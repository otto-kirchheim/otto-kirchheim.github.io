import type { CustomTableTypes } from '@/infrastructure/table/CustomTable';
import type { CustomHTMLTableElement, IDatenBE, IDatenBZ, IDatenEA, IDatenEWT, IDatenN } from '@/types';
import type { TStorageData } from '@/infrastructure/storage/Storage';
import dayjs from 'dayjs';
import { normalizeRows, rowMatchesMonth } from './loadUserDaten.helpers';
import type { UnterschiedNachMonat } from './loadUserDaten.sync';

/**
 * Ordnet die Unterschiede den Storage-Keys der Ressourcen zu und sammelt je Key die betroffenen Monate.
 *
 * @param vorhanden - Erkannte Unterschiede.
 * @returns Storage-Key auf die Monate mit Unterschied; Beschreibungen ohne Storage-Zuordnung fehlen.
 */
export function createChangedMonthsByStorage(vorhanden: UnterschiedNachMonat[]): Map<TStorageData, Set<number>> {
  const beschreibungToStorage: Partial<Record<UnterschiedNachMonat['beschreibung'], TStorageData>> = {
    Bereitschaftszeit: 'dataBZ',
    Bereitschaftseinsatz: 'dataBE',
    EWT: 'dataE',
    Erschwerniszulagen: 'dataN',
    Entgeltausgleich: 'dataEA',
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

/**
 * Gruppiert die Unterschiede nach Ressourcenbeschreibung.
 *
 * @param vorhanden - Erkannte Unterschiede.
 * @returns Beschreibung der Ressource auf ihre Unterschiede.
 */
export function groupUnterschiedeByResource(vorhanden: UnterschiedNachMonat[]): Map<string, UnterschiedNachMonat[]> {
  const grouped = new Map<string, UnterschiedNachMonat[]>();

  vorhanden.forEach(unterschied => {
    const key = unterschied.beschreibung;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(unterschied);
  });

  return grouped;
}

/**
 * Baut den HTML-Text des Konfliktdialogs: je Ressource die Monate mit lokalem und Serverwert.
 * Sortiert die Listen in `grouped` dabei nach Monat (in place).
 *
 * @param grouped - Unterschiede je Ressource.
 * @returns HTML für den Konfliktdialog.
 */
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

/**
 * Bereitet die Unterschiede für das Konflikt-Hinweisbanner auf.
 *
 * @param grouped - Unterschiede je Ressource.
 * @returns Ressourcenname mit aufsteigend sortierten, eindeutigen Monaten; Monat 0 (ohne erkennbaren Monat) entfällt.
 */
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

/**
 * Markiert Zeilen der Tabelle, deren Monat in `changedMonths` liegt, als geändert, damit AutoSave sie sendet.
 * Ohne Monate oder ohne Tabelle im DOM passiert nichts.
 *
 * @param selector - CSS-Selektor der Tabelle.
 * @param storageName - Storage-Key der Ressource.
 * @param changedMonths - Betroffene Monate (1-12).
 */
export function markRowsForAutosave(selector: string, storageName: TStorageData, changedMonths: Set<number>): void {
  if (changedMonths.size === 0) return;

  const table = document.querySelector<CustomHTMLTableElement>(selector);
  if (!table) return;

  table.instance.rows.markRowsDirtyByMatch(cells =>
    [...changedMonths].some(month => rowMatchesMonth(storageName, cells, month)),
  );
}

/**
 * Gleicht die Tabelle mit dem Serverbestand ab (`reconcileDeletedRows`) und zeichnet sie bei Änderungen neu.
 *
 * @typeParam T - Zeilentyp der Ressource.
 * @param selector - CSS-Selektor der Tabelle.
 * @param storageName - Storage-Key der Ressource.
 * @param serverData - Aktueller Serverbestand.
 * @param changedMonths - Zu prüfende Monate; leer bedeutet alle Zeilen.
 * @returns Anzahl abgeglichener Zeilen; 0 ohne Tabelle.
 */
export function reconcileRowsAsDeleted<
  T extends CustomTableTypes = IDatenBE | IDatenBZ | IDatenEWT | IDatenN | IDatenEA,
>(selector: string, storageName: TStorageData, serverData: T[], changedMonths: Set<number>): number {
  const tableEl = document.querySelector<CustomHTMLTableElement>(selector);
  if (!tableEl?.instance?.rows) return 0;

  /**
   * Trifft Zeilen der geänderten Monate; ohne Monatsangabe alle.
   *
   * @param cells - Zellen einer Tabellenzeile.
   * @returns `true`, wenn die Zeile abgeglichen werden soll.
   */
  const matcher = (cells: unknown): boolean =>
    changedMonths.size === 0 || [...changedMonths].some(month => rowMatchesMonth(storageName, cells, month));

  const count = tableEl.instance.rows.reconcileDeletedRows(serverData, matcher);
  if (count > 0) tableEl.instance.drawRows();
  return count;
}

/**
 * Normalisiert Server-Zeilen für den Konfliktabgleich (`normalizeRows`).
 *
 * @typeParam T - Zeilentyp.
 * @param rows - Rohdaten vom Server.
 * @returns Zeilen-Array.
 */
export function normalizeServerRowsForConflict<T>(rows: unknown): T[] {
  return normalizeRows<T>(rows);
}
