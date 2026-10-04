import dayjs from './configDayjs';

/**
 * Monat und Jahr eines Datumswerts (Zeitraum, zu dem eine Zeile beim Speichern gehoert).
 *
 * @param value - Datumswert der Zeile (String).
 * @param format - Erwartetes Format, z. B. `DD.MM.YYYY`; dann wird strikt geparst. Ohne Angabe: ISO/Standard-Parsing.
 * @returns Monat (1-12) und Jahr, `undefined` bei ungueltigem Datum.
 */
export function periodFromDate(value: unknown, format?: string): { monat: number; jahr: number } | undefined {
  const parsed = format ? dayjs(value as string, format, true) : dayjs(String(value));
  return parsed.isValid() ? { monat: parsed.month() + 1, jahr: parsed.year() } : undefined;
}

/**
 * Monat und Jahr eines Datumswerts fuer das Backend-Dokument; bei ungueltigem Datum die Fallback-Werte.
 *
 * @param value - Datumswert.
 * @param fallbackMonat - Monat bei ungueltigem Datum.
 * @param fallbackJahr - Jahr bei ungueltigem Datum.
 * @param format - Optionales Format; dann strikt geparst.
 * @returns Monat (1-12) und Jahr.
 */
export function resolveYearMonth(
  value: string,
  fallbackMonat: number,
  fallbackJahr: number,
  format?: string,
): { Monat: number; Jahr: number } {
  const period = periodFromDate(value, format);
  return period ? { Monat: period.monat, Jahr: period.jahr } : { Monat: fallbackMonat, Jahr: fallbackJahr };
}
