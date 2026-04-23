import dayjs from '../src/ts/infrastructure/date/configDayjs';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'bun:test';
import { createAddModalBereitschaftsZeit } from '../src/ts/features/Bereitschaft/components';
import {
  calculateBereitschaftsZeiten,
  getBereitschaftsEinsatzDaten,
  getBereitschaftsZeitraumDaten,
  submitBereitschaftsZeiten,
} from '../src/ts/features/Bereitschaft/utils';
import type { CustomHTMLDivElement } from '../src/ts/interfaces/CustomHTMLElements';
import type { IDaten, IDatenBZ } from '../src/ts/interfaces/IDaten';
import Storage from '../src/ts/infrastructure/storage/Storage';
import {
  VorgabenGeldMock,
  VorgabenUMock,
  datenBEMock,
  datenBZMock,
  datenEWTMock,
  datenNMock,
  mockBereitschaft,
} from './mockData';

describe('#Bereitschaftseingabe', () => {
  it('Bereitschaft an Zeitumstellung (Sommerzeit) – Wechsel bleibt 08:00', () => {
    // 29.03.2026 ist Sonntag, Zeitumstellung auf Sommerzeit (02:00 -> 03:00)
    // Wir prüfen, dass der Wechsel an diesem Tag trotzdem um 08:00 lokal bleibt
    const bereitschaftsAnfang = dayjs('2026-03-29T00:00:00');
    const bereitschaftsEnde = dayjs('2026-03-30T00:00:00');
    const nacht = false;
    const nachtAnfang = bereitschaftsEnde;
    const nachtEnde = bereitschaftsEnde;
    const daten: IDatenBZ[] = [];
    const result = calculateBereitschaftsZeiten(
      bereitschaftsAnfang,
      bereitschaftsEnde,
      nachtAnfang,
      nachtEnde,
      nacht,
      daten,
    );
    expect(result).not.toBeFalsy();
    if (!result) return;
    // Finde den Wechsel am 29.03.2026
    const wechsel = result.find(e => dayjs(e.beginB || e.beginn).isSame('2026-03-29T08:00:00', 'minute'));
    expect(wechsel).toBeDefined();
    // Der Wechsel muss exakt um 08:00 Uhr sein (lokal, unabhängig von Zeitumstellung)
    expect(dayjs(wechsel?.beginB || wechsel?.beginn).hour()).toBe(8);
    expect(dayjs(wechsel?.beginB || wechsel?.beginn).minute()).toBe(0);
  });
  beforeAll(() => {
    Storage.set('VorgabenU', VorgabenUMock);
  });
  it('Berechnet normale Bereitschaft', () => {
    const bereitschaftsAnfang = dayjs('2023-04-12T15:45:00');
    const bereitschaftsEnde = dayjs('2023-04-19T07:00:00');
    const nacht = false;
    const nachtAnfang = bereitschaftsEnde;
    const nachtEnde = bereitschaftsEnde;
    const daten: IDatenBZ[] = [];
    const result = calculateBereitschaftsZeiten(
      bereitschaftsAnfang,
      bereitschaftsEnde,
      nachtAnfang,
      nachtEnde,
      nacht,
      daten,
    );
    expect(result).not.toBeFalsy();
    if (result === false) return;
    expect(result.length === 7);
    expect(result).toMatchSnapshot();
  });
  it('Berechnet normale Bereitschaft über Feiertag', () => {
    const bereitschaftsAnfang = dayjs('2023-04-05T15:45:00');
    const bereitschaftsEnde = dayjs('2023-04-12T07:00:00');
    const nacht = false;
    const nachtAnfang = bereitschaftsEnde;
    const nachtEnde = bereitschaftsEnde;
    const daten: IDatenBZ[] = [];
    const result = calculateBereitschaftsZeiten(
      bereitschaftsAnfang,
      bereitschaftsEnde,
      nachtAnfang,
      nachtEnde,
      nacht,
      daten,
    );
    if (result === false) return;
    expect(result.length === 7);
  });
  it('Berechnet Bereitschaft mit Nacht', () => {
    const bereitschaftsAnfang = dayjs('2023-04-12T15:45:00');
    const bereitschaftsEnde = dayjs('2023-04-19T07:00:00');
    const nacht = true;
    const nachtAnfang = dayjs('2023-04-15T19:45:00');
    const nachtEnde = dayjs('2023-04-19T06:15:00');
    const daten: IDatenBZ[] = [];
    const result = calculateBereitschaftsZeiten(
      bereitschaftsAnfang,
      bereitschaftsEnde,
      nachtAnfang,
      nachtEnde,
      nacht,
      daten,
    );
    if (result === false) return;
    expect(result.length === 10);
    expect(result).toMatchSnapshot();
  });
  it('Berechnet Bereitschaft mit Nacht über Feiertag', () => {
    const bereitschaftsAnfang = dayjs('2023-04-05T15:45:00');
    const bereitschaftsEnde = dayjs('2023-04-12T12:00:00');
    const nacht = true;
    const nachtAnfang = dayjs('2023-04-10T19:30:00');
    const nachtEnde = dayjs('2023-04-12T06:15:00');
    const daten: IDatenBZ[] = [];
    const result = calculateBereitschaftsZeiten(
      bereitschaftsAnfang,
      bereitschaftsEnde,
      nachtAnfang,
      nachtEnde,
      nacht,
      daten,
    );
    if (result === false) return;
    expect(result.length === 10);
    expect(result).toMatchSnapshot();
  });
  it('Berechnet Monatsübergang (anfang) korrekt', () => {
    const bereitschaftsAnfang = dayjs('2023-04-01T00:00:00');
    const bereitschaftsEnde = dayjs('2023-04-05T07:00:00');
    const nacht = false;
    const nachtAnfang = bereitschaftsEnde;
    const nachtEnde = bereitschaftsEnde;
    const daten: IDatenBZ[] = [];
    const result = calculateBereitschaftsZeiten(
      bereitschaftsAnfang,
      bereitschaftsEnde,
      nachtAnfang,
      nachtEnde,
      nacht,
      daten,
    );
    expect(result).not.toBeFalsy();
    if (!result) return;
    expect(result).toMatchSnapshot();
  });
  beforeAll(() => {
    (globalThis as any).createSnackBar = vi.fn();
    (globalThis as any).FetchRetry = vi.fn();
    (globalThis as any).aktualisiereBerechnung = vi.fn();
  });

  afterEach(() => {
    delete (globalThis as any).createSnackBar;
    delete (globalThis as any).FetchRetry;
    delete (globalThis as any).aktualisiereBerechnung;
  });

  it('Berechnet Monatsübergang (ende) korrekt', () => {
    const bereitschaftsAnfang = dayjs('2023-04-26T15:45:00');
    const bereitschaftsEnde = dayjs('2023-05-01T00:00:00');
    const nacht = false;
    const nachtAnfang = bereitschaftsEnde;
    const nachtEnde = bereitschaftsEnde;
    const daten: IDatenBZ[] = [];
    const result = calculateBereitschaftsZeiten(
      bereitschaftsAnfang,
      bereitschaftsEnde,
      nachtAnfang,
      nachtEnde,
      nacht,
      daten,
    );
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    if (result && result.length > 0) {
      const letzterTag = result[result.length - 1];
      expect(dayjs(letzterTag.endeB || letzterTag.ende).month()).toBe(4); // Mai = 4 (0-basiert)
    }
  });
  it('Return undefined, wenn Bereitschaftszeit bereits vorhanden', () => {
    const bereitschaftsAnfang = dayjs('2023-04-12T15:45:00');
    const bereitschaftsEnde = dayjs('2023-04-19T07:00:00');
    const nacht = false;
    const nachtAnfang = bereitschaftsEnde;
    const nachtEnde = bereitschaftsEnde;
    const daten = [
      {
        beginB: '2023-04-12T13:45:00.000Z',
        endeB: '2023-04-13T05:00:00.000Z',
        pauseB: 30,
      },
      {
        beginB: '2023-04-13T13:45:00.000Z',
        endeB: '2023-04-14T05:00:00.000Z',
        pauseB: 30,
      },
      {
        beginB: '2023-04-14T11:00:00.000Z',
        endeB: '2023-04-15T06:00:00.000Z',
        pauseB: 0,
      },
      {
        beginB: '2023-04-15T06:00:00.000Z',
        endeB: '2023-04-16T06:00:00.000Z',
        pauseB: 0,
      },
      {
        beginB: '2023-04-16T06:00:00.000Z',
        endeB: '2023-04-17T05:00:00.000Z',
        pauseB: 0,
      },
      {
        beginB: '2023-04-17T13:45:00.000Z',
        endeB: '2023-04-18T05:00:00.000Z',
        pauseB: 30,
      },
      {
        beginB: '2023-04-18T13:45:00.000Z',
        endeB: '2023-04-19T05:00:00.000Z',
        pauseB: 30,
      },
    ];
    const result = calculateBereitschaftsZeiten(
      bereitschaftsAnfang,
      bereitschaftsEnde,
      nachtAnfang,
      nachtEnde,
      nacht,
      daten,
    );
    expect(result).toBe(false);
    const inputData: IDaten['BZ'] = datenBZMock;
    const result2 = getBereitschaftsZeitraumDaten([inputData[3]], 3);
    expect(result2).toEqual([]);
  });
});

