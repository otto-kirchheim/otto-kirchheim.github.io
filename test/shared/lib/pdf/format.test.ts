import { describe, expect, it } from 'bun:test';
import { formatiereWert, standardText } from '@/shared/lib/pdf/format';

describe('formatiereWert (Migrationstabelle alt → Muster)', () => {
  it('waehrung formatiert mit zwei Nachkommastellen und deutschem Komma', () => {
    expect(formatiereWert(1234.5, '#.##0,00 €')).toBe('1.234,50 €');
  });

  it('zahl und ganzzahl runden bzw. kürzen deutsch formatiert', () => {
    expect(formatiereWert(1234.567, '#.##0,##')).toBe('1.234,57');
    expect(formatiereWert(1234.6, '#.##0')).toBe('1.235');
  });

  it('datum formatiert zweistellig (Formularzellen erwarten 15.03., nicht 15.3.)', () => {
    expect(formatiereWert('2026-03-15', 'DD.MM.YYYY')).toBe('15.03.2026');
    expect(formatiereWert('2026-03-15', 'DD.MM.')).toBe('15.03.');
    expect(formatiereWert('2026-03-15', 'D')).toBe('15');
    expect(formatiereWert('2026-03-15', 'dd')).toBe('So');
    expect(formatiereWert('2026-03-15', 'MM/YYYY')).toBe('03/2026');
  });

  it('tagZweistellig füllt die führende Null auf (zweistelliges Kästchen im Formular)', () => {
    expect(formatiereWert('2026-03-05', 'DD')).toBe('05');
    expect(formatiereWert('2026-03-15', 'DD')).toBe('15');
    // Leerwert bleibt leer -- ein aufgefülltes "00" stünde sonst in jeder ungenutzten Zeile.
    expect(formatiereWert('', 'DD')).toBe('');
    expect(formatiereWert(null, 'DD')).toBe('');
  });

  it('datum liefert leeren String statt "Invalid Date" bei unlesbarem Wert', () => {
    expect(formatiereWert('kein datum', 'DD.MM.YYYY')).toBe('');
    expect(formatiereWert(null, 'DD.MM.YYYY')).toBe('');
  });

  it('akzeptiert deutsches "DD.MM.YYYY" -- so speichern IDatenN/IDatenEA/IDatenBE ihr Tag-Feld, nicht ISO (User-Fund: EA-Kalendertag/Wochentag blieben im PDF leer)', () => {
    expect(formatiereWert('14.08.2026', 'DD.MM.YYYY')).toBe('14.08.2026');
    expect(formatiereWert('05.08.2026', 'DD.MM.')).toBe('05.08.');
    expect(formatiereWert('14.08.2026', 'D')).toBe('14');
    expect(formatiereWert('5.08.2026', 'DD')).toBe('05');
    expect(formatiereWert('14.08.2026', 'dd')).toBe('Fr');
    expect(formatiereWert('14.08.2026', 'MM/YYYY')).toBe('08/2026');
  });

  it('MMMM/MMM lesen die eigenständige Monat-Zahl (1-12), kein Datum -- MMM nach dayjs-Locale (Jan., März, Sept.)', () => {
    expect(formatiereWert(3, 'MMMM')).toBe('März');
    expect(formatiereWert('3', 'MMMM')).toBe('März');
    expect(formatiereWert(1, 'MMMM')).toBe('Januar');
    expect(formatiereWert(12, 'MMMM')).toBe('Dezember');
    expect(formatiereWert(3, 'MMM')).toBe('März');
    expect(formatiereWert(1, 'MMM')).toBe('Jan.');
    expect(formatiereWert(9, 'MMM')).toBe('Sept.');
  });

  it('monatName: NICHT über alsDatum -- new Date(3) wäre sonst fälschlich Januar statt März', () => {
    // Reproduziert genau den Fehler, den eine alsDatum-basierte Implementierung hätte: new Date(3)
    // ist ein gültiger Zeitstempel nahe der Unix-Epoche (Januar 1970), nicht der Monat März.
    expect(formatiereWert(3, 'MMMM')).not.toBe('Januar');
  });

  it('monatName/monatNameKurz: unlesbare oder außerhalb 1-12 liegende Werte bleiben leer', () => {
    expect(formatiereWert(0, 'MMMM')).toBe('');
    expect(formatiereWert(13, 'MMMM')).toBe('');
    expect(formatiereWert('kaputt', 'MMMM')).toBe('');
    expect(formatiereWert(null, 'MMMM')).toBe('');
    expect(formatiereWert(0, 'MMM')).toBe('');
  });

  it('uhrzeit akzeptiert reine HH:mm-Strings und ISO-Zeitstempel', () => {
    expect(formatiereWert('7:05', 'HH:mm')).toBe('07:05');
    expect(formatiereWert('2026-03-15T14:30:00', 'HH:mm')).toBe('14:30');
  });

  it('stunden rechnet Minuten und HH:mm zu einer Zeitspanne', () => {
    expect(formatiereWert(150, 'H:mm')).toBe('2:30');
    expect(formatiereWert('26:15', 'H:mm')).toBe('26:15');
  });

  it('liste fügt Arrays generisch zusammen und filtert Leerwerte', () => {
    expect(formatiereWert(['NZ', '', 'SoZ'], '@liste')).toBe('NZ / SoZ');
    expect(formatiereWert('einzeln', '@liste')).toBe('einzeln');
  });

  it('grossbuchstaben normalisiert Text', () => {
    expect(formatiereWert('müller', '@grossbuchstaben')).toBe('MÜLLER');
  });

  it('jaNein übersetzt Boolean (echt oder als String) statt englischem true/false', () => {
    expect(formatiereWert(true, '@jaNein')).toBe('Ja');
    expect(formatiereWert(false, '@jaNein')).toBe('Nein');
    expect(formatiereWert('true', '@jaNein')).toBe('Ja');
    expect(formatiereWert('false', '@jaNein')).toBe('Nein');
    expect(formatiereWert(undefined, '@jaNein')).toBe('Nein');
  });

  it('oe fügt Ebenen in kanonischer OE-Schreibweise zusammen (User-Fund: liste zerstört das Format)', () => {
    // Exakter Reproduktionsfall: `liste` lieferte "V / IW / MI / N / KSL / IL / 03", erwartet war
    // die kanonische Schreibweise wie in `backend/src/utils/oe-scope.ts::joinOeSegments`.
    expect(formatiereWert(['V', 'IW', 'MI', 'N', 'KSL', 'IL', '03'], '@oe')).toBe('V.IW-MI-N-KSL-IL 03');
  });

  it('oe: erste zwei Ebenen mit Punkt, weitere mit Bindestrich, ohne numerische letzte Ebene', () => {
    expect(formatiereWert(['I', 'IW', 'MI', 'N', 'MUS', 'IL'], '@oe')).toBe('I.IW-MI-N-MUS-IL');
  });

  it('oe: Randfälle -- leer, ein Element, zwei Elemente, Leerwerte gefiltert', () => {
    expect(formatiereWert([], '@oe')).toBe('');
    expect(formatiereWert(['V'], '@oe')).toBe('V');
    expect(formatiereWert(['V', 'IW'], '@oe')).toBe('V.IW');
    expect(formatiereWert(['V', 'IW', '', 'MI'], '@oe')).toBe('V.IW-MI');
  });

  it('oe: eine rein numerische letzte Ebene zählt nur ab zwei Restebenen als Teamnummer', () => {
    // Nur EINE Restebene und die ist numerisch: kein Sonderfall, ganz normal mit "." verbunden.
    expect(formatiereWert(['V', '03'], '@oe')).toBe('V.03');
  });

  it('oe: Nicht-Array fällt auf String zurück wie die anderen Formate', () => {
    expect(formatiereWert('V.IW-MI', '@oe')).toBe('V.IW-MI');
    expect(formatiereWert(undefined, '@oe')).toBe('');
  });
});

