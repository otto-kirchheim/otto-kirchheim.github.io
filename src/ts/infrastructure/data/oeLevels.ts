/**
 * OE-Ebenen ↔ Anzeigeform.
 *
 * Spiegelt `joinOeSegments`/`tokenizeOeInput` aus dem Backend
 * (`src/utils/oe-scope.ts`). Lokal dupliziert statt importiert, da laut
 * Shared-Library-Entscheidung vorerst nur Typen und Daten-Konstanten geteilt
 * werden, keine Funktionen.
 *
 * Gespeichert wird die OE als Ebenen-Array; Eingabe und Anzeige laufen weiter
 * über ein einzelnes Textfeld.
 */

/** Zerlegt eine Eingabe wie "V.IW-MI-M-KSL-IL 03" in ihre Ebenen. */
export function splitOeInput(value: string): string[] {
  return value
    .trim()
    .replace(/\//g, '-')
    .replace(/\s+/g, ' ')
    .split(/[.\-\s]+/)
    .map(segment => segment.trim())
    .filter(Boolean);
}

/**
 * Fügt Ebenen zur kanonischen Schreibweise zusammen: die ersten beiden mit `.`,
 * weitere mit `-`, eine rein numerische letzte Ebene (Teamnummer) mit Leerzeichen.
 */
export function joinOeLevels(levels: string[]): string {
  const segments = levels.map(level => level.trim()).filter(Boolean);
  if (segments.length === 0) return '';
  if (segments.length === 1) return segments[0];

  const [level1, level2, ...remainingLevels] = segments;
  const base = `${level1}.${level2}`;
  if (remainingLevels.length === 0) return base;

  const lastSegment = remainingLevels[remainingLevels.length - 1];
  const hasNumericTeamSuffix = /^\d+$/.test(lastSegment) && remainingLevels.length >= 2;

  if (!hasNumericTeamSuffix) return `${base}-${remainingLevels.join('-')}`;

  const beforeTeamNumber = remainingLevels.slice(0, -1).join('-');
  return `${base}-${beforeTeamNumber} ${lastSegment}`;
}
