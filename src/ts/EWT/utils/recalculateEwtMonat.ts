import type { CustomTable } from '../../class/CustomTable';
import { calculateEwtEintraege, getEwtDaten, persistEwtTableData } from '.';
import { publishDataChanged } from '../../core';
import { createSnackBar } from '../../class/CustomSnackbar';
import type { IDatenEWT, IMonatsDaten, IVorgabenU } from '../../interfaces';
import { isEwtInMonat } from '../../utilities';

type ewtBerechnenType = {
  monat: number;
  daten: IMonatsDaten['EWT'];
  vorgabenU: IVorgabenU;
  tableE: CustomTable<IDatenEWT>;
};

export default function recalculateEwtMonat({ monat, daten, vorgabenU, tableE }: ewtBerechnenType): void {
  if (!monat || !daten || !vorgabenU) throw new Error('Daten fehlen');

  const berechneteMonatsDaten = calculateEwtEintraege(vorgabenU, structuredClone(getEwtDaten(daten, monat)));
  const jahresDaten = getEwtDaten(undefined, undefined, { scope: 'all' });
  const restlicheJahresDaten = jahresDaten.filter(item => !isEwtInMonat(item, monat));

  // Die Tabelle muss den kompletten Jahresbestand behalten, damit spätere Monatswechsel
  // weiterhin auf alle bereits geladenen EWT-Zeilen filtern können.
  tableE.rows.load([...restlicheJahresDaten, ...berechneteMonatsDaten]);
  persistEwtTableData(tableE);

  publishDataChanged();

  createSnackBar({
    message: `EWT<br/>Zeiten berechnet.`,
    status: 'success',
    timeout: 3000,
    fixed: true,
  });
}
