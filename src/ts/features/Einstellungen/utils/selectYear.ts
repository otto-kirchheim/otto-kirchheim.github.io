import { default as Storage } from '@/shared/lib/storage/Storage';
import { getUserCookie } from '@/shared/api/token/decodeAccessToken';
import { default as setLoading } from '@/shared/ui/button-loading/setLoading';
import loadUserDaten from '@/app/session/loadUserDaten';
import setMonatJahr from './setMonatJahr';

/**
 * Wählt Monat und Jahr aus: merkt sie im Storage (Jahreswechsel wird vermerkt), aktualisiert die Überschriften und lädt bei angemeldetem Benutzer die Daten. Offline passiert nichts.
 *
 * @param monat - Monat 1-12; ohne Angabe aus `#Monat`.
 * @param jahr - Jahr; ohne Angabe aus `#Jahr`.
 * @throws {Error} Wenn ein benötigtes Eingabefeld fehlt.
 */
export default function selectYear(monat?: number, jahr?: number): void {
  // Kein eigener Offline-Hinweis hier: `setOffline.ts` zeigt bereits eine dauerhafte,
  // globale Banner fuer die ganze Session, solange `navigator.onLine === false`.
  if (!navigator.onLine) return;

  if (!monat) {
    const monatInput = document.querySelector<HTMLInputElement>('#Monat');
    if (!monatInput) throw new Error('Monats Input nicht gefunden');
    monat = +monatInput.value;
  }

  if (!jahr) {
    const jahrInput = document.querySelector<HTMLInputElement>('#Jahr');
    if (!jahrInput) throw new Error('Jahres Input nicht gefunden');
    jahr = +jahrInput.value;
  }

  setLoading('btnAuswaehlen');

  if (Storage.check('Jahr') && Storage.check('Monat'))
    if (!Storage.compare<number>('Jahr', jahr)) Storage.set('Jahreswechsel', true);

  Storage.set('Jahr', jahr);
  Storage.set('Monat', monat);

  setMonatJahr(jahr, monat);

  if (getUserCookie()) void loadUserDaten(monat, jahr);
}
