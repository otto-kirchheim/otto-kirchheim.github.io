import dayjs from '../date/configDayjs';
import { warmeVorlagenCache } from './ladeFormular';

/** aktivierteTabs-Wert -> FormularCode (deckt sich mit `FORMULAR_JE_MODUS` in `generatePDF.ts`). */
const FORMULAR_JE_TAB: Record<string, string> = {
  bereitschaft: 'bereitschaft',
  ewt: 'ewt',
  neben: 'ez',
  ea: 'ea',
};

/** Wie in `syncFeatureTabs.ts`: leere Liste = Alt-User, Bereitschaft/EWT/Neben sind dann an. */
const LEGACY_DEFAULT_ON_KEYS = ['bereitschaft', 'ewt', 'neben'];

/**
 * Fuehrt `aufgabe` bei Leerlauf des Browsers aus (spaetestens nach 10 s), sonst per `setTimeout`.
 *
 * @param aufgabe - Auszufuehrende Arbeit.
 */
function plane(aufgabe: () => void): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(aufgabe, { timeout: 10_000 });
  } else {
    setTimeout(aufgabe, 0);
  }
}

/**
 * Vorwaermer fuer den Formular-Vorlagen-Cache, damit ein spaeterer PDF-Export auch funktioniert, wenn
 * die Verbindung nach dem Laden der Seite wegbricht. Laeuft im Hintergrund und blockiert nicht: der
 * Aufrufer (`loadUserDaten.ts`) wartet nicht darauf, die Arbeit haengt zusaetzlich in
 * `requestIdleCallback`.
 *
 * Gecacht wird nur fuer die aktivierten Feature-Tabs und den gewaehlten Monat -- der Cache-Schluessel
 * enthaelt den Stichtag, ein anderer Monat bleibt also ein Cache-Miss, bis er selbst geladen wurde.
 *
 * @param aktivierteTabs - Aktivierte Feature-Tabs der Einstellungen; leer/`undefined` = Alt-User (siehe `LEGACY_DEFAULT_ON_KEYS`).
 * @param monat - Gewaehlter Monat, 1-basiert.
 * @param jahr - Gewaehltes Jahr.
 */
export function warmeFormularCaches(aktivierteTabs: string[] | undefined, monat: number, jahr: number): void {
  const tabs = !aktivierteTabs || aktivierteTabs.length === 0 ? LEGACY_DEFAULT_ON_KEYS : aktivierteTabs;
  const formulare = [...new Set(tabs.map(tab => FORMULAR_JE_TAB[tab]).filter((f): f is string => Boolean(f)))];
  if (formulare.length === 0) return;

  const stichtag = dayjs([jahr, monat - 1, 1]).format('YYYY-MM-DD');

  plane(() => {
    // Sequentiell, damit nicht alle vier Vorlagen-PDFs gleichzeitig ziehen. `warmeVorlagenCache`
    // ist best-effort und wirft nicht -- das `.catch` ist nur der Gurt, damit ein unerwarteter
    // Fehler die restlichen Formulare nicht ueberspringt.
    void formulare.reduce(
      (kette, formular) => kette.then(() => warmeVorlagenCache(formular, stichtag).catch(() => undefined)),
      Promise.resolve(),
    );
  });
}