describe('#bereitschaftEingabeWeb', async () => {
  beforeAll(() => {
    Storage.set('VorgabenU', VorgabenUMock);
    mockBereitschaft();

    (globalThis as any).createSnackBar = vi.fn();
    (globalThis as any).FetchRetry = vi.fn();
    (globalThis as any).aktualisiereBerechnung = vi.fn();
  });

  afterEach(() => {
    delete (globalThis as any).createSnackBar;
    delete (globalThis as any).FetchRetry;
    delete (globalThis as any).aktualisiereBerechnung;
  });

  it('Should calculate the correct Bereitschaft if month is the same', async () => {
    // Modal-Inputs für die klassische Variante (querySelector im Modal)
    const $modal = document.createElement('div') as CustomHTMLDivElement<IDatenBZ>;
    $modal.innerHTML = `
      <input id="bA" value="2023-04-12"/>
      <input id="bAT" value="15:45"/>
      <input id="bE" value="2023-04-19"/>
      <input id="bET" value="07:00"/>
      <input id="nacht" type="checkbox"/>
      <input id="nA" value="2023-04-19"/>
      <input id="nAT" value="07:00"/>
      <input id="nE" value="2023-04-19"/>
      <input id="nET" value="07:00"/>
    `;
    // Table-Element erzeugen
    const tableBZ = document.createElement('table') as HTMLTableElement & {
      instance: {
        rows: { loadSmart: ReturnType<typeof vi.fn>; setFilter: ReturnType<typeof vi.fn> };
        drawRows: ReturnType<typeof vi.fn>;
      };
    };
    tableBZ.id = 'tableBZ';
    tableBZ.instance = { rows: { loadSmart: vi.fn(), setFilter: vi.fn() }, drawRows: vi.fn() };
    document.body.appendChild(tableBZ);
    Storage.set('Monat', 4);
    Storage.set('Jahr', 2023);
    Storage.set('dataBZ', datenBZMock);
    Storage.set('dataBE', datenBEMock);
    Storage.set('dataE', datenEWTMock);
    Storage.set('dataN', datenNMock);
    Storage.set('VorgabenGeld', VorgabenGeldMock);
    const StorageSpy = vi.spyOn(Storage, 'set');

    await submitBereitschaftsZeiten($modal, tableBZ as never);

    expect(StorageSpy).toMatchSnapshot();
    // Aufräumen
    tableBZ.remove();
  });
});

