import { publishEvent } from '@/core';
import { featureRegistry } from '@/shared/lib/feature';
import { generateEingabeMaskeEinstellungen } from '@/features/Einstellungen/utils';
import { isRowInMonat, resourceDefs } from '@/shared/lib/ressource/resourceConfig';
import { createSnackBar } from '@/shared/ui/snackbar/CustomSnackbar';
import type { CustomTableTypes } from '@/shared/ui/custom-table/CustomTable';
import type { CustomHTMLTableElement, UserDatenServer } from '@/types';
import Storage, { type TStorageData } from '@/shared/lib/storage/Storage';

/**
 * Übernimmt die unter `dataServer` gemerkten Serverdaten: schreibt jede vorhandene Ressource in den
 * Storage und die Tabelle (Filter auf den gewählten Monat), meldet `data:changed` und verwirft
 * `dataServer`. Die Tabellenzeilen baut der lazy Feature-Teil `data`; ohne Tabelle im DOM wird er nicht geladen.
 *
 * @throws {Error} Wenn `Monat` im Storage fehlt.
 */
export default async function overwriteUserDaten(): Promise<void> {
  const dataServer: Partial<UserDatenServer> = Storage.get<Partial<UserDatenServer>>('dataServer', { default: {} });
  console.log({ dataServer });

  const Monat: number = Storage.get<number>('Monat', { check: true });

  if (dataServer.vorgabenU) {
    console.log('VorgabenU überschreiben');
    Storage.set('VorgabenU', dataServer.vorgabenU);
    // Die Bereitschafts-Vorgaben (`#tableVE`) laedt der Einstellungen-Slot der Bereitschaft (`read`).
    await generateEingabeMaskeEinstellungen(dataServer.vorgabenU);
    delete dataServer.vorgabenU;
  }

  for (const resource of resourceDefs()) {
    const serverRows = dataServer[resource.key];
    if (!serverRows) continue;

    console.log(`Daten${resource.key} überschreiben`);
    Storage.set(resource.storageKey as TStorageData, serverRows);

    const table = document.querySelector<CustomHTMLTableElement>(`#${resource.tableId}`);
    if (table) {
      try {
        const featureId = featureRegistry.featureIdOfResource(resource.key);
        const data = featureId ? await featureRegistry.load(featureId, 'data') : undefined;
        const tableRows = data?.tableRows[resource.key]?.(serverRows as unknown[]);
        if (tableRows) table.instance.rows.load(tableRows as CustomTableTypes[]);
      } catch (error) {
        console.error(`Tabelle '${resource.tableId}' konnte nicht aktualisiert werden:`, error);
        createSnackBar({
          message: `Tabelle konnte nicht aktualisiert werden – bitte Seite neu laden.`,
          status: 'error',
          timeout: 5000,
          fixed: true,
        });
      }
      table.instance.rows.setFilter(row => isRowInMonat(resource, row, Monat));
    }
    delete dataServer[resource.key];
  }
  publishEvent('data:changed', { resource: 'all', action: 'sync' });

  Storage.remove('dataServer');
}
