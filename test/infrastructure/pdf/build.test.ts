import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { PDFDict, PDFDocument, PDFName } from '@cantoo/pdf-lib';
import type { Spalte, Version } from '@otto-kirchheim/nebengeld-shared';
import { build, spalteFuerZelle, zellGeometrie } from '@/infrastructure/pdf/build';

const vorlagePfad = `${import.meta.dir}/../../fixtures/test_1seitig.pdf`;

// Minimales gültiges 1x1-transparentes PNG als Signatur-Dummy.
const DUMMY_SIGNATUR_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

async function hatBildXObject(bytes: Uint8Array): Promise<boolean> {
  const doc = await PDFDocument.load(bytes);
  const resources = doc.getPage(0).node.Resources();
  const xobjekte = resources?.lookupMaybe(PDFName.of('XObject'), PDFDict);
  return (xobjekte?.keys().length ?? 0) > 0;
}

globalThis.fetch = vi.fn() as unknown as typeof fetch;

function macheCfg(): Version & { formular: string } {
  return {
    formular: 'ez',
    version: 'v1',
    gueltigVon: '2026-01-01',
    gueltigBis: null,
    layout: {
      template: 'test_1seitig.pdf',
      seiten: [
        {
          quelle: 0,
          bereiche: [{ tabelle: 'haupt', startY: 700, maxZeilen: 20 }],
          felder: {
            name: { x: 50, y: 800, size: 12 },
            summe: {
              x: 500,
              y: 60,
              size: 10,
              align: 'rechts',
              format: 'waehrung',
              berechnet: { op: 'summe', ueber: '$alle', feld: 'betrag' },
            },
          },
          signaturBild: { x: 400, y: 100, w: 120, h: 40 },
        },
      ],
    },
    tabellen: {
      haupt: {
        quelle: 'zeilen',
        startY: 700,
        maxZeilen: 20,
        hoehe: 14,
        spalten: [
          { key: 'text', x: 50, size: 10 },
          { key: 'betrag', x: 500, size: 10, align: 'rechts', format: 'waehrung' },
        ],
      },
    },
  };
}

describe('spalteFuerZelle (Spaltenbezug einer Sonderzeilen-Zelle über die Position)', () => {
  // User-Fund: sowohl dynamische Spalten (listenPlatz) als auch Ankreuz-Spalten (wenn) haben in der
  // Praxis ALLE denselben leeren `key` -- ein Bezug über `key` könnte sie nicht unterscheiden.
  const platz0: Spalte = { key: '', x: 10, size: 8, listenPlatz: { gruppe: 'g', index: 0 } };
  const ankreuz: Spalte = { key: '', x: 40, size: 8, wenn: { feld: 'x', werte: [1], dann: '1' } };
  const normal: Spalte = { key: 'Tag', x: 70, size: 8 };
  const spalten = [platz0, ankreuz, normal];

  it('findet die Spalte an der referenzierten Position, auch bei geteiltem leerem key', () => {
    expect(spalteFuerZelle(spalten, { spaltenIndex: 1, art: 'summe' })).toBe(ankreuz);
    expect(spalteFuerZelle(spalten, { spaltenIndex: 2, art: 'summe' })).toBe(normal);
  });

  it('liefert undefined bei einem Index außerhalb der Spaltenliste statt der falschen Spalte', () => {
    expect(spalteFuerZelle(spalten, { spaltenIndex: 9, art: 'summe' })).toBeUndefined();
  });
});

describe('zellGeometrie (Zeichen-Geometrie einer Sonderzeilen-Zelle)', () => {
  const spalte: Spalte = { key: 'betrag', x: 10, x2: 60, size: 8, align: 'links', autoGroesse: false };

  it('übernimmt x/x2 immer von der Spalte, y/y2 von der Platzierung', () => {
    const geo = zellGeometrie(spalte, { spaltenIndex: 0, art: 'summe' }, 100, 112);
    expect(geo.x).toBe(10);
    expect(geo.x2).toBe(60);
    expect(geo.y).toBe(100);
    expect(geo.y2).toBe(112);
  });

  it('ohne Angabe gelten size/align/autoGroesse der Spalte', () => {
    const geo = zellGeometrie(spalte, { spaltenIndex: 0, art: 'summe' }, 100, undefined);
    expect(geo.size).toBe(8);
    expect(geo.align).toBe('links');
    expect(geo.autoGroesse).toBe(false);
  });

  it('Zellen-Angaben überschreiben size/align/autoGroesse der Spalte', () => {
    const geo = zellGeometrie(
      spalte,
      { spaltenIndex: 0, art: 'summe', size: 14, align: 'zentriert', autoGroesse: true },
      100,
      undefined,
    );
    expect(geo.size).toBe(14);
    expect(geo.align).toBe('zentriert');
    expect(geo.autoGroesse).toBe(true);
  });
});

