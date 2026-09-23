import overwriteUserDaten from './overwriteUserDaten';
import { aktualisiereBerechnung } from '@/pages/berechnung';
import generateTableBerechnung from '@/pages/berechnung/generateTableBerechnung';
import { generateEingabeMaskeEinstellungen } from '@/pages/einstellungen/model';
import { createSnackBar } from '@/shared/ui/snackbar/CustomSnackbar';
import type { CustomHTMLTableElement, IDatenBE, IDatenBZ, IDatenEA, IDatenEWT, IDatenN } from '@/types';
import { isRowInMonat, resourceDefs } from '@/shared/lib/ressource/resourceConfig';
import { cancelAllPending, flushAll, isAutoSaveEnabled, setAutoSaveEnabled } from '@/shared/lib/autosave/autoSave';
import { default as Storage } from '@/shared/lib/storage/Storage';
import { default as buttonDisable } from '@/shared/ui/button-loading/buttonDisable';
import { default as clearLoading } from '@/shared/ui/button-loading/clearLoading';
import { default as updateTabVisibility } from '@/infrastructure/ui/updateTabVisibility';
import { setNavigationSichtbar } from '@/shared/model/navigation/navigationVisibleStore';
import { syncFeatureTabs } from '@/app/init/syncFeatureTabs';
import { warmeFormularCaches } from '@/shared/lib/pdf/warmeFormularCaches';
import { type LoadedYearData, loadAllYearData } from '@/shared/api/apiService';
import { hideConflictReviewBanner, showConflictReviewBanner } from '@/features/auth/ui';
import { isSessionErrorMessage } from './loadUserDaten.helpers';
import {
  applyConflictToTables,
  buildReviewResources,
  buildUnterschiedeMessage,
  createChangedMonthsByStorage,
  groupUnterschiedeByResource,
} from './loadUserDaten.conflict';
import { syncLoadedYearResources } from './loadUserDaten.sync';

