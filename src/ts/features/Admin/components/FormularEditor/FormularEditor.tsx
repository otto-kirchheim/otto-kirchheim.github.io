import { useMemo, useState } from 'preact/hooks';
import type { Feld, SeitenDef, Spalte, Version } from '@otto-kirchheim/nebengeld-shared';
import { build } from '@/infrastructure/pdf/build';
import { konfigSchema } from '@/infrastructure/pdf/configSchema';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { PdfCanvas, type Achse, type RasterMarke, type Rechteck } from './PdfCanvas';
import { FeldPanel, type Armed } from './FeldPanel';
import { erzeugeDummyDaten, erzeugeVorschau, type Werteart } from './dummyDaten';
import { beispielSignatur } from './beispielSignatur';
import type { FormularCode } from './datenKatalog';

export type Konfig = { ersteSeite: SeitenDef; weitereSeite?: SeitenDef; tabellen: Version['tabellen'] };

type Props = {
  formular: FormularCode;
  datei: File;
  value: Konfig;
  onChange: (value: Konfig) => void;
};

export function leereSeite(): SeitenDef {
  return { quelle: 0, bereiche: [], felder: {} };
}

function feldRechteck(f: Feld, label: string, aktiv: boolean): Rechteck {
  return { x: f.x, y: f.y, x2: f.x2 ?? f.x + 40, y2: f.y2 ?? f.y + f.size, label, aktiv };
}

/**
 * Spalten uebernehmen nur die x-Kanten, das Zeilenraster nur die y-Kanten -- das Canvas zeigt beim
 * Ziehen deshalb ein Band statt eines Rechtecks, dessen halbe Angabe verworfen wuerde.
 */
function achseFuer(armed: Armed | null): Achse {
  if (armed?.bereich === 'spalte') return 'x';
  if (armed?.bereich === 'tabelle' || armed?.bereich === 'letzteZeile') return 'y';
  return 'beide';
}

/**
 * Zeilenhöhe aus erster und letzter Datenzeile, über alle Zeilen gemittelt. Eine Einzelmessung an
 * nur einer Zeile ist zwangsläufig ungenau (freihändig gezogenes Band); der Renderer zieht je Zeile
 * dieselbe `hoehe` ab, wodurch sich Bruchteile eines Punktes über die Tabelle zu einem sichtbaren
 * Versatz aufsummieren. `null` bedeutet: nicht messbar (zu wenige Zeilen oder Reihenfolge vertauscht).
 */
export function zeilenHoeheAus(startY: number, letzteY: number, zeilen: number): number | null {
  if (zeilen < 2) return null;
  const hoehe = (startY - letzteY) / (zeilen - 1);
  return hoehe > 0 ? Number(hoehe.toFixed(2)) : null;
}

/** Spannweite jeder Tabelle dieser Seite -- Grundlage für den Indikator am linken Seitenrand. */
function sammleRaster(seite: SeitenDef, tabellen: Version['tabellen'], armed: Armed | null): RasterMarke[] {
  return seite.bereiche.flatMap(bereich => {
    const tabelle = tabellen[bereich.tabelle];
    if (!tabelle) return [];
    return [
      {
        startY: bereich.startY,
        hoehe: tabelle.hoehe,
        zeilen: bereich.maxZeilen,
        aktiv: Boolean((armed?.bereich === 'tabelle' || armed?.bereich === 'letzteZeile') && armed.tabelle === bereich.tabelle),
      },
    ];
  });
}

