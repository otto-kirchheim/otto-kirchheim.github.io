import { afterEach, beforeAll, describe, expect, it } from 'bun:test';
import pruefeAppVersion from '@/app/shell/pruefeAppVersion';

// Vite setzt APP_VERSION per `define`; in Bun ist `import.meta.env` die Prozess-Env.
const AKTUELL = '3.0.0';
beforeAll(() => {
  process.env.APP_VERSION = AKTUELL;
});

/** Legt `anzahl` App-Keys plus optional `Version` an. */
function fuelle(version: string | null, anzahl = 4): void {
  localStorage.setItem('Benutzer', JSON.stringify('jan'));
  for (let i = 1; i < anzahl; i++) localStorage.setItem(`Daten${i}`, JSON.stringify({ alt: true }));
  if (version !== null) localStorage.setItem('Version', JSON.stringify(version));
}

describe('pruefeAppVersion', () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('leert localStorage und sessionStorage bei aelterer gespeicherter Version und liefert den Benutzernamen', () => {
    fuelle('0.0.1');
    sessionStorage.setItem('x', '1');
    expect(pruefeAppVersion()).toBe('jan');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('wertet App-Daten ohne Version-Eintrag als alt', () => {
    fuelle(null);
    expect(pruefeAppVersion()).toBe('jan');
    expect(localStorage.length).toBe(0);
  });

  it('laesst Daten der aktuellen Version stehen', () => {
    fuelle(AKTUELL);
    expect(pruefeAppVersion()).toBeNull();
    expect(localStorage.getItem('Benutzer')).not.toBeNull();
  });

  it('ignoriert einen fast leeren Speicher (vor dem ersten Login)', () => {
    localStorage.setItem('Version', JSON.stringify('0.0.1'));
    expect(pruefeAppVersion()).toBeNull();
    expect(localStorage.length).toBe(1);
  });
});
