/**
 * Abschnitt „Zulagen“ des Profil-Vorlagen-Editors: `Einstellungen.benoetigteZulagen` (Auswahl der Zulagen im EZ-Tab).
 * Die Liste bleibt sortiert, damit An- und wieder Abwaehlen keine Aenderung meldet.
 */

/**
 * Liest die benoetigten Zulagen aus dem Rohinhalt.
 *
 * @param einstellungen - Rohwert von `Einstellungen`.
 * @returns Sortierte Zulagen-Codes (nur Strings).
 */
export function benoetigteZulagenAusVorlage(einstellungen: unknown): string[] {
  const liste = (einstellungen as { benoetigteZulagen?: unknown } | undefined)?.benoetigteZulagen;
  return Array.isArray(liste) ? liste.filter((code): code is string => typeof code === 'string').sort() : [];
}
