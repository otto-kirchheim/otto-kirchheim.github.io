import { calculateEwtEintraege, getEwtDaten, persistEwtTableData } from '.';
import { aktualisiereBerechnung } from '../../Berechnung';
import { createSnackBar } from '../../class/CustomSnackbar';
import type { CustomHTMLTableElement, IDatenEWT, IMonatsDaten, IVorgabenU } from '../../interfaces';
import { isEwtInMonat } from '../../utilities';

type ewtBerechnenType = {
  monat: number;
  daten: IMonatsDaten['EWT'];
  vorgabenU: IVorgabenU;
};

export default function recalculateEwtMonat({ monat, daten, vorgabenU }: ewtBerechnenType): void {
  if (!monat || !daten || !vorgabenU) throw new Error('Daten fehlen');

  const berechneteMonatsDaten = calculateEwtEintraege(vorgabenU, structuredClone(getEwtDaten(daten, monat)));
  const jahresDaten = getEwtDaten(undefined, undefined, { scope: 'all' });
  const restlicheJahresDaten = jahresDaten.filter(item => !isEwtInMonat(item, monat));

  const table = document.querySelector<CustomHTMLTableElement<IDatenEWT>>('#tableE');
  if (!table) throw new Error('Tabelle nicht gefunden');
  const ftE = table.instance;

  // Die Tabelle muss den kompletten Jahresbestand behalten, damit spätere Monatswechsel
  // weiterhin auf alle bereits geladenen EWT-Zeilen filtern können.
  ftE.rows.load([...restlicheJahresDaten, ...berechneteMonatsDaten]);
  persistEwtTableData(ftE);

  aktualisiereBerechnung();

  createSnackBar({
    message: `EWT<br/>Zeiten berechnet.`,
    status: 'success',
    timeout: 3000,
    fixed: true,
  });
}
