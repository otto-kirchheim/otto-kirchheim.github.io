import { describe, expect, it, vi } from 'bun:test';
import { initializeAppBootstrap } from '@/shared/lib/lifecycle/bootstrap';

// Eigene Datei, damit dieser Test eine frische Modulinstanz von @/app/init/bootstrap bekommt
// (siehe test/app/init/bootstrap.test.ts: bootstrapInitialized ist dort bereits nach dem ersten
// initializeAppBootstrap()-Aufruf auf true gesetzt). So lässt sich der
// document.readyState !== 'complete'-Zweig isoliert prüfen, ohne die Testreihenfolge oder
// die Modul-Singleton-Annahmen der anderen Datei anzutasten.
describe('bootstrap – Dokument noch nicht vollständig geladen', () => {
  it('registriert einen load-Listener statt die Start-Tasks sofort auszuführen', () => {
    Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true });
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    initializeAppBootstrap();

    expect(addEventListenerSpy).toHaveBeenCalledWith('load', expect.any(Function));

    Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
  });
});
