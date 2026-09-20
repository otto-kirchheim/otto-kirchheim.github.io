import type { IVorgabenBerechnung, IVorgabenGeld, IVorgabenU } from '@/types';
import { default as Storage } from '@/infrastructure/storage/Storage';
import { default as clearLoading } from '@/infrastructure/ui/clearLoading';
import calculateBerechnungRows from './calculateBerechnungRows';
import { mountBerechnungMobileCards, mountBerechnungTableRows } from './components/mountBerechnung';
import { wendeMonatsFensterAn } from './berechnungMonatsFenster';
import { type IBerechnungGruppe, ladeBerechnungsTeile } from './ladeBerechnungsTeile';

/**
 * Rendert die Berechnungsansicht (Monatskarten und Tabellenzeilen) und wendet danach das Monats-Fenster an.
 * Wartet auf das Laden der Berechnungs-Slots der Features. Bei `true` wird nur der Lade-Zustand von `btnNeuBerech` zurückgesetzt.
 *
 * @param datenBerechnung - Berechnungsdaten des Jahres; `true` = noch keine Daten vorhanden.
 * @param datenGeldVorgabe - Geld-Vorgaben; Standard aus dem Storage (`VorgabenGeld`).
 */
export default async function generateTableBerechnung(
  datenBerechnung: true | IVorgabenBerechnung,
  datenGeldVorgabe: IVorgabenGeld = Storage.get<IVorgabenGeld>('VorgabenGeld', { check: true }),
): Promise<void> {
  if (datenBerechnung === true) return clearLoading('btnNeuBerech');

  const teile = await ladeBerechnungsTeile();

  const vorgabenU = Storage.get<IVorgabenU>('VorgabenU', { check: true });
  const tarifKraft = vorgabenU.Pers.TB;
  const aktivierteTabs = vorgabenU.Einstellungen?.aktivierteTabs;

  const monatsErgebnisse = calculateBerechnungRows(datenBerechnung, datenGeldVorgabe, tarifKraft, teile);
  const gruppen: IBerechnungGruppe[] = teile.map(teil => ({ ...teil, extra: teil.part.vorbereite?.() }));
  mountBerechnungMobileCards(monatsErgebnisse, aktivierteTabs, gruppen);
  mountBerechnungTableRows(monatsErgebnisse, gruppen, aktivierteTabs);

  wendeMonatsFensterAn();
}
