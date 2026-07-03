import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test';

import { CustomTable } from '@/infrastructure/table/CustomTable';
import type { IDatenEWT, IVorgabenU } from '@/core/types';
import EditorModalEWT from '@/features/EWT/components/createEditorModalEWT';
import calculateBuchungstagEwt from '@/infrastructure/date/calculateBuchungstagEwt';
import clearEwtZeiten from '@/features/EWT/utils/clearEwtZeiten';
import getEwtEditorDate from '@/features/EWT/utils/getEwtEditorDate';
import getEwtWindow from '@/features/EWT/utils/getEwtWindow';
import setNaechsterEwtTag from '@/features/EWT/utils/setNaechsterEwtTag';
import Storage from '@/infrastructure/storage/Storage';

const { createSnackBarMock } = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  createSnackBarMock: vi.fn(),
}));

vi.mock('@/infrastructure/ui/CustomSnackbar', () => ({
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
      frueh: {
        aktiv: true,
        default: { beginn: '07:00', ende: '15:00', pause: 30 },
        overrides: { 5: { ende: '14:00', pause: 0 } },
      },
      spaet: { aktiv: false, default: { beginn: '14:00', ende: '22:00', pause: 30 } },
      nacht: { aktiv: false, default: { beginn: '22:00', ende: '06:00', pause: 45 } },
      sonder: { aktiv: false, beginn: '08:00', ende: '12:00', pause: 20 },
      fahrzeit: '00:30',
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

  it('naechsterTag klemmt tag=0 auf 0 und setzt den ersten freien Tag', () => {
    // tag=0 → Number.isFinite(0)=true → currentTag=0 → 0<1 → currentTag=0 (line 31 coverage)
    // Loop: currentTag becomes 1 (0+1), day 1 is free → tagE.value = 2026-03-01
    document.body.innerHTML = `<input id="tagE" value="2026-03-01" />`;

    setNaechsterEwtTag(0, []);

    expect(document.querySelector<HTMLInputElement>('#tagE')?.value).toBe('2026-03-01');
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

  it('versteckt den Buchungstag-Hinweis wenn das Tag-Feld im Editor geleert wird', () => {
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
    const tagInput = form.querySelector<HTMLInputElement>('#tagE');
    if (!tagInput) throw new Error('tagE nicht gefunden');

    tagInput.value = '';
    tagInput.dispatchEvent(new Event('change', { bubbles: true }));

    const hinweis = document.querySelector<HTMLDivElement>('#buchungstagHinweisEdit');
    expect(hinweis?.classList.contains('d-none')).toBe(true);
  });

  it('zeigt den abweichenden Buchungstag bei einer Nachtschicht mit Tagesübertrag an', () => {
    Storage.set('VorgabenU', createVorgabenU());
    Storage.set('VorgabenGeld', { 1: {}, 3: {} } as never);

    const table = createEditorTable([
      {
        ...createRow(20),
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
        berechnen: false,
      },
    ]);
    const existingRow = table.rows.array[0];
    if (!existingRow) throw new Error('row not found');

    EditorModalEWT(existingRow, 'EWT bearbeiten');

    const hinweis = document.querySelector<HTMLDivElement>('#buchungstagHinweisEdit');
    const hinweisInput = document.querySelector<HTMLInputElement>('#buchungstagE');

    expect(hinweis?.classList.contains('d-none')).toBe(false);
    expect(hinweisInput?.value).toBe('2026-03-21');
  });

  it('zeigt die Validierungsmeldung erneut an wenn ein fehlerhaftes Zeitfeld fokussiert wird', () => {
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
    const abWEInput = form.querySelector<HTMLInputElement>('#abWE');
    if (!abWEInput) throw new Error('abWE nicht gefunden');

    // Kein Fehlerzustand -> Guard bricht sofort ab (kein Fehler, kein Aufruf von reportValidity).
    expect(() => abWEInput.dispatchEvent(new Event('focus', { bubbles: true }))).not.toThrow();

    // is-invalid gesetzt, aber keine Validierungsmeldung -> Guard bricht ebenfalls ab.
    abWEInput.classList.add('is-invalid');
    expect(() => abWEInput.dispatchEvent(new Event('click', { bubbles: true }))).not.toThrow();

    // is-invalid mit Meldung -> reportValidity() wird aufgerufen.
    abWEInput.setCustomValidity('Fehlerhafte Zeit');
    const reportValiditySpy = vi.spyOn(abWEInput, 'reportValidity');
    abWEInput.dispatchEvent(new Event('focus', { bubbles: true }));

    expect(reportValiditySpy).toHaveBeenCalledTimes(1);
  });

  it('markiert fehlerhafte Zeitfelder beim Speichern und bricht den Submit ab', () => {
    Storage.set('VorgabenU', createVorgabenU());
    Storage.set('VorgabenGeld', { 1: {}, 3: {} } as never);

    const table = createEditorTable([
      {
        ...createRow(15),
        tagE: '2026-03-15',
        eOrtE: 'Fulda',
        schichtE: 'T',
        beginE: '10:00',
        endeE: '09:00',
        berechnen: false,
      },
    ]);
    const existingRow = table.rows.array[0];
    if (!existingRow) throw new Error('row not found');

    EditorModalEWT(existingRow, 'EWT bearbeiten');

    const form = document.querySelector<HTMLFormElement>('#modal form');
    if (!form) throw new Error('form not found');

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    const beginEInput = form.querySelector<HTMLInputElement>('#beginE');
    const endeEInput = form.querySelector<HTMLInputElement>('#endeE');
    const endeEFeedback = form.querySelector<HTMLDivElement>('#zeitfehler-endeE');

    expect(beginEInput?.classList.contains('is-invalid')).toBe(true);
    expect(endeEInput?.classList.contains('is-invalid')).toBe(true);
    expect(endeEFeedback?.textContent).toContain('Muss nach "Arbeitszeit Von" liegen.');
    // Speichern wurde verhindert: der ursprüngliche Tag im Datensatz ist unverändert.
    expect(existingRow.cells.tagE).toBe('2026-03-15');
  });

  it('zeigt eine Warnung bei Zeitüberschneidung mit einem anderen EWT-Eintrag und bricht den Submit ab', () => {
    Storage.set('VorgabenU', createVorgabenU());
    Storage.set('VorgabenGeld', { 1: {}, 3: {} } as never);
    Storage.set('Benutzer', { id: 'user-1' } as never);
    Storage.set('dataE', [
      {
        _id: 'other-entry',
        tagE: '2026-03-12',
        buchungstagE: '2026-03-12',
        eOrtE: 'Fulda',
        schichtE: 'T',
        abWE: '06:30',
        ab1E: '07:10',
        anEE: '07:20',
        beginE: '08:00',
        endeE: '16:00',
        abEE: '15:00',
        an1E: '15:10',
        anWE: '16:30',
        berechnen: false,
      },
    ] as never);

    const table = createEditorTable([
      {
        ...createRow(12),
        tagE: '2026-03-12',
        eOrtE: 'Fulda',
        schichtE: 'T',
        abWE: '06:30',
        ab1E: '07:10',
        anEE: '07:20',
        beginE: '07:00',
        endeE: '15:00',
        abEE: '14:40',
        an1E: '14:50',
        anWE: '15:30',
        berechnen: false,
        _id: 'row-editing',
      },
    ]);
    const existingRow = table.rows.array[0];
    if (!existingRow) throw new Error('row not found');

    EditorModalEWT(existingRow, 'EWT bearbeiten');

    const form = document.querySelector<HTMLFormElement>('#modal form');
    if (!form) throw new Error('form not found');

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(createSnackBarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Zeitüberschneidung'),
        status: 'warning',
      }),
    );
    expect(existingRow.cells.tagE).toBe('2026-03-12');
  });

  it('erkennt einen identischen Eintrag beim Speichern und verhindert das Duplizieren', () => {
    Storage.set('VorgabenU', createVorgabenU());
    Storage.set('VorgabenGeld', { 1: {}, 3: {} } as never);

    const sharedValues = {
      tagE: '2026-03-12',
      buchungstagE: '2026-03-12',
      eOrtE: 'Fulda',
      schichtE: 'T',
      abWE: '06:30',
      ab1E: '07:10',
      anEE: '07:20',
      beginE: '07:00',
      endeE: '15:00',
      abEE: '14:40',
      an1E: '14:50',
      anWE: '15:30',
      berechnen: false,
    };

    const table = createEditorTable([
      { ...sharedValues, _id: 'row-a' },
      { ...sharedValues, _id: 'row-b' },
    ]);
    const existingRow = table.rows.array[0];
    if (!existingRow) throw new Error('row not found');

    EditorModalEWT(existingRow, 'EWT bearbeiten');

    const form = document.querySelector<HTMLFormElement>('#modal form');
    if (!form) throw new Error('form not found');

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(createSnackBarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('identischer Eintrag'),
        status: 'warning',
      }),
    );
    expect(existingRow.cells.tagE).toBe('2026-03-12');
  });
});
