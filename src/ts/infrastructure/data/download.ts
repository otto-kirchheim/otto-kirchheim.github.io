import { saveAs } from 'file-saver';
import Storage from '../storage/Storage';
import buttonDisable from '../ui/buttonDisable';
import clearLoading from '../ui/clearLoading';
import setLoading from '../ui/setLoading';
import { createSnackBar } from '../ui/CustomSnackbar';
import type {
  IDatenBE,
  IDatenBZ,
  IDatenEWT,
  IDatenN,
  IVorgabenGeld,
  IVorgabenGeldType,
  IVorgabenU,
} from '@/types';
import tableToArray from './tableToArray';
import dayjs from '../date/configDayjs';
import { userProfileToBackend } from './fieldMapper';
import { downloadPdf } from '../api/apiService';
import { filterByMonat, getMonatFromBE, getMonatFromBZ, getMonatFromN, isEwtInMonat } from '../date/getMonatFromItem';
import calculateBuchungstagEwt from '../date/calculateBuchungstagEwt';

export default async function download(button: HTMLButtonElement | null, modus: 'B' | 'E' | 'N'): Promise<void> {
  if (button === null) return;

  if (!navigator.onLine) {
    createSnackBar({
      message: 'Download nicht möglich – keine Internetverbindung',
      status: 'error',
      timeout: 3000,
      fixed: true,
    });
    return;
  }

  setLoading(button.id);
  buttonDisable(true);

  const MonatInput = document.querySelector<HTMLInputElement>('#Monat');
  const JahrInput = document.querySelector<HTMLInputElement>('#Jahr');

  if (!MonatInput || !JahrInput) throw new Error('Input Element nicht gefunden');

  const VorgabenGeldDaten: IVorgabenGeld = Storage.get('VorgabenGeld', { check: true });
  const VorgabenGeldHandler: ProxyHandler<IVorgabenGeld> = {
    get: (target: IVorgabenGeld, prop: string): IVorgabenGeldType => {
      const maxMonat: number = Number(prop);
      let returnObjekt = target[1];
      const keys = Object.keys(target).map(Number);
      if (keys.length > 1 && maxMonat > 1 && Math.max(...keys.filter(key => key <= maxMonat)) > 1)
        for (let monat = 2; monat <= maxMonat; monat++)
          if (typeof target[monat] !== 'undefined') returnObjekt = { ...returnObjekt, ...target[monat] };
      return returnObjekt;
    },
    set: (_target: IVorgabenGeld, prop: string, newValue) => {
      console.log('veränderung von datenGeld nicht erlaubt:', prop, newValue);
      return false;
    },
  };
  const VorgabenGeld = new Proxy(VorgabenGeldDaten, VorgabenGeldHandler);

  const Monat = +MonatInput.value;
  const Jahr = +JahrInput.value;
  const localVorgabenU = Storage.get<IVorgabenU>('VorgabenU', { check: true });
  const backendVorgabenU = userProfileToBackend(localVorgabenU);

  const data: Record<string, unknown> = {
    // Backend-Download-Schema erwartet `Pers` und `Fahrzeit` im Backend-Format.
    VorgabenU: {
      Pers: backendVorgabenU.Pers,
      Fahrzeit: backendVorgabenU.Fahrzeit,
    },
    VorgabenGeld: VorgabenGeld[Monat],
    Monat,
    Jahr,
  };

  // Daten: Frontend-Feldnamen → Backend-Feldnamen mappen
  switch (modus) {
    case 'B': {
      const bzRaw = filterByMonat(tableToArray<IDatenBZ<string>>('tableBZ'), Monat, getMonatFromBZ);
      const beRaw = filterByMonat(tableToArray<IDatenBE>('tableBE'), Monat, getMonatFromBE);
      data.Daten = {
        BZ: bzRaw.map(bz => ({ Beginn: bz.beginB, Ende: bz.endeB, Pause: bz.pauseB ?? 0 })),
        BE: beRaw.map(be => ({
          Tag: be.tagBE,
          Auftragsnummer: be.auftragsnummerBE,
          Beginn: be.beginBE,
          Ende: be.endeBE,
          LRE: be.lreBE,
          PrivatKm: be.privatkmBE ?? 0,
        })),
      };
      break;
    }
    case 'E': {
      const ewtRaw = tableToArray<IDatenEWT<string>>('tableE').filter(e => isEwtInMonat(e, Monat, 'buchungstag'));
      data.Daten = {
        EWT: ewtRaw.map(e => ({
          Buchungstag: dayjs(e.buchungstagE || calculateBuchungstagEwt(e)).format('DD'),
          Einsatzort: e.eOrtE,
          Schicht: e.schichtE,
          abWE: e.abWE ? dayjs(e.abWE, 'HH:mm').format('HH:mm') : undefined,
          ab1E: e.ab1E ? dayjs(e.ab1E, 'HH:mm').format('HH:mm') : undefined,
          anEE: e.anEE ? dayjs(e.anEE, 'HH:mm').format('HH:mm') : undefined,
          beginE: e.beginE ? dayjs(e.beginE, 'HH:mm').format('HH:mm') : undefined,
          endeE: e.endeE ? dayjs(e.endeE, 'HH:mm').format('HH:mm') : undefined,
          abEE: e.abEE ? dayjs(e.abEE, 'HH:mm').format('HH:mm') : undefined,
          an1E: e.an1E ? dayjs(e.an1E, 'HH:mm').format('HH:mm') : undefined,
          anWE: e.anWE ? dayjs(e.anWE, 'HH:mm').format('HH:mm') : undefined,
          berechnen: e.berechnen,
        })),
      };
      break;
    }
    case 'N': {
      const nRaw = filterByMonat(tableToArray<IDatenN>('tableN'), Monat, getMonatFromN);
      data.Daten = {
        N: nRaw.map(n => ({
          Tag: dayjs(n.tagN, 'DD.MM.YYYY').format('DD'),
          Beginn: n.beginN,
          Ende: n.endeN,
          Anzahl040: String(n.anzahl040N ?? ''),
          Auftragsnummer: n.auftragN,
        })),
      };
      break;
    }
    default:
      throw new Error('Modus fehlt');
  }

  try {
    console.time('download');

    const { blob, filename } = await downloadPdf(modus, data);

    let dateiName = filename;
    if (!dateiName || dateiName === 'download.pdf') {
      const vorDateiName: { [key in typeof modus]: string } = {
        B: 'RB',
        E: 'Verpfl',
        N: 'EZ',
      };
      dateiName = `${vorDateiName[modus]}_${dayjs([Jahr, Monat - 1, 1]).format('MM_YY')}_${localVorgabenU.pers.Vorname} ${
        localVorgabenU.pers.Nachname
      }_${localVorgabenU.pers.Gewerk} ${localVorgabenU.pers.ErsteTkgSt}.pdf`;
    }

    saveAs(blob, dateiName);
  } catch (error: unknown) {
    console.error('Fehler', error instanceof Error ? error.message : error);
    createSnackBar({
      message: `Download fehlerhaft:<br/>${error instanceof Error ? error.message : String(error)}`,
      status: 'error',
      timeout: 3000,
      fixed: true,
    });
  } finally {
    console.timeEnd('download');
    buttonDisable(false);
    clearLoading(button.id);
  }
}
