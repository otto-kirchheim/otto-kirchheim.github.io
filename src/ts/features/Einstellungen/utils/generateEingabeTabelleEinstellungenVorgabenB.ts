import { CustomTable } from '@/infrastructure/table/CustomTable';
import type { CustomHTMLTableElement, IVorgabenU, IVorgabenUvorgabenB } from '@/types';
import { default as Storage } from '@/shared/lib/storage/Storage';

/**
 * Lädt `VorgabenB`-Zeilen in die bestehende `#tableVE`-Instanz. Die Instanz konstruiert `VorgabenBTable.tsx`
 * einmalig beim Mount; ohne Instanz passiert nichts. `rows.load()` ist synchron (siehe `Rows.ts`), ein direkt
 * folgender Lesezugriff sieht den frisch geladenen Stand.
 *
 * @param VorgabenB - Zu ladende Vorgaben; ohne Angabe die gespeicherten aus `VorgabenU` (leer, falls keine vorhanden).
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
