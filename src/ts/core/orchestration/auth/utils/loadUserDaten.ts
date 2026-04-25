import { overwriteUserDaten } from '.';
import { publishEvent } from '../../..';
import { aktualisiereBerechnung } from '../../../../features/Berechnung';
import generateTableBerechnung from '../../../../features/Berechnung/generateTableBerechnung';
import { generateEingabeMaskeEinstellungen } from '../../../../features/Einstellungen/utils';
import { createSnackBar } from '../../../../infrastructure/ui/CustomSnackbar';
import type {
  CustomHTMLTableElement,
  IDatenBE,
  IDatenBZ,
  IDatenEWT,
  IDatenN,
  UserDatenServer,
} from '../../../../interfaces';
import { flushAll, isAutoSaveEnabled, setAutoSaveEnabled } from '../../../../infrastructure/autoSave/autoSave';
import { default as Storage } from '../../../../infrastructure/storage/Storage';
import { default as buttonDisable } from '../../../../infrastructure/ui/buttonDisable';
import { default as clearLoading } from '../../../../infrastructure/ui/clearLoading';
import { default as updateTabVisibility } from '../../../../infrastructure/ui/updateTabVisibility';
import { type LoadedYearData, loadAllYearData } from '../../../../infrastructure/api/apiService';
import {
  getMonatFromBE,
  getMonatFromBZ,
  getMonatFromN,
  isEwtInMonat,
} from '../../../../infrastructure/date/getMonatFromItem';
import { hideConflictReviewBanner, showConflictReviewBanner } from '../components';
import { isSessionErrorMessage } from './loadUserDaten.helpers';
import {
  buildReviewResources,
  buildUnterschiedeMessage,
  createChangedMonthsByStorage,
  groupUnterschiedeByResource,
  markRowsForAutosave,
  normalizeServerRowsForConflict,
  reconcileRowsAsDeleted,
} from './loadUserDaten.conflict';
import { syncLoadedYearResources } from './loadUserDaten.sync';