describe('build', () => {
  beforeEach(async () => {
    const bytes = await Bun.file(vorlagePfad).arrayBuffer();
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ arrayBuffer: async () => bytes });
  });

  it('erzeugt ein einseitiges PDF mit korrekter Seitenzahl und Subject-Metadaten', async () => {
    const cfg = macheCfg();
    const daten = {
      name: 'Max Mustermann',
      zeilen: [
        { text: 'Zeile 1', betrag: 10 },
        { text: 'Zeile 2', betrag: 5 },
      ],
    };

    const bytes = await build(cfg, daten);
    const doc = await PDFDocument.load(bytes);

    expect(doc.getPageCount()).toBe(1);
    expect(doc.getSubject()).toBe('ez@v1');
  });

  it('lädt die Vorlage über die konfigurierte Template-URL', async () => {
    const cfg = macheCfg();
    await build(cfg, { name: 'X', zeilen: [] });
    expect(globalThis.fetch).toHaveBeenCalledWith('test_1seitig.pdf');
  });

  it('funktioniert auch ohne Zeilen (leere Datenliste)', async () => {
    const cfg = macheCfg();
    const bytes = await build(cfg, { name: 'Leer', zeilen: [] });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });

  it('rendert mit je Schnitt eigener Standard-Familie fehlerfrei (Layout.schriftart als Objekt)', async () => {
    const cfg = macheCfg();
    cfg.layout.schriftart = { normal: 'times', fett: 'times', kursiv: 'helvetica', fettKursiv: 'courier' };
    cfg.layout.seiten[0]!.felder['kursiv'] = { x: 50, y: 500, size: 10, text: 'kursiv', kursiv: true };
    await expect(build(cfg, { name: 'X', zeilen: [] })).resolves.toBeInstanceOf(Uint8Array);
  });

  it('rendert eine um 90° gedrehte Tabelle fehlerfrei (TabellenDef.drehung)', async () => {
    const cfg = macheCfg();
    cfg.tabellen.haupt!.drehung = 90;
    cfg.tabellen.haupt!.sonderzeilen = { summe: { ueber: '$alle', zellen: [{ spaltenIndex: 1, art: 'summe' }] } };
    cfg.layout.seiten[0]!.bereiche = [
      { tabelle: 'haupt', startY: 700, maxZeilen: 20, sonderzeilen: [{ name: 'summe', y: 60 }] },
    ];
    const daten = {
      name: 'Max',
      zeilen: [
        { text: 'Zeile 1', betrag: 10 },
        { text: 'Zeile 2', betrag: 5 },
      ],
    };
    const doc = await PDFDocument.load(await build(cfg, daten));
    expect(doc.getPageCount()).toBe(1);
  });

  it('erlaubt eine seitenspezifische Tabellen-Drehung (TabellenBereich.drehung)', async () => {
    const cfg = macheCfg();
    cfg.layout.seiten[0]!.bereiche = [{ tabelle: 'haupt', startY: 700, maxZeilen: 20, drehung: 270 }];
    await expect(build(cfg, { name: 'X', zeilen: [{ text: 'a', betrag: 1 }] })).resolves.toBeInstanceOf(Uint8Array);
  });

  it('fällt bei einer vorlage:*-Familie ohne Font-Daten auf Helvetica zurück (Download-Pfad)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const cfg = macheCfg();
      cfg.layout.schriftart = 'vorlage:Fehlt';
      await expect(build(cfg, { name: 'X', zeilen: [] })).resolves.toBeInstanceOf(Uint8Array);
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('bettet bei vorhandenem Signatur-Input ein Image-XObject an der signaturBild-Position ein', async () => {
    const cfg = macheCfg();
    const bytes = await build(cfg, { name: 'X', zeilen: [] }, DUMMY_SIGNATUR_PNG);
    expect(await hatBildXObject(bytes)).toBe(true);
  });

  it('liefert ohne Signatur-Input ein valides PDF ohne Image-XObject (Pfad "Nein")', async () => {
    const cfg = macheCfg();
    const bytes = await build(cfg, { name: 'X', zeilen: [] });
    expect(await hatBildXObject(bytes)).toBe(false);
  });

  it('zeichnet keine Signatur, wenn die Seite kein signaturBild definiert (auch bei vorhandenem Input)', async () => {
    const cfg = macheCfg();
    delete cfg.layout.seiten[0]!.signaturBild;
    const bytes = await build(cfg, { name: 'X', zeilen: [] }, DUMMY_SIGNATUR_PNG);
    expect(await hatBildXObject(bytes)).toBe(false);
  });

  it('rendert ein nurBeiSignatur-Feld fehlerfrei, mit und ohne Signatur-Input (Suppression selbst siehe wert.test.ts)', async () => {
    const cfg = macheCfg();
    cfg.layout.seiten[0]!.felder['unterschriftsdatum'] = {
      x: 400,
      y: 80,
      size: 10,
      format: 'datum',
      berechnet: { op: 'letztesDatum', ueber: '$alle', maxTage: 14 },
      nurBeiSignatur: true,
    };
    await expect(build(cfg, { name: 'X', zeilen: [] })).resolves.toBeDefined();
    await expect(build(cfg, { name: 'X', zeilen: [] }, DUMMY_SIGNATUR_PNG)).resolves.toBeDefined();
  });

  it('rendert Übertragszeile und berechnete Spalten über mehrere Seiten ohne Fehler', async () => {
    const cfg = macheCfg();
    cfg.layout.seiten[0]!.bereiche = [{ tabelle: 'haupt', startY: 700, maxZeilen: 2 }];
    cfg.layout.seiten.push({
      quelle: 0,
      wiederholt: true,
      bereiche: [{ tabelle: 'haupt', startY: 680, maxZeilen: 2 }],
      felder: {
        beschriftung: { x: 50, y: 700, x2: 200, y2: 714, size: 10, text: 'Übertrag' },
        uebertragSumme: {
          x: 400,
          y: 700,
          x2: 500,
          y2: 714,
          size: 10,
          align: 'rechts',
          format: 'waehrung',
          berechnet: { op: 'summe', ueber: '$bisher', feld: 'betrag' },
        },
        seitenzahl: { x: 480, y: 30, x2: 545, y2: 42, size: 8, align: 'rechts', text: 'Seite {seite} von {seiten}' },
      },
    });
    cfg.tabellen.haupt!.spalten.push({
      key: 'gesamt',
      x: 300,
      x2: 380,
      size: 10,
      align: 'zentriert',
      berechnet: { op: 'produkt', operanden: ['betrag', 2] },
    });

    const daten = {
      name: 'Max',
      zeilen: Array.from({ length: 6 }, (_, i) => ({ text: `Zeile ${i + 1}`, betrag: i + 1 })),
    };

    const bytes = await build(cfg, daten);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(3);
  });

  it('rendert eine Seite mit eigener bereich.hoehe (Seiten-Override) fehlerfrei, unabhängig von startY/maxZeilen der anderen Seite', async () => {
    // Der genaue Zeilenabstand aus `hoeheFuer()` ist bereits in `shared/tests/formular/spaltenFuer.test.ts`
    // exakt abgedeckt -- hier geht es nur um die Verdrahtung in `build.ts`: ein `bereich.hoehe`
    // (statt `tabelle.hoehe`) darf den Renderer nicht zum Absturz bringen, und `maxZeilen`/`startY`
    // (von `verteile.ts` unabhängig von `hoehe` verarbeitet) bleiben je Seite unangetastet.
    const cfg = macheCfg();
    cfg.layout.seiten[0]!.bereiche = [{ tabelle: 'haupt', startY: 700, maxZeilen: 2 }];
    cfg.layout.seiten.push({
      quelle: 0,
      wiederholt: true,
      bereiche: [{ tabelle: 'haupt', startY: 500, maxZeilen: 3, hoehe: 30 }],
      felder: {},
    });

    const daten = {
      name: 'Max',
      zeilen: Array.from({ length: 5 }, (_, i) => ({ text: `Zeile ${i + 1}`, betrag: i + 1 })),
    };

    const bytes = await build(cfg, daten);
    const doc = await PDFDocument.load(bytes);
    // 2 Zeilen (Seite 1, maxZeilen: 2) + 3 Zeilen (wiederholte Seite 2, maxZeilen: 3) = alle 5
    // Zeilen in genau 2 Seiten.
    expect(doc.getPageCount()).toBe(2);
  });

  it('EA-artig: zwei Seiten mit bloßem { tabelle } erben startY/Höhe/Zeilen 1:1 von der Tabelle, nur Spalten weichen ab', async () => {
    const cfg = macheCfg();
    // Kein bereich.startY/hoehe/maxZeilen auf beiden Seiten -- beide erben komplett von
    // cfg.tabellen.haupt. maxZeilen bewusst auf 1 gesetzt: würde der Fallback nicht greifen (z.B.
    // 0 statt geerbter 1), risse `verteile()` schon auf Seite 1 aus ("keine Seite ist als
    // wiederholt markiert"), statt sauber zwei Seiten zu füllen. Nur die zweite Seite trägt
    // zusätzlich eine Übertragsspalte.
    cfg.tabellen.haupt!.maxZeilen = 1;
    cfg.layout.seiten[0]!.bereiche = [{ tabelle: 'haupt' }];
    cfg.layout.seiten.push({
      quelle: 0,
      bereiche: [
        {
          tabelle: 'haupt',
          spalten: [...cfg.tabellen.haupt!.spalten, { key: 'uebertrag', x: 300, size: 10, format: 'waehrung' }],
        },
      ],
      felder: {},
    });

    const daten = {
      name: 'Max',
      zeilen: [
        { text: 'Zeile 1', betrag: 10 },
        { text: 'Zeile 2', betrag: 5 },
      ],
    };
    const bytes = await build(cfg, daten);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(2);
  });

  it('rendert Sonderzeilen (Kopf zweifach platziert + Summen) fehlerfrei -- x kommt automatisch von der Spalte', async () => {
    const cfg = macheCfg();
    cfg.tabellen.haupt!.listen = { gruppe: { quelle: 'zulagen', schluessel: 'Typ', wert: 'Wert' } };
    // Über eine Vorlage angelegte dynamische Spalten (User-Fund): `key` bleibt leer, mehrere
    // Spalten teilen sich denselben Wert -- der Zellbezug muss deshalb über die Position laufen
    // (Index 0/1 = die beiden Basis-Spalten `text`/`betrag`, 2/3 die neuen Zulagen-Plätze).
    cfg.tabellen.haupt!.spalten.push(
      { key: '', x: 300, size: 8, listenPlatz: { gruppe: 'gruppe', index: 0 } },
      { key: '', x: 340, size: 8, listenPlatz: { gruppe: 'gruppe', index: 1 } },
    );
    cfg.tabellen.haupt!.sonderzeilen = {
      kopf: {
        zellen: [
          { spaltenIndex: 2, art: 'kopf' },
          { spaltenIndex: 3, art: 'kopf' },
        ],
      },
      summe: {
        ueber: '$alle',
        zellen: [
          { spaltenIndex: 2, art: 'summe' },
          { spaltenIndex: 2, art: 'bereinigt' },
          { spaltenIndex: 2, art: 'summeGeld', format: 'waehrung' },
          { spaltenIndex: 3, art: 'summe' },
          { spaltenIndex: 1, art: 'summe', format: 'waehrung' },
        ],
      },
    };
    cfg.layout.seiten[0]!.bereiche[0]!.sonderzeilen = [
      { name: 'kopf', y: 780 },
      { name: 'kopf', y: 50 }, // Kopie unten -- eine Inhaltsdefinition, zweimal platziert.
      { name: 'summe', y: 40 },
    ];

    const daten = {
      name: 'Max',
      VorgabenGeld: { B: 2 },
      zeilen: [
        {
          text: 'Zeile 1',
          betrag: 10,
          zulagen: [
            { Typ: '811', Wert: 60 },
            { Typ: '818', Wert: 30 },
          ],
        },
        { text: 'Zeile 2', betrag: 5 },
      ],
    };

    const bytes = await build(cfg, daten);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });
});
