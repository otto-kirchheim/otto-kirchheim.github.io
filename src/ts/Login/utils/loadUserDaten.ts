import { overwriteUserDaten } from '.';
import { aktualisiereBerechnung } from '../../Berechnung';
import generateTableBerechnung from '../../Berechnung/generateTableBerechnung';
import { generateEingabeMaskeEinstellungen } from '../../Einstellungen/utils';
import { createSnackBar } from '../../class/CustomSnackbar';
import type { CustomHTMLTableElement, IDatenBE, IDatenBZ, IDatenEWT, IDatenN, UserDatenServer } from '../../interfaces';
import { flushAll, isAutoSaveEnabled, scheduleAutoSave, setAutoSaveEnabled } from '../../utilities/autoSave';
import { Storage, buttonDisable, clearLoading, getMonatFromEWT, updateTabVisibility } from '../../utilities';
import { type LoadedYearData, loadAllYearData } from '../../utilities/apiService';
import type { TStorageData } from '../../utilities/Storage';
import { getMonatFromBE, getMonatFromBZ, getMonatFromN, isEwtInMonat, normalizeResourceRows } from '../../utilities';
import { Row } from '../../class/CustomTable';
import type { CustomTableTypes } from '../../class/CustomTable';
import dayjs from 'dayjs';
import { hideConflictReviewBanner, showConflictReviewBanner } from '../components';