export default async function loadUserDaten(monat: number, jahr: number): Promise<void> {
  // Vorherige Überprüfung zurücksetzen wenn noch aktiv
  const bannerMount = document.getElementById('conflictReviewBannerMount');
  if (bannerMount?.hasChildNodes()) {
    hideConflictReviewBanner(bannerMount);
    if (!isAutoSaveEnabled()) setAutoSaveEnabled(true);
    buttonDisable(false);
  }

  let userData: LoadedYearData | undefined;

  try {
    userData = await loadAllYearData(jahr);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Server nicht Erreichbar') || isSessionErrorMessage(message)) return;

    console.error(err);
    createSnackBar({
      message: `Server <br/>Keine Verbindung zum Server oder Serverfehler.`,
      status: 'error',
      timeout: 3000,
      fixed: true,
    });
    return;
  } finally {
    clearLoading('btnAuswaehlen');
  }

  console.log('Daten geladen: ', userData);
  const { datenGeld, timestamps: serverTimestamps } = userData;
  const { vorgabenU: serverVorgabenU, BZ: serverBZ, BE: serverBE, EWT: serverEWT, N: serverN } = userData;

  let dataServer: Partial<UserDatenServer> = {};
  if (Storage.check('dataServer')) {
    dataServer = Storage.get('dataServer', { check: true });
    console.log('Unterschiede Server - Client | Bereits vorhanden', dataServer);
  }

  // Jahreswechsel-Flag auslesen und zurücksetzen
  const isJahreswechsel = Storage.check('Jahreswechsel') && Storage.get<boolean>('Jahreswechsel', { default: false });
  if (isJahreswechsel) Storage.remove('Jahreswechsel');

  const synced = syncLoadedYearResources({
    vorgabenU: serverVorgabenU,
    BZ: serverBZ,
    BE: serverBE,
    EWT: serverEWT,
    N: serverN,
    serverTimestamps,
    initialDataServer: dataServer,
    isJahreswechsel,
  });

  const { vorgabenU, BZ, BE, EWT, N } = synced;
  const { vorhanden } = synced;
  dataServer = synced.dataServer;

  // Review-Banner unterhalb der Navbar anzeigen.
  const showReviewBanner = (resources: { name: string; months: number[] }[], onSave: () => Promise<void>): void => {
    const mount = document.getElementById('conflictReviewBannerMount');
    if (!mount) return;
    showConflictReviewBanner(mount, resources, onSave);
  };

  const willkommen = document.querySelector<HTMLHeadingElement>('#Willkommen');
  if (willkommen) {
    willkommen.innerHTML = `Hallo, ${vorgabenU.pers.Vorname}.`;
  }

  Storage.set('VorgabenGeld', datenGeld);

  const datenBerechnung = aktualisiereBerechnung({ BZ, BE, EWT, N });

  if (vorhanden.length > 0) {
    if (Object.keys(dataServer).length > 0) console.log('Unterschiede Server - Client', dataServer);
    Storage.set('dataServer', dataServer);

    const changedMonthsByStorage = createChangedMonthsByStorage(vorhanden);
    const grouped = groupUnterschiedeByResource(vorhanden);
    const message = buildUnterschiedeMessage(grouped);

    createSnackBar({
      message,
      status: 'info',
      dismissible: false,
      timeout: false,
      fixed: true,
      actions: [
        {
          text: 'Serverdaten übernehmen & speichern',
          function: () => {
            overwriteUserDaten();
            clearLoading('btnAuswaehlen');
            buttonDisable(false);
          },
          dismiss: true,
          class: ['text-primary', 'u-min-w-120'],
        },
        {
          text: 'Lokale Daten behalten & speichern',
          function: () => {
            const bzMonths = changedMonthsByStorage.get('dataBZ') ?? new Set<number>();
            const beMonths = changedMonthsByStorage.get('dataBE') ?? new Set<number>();
            const eMonths = changedMonthsByStorage.get('dataE') ?? new Set<number>();
            const nMonths = changedMonthsByStorage.get('dataN') ?? new Set<number>();

            if ('BZ' in dataServer) {
              markRowsForAutosave('#tableBZ', 'dataBZ', bzMonths);
              publishEvent('data:changed', { resource: 'BZ', action: 'sync' });
            }
            if ('BE' in dataServer) {
              markRowsForAutosave('#tableBE', 'dataBE', beMonths);
              publishEvent('data:changed', { resource: 'BE', action: 'sync' });
            }
            if ('EWT' in dataServer) {
              markRowsForAutosave('#tableE', 'dataE', eMonths);
              publishEvent('data:changed', { resource: 'EWT', action: 'sync' });
            }
            if ('N' in dataServer) {
              markRowsForAutosave('#tableN', 'dataN', nMonths);
              publishEvent('data:changed', { resource: 'N', action: 'sync' });
            }

            Storage.remove('dataServer');
            clearLoading('btnAuswaehlen');
            buttonDisable(false);
          },
          dismiss: true,
          class: ['text-secondary', 'u-min-w-120'],
        },
        {
          text: 'Vergleichen & manuell speichern',
          function: () => {
            setAutoSaveEnabled(false);
            buttonDisable(true);

            const bzMonths = changedMonthsByStorage.get('dataBZ') ?? new Set<number>();
            const beMonths = changedMonthsByStorage.get('dataBE') ?? new Set<number>();
            const eMonths = changedMonthsByStorage.get('dataE') ?? new Set<number>();
            const nMonths = changedMonthsByStorage.get('dataN') ?? new Set<number>();

            if ('BZ' in dataServer) {
              markRowsForAutosave('#tableBZ', 'dataBZ', bzMonths);
              reconcileRowsAsDeleted(
                '#tableBZ',
                'dataBZ',
                normalizeServerRowsForConflict<IDatenBZ>(dataServer.BZ),
                bzMonths,
              );
            }
            if ('BE' in dataServer) {
              markRowsForAutosave('#tableBE', 'dataBE', beMonths);
              reconcileRowsAsDeleted(
                '#tableBE',
                'dataBE',
                normalizeServerRowsForConflict<IDatenBE>(dataServer.BE),
                beMonths,
              );
            }
            if ('EWT' in dataServer) {
              markRowsForAutosave('#tableE', 'dataE', eMonths);
              reconcileRowsAsDeleted(
                '#tableE',
                'dataE',
                normalizeServerRowsForConflict<IDatenEWT>(dataServer.EWT),
                eMonths,
              );
            }
            if ('N' in dataServer) {
              markRowsForAutosave('#tableN', 'dataN', nMonths);
              reconcileRowsAsDeleted(
                '#tableN',
                'dataN',
                normalizeServerRowsForConflict<IDatenN>(dataServer.N),
                nMonths,
              );
            }

            showReviewBanner(buildReviewResources(grouped), async () => {
              setAutoSaveEnabled(true);
              buttonDisable(false);
              await flushAll();
            });

            Storage.remove('dataServer');
            clearLoading('btnAuswaehlen');
          },
          dismiss: true,
          class: ['text-info', 'u-min-w-120'],
        },
      ],
    });
  } else {
    clearLoading('btnAuswaehlen');
    buttonDisable(false);
  }

  // Immer laden: Bei Längenmismatch mit lokalen Daten, sonst mit Server-Daten
  document.querySelector<CustomHTMLTableElement>('#tableBZ')?.instance.rows.load(BZ);
  document.querySelector<CustomHTMLTableElement>('#tableBE')?.instance.rows.load(BE);
  document.querySelector<CustomHTMLTableElement>('#tableE')?.instance.rows.load(EWT);
  document.querySelector<CustomHTMLTableElement>('#tableN')?.instance.rows.load(N);
  document
    .querySelector<CustomHTMLTableElement>('#tableVE')
    ?.instance.rows.load([...Object.values(vorgabenU.vorgabenB)]);

  document
    .querySelector<CustomHTMLTableElement>('#tableBZ')
    ?.instance.rows.setFilter(row => getMonatFromBZ(row as IDatenBZ) === monat);
  document
    .querySelector<CustomHTMLTableElement>('#tableBE')
    ?.instance.rows.setFilter(row => getMonatFromBE(row as IDatenBE) === monat);
  document
    .querySelector<CustomHTMLTableElement>('#tableE')
    ?.instance.rows.setFilter(row => isEwtInMonat(row as IDatenEWT, monat));
  document
    .querySelector<CustomHTMLTableElement>('#tableN')
    ?.instance.rows.setFilter(row => getMonatFromN(row as IDatenN) === monat && jahr >= 2024);

  generateTableBerechnung(datenBerechnung, datenGeld);
  generateEingabeMaskeEinstellungen(vorgabenU);

  updateTabVisibility(vorgabenU.Einstellungen?.aktivierteTabs);
  document.querySelector<HTMLDivElement>('#navmenu')?.classList.remove('d-none');
  document.querySelector<HTMLButtonElement>('#btn-navmenu')?.classList.remove('d-none');
  createSnackBar({
    message: `Neue Daten geladen.`,
    status: 'success',
    timeout: 3000,
    fixed: true,
  });
}
