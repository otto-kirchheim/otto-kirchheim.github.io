import { describe, expect, it } from 'bun:test';
import {
  familieFuerSchnitt,
  fehlendeVorlagenSchnitte,
  schriftKurz,
  verdichteSchriftart,
} from '@/features/Admin/components/FormularEditor/SchriftartWahl';
import type { VorlageFontFamilie } from '@/features/Admin/components/FormularEditor/vorlageFonts';

describe('familieFuerSchnitt', () => {
  it('gibt helvetica ohne Angabe', () => {
    expect(familieFuerSchnitt(undefined, 'kursiv')).toBe('helvetica');
  });

  it('gibt für einen String jede Familie für jeden Schnitt', () => {
    expect(familieFuerSchnitt('times', 'fettKursiv')).toBe('times');
  });

  it('nimmt beim Objekt die Schnitt-Angabe, sonst normal, sonst helvetica', () => {
    expect(familieFuerSchnitt({ normal: 'vorlage:DBOffice', kursiv: 'helvetica' }, 'fett')).toBe('vorlage:DBOffice');
    expect(familieFuerSchnitt({ normal: 'vorlage:DBOffice', kursiv: 'helvetica' }, 'kursiv')).toBe('helvetica');
    expect(familieFuerSchnitt({ fett: 'times' }, 'normal')).toBe('helvetica');
  });
});

describe('verdichteSchriftart', () => {
  it('gibt undefined für Helvetica ohne Abweichung', () => {
    expect(verdichteSchriftart('helvetica', {})).toBeUndefined();
  });

  it('gibt die Familie als String, wenn keine echte Abweichung bleibt', () => {
    expect(verdichteSchriftart('times', {})).toBe('times');
    expect(verdichteSchriftart('times', { fett: 'times', kursiv: 'times' })).toBe('times');
  });

  it('gibt ein Objekt nur mit den echten Abweichungen', () => {
    expect(verdichteSchriftart('vorlage:DBOffice', { kursiv: 'helvetica', fettKursiv: 'helvetica' })).toEqual({
      normal: 'vorlage:DBOffice',
      kursiv: 'helvetica',
      fettKursiv: 'helvetica',
    });
  });

  it('verwirft eine Abweichung, die der Grundschrift entspricht', () => {
    expect(verdichteSchriftart('vorlage:DBOffice', { fett: 'vorlage:DBOffice', kursiv: 'helvetica' })).toEqual({
      normal: 'vorlage:DBOffice',
      kursiv: 'helvetica',
    });
  });
});

describe('schriftKurz', () => {
  it('nennt die Standard-Familie ohne Angabe', () => {
    expect(schriftKurz(undefined)).toBe('Helvetica (Standard)');
    expect(schriftKurz('times')).toBe('Times');
  });

  it('hängt die Zahl echter Schnitt-Abweichungen an', () => {
    expect(schriftKurz({ normal: 'vorlage:DBOffice', kursiv: 'helvetica' })).toBe('DBOffice (Vorlage) +1');
    expect(schriftKurz({ normal: 'vorlage:DBOffice', kursiv: 'helvetica', fettKursiv: 'helvetica' })).toBe(
      'DBOffice (Vorlage) +2',
    );
  });

  it('zählt eine Abweichung nicht, die der Grundschrift entspricht', () => {
    expect(schriftKurz({ normal: 'times', fett: 'times' })).toBe('Times');
  });
});

describe('fehlendeVorlagenSchnitte', () => {
  const dbOffice: VorlageFontFamilie = {
    id: 'vorlage:DBOffice',
    label: 'DBOffice (Vorlage)',
    psNamen: ['DBOffice-Regular', 'DBOffice-Bold'],
    schnitte: { normal: new Uint8Array([1]), fett: new Uint8Array([2]) },
  };

  it('meldet die Schnitte, die die aktive Vorlagen-Schrift nicht mitbringt', () => {
    expect(fehlendeVorlagenSchnitte('vorlage:DBOffice', [dbOffice])).toEqual(['kursiv', 'fettKursiv']);
  });

  it('meldet nichts für eine Standard-Schrift', () => {
    expect(fehlendeVorlagenSchnitte('times', [dbOffice])).toEqual([]);
    expect(fehlendeVorlagenSchnitte(undefined, [dbOffice])).toEqual([]);
  });

  it('berücksichtigt eine gezielte Abweichung auf eine Standard-Schrift', () => {
    expect(fehlendeVorlagenSchnitte({ normal: 'vorlage:DBOffice', kursiv: 'helvetica' }, [dbOffice])).toEqual([
      'fettKursiv',
    ]);
  });
});