function sammleRechtecke(seite: SeitenDef, tabellen: Version['tabellen'], armed: Armed | null): Rechteck[] {
  const rechtecke: Rechteck[] = [];

  for (const [key, feld] of Object.entries(seite.felder) as [string, Feld][]) {
    rechtecke.push(feldRechteck(feld, feld.label ?? key, Boolean(armed?.bereich === 'feld' && armed.key === key)));
  }

  for (const bereich of seite.bereiche) {
    const tabelle = tabellen[bereich.tabelle];
    if (!tabelle) continue;

    tabelle.spalten.forEach((spalte: Spalte, index) => {
      rechtecke.push({
        x: spalte.x,
        y: bereich.startY,
        x2: spalte.x2 ?? spalte.x + 40,
        y2: bereich.startY + tabelle.hoehe,
        label: spalte.label ?? spalte.key,
        aktiv: Boolean(armed?.bereich === 'spalte' && armed.tabelle === bereich.tabelle && armed.index === index),
      });
    });

    // Der Tabellenrahmen hat selbst keine x-Kanten: er spannt so weit wie seine Spalten, sonst über
    // die ganze Seitenbreite (x/x2 undefined) -- keine festen Werte, die bei Querformat brechen.
    const links = tabelle.spalten.map(s => Math.min(s.x, s.x2 ?? s.x));
    const rechts = tabelle.spalten.map(s => Math.max(s.x, s.x2 ?? s.x));
    rechtecke.push({
      x: links.length > 0 ? Math.min(...links) : undefined,
      y: bereich.startY,
      x2: rechts.length > 0 ? Math.max(...rechts) : undefined,
      y2: bereich.startY + tabelle.hoehe,
      label: `${bereich.tabelle}: erste Zeile`,
      aktiv: Boolean(armed?.bereich === 'tabelle' && armed.tabelle === bereich.tabelle),
      // Linke Kante teilt sich der Rahmen mit der ersten Spalte -- Beschriftung deshalb nach rechts.
      labelRechts: true,
    });
  }

  if (seite.signaturBild) {
    const s = seite.signaturBild;
    rechtecke.push({ x: s.x, y: s.y, x2: s.x + s.w, y2: s.y + s.h, label: 'Signatur', aktiv: Boolean(armed?.bereich === 'signaturBild') });
  }

  return rechtecke;
}

/**
 * Ersetzt die JSON-Textarea aus Phase 7 (User-Vorgabe) -- Zellen werden als Rechteck auf der echten
 * PDF-Vorschau aufgezogen statt per Hand ins JSON getippt. Laeuft komplett gegen die lokal
 * gewaehlte `datei: File`, kein Server-Roundtrip noetig.
 */
