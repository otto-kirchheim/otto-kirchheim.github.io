import { aktualisiereBerechnung } from '../../Berechnung';
import { getBereitschaftsEinsatzDaten, getBereitschaftsZeitraumDaten } from '../../Bereitschaft/utils';
import { getEwtDaten } from '../../EWT/utils';
import { generateEingabeMaskeEinstellungen } from '../../Einstellungen/utils';
import type { CustomHTMLTableElement, IDatenBE, IDatenBZ, IDatenEWT, IDatenN, UserDatenServer } from '../../interfaces';
import { getNebengeldDaten } from '../../Neben/utils';
import { getMonatFromBE, getMonatFromBZ, getMonatFromN, isEwtInMonat, Storage } from '../../utilities';
import { scheduleAutoSave } from '../../utilities/autoSave';

function applyDataToTable(selector: string, data: object[]): void {
  const table = document.querySelector<CustomHTMLTableElement>(selector);
  table?.instance.rows.load(data);
}

export default function overwriteUserDaten(): void {
  const dataServer: Partial<UserDatenServer> = Storage.get<Partial<UserDatenServer>>('dataServer', { default: {} });
  console.log({ dataServer });

  const Monat: number = Storage.get<number>('Monat', { check: true });

  if (dataServer.vorgabenU) {
    console.log('VorgabenU überschreiben');
    Storage.set('VorgabenU', dataServer.vorgabenU);
    applyDataToTable('#tableVE', [...Object.values(dataServer.vorgabenU.vorgabenB)]);
    generateEingabeMaskeEinstellungen(dataServer.vorgabenU);
    delete dataServer.vorgabenU;
  }
  if (dataServer.BZ) {
    console.log('DatenBZ überschreiben');
    Storage.set('dataBZ', dataServer.BZ);
    applyDataToTable('#tableBZ', getBereitschaftsZeitraumDaten(dataServer.BZ, undefined, { scope: 'all' }));
    document
      .querySelector<CustomHTMLTableElement>('#tableBZ')
      ?.instance.rows.setFilter(row => getMonatFromBZ(row as IDatenBZ) === Monat);
    scheduleAutoSave('BZ');
    delete dataServer.BZ;
  }
  if (dataServer.BE) {
    console.log('DatenBE überschreiben');
    Storage.set('dataBE', dataServer.BE);
    applyDataToTable('#tableBE', getBereitschaftsEinsatzDaten(dataServer.BE, undefined, { scope: 'all' }));
    document
      .querySelector<CustomHTMLTableElement>('#tableBE')
      ?.instance.rows.setFilter(row => getMonatFromBE(row as IDatenBE) === Monat);
    scheduleAutoSave('BE');
    delete dataServer.BE;
  }
  if (dataServer.EWT) {
    console.log('DatenE überschreiben');
    Storage.set('dataE', dataServer.EWT);
    applyDataToTable('#tableE', getEwtDaten(dataServer.EWT, undefined, { scope: 'all' }));
    document
      .querySelector<CustomHTMLTableElement>('#tableE')
      ?.instance.rows.setFilter(row => isEwtInMonat(row as IDatenEWT, Monat));
    scheduleAutoSave('EWT');
    delete dataServer.EWT;
  }
  if (dataServer.N) {
    console.log('DatenN überschreiben');
    Storage.set('dataN', dataServer.N);
    applyDataToTable('#tableN', getNebengeldDaten(dataServer.N, undefined, { scope: 'all' }));
    document
      .querySelector<CustomHTMLTableElement>('#tableN')
      ?.instance.rows.setFilter(row => getMonatFromN(row as IDatenN) === Monat);
    scheduleAutoSave('N');
    delete dataServer.N;
  }
  aktualisiereBerechnung();

  Storage.remove('dataServer');
}
