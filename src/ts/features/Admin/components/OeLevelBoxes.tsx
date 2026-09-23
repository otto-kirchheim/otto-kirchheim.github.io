import { useState } from 'react';

import { joinOeLevels, splitOeInput } from '@/shared/lib/ressource/oeLevels';
import { MAX_OE_LEVELS } from '../utils/bulkEditOe';
import { OeLevelInputs } from './OeLevelInputs';

type OeLevelBoxesProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  allowAddRemove?: boolean;
  /** Anzahl leerer Boxen, solange kein Wert gesetzt ist (z.B. Tiefe der aktuellen OE). */
  defaultLevelCount?: number;
  /** Bisherige Werte je Ebene als Platzhalter; ausgefüllte Boxen werden dann hervorgehoben. */
  placeholders?: string[];
};

/**
 * Zerlegt den OE-String in Ebenen und füllt mit leeren Feldern auf mindestens `defaultLevelCount` (höchstens `MAX_OE_LEVELS`) auf.
 *
 * @param value - Kanonischer OE-String.
 * @param defaultLevelCount - Mindestanzahl Ebenen, solange `value` weniger enthält.
 * @returns Ebenen-Array mit `''` für leere Positionen.
 */
function levelsFrom(value: string, defaultLevelCount: number): string[] {
  const levels = splitOeInput(value);
  const count = Math.min(MAX_OE_LEVELS, Math.max(1, levels.length, defaultLevelCount));
  return Array.from({ length: count }, (_, index) => levels[index] ?? '');
}

/**
 * Mehrfeld-Eingabe für eine einzelne OE-Kette: ein Textfeld pro Ebene, nach außen aber String-in/
 * String-out (kanonischer OE-String aus `joinOeLevels`). Die Ebenen liegen zusätzlich lokal, damit
 * eine zwischendurch leere Ebene nicht sofort wegnormalisiert wird.
 *
 * @param props - `value`/`onChange` (OE-String), `disabled`, `allowAddRemove` (Ebenen hinzufügen/entfernen),
 *   `defaultLevelCount` und `placeholders` (bisherige Werte je Ebene).
 */
export function OeLevelBoxes({
  value,
  onChange,
  disabled = false,
  allowAddRemove = true,
  defaultLevelCount = 1,
  placeholders,
}: OeLevelBoxesProps) {
  const [levels, setLevels] = useState(() => levelsFrom(value, defaultLevelCount));
  // Zuletzt gesehener/emittierter Wert als State statt Ref: erlaubt das Nachziehen bei
  // Prop-Wechsel in der Renderphase, ohne während des Renderns eine Ref zu schreiben.
  const [lastEmitted, setLastEmitted] = useState(value);

  // Externe Änderung (z.B. Reset nach dem Hinzufügen einer Tag-OE) übernehmen, eigene Emissionen nicht.
  if (value !== lastEmitted) {
    setLastEmitted(value);
    setLevels(levelsFrom(value, defaultLevelCount));
  }

  /**
   * Übernimmt neue Ebenen lokal und meldet den daraus zusammengesetzten OE-String an `onChange`.
   *
   * @param next - Neue Ebenen (leere bleiben lokal erhalten).
   */
  function emit(next: string[]): void {
    const joined = joinOeLevels(next);
    setLastEmitted(joined);
    setLevels(next);
    onChange(joined);
  }

  return (
    <OeLevelInputs
      levels={levels}
      disabled={disabled}
      placeholders={placeholders}
      highlightFilled={placeholders !== undefined}
      ariaLabel={index => `OE-Ebene ${index + 1}`}
      onChangeLevel={(index, newValue) => emit(levels.map((level, i) => (i === index ? newValue : level)))}
      onAddLevel={allowAddRemove ? () => setLevels([...levels, '']) : undefined}
      onRemoveLevel={allowAddRemove ? () => emit(levels.slice(0, -1)) : undefined}
    />
  );
}
