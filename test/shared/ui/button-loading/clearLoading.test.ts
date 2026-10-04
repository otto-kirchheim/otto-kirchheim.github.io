import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import clearLoading from '@/shared/ui/button-loading/clearLoading';
import setLoading from '@/shared/ui/button-loading/setLoading';

describe('setLoading / clearLoading (nicht-React-Buttons)', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.innerHTML = `
      <div id="ladeAnzeige" hidden></div>
      <button id="btnTest">Speichern <span class="autosave-badge">●</span></button>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('sperrt den Button, laesst seinen Inhalt unveraendert und zeigt die Ladeanzeige', () => {
    const btn = document.querySelector<HTMLButtonElement>('#btnTest')!;
    const markup = btn.innerHTML;

    setLoading('btnTest');

    expect(btn.disabled).toBe(true);
    expect(btn.innerHTML).toBe(markup);
    expect(document.querySelector<HTMLElement>('#ladeAnzeige')!.hidden).toBe(false);
  });

  it('clearLoading gibt den Button frei und versteckt die Ladeanzeige', () => {
    const btn = document.querySelector<HTMLButtonElement>('#btnTest')!;

    setLoading('btnTest');
    clearLoading('btnTest');

    expect(btn.disabled).toBe(false);
    expect(document.querySelector<HTMLElement>('#ladeAnzeige')!.hidden).toBe(true);
  });

  it('versteckt die Ladeanzeige nicht, wenn resetLoader=false', () => {
    setLoading('btnTest');
    clearLoading('btnTest', false);
    expect(document.querySelector<HTMLElement>('#ladeAnzeige')!.hidden).toBe(false);
  });

  it('tut nichts, wenn Button oder Ladeanzeige fehlen', () => {
    document.querySelector('#ladeAnzeige')!.remove();
    expect(() => setLoading('nichtExistent')).not.toThrow();
    expect(() => clearLoading('nichtExistent')).not.toThrow();
    expect(() => clearLoading('btnTest')).not.toThrow();
  });
});
