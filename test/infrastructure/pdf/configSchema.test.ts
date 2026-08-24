import { describe, expect, it } from 'bun:test';
import { ZodError } from 'zod';
import { resolve } from '@otto-kirchheim/nebengeld-shared';
import { parseRegistry } from '@/infrastructure/pdf/configSchema';

const leeresLayout = {
  template: 'x.pdf',
  seiten: [{ quelle: 0, bereiche: [{ tabelle: 'haupt', startY: 0, maxZeilen: 1 }], felder: {} }],
};

function macheRegistryJson() {
  return {
    ez: {
      titel: 'Zulagenzettel',
      versionen: [
        {
          version: 'v1',
          gueltigVon: '2025-01-01',
          gueltigBis: '2026-01-01',
          layout: leeresLayout,
          tabellen: { haupt: { quelle: 'zeilen', startY: 700, maxZeilen: 10, hoehe: 12, spalten: [] } },
        },
        {
          version: 'v2',
          gueltigVon: '2026-01-01',
          gueltigBis: null,
          layout: leeresLayout,
          tabellen: { haupt: { quelle: 'zeilen', startY: 700, maxZeilen: 10, hoehe: 12, spalten: [] } },
        },
      ],
    },
  };
}

// Simuliert den Roundtrip über den Server (JSON hat zur Laufzeit keinen Typ mehr).
function alsUnknownVomServer(wert: unknown): unknown {
  return JSON.parse(JSON.stringify(wert));
}