describe('standardText', () => {
  it('leerer String für null/undefined', () => {
    expect(standardText(null)).toBe('');
    expect(standardText(undefined)).toBe('');
  });

  it('Arrays über FORMAT.liste statt kommagetrennt ohne Leerzeichen (OE-Bug)', () => {
    expect(standardText(['I', 'IW', 'MI', 'N', 'MUS', 'IL', ''])).toBe('I / IW / MI / N / MUS / IL');
  });

  it('Booleans als Ja/Nein statt englischem true/false', () => {
    expect(standardText(true)).toBe('Ja');
    expect(standardText(false)).toBe('Nein');
  });

  it('verschachtelte Objekte (falsch gewählter Datenpfad) werden leer statt "[object Object]"', () => {
    expect(standardText({ Vorname: 'Max' })).toBe('');
  });

  it('Zahl und Text unverändert', () => {
    expect(standardText(42)).toBe('42');
    expect(standardText('Max')).toBe('Max');
  });
});

describe('formatiereWert – Zahlenmuster', () => {
  it.each([
    [1234.567, '#.##0,0', '1.234,6'],
    [1234.5678, '0,000', '1234,568'],
    [1234.5, '#.##0 €', '1.235 €'],
    [0.125, '0,0 %', '12,5 %'],
    [5, '00', '05'],
    [2026, '0', '2026'],
    [12.5, '#.##0,0 Std.', '12,5 Std.'],
    [3, '0 Tage', '3 Tage'],
    [7, '0 [m]', '7 m'],
    [7, '[Nr.] 0', 'Nr. 7'],
    [-1234.5, '#.##0,00 €', '-1.234,50 €'],
    ['12.5', '#.##0,00', '12,50'],
    [123456789, '000 000 000', '123 456 789'],
    [5, '000 000 000', '000 000 005'],
    [1234567.5, '# ##0,00 €', '1 234 567,50 €'],
    [123456, '00 00 00', '12 34 56'],
    [1234567, '#.##0', '1.234.567'],
    [-0.001, '0,00', '0,00'],
    [-1234567, '#.##0', '-1.234.567'],
  ])('%p mit %s → %s', (wert, muster, erwartet) => {
    expect(formatiereWert(wert, muster)).toBe(erwartet);
  });

  it('Text, der keine Zahl ist, bleibt unverändert (Feld mit Text oder Nummer)', () => {
    expect(formatiereWert('Unterstützung XYZ', '### ### ###')).toBe('Unterstützung XYZ');
    expect(formatiereWert('123456789', '### ### ###')).toBe('123 456 789');
    expect(formatiereWert('02:30', '#.##0')).toBe('02:30');
    expect(formatiereWert(true, '0')).toBe('Ja');
  });

  it('NaN wird leer statt "NaN €"', () => {
    expect(formatiereWert(Number.NaN, '#.##0,00 €')).toBe('');
  });
});