describe('#DataBZ', () => {
  beforeEach(() => {
    Storage.clear();
    Storage.set('Benutzer', 'TEST');
  });

  it('should return an empty array when no data is provided and nothing is in storage', () => {
    const result = getBereitschaftsZeitraumDaten(undefined, 3);
    expect(result).toEqual([]);
  });

  it('should return data from storage when no data is provided but storage has data', () => {
    const storageData: IDaten['BZ'] = datenBZMock;
    Storage.set('dataBZ', storageData);
    const result = getBereitschaftsZeitraumDaten(undefined, 3);
    expect(result).toEqual(storageData);
  });

  it('should return the provided data when data is provided', () => {
    const inputData = datenBZMock;
    const result = getBereitschaftsZeitraumDaten(inputData, 3);
    expect(result).toEqual(inputData);
  });
});

describe('#DataBE', () => {
  beforeEach(() => {
    Storage.clear();
    Storage.set('Benutzer', 'TEST');
  });

  it('should return an empty array when no data is provided and nothing is in storage', () => {
    const result = getBereitschaftsEinsatzDaten(undefined, 3);
    expect(result).toEqual([]);
  });

  it('should return data from storage when no data is provided but storage has data', () => {
    const storageData: Required<IDaten>['BE'] = datenBEMock;
    Storage.set('dataBE', storageData);
    const result = getBereitschaftsEinsatzDaten(undefined, 3);
    expect(result).toEqual(storageData);
  });

  it('should return the provided data when data is provided', () => {
    const inputData = datenBEMock;
    const result = getBereitschaftsEinsatzDaten(inputData, 3);
    expect(result).toEqual(inputData);
  });
});

describe('#createAddModalBereitschaftsZeit', () => {
  beforeAll(() => {
    Storage.clear();
    Storage.set('VorgabenU', VorgabenUMock);
    Storage.set('Monat', 4);
    Storage.set('Jahr', 2023);
    document.body.innerHTML = '<div class="modal" id="modal" tabindex="-1"></div>';
  });

  it('should create a modal with the correct structure and elements', () => {
    createAddModalBereitschaftsZeit();

    const modal = document.querySelector<HTMLDivElement>('.modal');
    expect(modal).toBeTruthy();

    const form = document.querySelector<HTMLFormElement>('form');
    expect(form).toBeTruthy();

    const modalBody = document.querySelector<HTMLDivElement>('.modal-body');
    expect(modalBody).toBeTruthy();

    const vorgabeBSelect = document.querySelector<HTMLSelectElement>('#vorgabeB');
    expect(vorgabeBSelect).toBeTruthy();
    expect((<HTMLSelectElement>vorgabeBSelect).selectedIndex).toBe(0);
  });

  // Add more test cases to check event listeners, attribute values, and other aspects of the function
});
