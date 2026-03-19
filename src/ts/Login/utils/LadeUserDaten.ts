import { SaveUserDatenUEberschreiben } from '.';
import { aktualisiereBerechnung } from '../../Berechnung';
import generateTableBerechnung from '../../Berechnung/generateTableBerechnung';
import { DataBE, DataBZ } from '../../Bereitschaft/utils';
import { DataE } from '../../EWT/utils';
import { generateEingabeMaskeEinstellungen } from '../../Einstellungen/utils';
import { DataN } from '../../Neben/utils';
import { createSnackBar } from '../../class/CustomSnackbar';
import type { CustomHTMLTableElement, IVorgabenUvorgabenB, UserDatenServer } from '../../interfaces';
import type { CustomTableTypes } from '../../class/CustomTable';
import { Storage, buttonDisable, clearLoading, updateTabVisibility } from '../../utilities';
import { type LoadedYearData, loadAllYearData } from '../../utilities/apiService';
import type { TStorageData } from '../../utilities/Storage';

export default async function LadeUserDaten(monat: number, jahr: number): Promise<void> {
  let userData: LoadedYearData | undefined;
  // jahreswechsel wird nicht mehr benötigt

  try {
    userData = await loadAllYearData(jahr);
  } catch (err: unknown) {
    console.error(err);
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Server nicht Erreichbar')) return;
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
    loadTable?: { name: string; data: CustomTableTypes[] },
  ): T => {
    const localTs = Storage.getTimestamp(storageName);
    if (localTs === 0 || serverTimestamp > localTs) {
      // Serverdaten übernehmen
      Storage.setWithTimestamp(storageName, serverData, serverTimestamp);
      if (loadTable)
        document.querySelector<CustomHTMLTableElement>(`#${loadTable.name}`)?.instance.rows.load(loadTable.data);
      return serverData;
    }
    return Storage.get<T>(storageName, { default: {} as T });
  };

  // Ressourcen synchronisieren
  vorgabenU = syncResource(
    'VorgabenU',
    vorgabenU,
    serverTimestamps.VorgabenU ? Date.parse(serverTimestamps.VorgabenU) : 0,
    'Persönliche Daten',
    {
      name: 'tableVE',
      data: [...Object.values(vorgabenU.vorgabenB)] as IVorgabenUvorgabenB[],
    },
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
    {
      name: 'tableBZ',
      data: DataBZ(BZ[monat], monat),
    },
  );
  BE = syncResource(
    'dataBE',
    BE,
    serverTimestamps.dataBE ? Date.parse(serverTimestamps.dataBE) : 0,
    'Bereitschaftseinsatz',
    {
      name: 'tableBE',
      data: DataBE(BE[monat], monat),
    },
  );
  EWT = syncResource('dataE', EWT, serverTimestamps.dataE ? Date.parse(serverTimestamps.dataE) : 0, 'EWT', {
    name: 'tableE',
    data: DataE(EWT[monat], monat),
  });
  N = syncResource('dataN', N, serverTimestamps.dataN ? Date.parse(serverTimestamps.dataN) : 0, 'Nebenbezüge', {
    name: 'tableN',
    data: DataN(N[monat], monat),
  });

  Storage.set('VorgabenGeld', datenGeld);

  const datenBerechnung = aktualisiereBerechnung(jahr, { BZ, BE, EWT, N });

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
            SaveUserDatenUEberschreiben();
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

  if (!('BZ' in dataServer))
    document.querySelector<CustomHTMLTableElement>('#tableBZ')?.instance.rows.load(DataBZ(BZ[monat], monat));
  if (!('BE' in dataServer))
    document.querySelector<CustomHTMLTableElement>('#tableBE')?.instance.rows.load(DataBE(BE[monat], monat));
  if (!('EWT' in dataServer))
    document.querySelector<CustomHTMLTableElement>('#tableE')?.instance.rows.load(DataE(EWT[monat], monat));
  if (!('N' in dataServer))
    document.querySelector<CustomHTMLTableElement>('#tableN')?.instance.rows.load(DataN(N[monat], monat));
  if (!('vorgabenU' in dataServer))
    document
      .querySelector<CustomHTMLTableElement>('#tableVE')
      ?.instance.rows.load([...Object.values(vorgabenU.vorgabenB)]);

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
