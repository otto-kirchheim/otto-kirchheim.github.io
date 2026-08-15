import { beforeAll, describe, expect, it } from 'bun:test';
import { VorgabenGeldMock, VorgabenUMock, datenBerechungMock } from './mockData';
import Storage from '@/infrastructure/storage/Storage';
import generateTableBerechnung from '@/features/Berechnung/generateTableBerechnung';
import type { IVorgabenBerechnung } from '@/core/types/IVorgabenBerechnungMonat';
import type { IVorgabenGeld } from '@/core/types/IVorgabenGeldType';
import type { IVorgabenU } from '@/core/types';

describe('#generateTableBerechnung', () => {
  beforeAll(() => {
    Storage.set('VorgabenU', VorgabenUMock);
    Storage.set('datenBerechnung', datenBerechungMock);
    Storage.set('VorgabenGeld', VorgabenGeldMock);

    document.body.innerHTML =
      '<!DOCTYPE html><table class="table table-bordered table-striped table-hover align-middle table-Berechnung" aria-describedby="titelBerechnung">' +
      '<thead class="align-middle">' +
      '<tr class="table-primary align-middle">' +
      '<th></th>' +
      '<th class="col-1">Jan</th>' +
      '<th class="col-1">Feb</th>' +
      '<th class="col-1">Mär</th>' +
      '<th class="col-1">Apr</th>' +
      '<th class="col-1">Mai</th>' +
      '<th class="col-1">Jun</th>' +
      '<th class="col-1">Jul</th>' +
      '<th class="col-1">Aug</th>' +
      '<th class="col-1">Sep</th>' +
      '<th class="col-1">Okt</th>' +
      '<th class="col-1">Nov</th>' +
      '<th class="col-1">Dez</th>' +
      '</tr></thead><tbody id="tbodyBerechnung"></tbody></table>';
  });
  it("should generate 'Berechnung' Table", () => {
    generateTableBerechnung(
      Storage.get<IVorgabenBerechnung>('datenBerechnung', { check: true }),
      Storage.get<IVorgabenGeld>('VorgabenGeld', { check: true }),
    );

    const tbody = document.querySelector<HTMLTableSectionElement>('#tbodyBerechnung');
    if (!tbody) throw new Error('tbody not found');

    const rows = tbody.children;
    if (rows.length !== 13) throw new Error(`Expected 13 rows, but found ${rows.length}`);

    const expectedValues = [
      '6000',
      '100:00',
      '258,00&nbsp;€',
      '70,94&nbsp;€',
      '46,43&nbsp;€',
      '26,57&nbsp;€',
      '4,05&nbsp;€',
      '405,99&nbsp;€',
      '15 <br>1 <br>1',
      '15 <br> 1',
      '77,20&nbsp;€',
      '13,30&nbsp;€',
      '496,49&nbsp;€',
    ];

    Array.from(rows).forEach((row, rowIndex) => {
      const expectedValue = expectedValues[rowIndex];
      Array.from(row.children).forEach((cell, cellIndex) => {
        if (cellIndex === 0 && rowIndex !== 1) return;
        if (cell.innerHTML !== expectedValue) {
          throw new Error(
            `Expected cell at (${rowIndex}, ${cellIndex}) to have value '${expectedValue}', but found '${cell.innerHTML}'`,
          );
        }
      });
    });
  });

  it('merges multi-month VorgabenGeld overrides and calculates Beamte Schichtarbeit (S8) values', () => {
    // Nicht-Tarifkraft (Besoldungsgruppe) → case 9 nutzt BE8/BE14 statt TE8/TE14 (Zeilen 158-161).
    const beamterVorgabenU: IVorgabenU = {
      ...VorgabenUMock,
      Pers: { ...VorgabenUMock.Pers, TB: 'Besoldungsgruppe A 8' },
    };
    Storage.set('VorgabenU', beamterVorgabenU);

    // Zwei Monats-Schlüssel (1 und 2) → Proxy-get muss Monat 2 über Monat 1 mergen (Zeile 28).
    const geldMonat1 = { ...VorgabenGeldMock[1], BE8: 9, BE14: 24 };
    const geldMonat2 = { ...VorgabenGeldMock[1], BE8: 999, BE14: 24 };
    const multiMonthVorgabenGeld: IVorgabenGeld = { 1: geldMonat1, 2: geldMonat2 };

    const datenBerechnungMonat2 = {
      2: {
        B: { B: 0, L1: 0, L2: 0, L3: 0, K: 0 },
        E: { A8: 0, A14: 0, A24: 0, S8: 2, S14: 0 },
        N: { F: 0, A: 0, B: 0, C: 0, CA: 0, CB: 0, C9: 0, SIPO: 0 },
        EA: { Minuten: 0 },
      },
    } as unknown as IVorgabenBerechnung;

    generateTableBerechnung(datenBerechnungMonat2, multiMonthVorgabenGeld);

    const tbody = document.querySelector<HTMLTableSectionElement>('#tbodyBerechnung');
    if (!tbody) throw new Error('tbody not found');

    // Zeile 10 = "Summe EWT", enthält den aus case 9 berechneten Wert (S8 * BE8[Monat 2]).
    const summeEwtRow = tbody.children[10];
    // children[0] = <th>Summe EWT</th> aus dem Template, children[1] = die von generateTableBerechnung angehängte <td>.
    const cell = summeEwtRow?.children[1];
    if (!cell) throw new Error('Zelle nicht gefunden');

    const expected = (2 * 999).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
    expect(cell.textContent).toBe(expected);

    // Wiederherstellen der ursprünglichen Vorgaben für nachfolgende Tests in diesem Modul.
    Storage.set('VorgabenU', VorgabenUMock);
  });
});
