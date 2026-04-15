import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test';

import { CustomTable } from '../src/ts/class/CustomTable';
import type { IDatenEWT, IVorgabenU } from '../src/ts/interfaces';
import EditorModalEWT from '../src/ts/EWT/components/createEditorModalEWT';
import calculateBuchungstagEwt from '../src/ts/EWT/utils/calculateBuchungstagEwt';
import clearEwtZeiten from '../src/ts/EWT/utils/clearEwtZeiten';
import getEwtEditorDate from '../src/ts/EWT/utils/getEwtEditorDate';
import getEwtWindow from '../src/ts/EWT/utils/getEwtWindow';
import setNaechsterEwtTag from '../src/ts/EWT/utils/setNaechsterEwtTag';
import Storage from '../src/ts/utilities/Storage';

const { createSnackBarMock } = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  createSnackBarMock: vi.fn(),
}));

vi.mock('../src/ts/class/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

function createRow(day: number): IDatenEWT {
  const dayString = String(day).padStart(2, '0');
  return {
    tagE: `2026-03-${dayString}`,
    buchungstagE: `2026-03-${dayString}`,
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

function createVorgabenU(): IVorgabenU {
  return {
    aZ: {
      bT: '07:00',
      eT: '15:00',
      eTF: '14:00',
      bN: '22:00',
      eN: '06:00',
      bBN: '20:00',
      bS: '08:00',
      eS: '12:00',
      rZ: '00:30',
    },
    fZ: [
      { key: 'Ort', value: '00:10' },
      { key: 'Fulda', value: '00:10' },
    ],
    pers: { Vorname: 'Max', Nachname: 'Mustermann', TB: 'Beamter' },
  } as unknown as IVorgabenU;
}

function createEditorTable(rows: IDatenEWT[]): CustomTable<IDatenEWT> {
  document.body.innerHTML = '<div id="modal" class="modal"></div><table id="tableE"></table>';

  return new CustomTable<IDatenEWT>('tableE', {
    columns: [
      { name: 'tagE', title: 'Tag' },
      { name: 'buchungstagE', title: 'Buchungstag' },
      { name: 'eOrtE', title: 'Einsatzort' },
      { name: 'schichtE', title: 'Schicht' },
      { name: 'abWE', title: 'Ab Wohnung' },
      { name: 'ab1E', title: 'Ab 1.Tgk.-St.' },
      { name: 'anEE', title: 'An Einsatzort' },
      { name: 'beginE', title: 'Arbeitszeit Von' },
      { name: 'endeE', title: 'Arbeitszeit Bis' },
      { name: 'abEE', title: 'Ab Einsatzort' },
      { name: 'an1E', title: 'An 1.Tgk.-St.' },
      { name: 'anWE', title: 'An Wohnung' },
      { name: 'berechnen', title: 'Berechnen?' },
    ],
    rows,
    sorting: { enabled: false },
  });
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

  it('naechsterTag ignoriert Eintraege aus anderen Monaten', () => {
    document.body.innerHTML = `<input id="tagE" max="2026-03-31" value="2026-03-01" />`;

    setNaechsterEwtTag(1, [createRow(2), { ...createRow(3), tagE: '2026-04-03' }]);

    expect(document.querySelector<HTMLInputElement>('#tagE')?.value).toBe('2026-03-03');
  });

  it('naechsterTag nutzt bei leerem tag den maximal vorhandenen Tag', () => {
    document.body.innerHTML = `<input id="tagE" max="2026-03-31" value="2026-03-21" />`;

    setNaechsterEwtTag('', [createRow(20), createRow(21)]);

    expect(document.querySelector<HTMLInputElement>('#tagE')?.value).toBe('2026-03-22');
  });

  it('setzt bei N-Schichten den Buchungstag auf den Folgetag, wenn der laengere Anteil nach Mitternacht liegt', () => {
    const result = calculateBuchungstagEwt({
      tagE: '2026-03-20',
      eOrtE: 'Mühlbach',
      schichtE: 'N',
      abWE: '19:25',
      ab1E: '20:30',
      anEE: '20:50',
      beginE: '19:45',
      endeE: '06:15',
      abEE: '05:10',
      an1E: '05:30',
      anWE: '06:35',
      berechnen: true,
    });

    expect(result).toBe('2026-03-21');
  });

  it('nutzt beim Bearbeiten das echte tagE statt den aktiven Monatsfilter', () => {
    const datum = getEwtEditorDate({ tagE: '2026-03-31' }, 2026, 3);

    expect(datum.format('YYYY-MM-DD')).toBe('2026-03-31');
  });

  it('berechnet im Editor vor dem Speichern fehlende EWT-Zeiten automatisch', () => {
    Storage.set('VorgabenU', createVorgabenU());
    Storage.set('VorgabenGeld', { 1: {}, 3: {} } as never);

    const table = createEditorTable([
      {
        ...createRow(10),
        tagE: '2026-03-10',
        eOrtE: 'Fulda',
        schichtE: 'T',
        berechnen: true,
      },
    ]);
    const existingRow = table.rows.array[0];
    if (!existingRow) throw new Error('row not found');

    EditorModalEWT(existingRow, 'EWT bearbeiten');

    const form = document.querySelector<HTMLFormElement>('#modal form');
    if (!form) throw new Error('form not found');

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(existingRow.cells.beginE).toBe('07:00');
    expect(existingRow.cells.endeE).toBe('15:00');
    expect(existingRow.cells.buchungstagE).toBe('2026-03-10');
  });

  it('nutzt bei Nachtschichten den echten Starttag fuer das Ueberschneidungsfenster', () => {
    const window = getEwtWindow({
      tagE: '2026-03-20',
      buchungstagE: '2026-03-21',
      eOrtE: 'Mühlbach',
      schichtE: 'N',
      abWE: '19:25',
      ab1E: '20:30',
      anEE: '20:50',
      beginE: '19:45',
      endeE: '06:15',
      abEE: '05:10',
      an1E: '05:30',
      anWE: '06:35',
      berechnen: true,
    });

    expect(window?.start.format('YYYY-MM-DD HH:mm')).toBe('2026-03-20 19:45');
    expect(window?.end.format('YYYY-MM-DD HH:mm')).toBe('2026-03-21 06:15');
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

    expect(() => setNaechsterEwtTag(1, alleTage)).toThrow('Alle Tage im Monat sind bereits belegt');

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
