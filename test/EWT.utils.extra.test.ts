import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IDatenEWT } from '../src/ts/interfaces';
import clearEwtZeiten from '../src/ts/EWT/utils/clearEwtZeiten';
import setNaechsterEwtTag from '../src/ts/EWT/utils/setNaechsterEwtTag';
import Storage from '../src/ts/utilities/Storage';

const { createSnackBarMock } = vi.hoisted(() => ({
  createSnackBarMock: vi.fn(),
}));

vi.mock('../src/ts/class/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

function createRow(day: number): IDatenEWT {
  const dayString = String(day).padStart(2, '0');
  return {
    tagE: `2026-03-${dayString}`,
    eOrtE: 'Ort',
    schichtE: 'T',
    abWE: '',
    ab1E: '',
    anEE: '',
    beginE: '',
    endeE: '',
    abEE: '',
    an1E: '',
    anWE: '',
    berechnen: true,
  };
}

describe('EWT utils extra', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    createSnackBarMock.mockReset();
    Storage.set('Jahr', 2026);
    Storage.set('Monat', 3);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('clearZeiten leert alle Zeitfelder im Modal', () => {
    document.body.innerHTML = `
      <div id="modal-root">
        <input id="abWE" value="1" />
        <input id="ab1E" value="2" />
        <input id="anEE" value="3" />
        <input id="beginE" value="4" />
        <input id="endeE" value="5" />
        <input id="abEE" value="6" />
        <input id="an1E" value="7" />
        <input id="anWE" value="8" />
      </div>
    `;

    const modal = document.querySelector<HTMLDivElement>('#modal-root');
    if (!modal) throw new Error('modal not found');

    clearEwtZeiten(modal as never);

    expect(modal.querySelector<HTMLInputElement>('#abWE')?.value).toBe('');
    expect(modal.querySelector<HTMLInputElement>('#ab1E')?.value).toBe('');
    expect(modal.querySelector<HTMLInputElement>('#anEE')?.value).toBe('');
    expect(modal.querySelector<HTMLInputElement>('#beginE')?.value).toBe('');
    expect(modal.querySelector<HTMLInputElement>('#endeE')?.value).toBe('');
    expect(modal.querySelector<HTMLInputElement>('#abEE')?.value).toBe('');
    expect(modal.querySelector<HTMLInputElement>('#an1E')?.value).toBe('');
    expect(modal.querySelector<HTMLInputElement>('#anWE')?.value).toBe('');
  });

  it('naechsterTag setzt den naechsten freien Tag', () => {
    document.body.innerHTML = `<input id="tagE" max="2026-03-31" value="2026-03-01" />`;

    setNaechsterEwtTag(1, [createRow(2), createRow(3)]);

    expect(document.querySelector<HTMLInputElement>('#tagE')?.value).toBe('2026-03-04');
  });

  it('naechsterTag nutzt bei leerem tag den maximal vorhandenen Tag', () => {
    document.body.innerHTML = `<input id="tagE" max="2026-03-31" value="2026-03-21" />`;

    setNaechsterEwtTag('', [createRow(20), createRow(21)]);

    expect(document.querySelector<HTMLInputElement>('#tagE')?.value).toBe('2026-03-22');
  });

  it('naechsterTag wirft Fehler und sperrt Speichern wenn kein freier Tag vorhanden ist', () => {
    document.body.innerHTML = `
      <input id="tagE" max="2026-03-03" value="2026-03-01" />
      <div id="modal">
        <div>
          <form>
            <div class="modal-footer">
              <button class="btn btn-primary">Speichern</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const alleTage = Array.from({ length: 31 }, (_, index) => createRow(index + 1));

    expect(() => setNaechsterEwtTag(1, alleTage)).toThrow('Fehler beim Finden eines Freien Tages');

    const saveButton = document.querySelector<HTMLButtonElement>(
      '#modal > div > form > div.modal-footer > button.btn.btn-primary',
    );
    expect(saveButton?.getAttribute('disabled')).toBe('true');
    expect(createSnackBarMock).toHaveBeenCalledTimes(1);
  });

  it('naechsterTag wirft Fehler wenn das Eingabefeld fehlt', () => {
    expect(() => setNaechsterEwtTag(1, [])).toThrow('Eingabefeld für Tag nicht gefunden');
  });
});
