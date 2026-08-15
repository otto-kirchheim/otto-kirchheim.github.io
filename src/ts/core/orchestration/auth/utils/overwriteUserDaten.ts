import { publishEvent } from '../../..';
import { getBereitschaftsEinsatzDaten, getBereitschaftsZeitraumDaten } from '@/features/Bereitschaft/utils';
import { getEwtDaten } from '@/features/EWT/utils';
import { getEaDaten } from '@/features/EA/utils';
import { generateEingabeMaskeEinstellungen } from '@/features/Einstellungen/utils';
import type { CustomTableTypes } from '@/infrastructure/table/CustomTable';
import type {
  CustomHTMLTableElement,
  IDatenBE,
  IDatenBZ,
  IDatenEA,
  IDatenEWT,
  IDatenN,
  UserDatenServer,
} from '@/types';
import { getNebengeldDaten } from '@/features/Neben/utils';
import {
  getMonatFromBE,
  getMonatFromBZ,
  getMonatFromEA,
  getMonatFromN,
  isEwtInMonat,
} from '@/infrastructure/date/getMonatFromItem';
import Storage from '@/infrastructure/storage/Storage';

function applyDataToTable(selector: string, data: CustomTableTypes[]): void {
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
    applyDataToTable('#tableVE', [...Object.values(dataServer.vorgabenU.VorgabenB)]);
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
    delete dataServer.BZ;
  }
  if (dataServer.BE) {
    console.log('DatenBE überschreiben');
    Storage.set('dataBE', dataServer.BE);
    applyDataToTable('#tableBE', getBereitschaftsEinsatzDaten(dataServer.BE, undefined, { scope: 'all' }));
    document
      .querySelector<CustomHTMLTableElement>('#tableBE')
      ?.instance.rows.setFilter(row => getMonatFromBE(row as IDatenBE) === Monat);
    delete dataServer.BE;
  }
  if (dataServer.EWT) {
    console.log('DatenE überschreiben');
    Storage.set('dataE', dataServer.EWT);
    applyDataToTable('#tableE', getEwtDaten(dataServer.EWT, undefined, { scope: 'all' }));
    document
      .querySelector<CustomHTMLTableElement>('#tableE')
      ?.instance.rows.setFilter(row => isEwtInMonat(row as IDatenEWT, Monat));
    delete dataServer.EWT;
  }
  if (dataServer.N) {
    console.log('DatenN überschreiben');
    Storage.set('dataN', dataServer.N);
    applyDataToTable('#tableN', getNebengeldDaten(dataServer.N, undefined, { scope: 'all' }));
    document
      .querySelector<CustomHTMLTableElement>('#tableN')
      ?.instance.rows.setFilter(row => getMonatFromN(row as IDatenN) === Monat);
    delete dataServer.N;
  }
  if (dataServer.EA) {
    console.log('DatenEA überschreiben');
    Storage.set('dataEA', dataServer.EA);
    applyDataToTable('#tableEA', getEaDaten(dataServer.EA, undefined, { scope: 'all' }));
    document
      .querySelector<CustomHTMLTableElement>('#tableEA')
      ?.instance.rows.setFilter(row => getMonatFromEA(row as IDatenEA) === Monat);
    delete dataServer.EA;
  }
  publishEvent('data:changed', { resource: 'all', action: 'sync' });

  Storage.remove('dataServer');
}
