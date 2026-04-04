import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test';

// --- Hoisted mocks ---
const { mockCreateSnackBar, mockSetDisableButton, mockChangeMonatJahr } = vi.hoisted(() => ({
  mockCreateSnackBar: vi.fn(() => ({ Close: vi.fn() })),
  mockSetDisableButton: vi.fn(),
  mockChangeMonatJahr: vi.fn(),
}));

vi.mock('../../src/ts/class/CustomSnackbar', () => ({ createSnackBar: mockCreateSnackBar }));
vi.mock('../../src/ts/utilities', () => ({ setDisableButton: mockSetDisableButton }));
vi.mock('../../src/ts/Einstellungen/utils', () => ({ changeMonatJahr: mockChangeMonatJahr }));

import setOffline from '../../src/ts/utilities/setOffline';

describe('setOffline', () => {
  // Cleanup-Tracking: um registrierte Event-Listener nach jedem Test zu entfernen
  let addEventSpy: ReturnType<typeof vi.spyOn>;
  const registeredListeners: { type: string; listener: EventListenerOrEventListenerObject }[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    registeredListeners.length = 0;

    addEventSpy = vi
      .spyOn(window, 'addEventListener')
      .mockImplementation(
        (type: string, listener: EventListenerOrEventListenerObject, _options?: AddEventListenerOptions | boolean) => {
          registeredListeners.push({ type, listener });
        },
      );
  });

  afterEach(() => {
    addEventSpy.mockRestore();
  });

  it('deaktiviert Buttons', () => {
    setOffline();
    expect(mockSetDisableButton).toHaveBeenCalledWith(true);
  });

  it('zeigt Offline-Snackbar', () => {
    setOffline();
    expect(mockCreateSnackBar).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Du bist offline',
        status: 'error',
        dismissible: false,
        timeout: false,
      }),
    );
  });

  it('registriert online-Event Listener', () => {
    setOffline();
    expect(addEventSpy).toHaveBeenCalledWith('online', expect.any(Function), { once: true });
  });

  it('bei online-Event: aktiviert Buttons, schließt Snackbar, zeigt online-Nachricht', () => {
    const closeFn = vi.fn();
    mockCreateSnackBar.mockReturnValueOnce({ Close: closeFn });

    setOffline();

    // Registrierten online-Handler manuell aufrufen
    const onlineHandler = registeredListeners.find(l => l.type === 'online')?.listener;
    expect(onlineHandler).toBeDefined();
    (onlineHandler as EventListener)(new Event('online'));

    expect(mockSetDisableButton).toHaveBeenCalledWith(false);
    expect(mockChangeMonatJahr).toHaveBeenCalled();
    expect(closeFn).toHaveBeenCalled();
    // Zweiter Snackbar-Call für "Du bist wieder online"
    expect(mockCreateSnackBar).toHaveBeenCalledTimes(2);
    expect(mockCreateSnackBar).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Du bist wieder online',
        timeout: 2000,
      }),
    );
  });
});
