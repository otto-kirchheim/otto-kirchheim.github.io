import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test';

const viCompat = vi as typeof vi & {
  hoisted: <T>(factory: () => T) => T;
};

const { createSnackBarMock, setLoadingMock, loadUserDatenMock, setMonatJahrMock } = viCompat.hoisted(() => ({
  createSnackBarMock: vi.fn(),
  setLoadingMock: vi.fn(),
  loadUserDatenMock: vi.fn(),
  setMonatJahrMock: vi.fn(),
}));

vi.mock('../../src/ts/class/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

vi.mock('../../src/ts/infrastructure/ui/setLoading', () => ({
  default: setLoadingMock,
}));

vi.mock('../../src/ts/features/Login/utils', () => ({
  loadUserDaten: loadUserDatenMock,
}));

vi.mock('../../src/ts/features/Einstellungen/utils/setMonatJahr', () => ({
  default: setMonatJahrMock,
}));

import Storage from '../../src/ts/infrastructure/storage/Storage';
import selectYear from '../../src/ts/features/Einstellungen/utils/selectYear';

describe('SelectYear', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });

    container = document.createElement('div');
    container.innerHTML = `
      <input id="Monat" value="3" />
      <input id="Jahr" value="2026" />
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    localStorage.clear();
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  it('zeigt Fehler bei fehlender Internetverbindung', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    selectYear();
    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
    expect(setLoadingMock).not.toHaveBeenCalled();
  });

  it('liest Monat/Jahr aus DOM-Inputs und speichert sie', () => {
    selectYear();
    expect(Storage.get<number>('Jahr')).toBe(2026);
    expect(Storage.get<number>('Monat')).toBe(3);
    expect(setMonatJahrMock).toHaveBeenCalledWith(2026, 3);
    expect(setLoadingMock).toHaveBeenCalledWith('btnAuswaehlen');
  });

  it('verwendet übergebene Monat/Jahr statt DOM', () => {
    selectYear(5, 2025);
    expect(Storage.get<number>('Jahr')).toBe(2025);
    expect(Storage.get<number>('Monat')).toBe(5);
    expect(setMonatJahrMock).toHaveBeenCalledWith(2025, 5);
  });

  it('setzt Jahreswechsel-Flag bei Jahresänderung', () => {
    Storage.set('Jahr', 2025);
    Storage.set('Monat', 12);
    selectYear(1, 2026);
    expect(Storage.get<boolean>('Jahreswechsel')).toBe(true);
  });

  it('setzt kein Jahreswechsel-Flag wenn Jahr gleich bleibt', () => {
    Storage.set('Jahr', 2026);
    Storage.set('Monat', 2);
    selectYear(3, 2026);
    expect(Storage.get('Jahreswechsel')).toBeNull();
  });

  it('ruft loadUserDaten auf wenn Benutzer eingeloggt ist', () => {
    Storage.set('Benutzer', 'Max');
    Storage.set('BenutzerRolle', 'member');
    Storage.set('AccessToken', 'access-token');
    selectYear(3, 2026);
    expect(loadUserDatenMock).toHaveBeenCalledWith(3, 2026);
  });

  it('ruft loadUserDaten nicht auf wenn kein Benutzer', () => {
    selectYear(3, 2026);
    expect(loadUserDatenMock).not.toHaveBeenCalled();
  });

  it('wirft Fehler wenn Monats-Input fehlt (ohne Parameter)', () => {
    container.remove();
    expect(() => selectYear()).toThrow('Monats Input nicht gefunden');
  });
});
