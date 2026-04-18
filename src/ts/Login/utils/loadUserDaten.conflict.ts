import { Row } from '../../class/CustomTable';
import type { CustomTableTypes } from '../../class/CustomTable';
import type { CustomHTMLTableElement, IDatenBE, IDatenBZ, IDatenEWT, IDatenN } from '../../interfaces';
import type { TStorageData } from '../../utilities/Storage';
import dayjs from 'dayjs';
import { normalizeRows, rowMatchesMonth } from './loadUserDaten.helpers';
import type { UnterschiedNachMonat } from './loadUserDaten.sync';

export function createChangedMonthsByStorage(vorhanden: UnterschiedNachMonat[]): Map<TStorageData, Set<number>> {
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

  return changedMonthsByStorage;
}

export function groupUnterschiedeByResource(vorhanden: UnterschiedNachMonat[]): Map<string, UnterschiedNachMonat[]> {
  const grouped = new Map<string, UnterschiedNachMonat[]>();

  vorhanden.forEach(unterschied => {
    const key = unterschied.beschreibung;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(unterschied);
  });

  return grouped;
}

export function buildUnterschiedeMessage(grouped: Map<string, UnterschiedNachMonat[]>): string {
  const unterschiedeText = Array.from(grouped.entries())
    .map(([ressource, unterschiede]) => {
      const sortedUnterschiede = unterschiede.sort((a, b) => a.monat - b.monat);
      const monatDetails = sortedUnterschiede
        .map(
          unterschied =>
            `${dayjs()
              .month(unterschied.monat - 1)
              .format(
                'MMM',
              )}: <strong>${unterschied.lokal}</strong> (lokal) → <strong>${unterschied.server}</strong> (Server)`,
        )
        .join('<br/>');

      return `<li><strong>${ressource}:</strong><br/><span style="margin-left: 0.85rem; display: block; font-size: clamp(0.92rem, 2.7vw, 0.98rem); line-height: 1.35;">${monatDetails}</span></li>`;
    })
    .join('');

  return `
      <b>Unterschiede erkannt:</b><br/>
      <ul style="margin: 0.5rem 0; padding-left: 1.5rem; font-size: clamp(0.95rem, 2.8vw, 1rem); line-height: 1.35;">
        ${unterschiedeText}
      </ul>
      <span style="opacity: 0.85; display: block; font-size: clamp(0.92rem, 2.6vw, 0.98rem); line-height: 1.35;">
        Wählen Sie: Serverdaten übernehmen oder lokale Daten behalten und überprüfen.
      </span>
    `;
}

export function buildReviewResources(
  grouped: Map<string, UnterschiedNachMonat[]>,
): { name: string; months: number[] }[] {
  return Array.from(grouped.entries()).map(([name, unterschiede]) => ({
    name,
    months: [...new Set(unterschiede.map(unterschied => unterschied.monat).filter(month => month > 0))].sort(
      (a, b) => a - b,
    ),
  }));
}

export function markRowsForAutosave(selector: string, storageName: TStorageData, changedMonths: Set<number>): void {
  if (changedMonths.size === 0) return;

  const table = document.querySelector<CustomHTMLTableElement>(selector);
  const rows = table?.instance.rows.array;
  if (!rows) return;

  rows.forEach(row => {
    if (row._state === 'deleted') return;
    if (![...changedMonths].some(month => rowMatchesMonth(storageName, row.cells, month))) return;
    row._state = typeof row._id === 'string' && row._id.length > 0 ? 'modified' : 'new';
  });
}

export function reconcileRowsAsDeleted<T extends CustomTableTypes = IDatenBE | IDatenBZ | IDatenEWT | IDatenN>(
  selector: string,
  storageName: TStorageData,
  serverData: T[],
  changedMonths: Set<number>,
): number {
  const tableEl = document.querySelector<CustomHTMLTableElement>(selector);
  if (!tableEl?.instance?.rows?.array) return 0;
  const table = tableEl.instance;

  const serverIds = new Set(
    serverData
      .filter(row => typeof (row as Record<string, unknown>)._id === 'string')
      .map(row => (row as Record<string, unknown>)._id as string),
  );

  let count = 0;

  table.rows.array.forEach(row => {
    if (row._state === 'deleted') return;
    if (typeof row._id !== 'string') return;
    if (changedMonths.size > 0 && ![...changedMonths].some(month => rowMatchesMonth(storageName, row.cells, month))) {
      return;
    }
    if (serverIds.has(row._id)) return;
    row._state = 'deleted';
    count += 1;
  });

  const existingIds = new Set(
    table.rows.array.filter(row => typeof row._id === 'string').map(row => row._id as string),
  );

  for (const serverRow of serverData) {
    const current = serverRow;
    if (typeof current._id !== 'string') continue;
    if (existingIds.has(current._id)) continue;
    if (changedMonths.size > 0 && ![...changedMonths].some(month => rowMatchesMonth(storageName, serverRow, month))) {
      continue;
    }

    table.rows.array.push(new Row(table, serverRow, 'deleted'));
    count += 1;
  }

  if (count > 0) tableEl.instance.drawRows();
  return count;
}

export function normalizeServerRowsForConflict<T>(rows: unknown): T[] {
  return normalizeRows<T>(rows);
}
