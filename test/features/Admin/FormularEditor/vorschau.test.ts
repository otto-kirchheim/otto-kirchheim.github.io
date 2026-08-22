import { describe, expect, it } from 'bun:test';
import type { SeitenDef, TabellenDef } from '@otto-kirchheim/nebengeld-shared';
import { erzeugeVorschau } from '@/features/Admin/components/FormularEditor/dummyDaten';
import { wert } from '@/infrastructure/pdf/wert';

const tabellen: Record<string, TabellenDef> = {
  haupt: {
    quelle: 'Daten.N',
    startY: 700,
    maxZeilen: 10,
    hoehe: 14,
    spalten: [
      { key: 'Tag', x: 50, size: 10, format: 'datum' },
      { key: 'betrag', x: 300, size: 10, format: 'waehrung' },
    ],
  },
};

function ersteSeite(maxZeilen: number): SeitenDef {
  return {
    quelle: 0,
    bereiche: [{ tabelle: 'haupt', startY: 700, maxZeilen }],
    felder: {
      gesamt: { x: 50, y: 60, size: 10, format: 'waehrung', berechnet: { op: 'summe', ueber: '$alle', feld: 'betrag' } },
      seitenzahl: { x: 400, y: 30, size: 8, text: 'Seite {seite} von {seiten}' },
    },
  };
}

function weitereSeite(maxZeilen: number): SeitenDef {
  return {
    quelle: 0,
    wiederholt: true,
    bereiche: [{ tabelle: 'haupt', startY: 680, maxZeilen }],
    felder: {
      uebertrag: { x: 50, y: 700, size: 10, format: 'waehrung', berechnet: { op: 'summe', ueber: '$bisher', feld: 'betrag' } },
      hinweis: { x: 50, y: 720, size: 10, text: 'Übertrag von Seite {seite-1}' },
    },
  };
}

describe('erzeugeVorschau', () => {
  it('liefert einen Kontext, in dem eine Gesamtsumme einen echten Wert ergibt (nicht 0)', () => {
    const seite = ersteSeite(3);
    const { daten, kontext } = erzeugeVorschau(tabellen, [seite], 0, 'ez');
    const gezeigt = wert(seite.felder.gesamt!, 'gesamt', daten, kontext);
    expect(gezeigt).not.toBe('0,00');
    expect(kontext.$alle.haupt!.length).toBeGreaterThan(0);
  });

  it('auf der Folgeseite ist $bisher gefüllt -- nur so zeigt der Übertrag überhaupt etwas an', () => {
    const erste = ersteSeite(2);
    const weitere = weitereSeite(2);
    const { daten, kontext } = erzeugeVorschau(tabellen, [erste, weitere], 1, 'ez');
    expect(kontext.seite).toBeGreaterThan(1);
    expect(kontext.$bisher.haupt!.length).toBeGreaterThan(0);
    expect(wert(weitere.felder.uebertrag!, 'uebertrag', daten, kontext)).not.toBe('0,00');
  });

  it('die Seitenzahlen im Kontext passen zum gewählten Tab -- {seite-1} zeigt die Vorseite', () => {
    const erste = ersteSeite(2);
    const weitere = weitereSeite(2);
    const { daten, kontext } = erzeugeVorschau(tabellen, [erste, weitere], 1, 'ez');
    expect(wert(weitere.felder.hinweis!, 'hinweis', daten, kontext)).toBe(`Übertrag von Seite ${kontext.seite - 1}`);
  });

  it('auf der ersten Seite bleibt $bisher leer, der Übertrag ist dort also 0', () => {
    const { kontext } = erzeugeVorschau(tabellen, [ersteSeite(2), weitereSeite(2)], 0, 'ez');
    expect(kontext.seite).toBe(1);
    expect(kontext.$bisher).toEqual({});
  });

  it('Datenpfade aus Text-Platzhaltern bekommen Beispielwerte statt leer zu bleiben', () => {
    const seite: SeitenDef = {
      quelle: 0,
      bereiche: [{ tabelle: 'haupt', startY: 700, maxZeilen: 2 }],
      felder: { kopf: { x: 50, y: 800, size: 10, text: 'Zulagen {Monat}/{Jahr}' } },
    };
    const { daten, kontext } = erzeugeVorschau(tabellen, [seite], 0, 'ez');
    const gezeigt = wert(seite.felder.kopf!, 'kopf', daten, kontext);
    expect(gezeigt).not.toBe('Zulagen /');
    expect(gezeigt.startsWith('Zulagen ')).toBe(true);
  });

  it('fällt bei unfertiger Konfiguration auf eine Einzelseite zurück, statt zu werfen', () => {
    // Zeilen laufen über, aber es gibt keine Folgeseite -- `verteile()` wirft hier.
    const zuKlein: SeitenDef = { quelle: 0, bereiche: [{ tabelle: 'haupt', startY: 700, maxZeilen: 0 }], felder: {} };
    const { kontext } = erzeugeVorschau(tabellen, [zuKlein], 0, 'ez');
    expect(kontext.seite).toBe(1);
    expect(kontext.seiten).toBe(1);
  });

  describe('Werteart', () => {
    const seite: SeitenDef = {
      quelle: 0,
      bereiche: [{ tabelle: 'haupt', startY: 700, maxZeilen: 3 }],
      felder: { 'VorgabenU.Pers.Nachname': { x: 50, y: 800, size: 12 } },
    };

    it('"beispiel" setzt fachlich passende Werte aus dem Datenkatalog', () => {
      const { daten, kontext } = erzeugeVorschau(tabellen, [seite], 0, 'ez', 'beispiel');
      expect(wert(seite.felder['VorgabenU.Pers.Nachname']!, 'VorgabenU.Pers.Nachname', daten, kontext)).toBe('Mustermann');
    });

    it('"platzhalter" liefert weiterhin generische Fuellwerte', () => {
      const { daten, kontext } = erzeugeVorschau(tabellen, [seite], 0, 'ez', 'platzhalter');
      const gezeigt = wert(seite.felder['VorgabenU.Pers.Nachname']!, 'VorgabenU.Pers.Nachname', daten, kontext);
      expect(gezeigt).not.toBe('Mustermann');
      expect(gezeigt).toContain('Test');
    });

    it('Zeilenwerte variieren ueber die Zeilen, statt sich zu wiederholen', () => {
      const { kontext } = erzeugeVorschau(tabellen, [seite], 0, 'ez', 'beispiel');
      const tage = kontext.$alle.haupt!.map(z => z.Tag);
      expect(new Set(tage).size).toBe(tage.length);
    });

    it('unbekannte Pfade fallen auf den generischen Platzhalter zurueck', () => {
      const eigen: SeitenDef = { ...seite, felder: { gibtsNichtImKatalog: { x: 50, y: 800, size: 12 } } };
      const { daten, kontext } = erzeugeVorschau(tabellen, [eigen], 0, 'ez', 'beispiel');
      expect(wert(eigen.felder.gibtsNichtImKatalog!, 'gibtsNichtImKatalog', daten, kontext)).toContain('Test');
    });
  });
});
