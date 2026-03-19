import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createSnackBarMock, setLoadingMock, LadeUserDatenMock, setMonatJahrMock } = vi.hoisted(() => ({
  createSnackBarMock: vi.fn(),
  setLoadingMock: vi.fn(),
  LadeUserDatenMock: vi.fn(),
  setMonatJahrMock: vi.fn(),
}));

vi.mock('../../src/ts/class/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

vi.mock('../../src/ts/utilities', async importOriginal => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    setLoading: setLoadingMock,
  };
});

vi.mock('../../src/ts/Login/utils', () => ({
  LadeUserDaten: LadeUserDatenMock,
}));

vi.mock('../../src/ts/Einstellungen/utils/setMonatJahr', () => ({
  default: setMonatJahrMock,
}));

import Storage from '../../src/ts/utilities/Storage';
import SelectYear from '../../src/ts/Einstellungen/utils/SelectYear';

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
    SelectYear();
    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
    expect(setLoadingMock).not.toHaveBeenCalled();
  });

  it('liest Monat/Jahr aus DOM-Inputs und speichert sie', () => {
    SelectYear();
    expect(Storage.get<number>('Jahr')).toBe(2026);
    expect(Storage.get<number>('Monat')).toBe(3);
    expect(setMonatJahrMock).toHaveBeenCalledWith(2026, 3);
    expect(setLoadingMock).toHaveBeenCalledWith('btnAuswaehlen');
  });

  it('verwendet übergebene Monat/Jahr statt DOM', () => {
    SelectYear(5, 2025);
    expect(Storage.get<number>('Jahr')).toBe(2025);
    expect(Storage.get<number>('Monat')).toBe(5);
    expect(setMonatJahrMock).toHaveBeenCalledWith(2025, 5);
  });

  it('setzt Jahreswechsel-Flag bei Jahresänderung', () => {
    Storage.set('Jahr', 2025);
    Storage.set('Monat', 12);
    SelectYear(1, 2026);
    expect(Storage.get<boolean>('Jahreswechsel')).toBe(true);
  });

  it('setzt kein Jahreswechsel-Flag wenn Jahr gleich bleibt', () => {
    Storage.set('Jahr', 2026);
    Storage.set('Monat', 2);
    SelectYear(3, 2026);
    expect(Storage.get('Jahreswechsel')).toBeNull();
  });

  it('ruft LadeUserDaten auf wenn Benutzer eingeloggt ist', () => {
    Storage.set('Benutzer', 'Max');
    SelectYear(3, 2026);
    expect(LadeUserDatenMock).toHaveBeenCalledWith(3, 2026);
  });

  it('ruft LadeUserDaten nicht auf wenn kein Benutzer', () => {
    SelectYear(3, 2026);
    expect(LadeUserDatenMock).not.toHaveBeenCalled();
  });

  it('wirft Fehler wenn Monats-Input fehlt (ohne Parameter)', () => {
    container.remove();
    expect(() => SelectYear()).toThrow('Monats Input nicht gefunden');
  });
});