export function FormularEditor({ formular, datei, value, onChange }: Props) {
  const [tab, setTab] = useState<'erste' | 'weitere'>('erste');
  const [armed, setArmed] = useState<Armed | null>(null);
  const [vorschauLaeuft, setVorschauLaeuft] = useState<Werteart | null>(null);

  const aktiveSeite = tab === 'erste' ? value.ersteSeite : value.weitereSeite;
  // Beispielwerte samt Renderer-Kontext -- die Feldliste zeigt damit dieselben Zahlen wie das PDF.
  // Neu berechnet, sobald sich die Konfiguration oder der Seiten-Tab ändert.
  const vorschau = useMemo(
    () => erzeugeVorschau(value.tabellen, value.ersteSeite, value.weitereSeite, tab, formular),
    [value.tabellen, value.ersteSeite, value.weitereSeite, tab, formular],
  );

  function setzeAktiveSeite(seite: SeitenDef) {
    if (tab === 'erste') onChange({ ...value, ersteSeite: seite });
    else onChange({ ...value, weitereSeite: seite });
  }

  function handleRechteck(r: { x: number; y: number; x2: number; y2: number }) {
    if (!armed || !aktiveSeite) return;

    if (armed.bereich === 'feld') {
      const feld = aktiveSeite.felder[armed.key];
      if (!feld) return;
      setzeAktiveSeite({ ...aktiveSeite, felder: { ...aktiveSeite.felder, [armed.key]: { ...feld, x: r.x, y: r.y, x2: r.x2, y2: r.y2 } } });
    } else if (armed.bereich === 'spalte') {
      // Spalten liegen im Zeilenraster ihrer Tabelle -- nur die x-Kanten stammen aus der Markierung.
      const tabelle = value.tabellen[armed.tabelle];
      if (!tabelle) return;
      const spalten = tabelle.spalten.map((s, i) => (i === armed.index ? { ...s, x: r.x, x2: r.x2 } : s));
      onChange({ ...value, tabellen: { ...value.tabellen, [armed.tabelle]: { ...tabelle, spalten } } });
    } else if (armed.bereich === 'letzteZeile') {
      // Zeilenhöhe über ALLE Zeilen gemittelt statt aus einer einzelnen Messung: eine Ungenauigkeit
      // von Bruchteilen eines Punktes summiert sich sonst über die Tabelle zu einem sichtbaren
      // Versatz auf, weil der Renderer je Zeile dieselbe `hoehe` abzieht.
      const tabelle = value.tabellen[armed.tabelle];
      const bereich = aktiveSeite.bereiche.find(b => b.tabelle === armed.tabelle);
      if (!tabelle || !bereich) return;
      const gemessen = zeilenHoeheAus(bereich.startY, r.y, bereich.maxZeilen);
      if (gemessen === null) {
        createSnackBar({ message: 'Die letzte Zeile muss unter der ersten liegen', status: 'warning', timeout: 3000 });
        return;
      }
      onChange({ ...value, tabellen: { ...value.tabellen, [armed.tabelle]: { ...tabelle, hoehe: gemessen } } });
      createSnackBar({ message: `Zeilenhöhe: ${gemessen} pt (aus ${bereich.maxZeilen} Zeilen)`, status: 'success', timeout: 3000 });
    } else if (armed.bereich === 'tabelle') {
      // Erste Datenzeile: y liefert die Startposition, die Höhe den Zeilenabstand.
      const tabelle = value.tabellen[armed.tabelle];
      if (!tabelle) return;
      const bereiche = aktiveSeite.bereiche.some(b => b.tabelle === armed.tabelle)
        ? aktiveSeite.bereiche.map(b => (b.tabelle === armed.tabelle ? { ...b, startY: r.y } : b))
        : [...aktiveSeite.bereiche, { tabelle: armed.tabelle, startY: r.y, maxZeilen: 10 }];
      onChange({
        ...value,
        tabellen: { ...value.tabellen, [armed.tabelle]: { ...tabelle, hoehe: Math.max(r.y2 - r.y, 1) } },
        ...(tab === 'erste' ? { ersteSeite: { ...aktiveSeite, bereiche } } : { weitereSeite: { ...aktiveSeite, bereiche } }),
      });
    } else {
      setzeAktiveSeite({ ...aktiveSeite, signaturBild: { x: r.x, y: r.y, w: r.x2 - r.x, h: r.y2 - r.y } });
    }
    setArmed(null);
  }

  async function testdatenVorschau(art: Werteart) {
    setVorschauLaeuft(art);
    try {
      const daten = erzeugeDummyDaten(value.tabellen, value.ersteSeite, value.weitereSeite, formular, art);
      const bytes = await build(
        {
          version: 'vorschau',
          gueltigVon: '2026-01-01',
          gueltigBis: null,
          layout: { template: URL.createObjectURL(datei), ersteSeite: value.ersteSeite, weitereSeite: value.weitereSeite },
          tabellen: value.tabellen,
          formular,
        },
        daten,
        // Sonst bliebe die Signaturfläche als einziges Element ohne Beispielwert.
        beispielSignatur(),
      );
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      window.open(URL.createObjectURL(blob), '_blank');
    } catch (error) {
      createSnackBar({
        message: `Vorschau fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`,
        status: 'error',
        timeout: 4000,
        fixed: true,
      });
    } finally {
      setVorschauLaeuft(null);
    }
  }

  return (
    <div class="border rounded p-2">
      <div class="d-flex align-items-center gap-2 mb-2">
        <ul class="nav nav-pills nav-fill flex-grow-1">
          <li class="nav-item">
            <button type="button" class={`nav-link py-1 ${tab === 'erste' ? 'active' : ''}`} onClick={() => setTab('erste')}>
              Erste Seite
            </button>
          </li>
          <li class="nav-item">
            <button type="button" class={`nav-link py-1 ${tab === 'weitere' ? 'active' : ''}`} onClick={() => setTab('weitere')}>
              Weitere Seite {value.weitereSeite ? '' : '(nicht gesetzt)'}
            </button>
          </li>
        </ul>
        <div class="btn-group btn-group-sm">
          <button
            type="button"
            class="btn btn-primary"
            title="Fachlich passende Werte aus dem Datenkatalog — sieht aus wie ein ausgefülltes Formular"
            disabled={vorschauLaeuft !== null}
            onClick={() => void testdatenVorschau('beispiel')}
          >
            {vorschauLaeuft === 'beispiel' ? 'Erzeugt…' : 'Beispieldaten'}
          </button>
          <button
            type="button"
            class="btn btn-outline-primary"
            title="Generische Füllwerte — zeigt vor allem, welche Zelle zu welchem Eintrag gehört"
            disabled={vorschauLaeuft !== null}
            onClick={() => void testdatenVorschau('platzhalter')}
          >
            {vorschauLaeuft === 'platzhalter' ? 'Erzeugt…' : 'Platzhalter'}
          </button>
        </div>
      </div>

      {tab === 'weitere' && !value.weitereSeite && (
        <div class="mb-2">
          <p class="small text-body-secondary">Optional — nur nötig, wenn bei Zeilenüberlauf eine Folgeseite wiederholt werden soll.</p>
          <button type="button" class="btn btn-sm btn-outline-primary" onClick={() => onChange({ ...value, weitereSeite: leereSeite() })}>
            Weitere Seite hinzufügen
          </button>
        </div>
      )}

      {aktiveSeite && (
        <div class="row g-2">
          <div class="col-lg-7">
            <PdfCanvas
              datei={datei}
              seiteIndex={aktiveSeite.quelle}
              rechtecke={sammleRechtecke(aktiveSeite, value.tabellen, armed)}
              raster={sammleRaster(aktiveSeite, value.tabellen, armed)}
              scharfGeschaltet={armed !== null}
              achse={achseFuer(armed)}
              hinweis={
                armed?.bereich === 'letzteZeile'
                  ? 'Band über die LETZTE Datenzeile ziehen — die Zeilenhöhe wird daraus über alle Zeilen gemittelt.'
                  : undefined
              }
              onRechteck={handleRechteck}
              onQuelleWaehlen={pageIndex => setzeAktiveSeite({ ...aktiveSeite, quelle: pageIndex })}
              aktiveSeiteLabel={tab === 'erste' ? 'Erste Seite' : 'Weitere Seite'}
            />
            {tab === 'weitere' && (
              <button
                type="button"
                class="btn btn-sm btn-outline-danger mt-2"
                onClick={() => {
                  onChange({ ...value, weitereSeite: undefined });
                  setTab('erste');
                }}
              >
                Weitere Seite entfernen
              </button>
            )}
          </div>
          <div class="col-lg-5" style="max-height:70vh;overflow-y:auto">
            <FeldPanel
              formular={formular}
              seite={aktiveSeite}
              onSeiteChange={setzeAktiveSeite}
              tabellen={value.tabellen}
              onTabellenChange={t => onChange({ ...value, tabellen: t })}
              armed={armed}
              onArm={setArmed}
              vorschau={vorschau}
            />
          </div>
        </div>
      )}

      <KonfigJson value={value} onChange={onChange} />
    </div>
  );
}

