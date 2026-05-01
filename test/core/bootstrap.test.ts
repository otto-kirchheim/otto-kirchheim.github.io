import { describe, expect, it, vi } from 'bun:test';
import { initializeAppBootstrap, registerAppStartTask } from '@/core/bootstrap';

// Jede Datei bekommt in Bun eine eigene Modulinstanz – kein vi.resetModules() nötig.
// Alle Tests sequenziell: bootstrapInitialized / bootstrapStarted werden nach dem
// ersten initializeAppBootstrap-Aufruf auf true gesetzt und bleiben so.

describe('bootstrap', () => {
  it('registerAppStartTask registriert Tasks, die bei initializeAppBootstrap ausgeführt werden', async () => {
    const task = vi.fn();
    registerAppStartTask(task);
    initializeAppBootstrap();

    // happy-dom setzt readyState='complete' → Tasks werden sofort ausgeführt
    await new Promise(r => setTimeout(r, 50));

    expect(task).toHaveBeenCalledTimes(1);
  });

  it('initializeAppBootstrap ist idempotent – zweiter Aufruf ist ein No-op', () => {
    // bootstrapInitialized ist jetzt true → früher Rücksprung, kein Fehler
    expect(() => initializeAppBootstrap()).not.toThrow();
  });
});
