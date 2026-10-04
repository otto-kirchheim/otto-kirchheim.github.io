import { setMonatJahrStore } from '@/shared/model/period/monatJahrStore';
import { flushExtern } from '@/shared/lib/react-root/reactRoot';

/**
 * Setzt Monat und Jahr fuer die Ueberschriften aller Tabs (`monatJahrStore`). Wirft nie: die Tabs lesen den Store
 * selbst (`MonatUeberschrift`), auch wenn sie erst spaeter mounten (`syncFeatureTabs`, je nach `aktivierteTabs`).
 *
 * @param jahr - Jahr.
 * @param monat - Monat 1-12.
 */
export function setMonatsUeberschriften(jahr: number, monat: number): void {
  // Synchron ins DOM, wie das bisherige direkte Schreiben in die Ueberschriften.
  flushExtern(() => setMonatJahrStore(jahr, monat));
}

/**
 * Schreibt Monat und Jahr in alle `#Monat`-Felder und setzt die Tab-Überschriften.
 *
 * @param jahr - Jahr.
 * @param monat - Monat 1-12.
 * @throws {Error} Wenn `#Monat` fehlt.
 */
export default function setMonatJahr(jahr: number, monat: number): void {
  // `#Monat` existiert zweimal (Desktop- und Mobile-Kopie im `AppHeader`).
  const inputMonatElemente = document.querySelectorAll<HTMLInputElement>('#Monat');
  if (inputMonatElemente.length === 0) throw new Error('One or more elements not found.');

  inputMonatElemente.forEach(el => (el.value = monat.toString()));
  setMonatsUeberschriften(jahr, monat);
}
