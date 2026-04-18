import type { Dayjs } from 'dayjs';
import {
  calculateBereitschaftsZeiten,
  getBereitschaftsEinsatzDaten,
  getBereitschaftsZeitraumDaten,
  persistBereitschaftsEinsatzTableData,
} from '.';
import { publishDataChanged } from '../../core';
import { createSnackBar } from '../../class/CustomSnackbar';
import type { CustomHTMLTableElement, IDatenBE, IDatenBZ } from '../../interfaces';
import { Storage, clearLoading, setLoading } from '../../utilities';
import dayjs from '../../utilities/configDayjs';
import { getMonatFromBZ } from '../../utilities/getMonatFromItem';

export default function submitBereitschaftsEinsatz(
  $modal: HTMLDivElement,
  tableBE: CustomHTMLTableElement<IDatenBE>,
  tableBZ: CustomHTMLTableElement<IDatenBZ>,
): boolean {
  setLoading('btnESE');

  const datumInput = $modal.querySelector<HTMLInputElement>('#Datum');
  const sapnrInput = $modal.querySelector<HTMLInputElement>('#SAPNR');
  const vonInput = $modal.querySelector<HTMLInputElement>('#ZeitVon');
  const bisInput = $modal.querySelector<HTMLInputElement>('#ZeitBis');
  const lreSelect = $modal.querySelector<HTMLSelectElement>('#LRE');
  const privatkmInput = $modal.querySelector<HTMLInputElement>('#privatkm');
  const berZeitInput = $modal.querySelector<HTMLInputElement>('#berZeit');

  if (!datumInput || !sapnrInput || !vonInput || !bisInput || !lreSelect || !privatkmInput || !berZeitInput)
    throw new Error('Input Element nicht gefunden');

  const tagBE = datumInput.value;

  if (!['LRE 1', 'LRE 2', 'LRE 1/2 ohne x', 'LRE 3', 'LRE 3 ohne x'].includes(lreSelect.value))
    throw new Error('LRE unbekannt');

  const daten: IDatenBE = {
    tagBE: dayjs(tagBE).format('DD.MM.YYYY'),
    auftragsnummerBE: sapnrInput.value,
    beginBE: vonInput.value,
    endeBE: bisInput.value,
    lreBE: lreSelect.value as IDatenBE['lreBE'],
    privatkmBE: Number(privatkmInput.value),
  };

  const berZeit: boolean = berZeitInput.checked;

  const einsatzStart = dayjs(`${tagBE}T${daten.beginBE}`);
  const einsatzEndRaw = dayjs(`${tagBE}T${daten.endeBE}`);
  const einsatzEnd = einsatzEndRaw.isAfter(einsatzStart) ? einsatzEndRaw : einsatzEndRaw.add(1, 'day');

  const bzData = getBereitschaftsZeitraumDaten();
  const startBz = bzData.find(bz => {
    const bzStart = dayjs(String(bz.beginB));
    const bzEnd = dayjs(String(bz.endeB));
    return einsatzStart.isSameOrAfter(bzStart) && einsatzStart.isSameOrBefore(bzEnd);
  });

  const endBz = bzData.find(bz => {
    const bzStart = dayjs(String(bz.beginB));
    const bzEnd = dayjs(String(bz.endeB));
    return einsatzEnd.isSameOrAfter(bzStart) && einsatzEnd.isSameOrBefore(bzEnd);
  });

  if (!startBz || !endBz) {
    clearLoading('btnESE');
    createSnackBar({
      message:
        'Bereitschaft<br/>Kein passender Bereitschaftszeitraum gefunden.<br/>Bitte zuerst einen Zeitraum über "Bereitschaftszeitraum hinzufügen" anlegen.',
      status: 'warning',
      timeout: 5000,
      fixed: true,
    });
    return false;
  }

  if (startBz !== endBz) {
    const endOfStartBz = dayjs(String(startBz.endeB));
    const startOfEndBz = dayjs(String(endBz.beginB));
    if (!endOfStartBz.isSame(startOfEndBz)) {
      clearLoading('btnESE');
      createSnackBar({
        message:
          'Bereitschaft<br/>Der Einsatz liegt in einer Lücke zwischen zwei Bereitschaftszeiträumen.<br/>Bitte Zeiträume anpassen.',
        status: 'warning',
        timeout: 5000,
        fixed: true,
      });
      return false;
    }
  }

  if (startBz._id) {
    daten.bereitschaftszeitraumBE = startBz._id;
  }

  const overlapsExistingBe = getBereitschaftsEinsatzDaten().some(be => {
    const beDate = dayjs(be.tagBE, 'DD.MM.YYYY').format('YYYY-MM-DD');
    const existingStart = dayjs(`${beDate}T${be.beginBE}`);
    const existingEndRaw = dayjs(`${beDate}T${be.endeBE}`);
    const existingEnd = existingEndRaw.isAfter(existingStart) ? existingEndRaw : existingEndRaw.add(1, 'day');
    return einsatzStart.isBefore(existingEnd) && existingStart.isBefore(einsatzEnd);
  });

  if (overlapsExistingBe) {
    clearLoading('btnESE');
    createSnackBar({
      message: 'Bereitschaft<br/>Bereitschaftseinsätze dürfen sich nicht überschneiden.',
      status: 'warning',
      timeout: 4000,
      fixed: true,
    });
    return false;
  }

  if (daten.lreBE === 'LRE 1') {
    const hasLre1InBz = getBereitschaftsEinsatzDaten().some(be => {
      if (be.lreBE !== 'LRE 1') return false;
      const start = dayjs(`${dayjs(be.tagBE, 'DD.MM.YYYY').format('YYYY-MM-DD')}T${be.beginBE}`);
      const endRaw = dayjs(`${dayjs(be.tagBE, 'DD.MM.YYYY').format('YYYY-MM-DD')}T${be.endeBE}`);
      const end = endRaw.isAfter(start) ? endRaw : endRaw.add(1, 'day');
      const bzStart = dayjs(String(startBz.beginB));
      const bzEnd = dayjs(String(startBz.endeB));
      return start.isSameOrAfter(bzStart) && end.isSameOrBefore(bzEnd);
    });

    if (hasLre1InBz) {
      createSnackBar({
        message: 'Bereitschaft<br/>Hinweis: Im gewählten Bereitschaftszeitraum existiert bereits ein LRE 1.',
        status: 'warning',
        timeout: 4000,
        fixed: true,
      });
    }
  }

  const ftBE = tableBE.instance;
  ftBE.rows.add(daten);
  persistBereitschaftsEinsatzTableData(ftBE);

  if (berZeit) {
    try {
      const bereitschaftsAnfang: Dayjs = dayjs(`${tagBE}T${daten.beginBE}`);
      const bereitschaftsEnde: Dayjs = dayjs(`${tagBE}T${daten.endeBE}`).isBefore(bereitschaftsAnfang)
        ? dayjs(`${tagBE}T${daten.endeBE}`).add(1, 'd')
        : dayjs(`${tagBE}T${daten.endeBE}`);
      const savedData = Storage.get<IDatenBZ[]>('dataBZ', { default: [] });
      const monat: number = bereitschaftsAnfang.month() + 1;
      const data: false | IDatenBZ[] = calculateBereitschaftsZeiten(
        bereitschaftsAnfang,
        bereitschaftsEnde,
        bereitschaftsEnde,
        bereitschaftsEnde,
        false,
        savedData.filter(item => getMonatFromBZ(item) === monat),
      );

      if (!data || savedData.filter(item => getMonatFromBZ(item) === monat).length === data.length) {
        clearLoading('btnESE');
        createSnackBar({
          message: 'Bereitschaft<br/>Zeitraum bereits vorhanden!',
          status: 'warning',
          timeout: 3000,
          fixed: true,
        });
        return true;
      }

      const otherMonths = savedData.filter(item => getMonatFromBZ(item) !== monat);
      const mergedRows = [...otherMonths, ...data];
      Storage.set('dataBZ', mergedRows);
      tableBZ.instance.rows.loadSmart(getBereitschaftsZeitraumDaten(undefined, undefined, { scope: 'all' }));
      tableBZ.instance.rows.setFilter(row => getMonatFromBZ(row) === monat);

      publishDataChanged();

      createSnackBar({
        message: 'Bereitschaft<br/>Neuer Zeitraum hinzugefügt',
        status: 'success',
        timeout: 3000,
        fixed: true,
      });
    } catch (error) {
      console.log(error);
    }
  }

  clearLoading('btnESE');
  return true;
}
