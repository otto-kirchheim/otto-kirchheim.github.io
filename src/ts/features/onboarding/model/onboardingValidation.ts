import type { IVorgabenU } from '@/types';
import Storage from '@/shared/lib/storage/Storage';
import { PERS_FIELD_LABELS, validatePersInput } from '@/shared/lib/validation/addressValidation';
import { zeigeTab } from '@/shared/model/navigation/tabController';
import { setOffenenAbschnitt } from '@/shared/model/navigation/offenerAbschnittStore';
import { flushExtern } from '@/shared/lib/react-root/reactRoot';

/** Die 5 Pflichtfelder der persönlichen Daten, die der Nutzer selbst eintragen muss. */
const PERS_FELDER = [
  { key: 'Vorname', label: 'Vorname' },
  { key: 'Nachname', label: 'Nachname' },
  { key: 'PNummer', label: 'Personalnummer' },
  { key: 'Telefon', label: 'Telefon' },
  { key: 'Adress1', label: 'Wohnsitz 1' },
] as const;

type PersFeldKey = (typeof PERS_FELDER)[number]['key'];
type PersSnapshot = Partial<Record<PersFeldKey, string>>;

const PERS_VALIDATION_SELECTORS = Object.keys(PERS_FIELD_LABELS).map(key => `#${key}`);

/**
 * Legt einmalig einen Snapshot der Template-Werte der Pflichtfelder im Storage
 * (`OnboardingPersSnapshot`) ab. Ein vorhandener Snapshot wird nie überschrieben; ohne geladene
 * VorgabenU passiert nichts (Aufruf ist später wiederholbar). Aktuell liest ihn kein Code aus:
 * `validatePersoenlicheDaten` prüft den Formularstand.
 */
export function capturePersSnapshot(): void {
  if (Storage.check('OnboardingPersSnapshot')) return;
  const pers = Storage.get<IVorgabenU>('VorgabenU')?.Pers;
  if (!pers) return;

  const snapshot: PersSnapshot = {};
  for (const feld of PERS_FELDER) snapshot[feld.key] = pers[feld.key] ?? '';
  Storage.set('OnboardingPersSnapshot', snapshot);
}

/**
 * Prüft die sichtbaren Pflichtfelder der persönlichen Daten direkt im Formular.
 * Damit zählt der aktuelle Eingabestand und nicht ein früherer Speicherstand oder Template-Wert.
 * Sind die Felder nicht im DOM, werden die gespeicherten VorgabenU auf leere Pflichtfelder geprüft.
 *
 * @returns `ok` und die Bezeichnungen der offenen Felder.
 */
export function validatePersoenlicheDaten(): { ok: boolean; offeneFelder: string[] } {
  const sichtbareFelder = PERS_VALIDATION_SELECTORS.map(selector =>
    document.querySelector<HTMLInputElement | HTMLSelectElement>(selector),
  ).filter((element): element is HTMLInputElement | HTMLSelectElement => element !== null);

  if (sichtbareFelder.length > 0) {
    const offeneFelder = sichtbareFelder
      .filter(input => !validatePersInput(input))
      .map(input => PERS_FIELD_LABELS[input.id as keyof typeof PERS_FIELD_LABELS]);

    return { ok: offeneFelder.length === 0, offeneFelder };
  }

  const pers = Storage.get<IVorgabenU>('VorgabenU')?.Pers;
  if (!pers) return { ok: false, offeneFelder: PERS_FELDER.map(feld => feld.label) };

  const offeneFelder = PERS_FELDER.filter(feld => (pers[feld.key] ?? '').trim() === '').map(feld => feld.label);

  return { ok: offeneFelder.length === 0, offeneFelder };
}

/**
 * Wechselt zum angegebenen Tab und öffnet optional das passende Einstellungen-Accordion,
 * damit der Nutzer direkt im richtigen Abschnitt landet.
 *
 * @param tabButtonId - CSS-Selektor des Tab-Knopfs; fehlt er, passiert nichts.
 * @param collapseId - Optional CSS-Selektor des Accordion-Abschnitts, der geöffnet und ins Bild gescrollt wird.
 */
export function springeZu(tabButtonId: string, collapseId?: string): void {
  const tabButton = document.querySelector<HTMLButtonElement>(tabButtonId);
  if (!tabButton) return;
  const tabZiel = tabButton.getAttribute('data-tab-target') ?? tabButton.getAttribute('aria-controls');

  if ((collapseId || tabZiel) && tabZiel && !zeigeTab(tabZiel)) return;

  if (!collapseId) return;
  // Die Einstellungen-Abschnitte sind `DBAccordionItem`s mit Zustand im `offenerAbschnittStore`
  // (die Id sitzt am `<li>`); `flushExtern` rendert sofort, damit `scrollIntoView` unten schon
  // die aufgeklappte Höhe sieht. Sitzt die Id direkt am `<details>`, öffnet der Fallback über `open`.
  flushExtern(() => setOffenenAbschnitt(collapseId.replace(/^#/, '')));
  const abschnitt = document.querySelector<HTMLElement>(collapseId);
  if (!abschnitt) return;
  const details = abschnitt instanceof HTMLDetailsElement ? abschnitt : abschnitt.querySelector('details');
  if (details && !details.open) details.open = true;
  abschnitt.closest('.db-accordion-item')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
