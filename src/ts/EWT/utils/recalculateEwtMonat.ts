import { calculateEwtEintraege, getEwtDaten, persistEwtTableData } from '.';
import { aktualisiereBerechnung } from '../../Berechnung';
import { createSnackBar } from '../../class/CustomSnackbar';
import type { CustomHTMLTableElement, IDatenEWT, IMonatsDaten, IVorgabenU } from '../../interfaces';

type ewtBerechnenType = {
  monat: number;
  daten: IMonatsDaten['EWT'];
  vorgabenU: IVorgabenU;
};

export default function recalculateEwtMonat({ monat, daten, vorgabenU }: ewtBerechnenType): void {
  if (!monat || !daten || !vorgabenU) throw new Error('Daten fehlen');
  const berechneteDaten = calculateEwtEintraege(vorgabenU, structuredClone(daten));

  const table = document.querySelector<CustomHTMLTableElement<IDatenEWT>>('#tableE');
  if (!table) throw new Error('Tabelle nicht gefunden');
  const ftE = table.instance;
  console.log('save ', { ftE });
  ftE.rows.load(getEwtDaten(berechneteDaten, monat));
  persistEwtTableData(ftE);

  aktualisiereBerechnung();

  createSnackBar({
    message: `EWT<br/>Zeiten berechnet.`,
    status: 'success',
    timeout: 3000,
    fixed: true,
  });
}
