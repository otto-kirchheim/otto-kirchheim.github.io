import type { IVorgabenU } from '@/types';
import Storage from '@/infrastructure/storage/Storage';
import { PERS_FIELD_LABELS, validatePersInput } from '@/infrastructure/validation/addressValidation';
import Collapse from 'bootstrap/js/dist/collapse';
import { zeigeTab } from '@/infrastructure/ui/tabController';

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
 * Legt einmalig einen Snapshot der Template-Werte an, gegen den "wurde bearbeitet" geprüft wird.
 * Die Werte kommen aus dem Profile-Template zum Zugangscode und sind daher template-abhängig —
 * ein Vergleich gegen hartkodierte Platzhalter wäre unzuverlässig. Ein vorhandener Snapshot wird
 * nie überschrieben; ohne geladene VorgabenU passiert nichts (Aufruf ist dann später wiederholbar).
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
 */
export function springeZu(tabButtonId: string, collapseId?: string): void {
  const tabButton = document.querySelector<HTMLButtonElement>(tabButtonId);
  if (!tabButton) return;
  const tabZiel = tabButton.getAttribute('data-tab-target') ?? tabButton.getAttribute('aria-controls');

  if ((collapseId || tabZiel) && tabZiel && !zeigeTab(tabZiel)) return;

  if (!collapseId) return;
  const collapseEl = document.querySelector<HTMLElement>(collapseId);
  if (!collapseEl) return;
  try {
    Collapse.getOrCreateInstance(collapseEl).show();
  } catch {
    return;
  }
  collapseEl.closest('.accordion-item')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
