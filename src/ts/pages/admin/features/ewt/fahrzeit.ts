import { normalizeTimeString } from '@/shared/lib/validation/timeString';

/** Daten des Vorlagen-Abschnitts „Fahrzeit“ (Fahrzeiten je Einsatzort): Entwurfstyp und Normalisierung. */

export type FahrzeitRow = { key: string; text: string; value: string };

/**
 * Normalisiert die Fahrzeit-Einträge und verwirft komplett leere Zeilen.
 *
 * @param input - Rohwert von `Fahrzeit`.
 * @returns Zeilen mit String-Feldern; leer bei Nicht-Arrays.
 */
export function normalizeFahrzeit(input: unknown): FahrzeitRow[] {
  if (!Array.isArray(input)) return [];
  return input
    .map(entry => ({
      key: String((entry as { key?: unknown }).key ?? ''),
      text: String((entry as { text?: unknown }).text ?? ''),
      // Legacy-Werte wie "0:30" auf "HH:mm" heben, ein type="time"-Input zeigt sie sonst leer an
      value: normalizeTimeString(String((entry as { value?: unknown }).value ?? '')),
    }))
    .filter(row => row.key || row.text || row.value);
}
