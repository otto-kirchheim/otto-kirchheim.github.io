import { describe, expect, it } from 'bun:test';
import { listenBelegung, listenBeschriftung, listenWert, loeseListenAuf, schluesselAufPlatz } from '@/infrastructure/pdf/listen';
import type { ListenGruppe, TabellenDef, Zeile } from '@otto-kirchheim/nebengeld-shared';

const gruppe: ListenGruppe = {
  quelle: 'Zulagen',
  schluessel: 'Typ',
  wert: 'Wert',
  auswahl: ['811', '818', '820', '824'],
};

function zeile(...zulagen: { Typ: string; Wert: number }[]): Zeile {
  return { Tag: '2026-03-01', Zulagen: zulagen };
}

describe('listenBelegung', () => {
  it('belegt die Plätze in der Reihenfolge der Auswahl, nicht in der der Daten', () => {
    const zeilen = [zeile({ Typ: '824', Wert: 2 }), zeile({ Typ: '811', Wert: 1 })];
    expect(listenBelegung(zeilen, gruppe)).toEqual(['811', '824']);
  });

  it('lässt nicht vorkommende Schlüssel weg -- unbenutzte Spalten bleiben leer', () => {
    expect(listenBelegung([zeile({ Typ: '818', Wert: 1 })], gruppe)).toEqual(['818']);
  });

  it('ignoriert Schlüssel außerhalb der Auswahl (andere Kategorie, eigene Gruppe)', () => {
    expect(listenBelegung([zeile({ Typ: '218', Wert: 1 })], gruppe)).toEqual([]);
  });

  it('ohne Auswahl zählt das erste Vorkommen in den Daten', () => {
    const ohneAuswahl: ListenGruppe = { quelle: 'Zulagen', schluessel: 'Typ', wert: 'Wert' };
    const zeilen = [zeile({ Typ: 'B', Wert: 1 }), zeile({ Typ: 'A', Wert: 1 }, { Typ: 'B', Wert: 2 })];
    expect(listenBelegung(zeilen, ohneAuswahl)).toEqual(['B', 'A']);
  });

  it('sammelt über ALLE Zeilen -- sonst stünde auf Seite 2 eine andere Zulage über derselben Spalte', () => {
    const zeilen = [zeile({ Typ: '811', Wert: 1 }), zeile(), zeile({ Typ: '820', Wert: 3 })];
    expect(listenBelegung(zeilen, gruppe)).toEqual(['811', '820']);
  });

  it('verträgt fehlende oder falsch getypte Listen, statt zu werfen', () => {
    const kaputt: Zeile[] = [{ Zulagen: undefined }, { Zulagen: 'kein Array' }, { Zulagen: [null, 5] }];
    expect(listenBelegung(kaputt, gruppe)).toEqual([]);
  });
});

describe('listenWert', () => {
  const z = zeile({ Typ: '811', Wert: 3 }, { Typ: '820', Wert: 7 });

  it('liefert den Wert zum Schlüssel dieser Zeile', () => {
    expect(listenWert(z, gruppe, '820')).toBe(7);
  });

  it('liefert undefined, wenn die Zeile den Schlüssel nicht führt (leere Zelle)', () => {
    expect(listenWert(z, gruppe, '824')).toBeUndefined();
  });
});

describe('loeseListenAuf', () => {
  const tabelle: TabellenDef = {
    quelle: 'Daten.N',
    startY: 700,
    maxZeilen: 10,
    hoehe: 14,
    spalten: [],
    listen: { erschwernis: gruppe },
  };

  it('liefert Gruppen und Platzvergabe zusammen', () => {
    const aufgeloest = loeseListenAuf(tabelle, [zeile({ Typ: '818', Wert: 1 })]);
    expect(aufgeloest?.belegung.erschwernis).toEqual(['818']);
    expect(aufgeloest?.gruppen.erschwernis).toBe(gruppe);
  });

  it('liefert undefined für Tabellen ohne dynamische Spalten', () => {
    expect(loeseListenAuf({ quelle: 'x', startY: 700, maxZeilen: 10, hoehe: 14, spalten: [] }, [])).toBeUndefined();
  });

  it('schluesselAufPlatz liefert undefined für unbelegte Plätze', () => {
    const aufgeloest = loeseListenAuf(tabelle, [zeile({ Typ: '818', Wert: 1 })]);
    expect(schluesselAufPlatz(aufgeloest, 'erschwernis', 0)).toBe('818');
    expect(schluesselAufPlatz(aufgeloest, 'erschwernis', 1)).toBeUndefined();
    expect(schluesselAufPlatz(undefined, 'erschwernis', 0)).toBeUndefined();
  });
});

describe('listenBeschriftung', () => {
  it('nimmt den Kurztext, wenn hinterlegt, sonst den Schlüssel selbst', () => {
    expect(listenBeschriftung({ ...gruppe, beschriftungen: { '811': 'Erschütterung' } }, '811')).toBe('Erschütterung');
    expect(listenBeschriftung(gruppe, '811')).toBe('811');
  });
});
