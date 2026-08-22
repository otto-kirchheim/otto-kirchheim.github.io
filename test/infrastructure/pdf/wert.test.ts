import { describe, expect, it } from 'bun:test';
import type { Feld, Zeile } from '@otto-kirchheim/nebengeld-shared';
import { datenPlatzhalter, wert, type Kontext } from '@/infrastructure/pdf/wert';

const seiteZeilen: Zeile[] = [{ betrag: 10 }, { betrag: 5 }];
const bisherZeilen: Zeile[] = [{ betrag: 100 }, { betrag: 50 }];
const alleZeilen: Zeile[] = [...bisherZeilen, ...seiteZeilen];
/** Fester Erzeugungstag, damit `{heute}` und das Unterschriftsdatum reproduzierbar sind. */
const HEUTE = new Date(2026, 7, 16);
const kontext: Kontext = {
  $seite: { haupt: seiteZeilen },
  $bisher: { haupt: bisherZeilen },
  $laufend: { haupt: [...bisherZeilen, ...seiteZeilen] },
  $alle: { haupt: alleZeilen },
  seite: 2,
  seiten: 3,
  heute: HEUTE,
  listen: {},
};

describe('wert', () => {
  it('liest einen Direktwert aus den Daten', () => {
    const f: Feld = { x: 0, y: 0, size: 10 };
    expect(wert(f, 'name', { name: 'Max' }, kontext)).toBe('Max');
  });

  it('formatiert einen Direktwert, wenn format gesetzt ist', () => {
    const f: Feld = { x: 0, y: 0, size: 10, format: 'waehrung' };
    expect(wert(f, 'betrag', { betrag: 1234.5 }, kontext)).toBe('1.234,50');
  });

  it('Array-Direktwert ohne format wird wie `liste` zusammengefügt statt roh gejoint (generischer Fallback)', () => {
    // Für VorgabenU.Pers.OE reicht dieser generische Fallback NICHT -- die hat eine eigene,
    // striktere Schreibweise, siehe FORMAT.oe in shared/tests/formular/aggregatoren.test.ts.
    const f: Feld = { x: 0, y: 0, size: 10 };
    expect(wert(f, 'zulagen', { zulagen: ['NZ', 'SoZ', ''] }, kontext)).toBe('NZ / SoZ');
  });

  it('OE-Direktwert mit format: oe in kanonischer Schreibweise (User-Fund)', () => {
    const f: Feld = { x: 0, y: 0, size: 10, format: 'oe' };
    expect(wert(f, 'oe', { oe: ['V', 'IW', 'MI', 'N', 'KSL', 'IL', '03'] }, kontext)).toBe('V.IW-MI-N-KSL-IL 03');
  });

  it('Boolean-Direktwert ohne format wird Ja/Nein statt englischem true/false', () => {
    const f: Feld = { x: 0, y: 0, size: 10 };
    expect(wert(f, 'aktiv', { aktiv: true }, kontext)).toBe('Ja');
    expect(wert(f, 'aktiv', { aktiv: false }, kontext)).toBe('Nein');
  });

  it('liefert leeren String für fehlende/null-Werte', () => {
    const f: Feld = { x: 0, y: 0, size: 10 };
    expect(wert(f, 'fehlt', {}, kontext)).toBe('');
    expect(wert(f, 'x', { x: null }, kontext)).toBe('');
  });

  it('fester text schlägt den Datenpfad -- Beschriftung der Übertragszeile', () => {
    const f: Feld = { x: 0, y: 0, size: 10, text: 'Übertrag' };
    expect(wert(f, 'name', { name: 'Max' }, kontext)).toBe('Übertrag');
  });

  describe('Platzhalter im festen Text', () => {
    it('{seite}/{seiten} liefern die Seitenzahlen -- so entsteht die Seitenzahl-Zelle', () => {
      const f: Feld = { x: 0, y: 0, size: 10, text: 'Seite {seite} von {seiten}' };
      expect(wert(f, 'egal', {}, kontext)).toBe('Seite 2 von 3');
    });

    it('{seite-1} liefert die Vorseite -- "Übertrag von Seite 1" auf Seite 2', () => {
      const f: Feld = { x: 0, y: 0, size: 10, text: 'Übertrag von Seite {seite-1}' };
      expect(wert(f, 'egal', {}, kontext)).toBe('Übertrag von Seite 1');
    });

    it('Leerzeichen im Versatz sind erlaubt und {seite + 1} zeigt auf die Folgeseite', () => {
      const f: Feld = { x: 0, y: 0, size: 10, text: '{seite - 1} / {seite + 1}' };
      expect(wert(f, 'egal', {}, kontext)).toBe('1 / 3');
    });

    it('der Versatz gilt auch für die Gesamtzahl ({seiten-1})', () => {
      const f: Feld = { x: 0, y: 0, size: 10, text: 'noch {seiten-1} Blatt' };
      expect(wert(f, 'egal', {}, kontext)).toBe('noch 2 Blatt');
    });

    it('nur ganzzahliger Versatz -- alles andere bleibt ein Datenpfad und damit leer', () => {
      const f: Feld = { x: 0, y: 0, size: 10, text: 'A{seite*2}B{seite-1.5}C' };
      expect(wert(f, 'egal', {}, kontext)).toBe('ABC');
    });

    it('beliebige Datenpfade sind ebenfalls als Platzhalter nutzbar', () => {
      const f: Feld = { x: 0, y: 0, size: 10, text: 'Zulagen {Monat}/{Jahr} für {p.Vorname}' };
      expect(wert(f, 'egal', { Monat: 3, Jahr: 2026, p: { Vorname: 'Max' } }, kontext)).toBe('Zulagen 3/2026 für Max');
    });

    it('unbekannte Platzhalter werden zu leerem Text, nicht roh ins PDF übernommen', () => {
      const f: Feld = { x: 0, y: 0, size: 10, text: 'A{gibtsNicht}B' };
      expect(wert(f, 'egal', {}, kontext)).toBe('AB');
    });

    it('Text ohne Platzhalter bleibt unverändert', () => {
      const f: Feld = { x: 0, y: 0, size: 10, text: 'Übertrag' };
      expect(wert(f, 'egal', {}, kontext)).toBe('Übertrag');
    });

    describe('optionales Format ({Pfad:Format})', () => {
      it('erzwingt liste statt roh gejointem Array', () => {
        const f: Feld = { x: 0, y: 0, size: 10, text: 'Zulagen: {zulagen:liste}' };
        expect(wert(f, 'egal', { zulagen: ['NZ', 'SoZ', ''] }, kontext)).toBe('Zulagen: NZ / SoZ');
      });

      it('erzwingt oe für die kanonische Organisationseinheit-Schreibweise (User-Fund: liste zerstört sie)', () => {
        const f: Feld = { x: 0, y: 0, size: 10, text: '{oe:oe}' };
        expect(wert(f, 'egal', { oe: ['V', 'IW', 'MI', 'N', 'KSL', 'IL', '03'] }, kontext)).toBe('V.IW-MI-N-KSL-IL 03');
      });

      it('erzwingt ein Format, das vom Standard-Fallback abweicht (Zahl als Währung)', () => {
        const f: Feld = { x: 0, y: 0, size: 10, text: '{betrag:waehrung}' };
        expect(wert(f, 'egal', { betrag: 1234.5 }, kontext)).toBe('1.234,50');
      });

      it('{heute:datumKurz} überschreibt das sonst feste FORMAT.datum', () => {
        const f: Feld = { x: 0, y: 0, size: 10, text: 'Stand: {heute:datumKurz}' };
        expect(wert(f, 'egal', {}, kontext)).toBe('Stand: 16.08.');
      });

      it('unbekannter Formatname wird ignoriert, Pfad bleibt über den Standard-Fallback nutzbar', () => {
        const f: Feld = { x: 0, y: 0, size: 10, text: '{zulagen:gibtsNicht}' };
        expect(wert(f, 'egal', { zulagen: ['NZ', 'SoZ'] }, kontext)).toBe('NZ / SoZ');
      });

      it('ohne Format bleibt das bisherige Verhalten (Standard-Fallback)', () => {
        const f: Feld = { x: 0, y: 0, size: 10, text: '{zulagen}' };
        expect(wert(f, 'egal', { zulagen: ['NZ', 'SoZ'] }, kontext)).toBe('NZ / SoZ');
      });
    });
  });

  describe('datenPlatzhalter', () => {
    it('schneidet den :Format-Teil ab, damit die Testdaten-Vorschau den Pfad noch findet', () => {
      expect(datenPlatzhalter('OE: {VorgabenU.Pers.OE:oe}, Stand {heute:datumKurz}')).toEqual(['VorgabenU.Pers.OE']);
    });

    it('liefert Pfade ohne Format unverändert', () => {
      expect(datenPlatzhalter('{Nachname}, {Vorname}')).toEqual(['Nachname', 'Vorname']);
    });
  });

  describe('Datum neben der Unterschrift (letztesDatum)', () => {
    function mitZeilen(tage: string[]): Kontext {
      const zeilen: Zeile[] = tage.map(Tag => ({ Tag }));
      return { ...kontext, $alle: { haupt: zeilen } };
    }

    const feld: Feld = { x: 0, y: 0, size: 10, format: 'datum', berechnet: { op: 'letztesDatum', ueber: '$alle', feld: 'Tag', maxTage: 14 } };

    it('nimmt den jüngsten Eintrag, wenn er innerhalb der Frist liegt', () => {
      // Reihenfolge bewusst unsortiert -- es zählt der jüngste Wert, nicht der letzte der Liste.
      expect(wert(feld, 'egal', {}, mitZeilen(['2026-08-05', '2026-08-10', '2026-08-07']))).toBe('10.08.2026');
    });

    it('fällt auf heute zurück, wenn der jüngste Eintrag älter als die Frist ist', () => {
      expect(wert(feld, 'egal', {}, mitZeilen(['2026-03-01', '2026-03-05']))).toBe('16.08.2026');
    });

    it('Grenzfall: genau am letzten Tag der Frist zählt noch der Eintrag', () => {
      expect(wert(feld, 'egal', {}, mitZeilen(['2026-08-02']))).toBe('02.08.2026');
    });

    it('fällt auf heute zurück, wenn es gar keine Zeilen gibt', () => {
      expect(wert(feld, 'egal', {}, mitZeilen([]))).toBe('16.08.2026');
    });

    it('ohne Frist bleibt es immer beim letzten Eintrag, egal wie alt', () => {
      const ohneFrist: Feld = { ...feld, berechnet: { op: 'letztesDatum', ueber: '$alle', feld: 'Tag' } };
      expect(wert(ohneFrist, 'egal', {}, mitZeilen(['2020-01-02']))).toBe('02.01.2020');
    });

    it('{heute} im festen Text liefert denselben Erzeugungstag', () => {
      const textFeld: Feld = { x: 0, y: 0, size: 10, text: 'Musterstadt, den {heute}' };
      expect(wert(textFeld, 'egal', {}, kontext)).toBe('Musterstadt, den 16.08.2026');
    });
  });

  it('summiert über $alle (Gesamtsumme des Dokuments, unabhängig von der Seite)', () => {
    const f: Feld = { x: 0, y: 0, size: 10, format: 'waehrung', berechnet: { op: 'summe', ueber: '$alle', feld: 'betrag' } };
    expect(wert(f, 'gesamt', {}, kontext)).toBe('165,00');
  });

  describe('zusammengesetzte Felder über Platzhalter im festen Text', () => {
    const daten = { p: { Nachname: 'Mustermann', Vorname: 'Max' } };

    it('verbindet mehrere Datenpfade -- für den einfachen Fall ohne Leerteile-Filter', () => {
      const f: Feld = { x: 0, y: 0, size: 10, text: '{p.Nachname}, {p.Vorname}' };
      expect(wert(f, 'egal', daten, kontext)).toBe('Mustermann, Max');
    });

    it('anders als quellen bleibt bei einem leeren Platzhalter die Trennzeichen-Lücke stehen', () => {
      const f: Feld = { x: 0, y: 0, size: 10, text: '{p.Adress1} / {p.Ort}' };
      expect(wert(f, 'egal', { p: { Adress1: '', Ort: '12345 Berlin' } }, kontext)).toBe(' / 12345 Berlin');
    });
  });

  describe('zusammengesetzte Felder (quellen + trenner)', () => {
    const daten = { p: { Nachname: 'Mustermann', Vorname: 'Max', Adress1: 'Bahnweg 1', Adress2: '', Ort: '12345 Berlin' } };

    it('verbindet mehrere Datenpfade mit dem konfigurierten Trenner', () => {
      const f: Feld = { x: 0, y: 0, size: 10, quellen: ['p.Nachname', 'p.Vorname'], trenner: ', ' };
      expect(wert(f, 'egal', daten, kontext)).toBe('Mustermann, Max');
    });

    it('überspringt leere und fehlende Teile, statt doppelte Trennzeichen zu hinterlassen', () => {
      const f: Feld = { x: 0, y: 0, size: 10, quellen: ['p.Adress1', 'p.Adress2', 'p.fehlt', 'p.Ort'], trenner: ' / ' };
      expect(wert(f, 'egal', daten, kontext)).toBe('Bahnweg 1 / 12345 Berlin');
    });

    it('ohne trenner wird mit Leerzeichen verbunden', () => {
      const f: Feld = { x: 0, y: 0, size: 10, quellen: ['p.Vorname', 'p.Nachname'] };
      expect(wert(f, 'egal', daten, kontext)).toBe('Max Mustermann');
    });

    it('das Format gilt für jeden Teil einzeln (z.B. zwei Datumswerte als Zeitraum)', () => {
      const f: Feld = { x: 0, y: 0, size: 10, quellen: ['von', 'bis'], trenner: ' - ', format: 'datum' };
      expect(wert(f, 'egal', { von: '2026-03-01', bis: '2026-03-05' }, kontext)).toBe('01.03.2026 - 05.03.2026');
    });

    it('quellen schlagen berechnet, aber nicht den festen text', () => {
      const beides: Feld = { x: 0, y: 0, size: 10, text: 'fest', quellen: ['p.Vorname'] };
      expect(wert(beides, 'egal', daten, kontext)).toBe('fest');
    });

    it('leere Quellenliste ergibt einen leeren String, keinen Absturz', () => {
      const f: Feld = { x: 0, y: 0, size: 10, quellen: [], trenner: ', ' };
      expect(wert(f, 'egal', daten, kontext)).toBe('');
    });
  });

  describe('wenn (bedingter Feldinhalt, Dokumentebene)', () => {
    it('zeigt "dann", wenn ein Datenpfad einen der gewählten Werte hat', () => {
      const f: Feld = { x: 0, y: 0, size: 10, wenn: { feld: 'p.TB', werte: ['Beamter'], dann: 'X' } };
      expect(wert(f, 'egal', { p: { TB: 'Beamter' } }, kontext)).toBe('X');
      expect(wert(f, 'egal', { p: { TB: 'Tarifkraft' } }, kontext)).toBe('');
    });

    it('werte akzeptiert direkt boolean statt des bereich-Umwegs {von:1,bis:2} (z.B. Wohnung8bis14)', () => {
      const f: Feld = { x: 0, y: 0, size: 10, wenn: { feld: 'aktiv', werte: [true], dann: 'X' } };
      expect(wert(f, 'egal', { aktiv: true }, kontext)).toBe('X');
      expect(wert(f, 'egal', { aktiv: false }, kontext)).toBe('');
    });

    it('bereich prüft von einschließlich bis ausschließlich', () => {
      const f: Feld = { x: 0, y: 0, size: 10, wenn: { feld: 'km', bereich: { von: 5, bis: 20 }, dann: 'X' } };
      expect(wert(f, 'egal', { km: 5 }, kontext)).toBe('X');
      expect(wert(f, 'egal', { km: 20 }, kontext)).toBe('');
      expect(wert(f, 'egal', { km: 4.9 }, kontext)).toBe('');
    });

    it('berechnet prüft eine Aggregation über Zeilen statt eines Datenpfads', () => {
      const f: Feld = { x: 0, y: 0, size: 10, wenn: { berechnet: { op: 'summe', ueber: '$alle', feld: 'betrag' }, bereich: { von: 1, bis: 1000 }, dann: 'Nachzahlung' } };
      expect(wert(f, 'egal', {}, kontext)).toBe('Nachzahlung');
    });
  });

  it('summiert über $seite (Zwischensumme der aktuellen Seite)', () => {
    const f: Feld = {
      x: 0,
      y: 0,
      size: 10,
      format: 'waehrung',
      berechnet: { op: 'summe', ueber: '$seite', feld: 'betrag' },
    };
    expect(wert(f, 'zwischensumme', {}, kontext)).toBe('15,00');
  });

  it('summiert über $laufend (Übertrag + diese Seite) und NICHT über das ganze Dokument', () => {
    // Eigener Kontext: `$alle` enthält zusätzlich Zeilen einer FOLGEseite. Nur so unterscheiden
    // sich laufende Summe und Gesamtsumme -- in der gemeinsamen Fixture wären sie zufällig gleich.
    const spaeter: Zeile[] = [{ betrag: 1000 }];
    const mitFolgeseite: Kontext = {
      ...kontext,
      $laufend: { haupt: [...bisherZeilen, ...seiteZeilen] },
      $alle: { haupt: [...bisherZeilen, ...seiteZeilen, ...spaeter] },
    };
    const f: Feld = { x: 0, y: 0, size: 10, format: 'waehrung', berechnet: { op: 'summe', ueber: '$laufend', feld: 'betrag' } };
    const gesamt: Feld = { ...f, berechnet: { op: 'summe', ueber: '$alle', feld: 'betrag' } };

    // Vorseiten 150,00 plus diese Seite 15,00 = 165,00; die Gesamtsumme liegt bei 1.165,00.
    expect(wert(f, 'zwischenstand', {}, mitFolgeseite)).toBe('165,00');
    expect(wert(gesamt, 'gesamt', {}, mitFolgeseite)).toBe('1.165,00');
  });

  it('summiert über $bisher (Übertrag der vorherigen Seiten)', () => {
    const f: Feld = {
      x: 0,
      y: 0,
      size: 10,
      format: 'waehrung',
      berechnet: { op: 'summe', ueber: '$bisher', feld: 'betrag' },
    };
    expect(wert(f, 'uebertrag', {}, kontext)).toBe('150,00');
  });

  it('$bisher ist leer auf der ersten Seite -- Übertrag ist 0', () => {
    const leererKontext: Kontext = { $seite: { haupt: seiteZeilen }, $bisher: {}, $laufend: { haupt: seiteZeilen }, $alle: { haupt: seiteZeilen }, seite: 1, seiten: 1, heute: HEUTE, listen: {} };
    const f: Feld = {
      x: 0,
      y: 0,
      size: 10,
      format: 'waehrung',
      berechnet: { op: 'summe', ueber: '$bisher', feld: 'betrag' },
    };
    expect(wert(f, 'uebertrag', {}, leererKontext)).toBe('0,00');
  });

  it('summiert über einen Datenpfad (nicht $seite/$bisher)', () => {
    const f: Feld = {
      x: 0,
      y: 0,
      size: 10,
      format: 'waehrung',
      berechnet: { op: 'summe', ueber: 'zeilen', feld: 'betrag' },
    };
    const daten = { zeilen: [{ betrag: 7 }, { betrag: 3 }] };
    expect(wert(f, 'gesamt', daten, kontext)).toBe('10,00');
  });

  it('anzahl und max funktionieren über $seite', () => {
    const anzahl: Feld = { x: 0, y: 0, size: 10, berechnet: { op: 'anzahl', ueber: '$seite' } };
    const max: Feld = { x: 0, y: 0, size: 10, berechnet: { op: 'max', ueber: '$seite', feld: 'betrag' } };
    expect(wert(anzahl, 'n', {}, kontext)).toBe('2');
    expect(wert(max, 'm', {}, kontext)).toBe('10');
  });

  describe('Aggregation über mehrere Tabellen (Berechnet.tabellen)', () => {
    const mehrTabellenKontext: Kontext = {
      ...kontext,
      $alle: { a: [{ betrag: 1 }, { betrag: 2 }], b: [{ betrag: 10 }], c: [{ betrag: 100 }] },
    };
    const summeFeld = (tabellen?: string[]): Feld => ({ x: 0, y: 0, size: 10, berechnet: { op: 'summe', ueber: '$alle', feld: 'betrag', tabellen } });

    it('ohne tabellen laufen die Zeilen aller Tabellen zusammen', () => {
      expect(wert(summeFeld(undefined), 'x', {}, mehrTabellenKontext)).toBe('113');
    });

    it('mit einer Tabelle zählen nur deren Zeilen', () => {
      expect(wert(summeFeld(['a']), 'x', {}, mehrTabellenKontext)).toBe('3');
    });

    it('mit mehreren Tabellen laufen deren Zeilen zusammen, andere bleiben außen vor', () => {
      expect(wert(summeFeld(['a', 'c']), 'x', {}, mehrTabellenKontext)).toBe('103');
    });

    it('leeres tabellen-Array verhält sich wie keine Angabe', () => {
      expect(wert(summeFeld([]), 'x', {}, mehrTabellenKontext)).toBe('113');
    });

    it('unbekannte Tabelle in tabellen liefert dafür 0 Zeilen, andere zählen weiter', () => {
      expect(wert(summeFeld(['a', 'gibtsNicht']), 'x', {}, mehrTabellenKontext)).toBe('3');
    });
  });

  describe('listenKopf (Überschrift dynamischer Spalten)', () => {
    const gruppe = { quelle: 'Zulagen', schluessel: 'Typ', wert: 'Wert', auswahl: ['811', '820'] };
    const mitListen: Kontext = {
      ...kontext,
      listen: { haupt: { gruppen: { ez: gruppe }, belegung: { ez: ['811', '820'] } } },
    };

    it('zeigt den Schlüssel, der auf dem Platz gelandet ist', () => {
      const f: Feld = { x: 0, y: 0, size: 8, listenKopf: { tabelle: 'haupt', gruppe: 'ez', index: 1 } };
      expect(wert(f, 'kopf1', {}, mitListen)).toBe('820');
    });

    it('nimmt den hinterlegten Kurztext statt des Schlüssels', () => {
      const mitText: Kontext = {
        ...kontext,
        listen: {
          haupt: { gruppen: { ez: { ...gruppe, beschriftungen: { '811': 'Erschütterung' } } }, belegung: { ez: ['811'] } },
        },
      };
      const f: Feld = { x: 0, y: 0, size: 8, listenKopf: { tabelle: 'haupt', gruppe: 'ez', index: 0 } };
      expect(wert(f, 'kopf1', {}, mitText)).toBe('Erschütterung');
    });

    it('bleibt leer für unbelegte Plätze und unbekannte Tabellen', () => {
      const leer: Feld = { x: 0, y: 0, size: 8, listenKopf: { tabelle: 'haupt', gruppe: 'ez', index: 5 } };
      const fremd: Feld = { x: 0, y: 0, size: 8, listenKopf: { tabelle: 'gibtsNicht', gruppe: 'ez', index: 0 } };
      expect(wert(leer, 'kopf6', {}, mitListen)).toBe('');
      expect(wert(fremd, 'kopf1', {}, mitListen)).toBe('');
    });
  });
});
