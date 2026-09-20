import type { CustomTable } from '@/infrastructure/table/CustomTable';
import { calculateEwtEintraege, getEwtDaten, persistEwtTableData } from '.';
import { publishEvent } from '@/core';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import type { IDatenEWT, IMonatsDaten, IVorgabenU } from '@/types';
import { isEwtInMonat } from '@/infrastructure/date/getMonatFromItem';

type ewtBerechnenType = {
  monat: number;
  daten: IMonatsDaten['EWT'];
  vorgabenU: IVorgabenU;
  tableE: CustomTable<IDatenEWT>;
};

/**
 * Berechnet die Zeiten aller EWT-Einträge eines Monats neu, lädt sie in die Tabelle, persistiert
 * und meldet `data:changed` sowie eine Erfolgs-Snackbar.
 *
 * @param params - Objekt mit `monat` (1-12), `daten` (EWT-Daten des Monats), `vorgabenU` und `tableE`.
 * @throws {Error} Wenn `monat`, `daten` oder `vorgabenU` fehlen.
 */
export default function recalculateEwtMonat({ monat, daten, vorgabenU, tableE }: ewtBerechnenType): void {
  if (!monat || !daten || !vorgabenU) throw new Error('Daten fehlen');

  const berechneteMonatsDaten = calculateEwtEintraege(vorgabenU, structuredClone(getEwtDaten(daten, monat)));
  const jahresDaten = getEwtDaten(undefined, undefined, { scope: 'all' });
  const restlicheJahresDaten = jahresDaten.filter(item => !isEwtInMonat(item, monat));

  // Die Tabelle muss den kompletten Jahresbestand behalten, damit spätere Monatswechsel
  // weiterhin auf alle bereits geladenen EWT-Zeilen filtern können.
  tableE.rows.load([...restlicheJahresDaten, ...berechneteMonatsDaten]);
  persistEwtTableData(tableE);

  publishEvent('data:changed', { resource: 'all', action: 'sync' });

  createSnackBar({
    message: `EWT<br/>Zeiten berechnet.`,
    status: 'success',
    timeout: 3000,
    fixed: true,
  });
}