describe('parseRegistry', () => {
  it('validiert eine korrekte Registry-Konfiguration', () => {
    const registry = parseRegistry(alsUnknownVomServer(macheRegistryJson()));
    expect(registry.ez.versionen).toHaveLength(2);
    expect(registry.ez.versionen[0].version).toBe('v1');
  });

  it('wirft ZodError statt eines Laufzeitabsturzes bei fehlendem Pflichtfeld', () => {
    const kaputt = macheRegistryJson();
    // @ts-expect-error -- absichtlich kaputtes Testdatum ohne gueltigVon
    delete kaputt.ez.versionen[0].gueltigVon;
    expect(() => parseRegistry(alsUnknownVomServer(kaputt))).toThrow(ZodError);
  });

  it('wirft ZodError bei falschem Feldtyp (Zahl statt String)', () => {
    const kaputt = macheRegistryJson();
    // @ts-expect-error -- absichtlich falscher Typ
    kaputt.ez.versionen[0].version = 123;
    expect(() => parseRegistry(alsUnknownVomServer(kaputt))).toThrow(ZodError);
  });

  it('wirft ZodError bei komplett falscher Form (Array statt Objekt, Nullwert, String)', () => {
    expect(() => parseRegistry([])).toThrow(ZodError);
    expect(() => parseRegistry(null)).toThrow(ZodError);
    expect(() => parseRegistry('kaputt')).toThrow(ZodError);
  });

  it('nimmt verschachtelte Zeilenrechnungen an (Operand ist selbst eine Rechnung)', () => {
    const json = macheRegistryJson();
    json.ez.versionen[0].tabellen.haupt.spalten = [
      {
        key: 'Dauer',
        x: 50,
        size: 10,
        format: 'stunden',
        berechnet: { op: 'summe', operanden: [{ op: 'zeitspanne', operanden: ['Ende', 'Beginn'] }, 'Pause'] },
      },
    ] as never;

    const registry = parseRegistry(alsUnknownVomServer(json));
    const berechnet = registry.ez.versionen[0].tabellen.haupt.spalten[0].berechnet!;
    expect(berechnet.op).toBe('summe');
    expect(berechnet.operanden[0]).toEqual({ op: 'zeitspanne', operanden: ['Ende', 'Beginn'] });
  });

  it('wirft ZodError, wenn eine Zwischenrechnung selbst kaputt ist (Rekursion validiert mit)', () => {
    const json = macheRegistryJson();
    json.ez.versionen[0].tabellen.haupt.spalten = [
      { key: 'Dauer', x: 50, size: 10, berechnet: { op: 'summe', operanden: [{ op: 'gibtsNicht', operanden: [] }] } },
    ] as never;

    expect(() => parseRegistry(alsUnknownVomServer(json))).toThrow(ZodError);
  });

  it('lässt unbekannte Formular-Zusatzfelder für spätere Erweiterung zu (kein strict())', () => {
    const mitZusatzfeld = macheRegistryJson();
    (mitZusatzfeld.ez as Record<string, unknown>).kommentar = 'nur intern';
    expect(() => parseRegistry(alsUnknownVomServer(mitZusatzfeld))).not.toThrow();
  });

  describe('Sonderzeilen (Kopf-/Summenzeilen über mehrere Spalten)', () => {
    it('nimmt eine Tabellen-Sonderzeile mit Platzierung (auch mehrfach) an', () => {
      const json = macheRegistryJson();
      json.ez.versionen[0].tabellen.haupt = {
        quelle: 'zeilen',
        startY: 700,
        maxZeilen: 10,
        hoehe: 12,
        spalten: [{ key: 'ez1', x: 50, size: 8, listenPlatz: { gruppe: 'g', index: 0 } }],
        sonderzeilen: { kopf: { zellen: [{ spaltenIndex: 0, art: 'kopf' }] } },
      } as never;
      json.ez.versionen[0].layout = {
        ...leeresLayout,
        seiten: [
          {
            quelle: 0,
            bereiche: [
              {
                tabelle: 'haupt',
                startY: 0,
                maxZeilen: 1,
                sonderzeilen: [
                  { name: 'kopf', y: 780 },
                  { name: 'kopf', y: 50 },
                ],
              },
            ],
            felder: {},
          },
        ],
      } as never;

      const registry = parseRegistry(alsUnknownVomServer(json));
      expect(registry.ez.versionen[0].tabellen.haupt.sonderzeilen?.kopf.zellen[0].art).toBe('kopf');
      expect(registry.ez.versionen[0].layout.seiten[0].bereiche[0].sonderzeilen).toHaveLength(2);
    });

    it('nimmt eine Zelle über spaltenIndex an (dynamische Spalte ohne key)', () => {
      const json = macheRegistryJson();
      json.ez.versionen[0].tabellen.haupt = {
        quelle: 'zeilen',
        startY: 700,
        maxZeilen: 10,
        hoehe: 12,
        spalten: [{ key: '', x: 50, size: 8, listenPlatz: { gruppe: 'g', index: 0 } }],
        sonderzeilen: { kopf: { zellen: [{ spaltenIndex: 0, art: 'kopf' }] } },
      } as never;

      const registry = parseRegistry(alsUnknownVomServer(json));
      expect(registry.ez.versionen[0].tabellen.haupt.sonderzeilen?.kopf.zellen[0].spaltenIndex).toBe(0);
    });

    it('nimmt size/align/autoGroesse als optionale Zellen-Übersteuerung an', () => {
      const json = macheRegistryJson();
      json.ez.versionen[0].tabellen.haupt = {
        quelle: 'zeilen',
        startY: 700,
        maxZeilen: 10,
        hoehe: 12,
        spalten: [{ key: 'betrag', x: 50, size: 8 }],
        sonderzeilen: {
          summe: { zellen: [{ spaltenIndex: 0, art: 'summe', size: 14, align: 'zentriert', autoGroesse: true }] },
        },
      } as never;

      const registry = parseRegistry(alsUnknownVomServer(json));
      const zelle = registry.ez.versionen[0].tabellen.haupt.sonderzeilen?.summe.zellen[0];
      expect(zelle?.size).toBe(14);
      expect(zelle?.align).toBe('zentriert');
      expect(zelle?.autoGroesse).toBe(true);
    });

    it('wirft ZodError bei unbekannter art', () => {
      const json = macheRegistryJson();
      json.ez.versionen[0].tabellen.haupt = {
        quelle: 'zeilen',
        startY: 700,
        maxZeilen: 10,
        hoehe: 12,
        spalten: [],
        sonderzeilen: { kopf: { zellen: [{ spaltenIndex: 0, art: 'gibtsNicht' }] } },
      } as never;
      expect(() => parseRegistry(alsUnknownVomServer(json))).toThrow(ZodError);
    });
  });

  describe('Berechnet.liste ohne index (Gesamtsumme über eine Listen-Gruppe)', () => {
    function mitBerechnet(liste: Record<string, unknown>) {
      const json = macheRegistryJson();
      json.ez.versionen[0].layout = {
        ...leeresLayout,
        seiten: [
          {
            quelle: 0,
            bereiche: [{ tabelle: 'haupt', startY: 0, maxZeilen: 1 }],
            felder: { gesamt: { x: 0, y: 0, size: 10, berechnet: { op: 'summe', ueber: '$alle', liste } } },
          },
        ],
      } as never;
      return json;
    }

    it('akzeptiert ohne index und ohne art (Default "summe", roh)', () => {
      expect(() => parseRegistry(alsUnknownVomServer(mitBerechnet({ tabelle: 'haupt', gruppe: 'g' })))).not.toThrow();
    });

    it('akzeptiert ohne index mit art "bereinigt" oder "summeGeld"', () => {
      expect(() =>
        parseRegistry(alsUnknownVomServer(mitBerechnet({ tabelle: 'haupt', gruppe: 'g', art: 'bereinigt' }))),
      ).not.toThrow();
      expect(() =>
        parseRegistry(alsUnknownVomServer(mitBerechnet({ tabelle: 'haupt', gruppe: 'g', art: 'summeGeld' }))),
      ).not.toThrow();
    });

    it('wirft ZodError bei unbekannter art', () => {
      expect(() =>
        parseRegistry(alsUnknownVomServer(mitBerechnet({ tabelle: 'haupt', gruppe: 'g', art: 'gibtsNicht' }))),
      ).toThrow(ZodError);
    });

    it('akzeptiert weiterhin die Platz-Form mit index (bestehendes Verhalten)', () => {
      expect(() =>
        parseRegistry(alsUnknownVomServer(mitBerechnet({ tabelle: 'haupt', gruppe: 'g', index: 0 }))),
      ).not.toThrow();
    });
  });
});

describe('parseRegistry + resolve (Integration)', () => {
  it('löst nach der Schema-Validierung dieselben Datumsgrenzfälle korrekt auf wie mit Handdaten', () => {
    const registry = parseRegistry(alsUnknownVomServer(macheRegistryJson()));

    expect(resolve(registry, 'ez', '2025-06-15').version).toBe('v1');
    expect(resolve(registry, 'ez', '2026-01-01').version).toBe('v2');
    expect(resolve(registry, 'ez', '2025-12-31').version).toBe('v1');
    expect(resolve(registry, 'ez', '2099-01-01').version).toBe('v2');
    expect(() => resolve(registry, 'ez', '2024-01-01')).toThrow('Keine gültige Version für ez am 2024-01-01');
  });
});
