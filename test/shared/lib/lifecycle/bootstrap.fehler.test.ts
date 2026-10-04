import { describe, expect, it, spyOn, vi } from 'bun:test';
import { initializeAppBootstrap, registerAppStartTask } from '@/shared/lib/lifecycle/bootstrap';

describe('bootstrap bei fehlschlagender Start-Aufgabe', () => {
  it('fuehrt die folgenden Aufgaben trotzdem aus und protokolliert den Fehler', async () => {
    Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
    const fehlerLog = spyOn(console, 'error').mockImplementation(() => undefined);
    const danach = vi.fn();
    registerAppStartTask(() => {
      throw new Error('Alt-Daten im Speicher');
    });
    registerAppStartTask(danach);

    initializeAppBootstrap();
    await new Promise(r => setTimeout(r, 50));

    expect(danach).toHaveBeenCalledTimes(1);
    expect(fehlerLog).toHaveBeenCalled();
    fehlerLog.mockRestore();
  });
});
