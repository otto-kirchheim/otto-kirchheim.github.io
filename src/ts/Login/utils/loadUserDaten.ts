import { overwriteUserDaten } from '.';
import { aktualisiereBerechnung } from '../../Berechnung';
import generateTableBerechnung from '../../Berechnung/generateTableBerechnung';
import { generateEingabeMaskeEinstellungen } from '../../Einstellungen/utils';
import { createSnackBar } from '../../class/CustomSnackbar';
import type { CustomHTMLTableElement, IDatenBE, IDatenBZ, IDatenEWT, IDatenN, UserDatenServer } from '../../interfaces';
import { Storage, buttonDisable, clearLoading, updateTabVisibility } from '../../utilities';
import { type LoadedYearData, loadAllYearData } from '../../utilities/apiService';
import type { TStorageData } from '../../utilities/Storage';
import { getMonatFromBE, getMonatFromBZ, getMonatFromN, isEwtInMonat, normalizeResourceRows } from '../../utilities';

function isSessionErrorMessage(message: string): boolean {
  return /session ungültig|abgemeldet|token|erneuerung/i.test(message);
}

export default async function loadUserDaten(monat: number, jahr: number): Promise<void> {
  let userData: LoadedYearData | undefined;
  // jahreswechsel wird nicht mehr benötigt

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
  let { vorgabenU, BZ, BE, EWT, N } = userData;

  const normalizeRows = <T>(rows: unknown): T[] => {
    return normalizeResourceRows<T>(rows);
  };

  const hasStringId = (value: unknown): boolean =>
    typeof value === 'object' && value !== null && typeof (value as { _id?: unknown })._id === 'string';

  const serializeRowWithoutMeta = (row: unknown): string => {
    if (row === null || row === undefined) return JSON.stringify(row);
    if (typeof row !== 'object') return JSON.stringify(row);
    if (Array.isArray(row)) return `[${row.map(item => serializeRowWithoutMeta(item)).join(',')}]`;

    const normalized = Object.entries(row as Record<string, unknown>)
      .filter(([key, value]) => !['_id', 'updatedAt', 'createdAt', '__v'].includes(key) && value !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));

    return `{${normalized.map(([key, value]) => `${JSON.stringify(key)}:${serializeRowWithoutMeta(value)}`).join(',')}}`;
  };

  const shouldRepairMissingIds = (storageName: TStorageData, localData: unknown, serverData: unknown): boolean => {
    if (!['dataBZ', 'dataBE', 'dataE', 'dataN'].includes(storageName)) return false;

    const localRows = normalizeRows<Record<string, unknown>>(localData);
    const serverRows = normalizeRows<Record<string, unknown>>(serverData);

    if (localRows.length === 0 || localRows.length !== serverRows.length) return false;
    if (!localRows.some(row => !hasStringId(row))) return false;
    if (!serverRows.every(row => hasStringId(row))) return false;

    const localSignatures = localRows.map(serializeRowWithoutMeta).sort();
    const serverSignatures = serverRows.map(serializeRowWithoutMeta).sort();

    return localSignatures.every((signature, index) => signature === serverSignatures[index]);
  };

  const vorhanden: string[] = [];

  let dataServer: Partial<UserDatenServer> = {};
  if (Storage.check('dataServer')) {
    dataServer = Storage.get('dataServer', { check: true });
    console.log('Unterschiede Server - Client | Bereits vorhanden', dataServer);
  }

  if (Storage.check('Jahreswechsel')) {
    Storage.remove('Jahreswechsel');
  }

  // Speichern/Sync für alle Ressourcen
  const syncResource = <T>(
    storageName: TStorageData,
    serverData: T,
    serverTimestamp: number,
    _beschreibung: string,
  ): T => {
    const localTs = Storage.getTimestamp(storageName);
    const localData = Storage.check(storageName)
      ? Storage.get<unknown>(storageName, { default: serverData })
      : undefined;

    if (localTs === 0 || serverTimestamp > localTs || shouldRepairMissingIds(storageName, localData, serverData)) {
      // Serverdaten übernehmen oder fehlende _id-Felder aus dem Serverzustand reparieren
      Storage.setWithTimestamp(storageName, serverData, serverTimestamp);
      return serverData;
    }

    return (localData as T | undefined) ?? serverData;
  };

  // Ressourcen synchronisieren
  vorgabenU = syncResource(
    'VorgabenU',
    vorgabenU,
    serverTimestamps.VorgabenU ? Date.parse(serverTimestamps.VorgabenU) : 0,
    'Persönliche Daten',
  );
  const willkommen = document.querySelector<HTMLHeadingElement>('#Willkommen');
  if (willkommen) {
    willkommen.innerHTML = `Hallo, ${vorgabenU.pers.Vorname}.`;
  }
  BZ = syncResource(
    'dataBZ',
    BZ,
    serverTimestamps.dataBZ ? Date.parse(serverTimestamps.dataBZ) : 0,
    'Bereitschaftszeit',
  );
  BE = syncResource(
    'dataBE',
    BE,
    serverTimestamps.dataBE ? Date.parse(serverTimestamps.dataBE) : 0,
    'Bereitschaftseinsatz',
  );
  EWT = syncResource('dataE', EWT, serverTimestamps.dataE ? Date.parse(serverTimestamps.dataE) : 0, 'EWT');
  N = syncResource('dataN', N, serverTimestamps.dataN ? Date.parse(serverTimestamps.dataN) : 0, 'Nebenbezüge');

  BZ = normalizeRows(BZ);
  BE = normalizeRows(BE);
  EWT = normalizeRows(EWT);
  N = normalizeRows(N);

  Storage.set('VorgabenGeld', datenGeld);

  const datenBerechnung = aktualisiereBerechnung({ BZ, BE, EWT, N });

  // TODO: Unterschiede auf Monat anpassen?
  if (vorhanden.length > 0) {
    if (Object.keys(dataServer).length > 0) console.log('Unterschiede Server - Client', dataServer);
    Storage.set('dataServer', dataServer);

    createSnackBar({
      message: `<b>Ungespeicherte Daten:</b> <br/>${vorhanden.join('<br/>')}`,
      status: 'info',
      dismissible: false,
      timeout: false,
      fixed: true,
      actions: [
        {
          text: 'Lokale Daten überschreiben',
          function: () => {
            overwriteUserDaten();
            clearLoading('btnAuswaehlen');
            buttonDisable(false);
          },
          dismiss: true,
          class: ['text-primary'],
        },
        {
          text: 'Daten behalten',
          function: () => {
            Storage.remove('dataServer');
            clearLoading('btnAuswaehlen');
            buttonDisable(false);
          },
          dismiss: true,
          class: ['text-secondary'],
        },
      ],
    });
  } else {
    clearLoading('btnAuswaehlen');
    buttonDisable(false);
  }

  if (!('BZ' in dataServer)) document.querySelector<CustomHTMLTableElement>('#tableBZ')?.instance.rows.load(BZ);
  if (!('BE' in dataServer)) document.querySelector<CustomHTMLTableElement>('#tableBE')?.instance.rows.load(BE);
  if (!('EWT' in dataServer)) document.querySelector<CustomHTMLTableElement>('#tableE')?.instance.rows.load(EWT);
  if (!('N' in dataServer)) document.querySelector<CustomHTMLTableElement>('#tableN')?.instance.rows.load(N);
  if (!('vorgabenU' in dataServer))
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
