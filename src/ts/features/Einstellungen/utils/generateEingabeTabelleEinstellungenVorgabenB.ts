import { CustomTable } from '@/infrastructure/table/CustomTable';
import type { CustomHTMLTableElement, IVorgabenU, IVorgabenUvorgabenB } from '@/types';
import { default as Storage } from '@/infrastructure/storage/Storage';

/**
 * Laedt `VorgabenB`-Zeilen in die bestehende `#tableVE`-Instanz (seit Achse B des
 * `useReducer`-Umbaus konstruiert `VorgabenBTable.tsx` -- eine feste, immer gemountete
 * Feature-Komponente, siehe dort -- die Instanz genau einmal; hier wird nur noch
 * nachgeladen). `rows.load()` ist synchron (siehe `Rows.ts`), ein Aufrufer, der direkt danach
 * liest, sieht garantiert den frisch geladenen State.
 */
export default function generateEingabeTabelleEinstellungenVorgabenB(VorgabenB?: {
  [key: string]: IVorgabenUvorgabenB;
}): void {
  VorgabenB ??= Storage.check('VorgabenU') ? Storage.get<IVorgabenU>('VorgabenU', true).VorgabenB : {};

  const table = document.querySelector<CustomHTMLTableElement<IVorgabenUvorgabenB>>('#tableVE');
  const ftVE = table?.instance;
  if (!(ftVE instanceof CustomTable)) return;

  ftVE.rows.load([...Object.values(VorgabenB ?? {})]);
}