describe('formatiereWert – Datumsmuster', () => {
  it('Dauer in Minuten: Stunden über 23, Rundung auf Minuten, Sekunden, Vorzeichen', () => {
    expect(formatiereWert(1590, 'H:mm')).toBe('26:30');
    expect(formatiereWert(1590, 'HH:mm')).toBe('26:30');
    expect(formatiereWert(90.6, 'H:mm')).toBe('1:31');
    expect(formatiereWert(90.5, 'H:mm:ss')).toBe('1:30:30');
    expect(formatiereWert(-30, 'H:mm')).toBe('-0:30');
    expect(formatiereWert(95, 'mm [min]')).toBe('95 min');
  });

  it('ms-Zeitstempel (letztesDatum) und Date-Objekte', () => {
    const ms = new Date(2026, 2, 15, 7, 5).getTime();
    expect(formatiereWert(ms, 'DD.MM.YYYY')).toBe('15.03.2026');
    expect(formatiereWert(ms, 'MMMM')).toBe('März');
    expect(formatiereWert(new Date(2026, 2, 15), 'dddd, DD.MM.YY')).toBe('Sonntag, 15.03.26');
  });

  it('Literale in eckigen Klammern', () => {
    expect(formatiereWert('2026-03-15T07:05:00', '[KW 01] DD.MM.')).toBe('KW 01 15.03.');
    expect(formatiereWert('2026-03-15T07:05:00', 'HH:[00]')).toBe('07:00');
  });

  it('unlesbare Tage bleiben leer (früher bei tag durchgereicht)', () => {
    expect(formatiereWert('kein datum', 'D')).toBe('');
  });
});

describe('formatiereWert – ohne/ungültiges Format', () => {
  it('fällt auf standardText zurück', () => {
    expect(formatiereWert(['a', 'b'], undefined)).toBe('a / b');
    expect(formatiereWert(true, 'datum')).toBe('Ja');
    expect(formatiereWert('x', 'HH:00')).toBe('x');
  });
});
