import type { Dayjs } from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { calculateBereitschaftsZeiten } from '.';
import { publishDataChanged } from '../../core';
import { createSnackBar } from '../../class/CustomSnackbar';
import type { CustomHTMLDivElement, CustomHTMLTableElement, IDatenBZ, IMonatsDaten } from '../../interfaces';
import { normalizeResourceRows, Storage, clearLoading, setLoading, tableToArray } from '../../utilities';
import { bereitschaftszeitraumApi } from '../../utilities/apiService';
import dayjs from '../../utilities/configDayjs';
import { getMonatFromBZ } from '../../utilities/getMonatFromItem';

export default async function submitBereitschaftsZeiten(
  modal: CustomHTMLDivElement<IDatenBZ>,
  tableBZ: CustomHTMLTableElement<IDatenBZ>,
): Promise<void> {
  setLoading('btnESZ');

  const bAInput = modal.querySelector<HTMLInputElement>('#bA');
  const bATInput = modal.querySelector<HTMLInputElement>('#bAT');
  const bEInput = modal.querySelector<HTMLInputElement>('#bE');
  const bETInput = modal.querySelector<HTMLInputElement>('#bET');
  const nachtInput = modal.querySelector<HTMLInputElement>('#nacht');
  const nAInput = modal.querySelector<HTMLInputElement>('#nA');
  const nATInput = modal.querySelector<HTMLInputElement>('#nAT');
  const nEInput = modal.querySelector<HTMLInputElement>('#nE');
  const nETInput = modal.querySelector<HTMLInputElement>('#nET');

  const preserveDeletedRows = (
    table: CustomHTMLTableElement<IDatenBZ>,
    reloadedRows: IDatenBZ[],
    monatToSet: number,
  ): void => {
    // Lade alle Zeilen (inkl. gelöschter) und lasse die Sortierung wie gewohnt laufen
    table.instance.rows.loadSmart(reloadedRows);
    table.instance.rows.setFilter(row => getMonatFromBZ(row) === monatToSet);
    table.instance.drawRows();
  };

  if (!bAInput || !bATInput || !bEInput || !bETInput || !nachtInput || !nAInput || !nATInput || !nEInput || !nETInput)
    throw new Error('Input Element nicht gefunden');

  const bereitschaftsAnfang: Dayjs = dayjs(`${bAInput.value}T${bATInput.value}`);
  const bereitschaftsEnde: Dayjs = dayjs(`${bEInput.value}T${bETInput.value}`);
  let nacht: boolean = nachtInput.checked;
  const nachtAnfang: Dayjs = nacht === true ? dayjs(`${nAInput.value}T${nATInput.value}`) : bereitschaftsEnde;
  const nachtEnde: Dayjs = nacht === true ? dayjs(`${nEInput.value}T${nETInput.value}`) : bereitschaftsEnde;

  if (nachtAnfang.isBefore(bereitschaftsAnfang)) {
    clearLoading('btnESZ');
    createSnackBar({
      message: 'Nacht Anfang darf nicht vor Bereitschafts Anfang liegen',
      status: 'error',
      timeout: 3000,
      fixed: true,
    });
    return;
  }
  if (nachtEnde.isAfter(bereitschaftsEnde)) {
    clearLoading('btnESZ');
    createSnackBar({
      message: 'Nacht Ende darf nicht nach Bereitschafts Ende liegen',
      status: 'error',
      timeout: 3000,
      fixed: true,
    });
    return;
  }

  const monat: number = Storage.get<number>('Monat', { check: true });
  const jahr: number = Storage.get<number>('Jahr', { check: true });

  const mergeMonatRows = (allRows: IDatenBZ[], monthRows: IDatenBZ[], month: number): IDatenBZ[] => {
    const otherMonths = allRows.filter(item => getMonatFromBZ(item) !== month);
    return [...otherMonths, ...monthRows];
  };

  const getMonatRows = (rows: IDatenBZ[], month: number): IDatenBZ[] => {
    return rows.filter(item => getMonatFromBZ(item) === month);
  };

  let monatData: IMonatsDaten['BZ'] | false = false;
  const currentMonatRows: IMonatsDaten['BZ'] = getMonatRows(tableToArray('tableBZ'), monat);
  let folgeMonatData: IMonatsDaten['BZ'] | false;
  if (!currentMonatRows) throw new Error('Fehler bei Datenermittlung');

  if (
    bereitschaftsAnfang.isSame(bereitschaftsEnde, 'month') ||
    (!bereitschaftsAnfang.isSame(bereitschaftsEnde, 'month') &&
      bereitschaftsEnde.isSameOrBefore(dayjs([jahr, bereitschaftsEnde.month(), 1, 0, 0])))
  ) {
    const nachtEnde2: Dayjs = bereitschaftsEnde.isSameOrBefore(nachtEnde, 'month')
      ? nachtEnde
      : bereitschaftsEnde.hour(nachtEnde.hour()).minute(nachtEnde.minute());

    monatData = calculateBereitschaftsZeiten(
      bereitschaftsAnfang,
      bereitschaftsEnde,
      nachtAnfang,
      nachtEnde2,
      nacht,
      currentMonatRows,
    );
  } else if (!bereitschaftsAnfang.isSame(bereitschaftsEnde, 'y') && !navigator.onLine) {
    createSnackBar({
      message: 'Bereitschaft<br/>Du bist Offline: <br/>Kein Jahreswechsel möglich!',
      icon: 'question',
      status: 'error',
      dismissible: false,
      timeout: false,
      actions: [
        {
          text: 'ohne wechsel fortsetzten?',
          function: () => {
            if (!currentMonatRows) throw new Error('Fehler bei Datenermittlung');
            monatData = calculateBereitschaftsZeiten(
              bereitschaftsAnfang,
              dayjs([bereitschaftsEnde.year(), bereitschaftsEnde.month()]),
              nachtAnfang,
              nachtEnde,
              nacht,
              currentMonatRows,
            );
            if (!monatData) {
              clearLoading('btnESZ');
              createSnackBar({
                message: 'Bereitschaft<br/>Bereitschaftszeitraum Bereits vorhanden!',
                icon: '!',
                status: 'warning',
                timeout: 3000,
                fixed: true,
              });
              return;
            }

            const mergedRows = mergeMonatRows(
              normalizeResourceRows<IDatenBZ>(Storage.get<unknown>('dataBZ', { default: [] })),
              monatData,
              monat,
            );
            Storage.set('dataBZ', mergedRows);
            preserveDeletedRows(
              tableBZ,
              normalizeResourceRows<IDatenBZ>(Storage.get<unknown>('dataBZ', { default: [] })),
              monat,
            );

            clearLoading('btnESZ');
            createSnackBar({
              message:
                'Bereitschaft<br/>Neuer Zeitraum hinzugefügt</br>Speichern nicht vergessen!</br></br>Berechnung wird erst nach Speichern aktualisiert.',
              status: 'success',
              timeout: 3000,
              fixed: true,
            });
          },
          dismiss: true,
          class: ['text-primary'],
        },
        {
          text: 'Abbrechen',
          function: () => {
            clearLoading('btnESZ');
          },
          dismiss: true,
        },
      ],
      fixed: true,
    });
    return;
  } else {
    const monat2: number = bereitschaftsEnde.month();
    const jahr2: number = bereitschaftsEnde.year();

    const bereitschaftsEndeWechsel: Dayjs = dayjs([jahr2, monat2]);
    let nacht2: boolean = false;
    let nachtEnde1: Dayjs;
    const nachtEnde2: Dayjs = nachtEnde.clone();
    let nachtAnfang2: Dayjs;
    if (bereitschaftsEndeWechsel.isBefore(nachtAnfang)) {
      [nacht, nacht2] = [nacht2, nacht];
      nachtEnde1 = nachtEnde.clone();
      nachtAnfang2 = nachtAnfang.clone();
    } else if (bereitschaftsEndeWechsel.isAfter(nachtEnde)) {
      nachtEnde1 = nachtEnde.clone();
      nachtAnfang2 = bereitschaftsEnde.clone();
    } else if (bereitschaftsEndeWechsel.isAfter(nachtAnfang) && bereitschaftsEndeWechsel.isBefore(nachtEnde)) {
      nacht2 = nacht;
      nachtEnde1 = dayjs([jahr2, monat2, 1, nachtEnde.hour(), nachtEnde.minute()]);
      nachtAnfang2 = dayjs([jahr2, monat2, 1, nachtAnfang.hour(), nachtAnfang.minute()]).subtract(1, 'day');
    } else throw new Error('Fehler bei Nacht und Bereitschaft');

    if (jahr !== jahr2) {
      try {
        const { data: respondedBzRows } = await bereitschaftszeitraumApi.loadYear(jahr2);

        folgeMonatData = calculateBereitschaftsZeiten(
          bereitschaftsEndeWechsel,
          bereitschaftsEnde,
          nachtAnfang2,
          nachtEnde2,
          nacht2,
          respondedBzRows.filter(item => getMonatFromBZ(item) === monat2 + 1),
        );

        if (!folgeMonatData) return;

        const createItems = folgeMonatData.map(row => ({ ...row, clientRequestId: uuidv4() }));
        const bulkResult = await bereitschaftszeitraumApi.bulk(
          { create: createItems, update: [], delete: [] },
          monat2 + 1,
          jahr2,
        );

        if (bulkResult.errors.length > 0) {
          createSnackBar({
            message: 'Bereitschaft<br/>Es ist ein Fehler beim Jahreswechsel aufgetreten',
            status: 'error',
            timeout: 3000,
            fixed: true,
          });
          return;
        }

        createSnackBar({
          message: `Bereitschaft<br/>Daten für 01/${jahr2} gespeichert`,
          status: 'success',
          timeout: 3000,
          fixed: true,
        });
      } catch (err: unknown) {
        console.error(err);
        return;
      }
    } else {
      folgeMonatData = getMonatRows(Storage.get<IDatenBZ[]>('dataBZ', { default: [] }), monat2 + 1);
      folgeMonatData = calculateBereitschaftsZeiten(
        bereitschaftsEndeWechsel,
        bereitschaftsEnde,
        nachtAnfang2,
        nachtEnde2,
        nacht2,
        folgeMonatData,
      );
      if (folgeMonatData) {
        const mergedRows = mergeMonatRows(
          normalizeResourceRows<IDatenBZ>(Storage.get<unknown>('dataBZ', { default: [] })),
          folgeMonatData,
          monat2 + 1,
        );
        Storage.set('dataBZ', mergedRows);
      }
    }

    monatData = calculateBereitschaftsZeiten(
      bereitschaftsAnfang,
      bereitschaftsEndeWechsel,
      nachtAnfang,
      nachtEnde1,
      nacht,
      currentMonatRows,
    );
  }

  if (!monatData) {
    clearLoading('btnESZ');
    createSnackBar({
      message: 'Bereitschaft<br/>Bereitschaftszeitraum Bereits vorhanden!',
      status: 'warning',
      timeout: 3000,
      fixed: true,
    });
    return;
  }

  const mergedRows = mergeMonatRows(
    normalizeResourceRows<IDatenBZ>(Storage.get<unknown>('dataBZ', { default: [] })),
    monatData,
    monat,
  );
  Storage.set('dataBZ', mergedRows);
  preserveDeletedRows(tableBZ, normalizeResourceRows<IDatenBZ>(Storage.get<unknown>('dataBZ', { default: [] })), monat);

  publishDataChanged();

  clearLoading('btnESZ');
  createSnackBar({
    message: 'Bereitschaft<br/>Neuer Zeitraum hinzugefügt</br>Speichern nicht vergessen!',
    status: 'success',
    timeout: 3000,
    fixed: true,
  });
}