function isSessionErrorMessage(message: string): boolean {
  return /session ungültig|abgemeldet|token|erneuerung/i.test(message);
}

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

  interface UnterschiedNachMonat {
    beschreibung: string;
    monat: number;
    lokal: number;
    server: number;
  }
  const vorhanden: UnterschiedNachMonat[] = [];
  const monthAwareStorageNames: TStorageData[] = ['dataBZ', 'dataBE', 'dataE', 'dataN'];

  let dataServer: Partial<UserDatenServer> = {};
  if (Storage.check('dataServer')) {
    dataServer = Storage.get('dataServer', { check: true });
    console.log('Unterschiede Server - Client | Bereits vorhanden', dataServer);
  }

  // Hilfsfunktion: zähle Einträge pro Monat
  const countByMonth = (rows: unknown, storageName: TStorageData): Map<number, number> => {
    const normalized = normalizeRows(rows);
    const monthCount = new Map<number, number>();

    normalized.forEach(row => {
      if (!row || typeof row !== 'object') return;
      let m = -1;
      if (storageName === 'dataBZ') m = getMonatFromBZ(row as IDatenBZ);
      else if (storageName === 'dataBE') m = getMonatFromBE(row as IDatenBE);
      else if (storageName === 'dataE') m = getMonatFromEWT(row as IDatenEWT);
      else if (storageName === 'dataN') m = getMonatFromN(row as IDatenN);

      const bucket = m > 0 ? m : 0;
      monthCount.set(bucket, (monthCount.get(bucket) ?? 0) + 1);
    });

    return monthCount;
  };

  const rowMatchesMonth = (storageName: TStorageData, row: unknown, month: number): boolean => {
    if (storageName === 'dataBZ' && row) {
      const m = getMonatFromBZ(row as IDatenBZ);
      return month === 0 ? m <= 0 : m === month;
    }

    if (storageName === 'dataBE' && row) {
      const m = getMonatFromBE(row as IDatenBE);
      return month === 0 ? m <= 0 : m === month;
    }

    if (storageName === 'dataE' && row) {
      const m = getMonatFromEWT(row as IDatenEWT);
      return month === 0 ? m <= 0 : m === month;
    }

    if (storageName === 'dataN' && row) {
      const m = getMonatFromN(row as IDatenN);
      return month === 0 ? m <= 0 : m === month;
    }

    return false;
  };

  // Markiert nur Zeilen aus betroffenen Mismatch-Monaten als geaendert.
  const markRowsForAutosave = (selector: string, storageName: TStorageData, changedMonths: Set<number>): void => {
    if (changedMonths.size === 0) return;

    const table = document.querySelector<CustomHTMLTableElement>(selector);
    const rows = table?.instance.rows.array;
    if (!rows) return;

    rows.forEach(row => {
      if (row._state === 'deleted') return;
      if (![...changedMonths].some(month => rowMatchesMonth(storageName, row.cells, month))) return;
      row._state = typeof row._id === 'string' && row._id.length > 0 ? 'modified' : 'new';
    });
  };

  // Gleiche lokale/serverseitige ID-Differenzen auf 'deleted' ab (beide Richtungen).
  const reconcileRowsAsDeleted = <T extends CustomTableTypes = IDatenBE | IDatenBZ | IDatenEWT | IDatenN>(
    selector: string,
    storageName: TStorageData,
    serverData: T[],
    changedMonths: Set<number>,
  ): number => {
    const tableEl = document.querySelector<CustomHTMLTableElement>(selector);
    if (!tableEl?.instance?.rows?.array) return 0;
    const table = tableEl.instance;

    const serverIds = new Set(
      serverData
        .filter(row => typeof (row as Record<string, unknown>)._id === 'string')
        .map(row => (row as Record<string, unknown>)._id as string),
    );

    let count = 0;

    // 1) Lokal vorhanden, serverseitig fehlend -> lokal als deleted markieren
    table.rows.array.forEach(row => {
      if (row._state === 'deleted') return;
      if (typeof row._id !== 'string') return;
      if (changedMonths.size > 0 && ![...changedMonths].some(m => rowMatchesMonth(storageName, row.cells, m))) return;
      if (serverIds.has(row._id)) return;
      row._state = 'deleted';
      count += 1;
    });

    // 2) Serverseitig vorhanden, lokal fehlend -> als deleted-Zeile einfügen
    const existingIds = new Set(
      table.rows.array.filter(row => typeof row._id === 'string').map(row => row._id as string),
    );

    for (const serverRow of serverData) {
      const r = serverRow;
      if (typeof r._id !== 'string') continue;
      if (existingIds.has(r._id)) continue;
      if (changedMonths.size > 0 && ![...changedMonths].some(m => rowMatchesMonth(storageName, serverRow, m))) continue;

      table.rows.array.push(new Row(table, serverRow, 'deleted'));

      count += 1;
    }

    if (count > 0) tableEl.instance.drawRows();
    return count;
  };

  // Review-Banner unterhalb der Navbar anzeigen.
  const showReviewBanner = (resources: { name: string; months: number[] }[], onSave: () => Promise<void>): void => {
    const mount = document.getElementById('conflictReviewBannerMount');
    if (!mount) return;
    showConflictReviewBanner(mount, resources, onSave);
  };

  // Speichern/Sync für alle Ressourcen
  const syncResource = <T>(
    storageName: TStorageData,
    serverData: T,
    serverTimestamp: number,
    beschreibung: string,
  ): T => {
    const localTs = Storage.getTimestamp(storageName);
    const localData = Storage.check(storageName)
      ? Storage.get<unknown>(storageName, { default: serverData })
      : undefined;

    if (localTs === 0 || serverTimestamp > localTs || shouldRepairMissingIds(storageName, localData, serverData)) {
      // Serverdaten übernehmen oder fehlende _id-Felder/Längenabweichungen reparieren
      Storage.setWithTimestamp(storageName, serverData, serverTimestamp);
      return serverData;
    }

    // Prüfe auf Längenmismatch und Unterschiede pro Monat
    if (localData !== undefined && monthAwareStorageNames.includes(storageName)) {
      const localRows = normalizeRows<unknown>(localData);
      const serverRows = normalizeRows<unknown>(serverData);
      if (localRows.length !== serverRows.length) {
        // Erfasse Unterschiede pro Monat
        const localByMonth = countByMonth(localData as unknown[], storageName);
        const serverByMonth = countByMonth(serverData as unknown[], storageName);
        const allMonths = new Set([...localByMonth.keys(), ...serverByMonth.keys()]);

        allMonths.forEach(m => {
          const localCount = localByMonth.get(m) ?? 0;
          const serverCount = serverByMonth.get(m) ?? 0;
          if (localCount !== serverCount) {
            vorhanden.push({
              beschreibung,
              monat: m,
              lokal: localCount,
              server: serverCount,
            });
          }
        });

        if (storageName === 'dataBZ') dataServer.BZ = serverData as UserDatenServer['BZ'];
        if (storageName === 'dataBE') dataServer.BE = serverData as UserDatenServer['BE'];
        if (storageName === 'dataE') dataServer.EWT = serverData as UserDatenServer['EWT'];
        if (storageName === 'dataN') dataServer.N = serverData as UserDatenServer['N'];
      }
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

  if (vorhanden.length > 0) {
    if (Object.keys(dataServer).length > 0) console.log('Unterschiede Server - Client', dataServer);
    Storage.set('dataServer', dataServer);

    const beschreibungToStorage: Partial<Record<UnterschiedNachMonat['beschreibung'], TStorageData>> = {
      Bereitschaftszeit: 'dataBZ',
      Bereitschaftseinsatz: 'dataBE',
      EWT: 'dataE',
      Nebenbezüge: 'dataN',
    };

    const changedMonthsByStorage = new Map<TStorageData, Set<number>>();
    vorhanden.forEach(unterschied => {
      const storageName = beschreibungToStorage[unterschied.beschreibung];
      if (!storageName) return;

      const months = changedMonthsByStorage.get(storageName) ?? new Set<number>();
      months.add(unterschied.monat);
      changedMonthsByStorage.set(storageName, months);
    });

    const grouped = new Map<string, UnterschiedNachMonat[]>();

    vorhanden.forEach(u => {
      const key = u.beschreibung;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(u);
    });

    // Formatiere gruppiert nach Ressource + Monat
    const unterschiedeText = Array.from(grouped.entries())
      .map(([ressource, unterschiede]) => {
        const sortedUnterschiede = unterschiede.sort((a, b) => a.monat - b.monat);
        const monatDetails = sortedUnterschiede
          .map(
            u =>
              `${dayjs()
                .month(u.monat - 1)
                .format('MMM')}: <strong>${u.lokal}</strong> (lokal) → <strong>${u.server}</strong> (Server)`,
          )
          .join('<br/>');
        return `<li><strong>${ressource}:</strong><br/><span style="margin-left: 0.85rem; display: block; font-size: clamp(0.92rem, 2.7vw, 0.98rem); line-height: 1.35;">${monatDetails}</span></li>`;
      })
      .join('');

    const message = `
      <b>Unterschiede erkannt:</b><br/>
      <ul style="margin: 0.5rem 0; padding-left: 1.5rem; font-size: clamp(0.95rem, 2.8vw, 1rem); line-height: 1.35;">
        ${unterschiedeText}
      </ul>
      <span style="opacity: 0.85; display: block; font-size: clamp(0.92rem, 2.6vw, 0.98rem); line-height: 1.35;">
        Wählen Sie: Serverdaten übernehmen oder lokale Daten behalten und überprüfen.
      </span>
    `;

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
              scheduleAutoSave('BZ');
            }
            if ('BE' in dataServer) {
              markRowsForAutosave('#tableBE', 'dataBE', beMonths);
              scheduleAutoSave('BE');
            }
            if ('EWT' in dataServer) {
              markRowsForAutosave('#tableE', 'dataE', eMonths);
              scheduleAutoSave('EWT');
            }
            if ('N' in dataServer) {
              markRowsForAutosave('#tableN', 'dataN', nMonths);
              scheduleAutoSave('N');
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
              reconcileRowsAsDeleted('#tableBZ', 'dataBZ', normalizeRows(dataServer.BZ) as IDatenBZ[], bzMonths);
            }
            if ('BE' in dataServer) {
              markRowsForAutosave('#tableBE', 'dataBE', beMonths);
              reconcileRowsAsDeleted('#tableBE', 'dataBE', normalizeRows(dataServer.BE) as IDatenBE[], beMonths);
            }
            if ('EWT' in dataServer) {
              markRowsForAutosave('#tableE', 'dataE', eMonths);
              reconcileRowsAsDeleted('#tableE', 'dataE', normalizeRows(dataServer.EWT) as IDatenEWT[], eMonths);
            }
            if ('N' in dataServer) {
              markRowsForAutosave('#tableN', 'dataN', nMonths);
              reconcileRowsAsDeleted('#tableN', 'dataN', normalizeRows(dataServer.N) as IDatenN[], nMonths);
            }

            showReviewBanner(
              Array.from(grouped.entries()).map(([name, unterschiede]) => ({
                name,
                months: [...new Set(unterschiede.map(u => u.monat).filter(m => m > 0))].sort((a, b) => a - b),
              })),
              async () => {
                setAutoSaveEnabled(true);
                buttonDisable(false);
                await flushAll();
              },
            );

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
