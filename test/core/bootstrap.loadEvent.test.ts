import { describe, expect, it, vi } from 'bun:test';
import { initializeAppBootstrap, registerAppStartTask } from '@/core/bootstrap';

// Eigene Datei für eine frische Modulinstanz (siehe test/core/bootstrap.notReady.test.ts):
// prüft, dass der registrierte 'load'-Listener beim Feuern tatsächlich die Start-Tasks ausführt.
describe('bootstrap – load-Event führt Start-Tasks aus', () => {
  it('führt die Start-Tasks aus sobald das load-Event feuert', async () => {
    Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true });
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const task = vi.fn();
    registerAppStartTask(task);

    initializeAppBootstrap();
    const loadCallback = addEventListenerSpy.mock.calls.find(call => call[0] === 'load')?.[1] as () => void;
    expect(loadCallback).toBeInstanceOf(Function);

    loadCallback();
    await new Promise(r => setTimeout(r, 10));

    expect(task).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
  });
});
