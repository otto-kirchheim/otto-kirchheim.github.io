import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import clearLoading from '../../src/ts/utilities/clearLoading';

describe('clearLoading', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.innerHTML = `
      <div id="ladeAnzeige"></div>
      <button id="btnTest" disabled>
        <span class="spinner-border spinner-border-sm"></span> Laden…
      </button>
      <button id="btnLogin" disabled>Laden…</button>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('versteckt Ladeanzeige und aktiviert Button', () => {
    const btn = document.querySelector<HTMLButtonElement>('#btnTest')!;
    btn.dataset.normaltext = 'Speichern';

    clearLoading('btnTest');

    expect(document.querySelector('#ladeAnzeige')!.classList.contains('d-none')).toBe(true);
    expect(btn.innerHTML).toBe('Speichern');
    expect(btn.disabled).toBe(false);
  });

  it('versteckt Ladeanzeige nicht wenn resetLoader=false', () => {
    clearLoading('btnTest', false);
    expect(document.querySelector('#ladeAnzeige')!.classList.contains('d-none')).toBe(false);
  });

  it('verwendet Fallback "Anmelden" für btnLogin ohne normaltext', () => {
    clearLoading('btnLogin');
    const btn = document.querySelector<HTMLButtonElement>('#btnLogin')!;
    expect(btn.innerHTML).toBe('Anmelden');
  });

  it('verwendet textContent als Fallback wenn kein normaltext gesetzt', () => {
    const btn = document.querySelector<HTMLButtonElement>('#btnTest')!;
    btn.textContent = 'Absenden';
    clearLoading('btnTest');
    expect(btn.innerHTML).toBe('Absenden');
  });

  it('tut nichts wenn Button nicht existiert', () => {
    expect(() => clearLoading('nichtExistent')).not.toThrow();
  });

  it('tut nichts für Ladeanzeige wenn Element fehlt', () => {
    document.querySelector('#ladeAnzeige')!.remove();
    expect(() => clearLoading('btnTest')).not.toThrow();
  });
});