/**
 * Rohansicht der kompletten Konfiguration -- zum Sichern, Übertragen auf ein anderes Formular oder
 * für Massenänderungen, die im visuellen Editor Feld für Feld zu mühsam wären. Übernommen wird
 * erst auf Knopfdruck, damit halbfertiges Tippen den Editor nicht laufend zurücksetzt.
 */
function KonfigJson({ value, onChange }: { value: Konfig; onChange: (value: Konfig) => void }) {
  const [entwurf, setEntwurf] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const angezeigt = entwurf ?? JSON.stringify(value, null, 2);

  function uebernehmen() {
    try {
      onChange(konfigSchema.parse(JSON.parse(angezeigt)));
      setEntwurf(null);
      setFehler(null);
      createSnackBar({ message: 'Konfiguration übernommen', status: 'success', timeout: 2000 });
    } catch (error) {
      setFehler(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <details class="mt-2">
      <summary class="small fw-semibold" style="cursor:pointer">
        Konfiguration als JSON (kopieren / einfügen)
      </summary>
      <textarea
        class={`form-control form-control-sm font-monospace mt-1${fehler ? ' is-invalid' : ''}`}
        style="font-size:0.7rem;min-height:12rem"
        spellcheck={false}
        value={angezeigt}
        onInput={e => {
          setEntwurf((e.target as HTMLTextAreaElement).value);
          setFehler(null);
        }}
      />
      {fehler && <div class="small text-danger mt-1">{fehler}</div>}
      <div class="d-flex gap-1 mt-1">
        <button type="button" class="btn btn-sm btn-primary" disabled={entwurf === null} onClick={uebernehmen}>
          Übernehmen
        </button>
        <button type="button" class="btn btn-sm btn-outline-secondary" disabled={entwurf === null} onClick={() => (setEntwurf(null), setFehler(null))}>
          Verwerfen
        </button>
        <button type="button" class="btn btn-sm btn-outline-secondary ms-auto" onClick={() => void navigator.clipboard?.writeText(angezeigt)}>
          In Zwischenablage
        </button>
      </div>
    </details>
  );
}