/**
 * Laedt die Jahresdaten vom Server, gleicht sie mit dem lokalen Stand ab und befuellt Tabellen,
 * Berechnung, Einstellungen und Tab-Sichtbarkeit. Bei Unterschieden zeigt eine Snackbar drei
 * Wege: Serverdaten uebernehmen, lokale behalten oder vergleichen und manuell speichern
 * (AutoSave pausiert, Review-Banner). Ladefehler werden gemeldet, Session-Fehler still beendet.
 *
 * @param monat - Angezeigter Monat (1-12); bestimmt die Tabellenfilter.
 * @param jahr - Zu ladendes Jahr; N gilt ab 2024, EA ab 2025.
 */
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
  const { vorgabenU: serverVorgabenU } = userData;

  // Jahreswechsel-Flag auslesen und zurücksetzen
  const isJahreswechsel = Storage.check('Jahreswechsel') && Storage.get<boolean>('Jahreswechsel', { default: false });
  if (isJahreswechsel) Storage.remove('Jahreswechsel');

  const synced = syncLoadedYearResources({
    vorgabenU: serverVorgabenU,
    resources: Object.fromEntries(resourceDefs().map(resource => [resource.key, userData[resource.key]])),
    serverTimestamps,
    isJahreswechsel,
  });

  const { vorgabenU, rows } = synced;
  const rowsOf = <T>(key: keyof typeof rows): T[] => (rows[key] ?? []) as T[];
  const { vorhanden } = synced;
  const dataServer = synced.dataServer;

  /**
   * Zeigt das Review-Banner im Mount-Punkt `#conflictReviewBannerMount`; ohne Mount wirkungslos.
   *
   * @param resources - Betroffene Ressourcen mit Monaten.
   * @param onSave - Wird beim Klick auf "Uebernehmen" ausgefuehrt.
   */
  const showReviewBanner = (resources: { name: string; months: number[] }[], onSave: () => Promise<void>): void => {
    const mount = document.getElementById('conflictReviewBannerMount');
    if (!mount) return;
    showConflictReviewBanner(mount, resources, onSave);
  };

  const willkommen = document.querySelector<HTMLHeadingElement>('#Willkommen');
  if (willkommen) {
    willkommen.innerHTML = `Hallo, ${vorgabenU.Pers.Vorname}.`;
  }

  Storage.set('VorgabenGeld', datenGeld);

  const datenBerechnung = await aktualisiereBerechnung({
    BZ: rowsOf<IDatenBZ>('BZ'),
    BE: rowsOf<IDatenBE>('BE'),
    EWT: rowsOf<IDatenEWT>('EWT'),
    N: rowsOf<IDatenN>('N'),
    EA: rowsOf<IDatenEA>('EA'),
  });

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
          /** Ersetzt lokale Daten durch die Serverdaten (`overwriteUserDaten`) und gibt die Bedienung frei. */
          function: async () => {
            await overwriteUserDaten();
            clearLoading('btnAuswaehlen');
            buttonDisable(false);
          },
          dismiss: true,
          class: ['u-min-w-120'],
        },
        {
          text: 'Lokale Daten behalten & speichern',
          /** Markiert die lokalen Zeilen der abweichenden Monate für AutoSave und speichert sofort (`flushAll`). */
          function: async () => {
            // Zuerst Server-only-Rows als gelöscht markieren, dann lokale Rows für Speichern vorbereiten
            applyConflictToTables(dataServer, changedMonthsByStorage, 'abgleichen-zuerst');

            Storage.remove('dataServer');
            await flushAll();
            clearLoading('btnAuswaehlen');
            buttonDisable(false);
          },
          dismiss: true,
          class: ['u-min-w-120'],
        },
        {
          text: 'Vergleichen & manuell speichern',
          /** Pausiert AutoSave, markiert die Abweichungen und zeigt das Review-Banner; gespeichert wird erst dessen "Übernehmen". */
          function: () => {
            setAutoSaveEnabled(false);
            buttonDisable(true);

            applyConflictToTables(dataServer, changedMonthsByStorage, 'markieren-zuerst');

            showReviewBanner(buildReviewResources(grouped), async () => {
              setAutoSaveEnabled(true);
              buttonDisable(false);
              await flushAll();
            });

            Storage.remove('dataServer');
            clearLoading('btnAuswaehlen');
          },
          dismiss: true,
          class: ['u-min-w-120'],
        },
      ],
    });
  } else {
    clearLoading('btnAuswaehlen');
    buttonDisable(false);
  }

  // Pending AutoSave-Timer abbrechen, bevor neu geladen wird — sonst zeigt der Status-Indicator
  // nach dem Reload bis zu 10s fälschlich 'pending', obwohl alle Rows 'unchanged' sind.
  cancelAllPending();

  // Immer laden: die Sync-Ergebnisse sind lokale Daten, sofern der Abgleich sie nicht durch Serverdaten ersetzt hat.
  for (const resource of resourceDefs()) {
    document.querySelector<CustomHTMLTableElement>(`#${resource.tableId}`)?.instance.rows.load(rowsOf(resource.key));
  }

  for (const resource of resourceDefs()) {
    document
      .querySelector<CustomHTMLTableElement>(`#${resource.tableId}`)
      ?.instance.rows.setFilter(
        row => isRowInMonat(resource, row, monat) && (resource.minYear === undefined || jahr >= resource.minYear),
      );
  }

  await generateTableBerechnung(datenBerechnung, datenGeld);
  await generateEingabeMaskeEinstellungen(vorgabenU);

  updateTabVisibility(vorgabenU.Einstellungen?.aktivierteTabs);
  await syncFeatureTabs(vorgabenU.Einstellungen?.aktivierteTabs);
  // Formular-Vorlagen-Cache im Hintergrund vorwaermen (nicht blockierend) -- damit ein
  // spaeterer PDF-Export auch nach Verbindungsabbruch funktioniert.
  warmeFormularCaches(vorgabenU.Einstellungen?.aktivierteTabs, monat, jahr);
  setNavigationSichtbar(true);
  document.querySelector<HTMLDivElement>('#startSchnellzugriff')?.classList.remove('d-none');
  createSnackBar({
    message: `Neue Daten geladen.`,
    status: 'success',
    timeout: 3000,
    fixed: true,
  });
}
