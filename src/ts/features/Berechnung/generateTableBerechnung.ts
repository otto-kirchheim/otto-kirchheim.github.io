import type { IVorgabenBerechnung, IVorgabenGeld, IVorgabenU } from '@/types';
import { default as Storage } from '@/infrastructure/storage/Storage';
import { default as clearLoading } from '@/infrastructure/ui/clearLoading';
import calculateBerechnungRows from './calculateBerechnungRows';
import calculateZulagenBreakdown from './calculateZulagenBreakdown';
import { mountBerechnungMobileCards, mountBerechnungTableRows } from './components/mountBerechnung';
import { wendeMonatsFensterAn } from './berechnungMonatsFenster';

/**
 * Rendert die Berechnungsansicht (Monatskarten und Tabellenzeilen) und wendet danach das Monats-Fenster an.
 * Bei `true` wird nur der Lade-Zustand von `btnNeuBerech` zurückgesetzt.
 *
 * @param datenBerechnung - Berechnungsdaten des Jahres; `true` = noch keine Daten vorhanden.
 * @param datenGeldVorgabe - Geld-Vorgaben; Standard aus dem Storage (`VorgabenGeld`).
 */
export default function generateTableBerechnung(
  datenBerechnung: true | IVorgabenBerechnung,
  datenGeldVorgabe: IVorgabenGeld = Storage.get<IVorgabenGeld>('VorgabenGeld', { check: true }),
): void {
  if (datenBerechnung === true) return clearLoading('btnNeuBerech');

  const vorgabenU = Storage.get<IVorgabenU>('VorgabenU', { check: true });
  const tarifKraft = vorgabenU.Pers.TB;
  const aktivierteTabs = vorgabenU.Einstellungen?.aktivierteTabs;

  const monatsErgebnisse = calculateBerechnungRows(datenBerechnung, datenGeldVorgabe, tarifKraft);
  const zulagenBreakdown = calculateZulagenBreakdown();
  mountBerechnungMobileCards(monatsErgebnisse, aktivierteTabs, zulagenBreakdown);
  mountBerechnungTableRows(monatsErgebnisse, zulagenBreakdown, aktivierteTabs);

  wendeMonatsFensterAn();
}
