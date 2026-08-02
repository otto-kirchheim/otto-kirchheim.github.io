import { useRef, useState } from 'preact/hooks';
import { joinOeLevels, splitOeInput } from '@/infrastructure/data/oeLevels';
import { MAX_OE_LEVELS, OeLevelInputs } from './OeLevelInputs';

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

function levelsFrom(value: string, defaultLevelCount: number): string[] {
  const levels = splitOeInput(value);
  const count = Math.min(MAX_OE_LEVELS, Math.max(1, levels.length, defaultLevelCount));
  return Array.from({ length: count }, (_, index) => levels[index] ?? '');
}

/**
 * Mehrfeld-Eingabe für eine einzelne OE-Kette: ein Textfeld pro Ebene statt
 * eines zusammengesetzten Strings. String-in/String-out über `value`/`onChange`
 * hält die Aufrufstellen unverändert (sie arbeiten bereits mit dem kanonischen
 * OE-String aus `joinOeLevels`). Die Ebenen liegen zusätzlich lokal, damit eine
 * zwischendurch leere Ebene nicht sofort wegnormalisiert wird.
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
  const lastEmitted = useRef(value);

  // Externe Änderung (z.B. Reset nach dem Hinzufügen einer Tag-OE) übernehmen,
  // eigene Emissionen ignorieren.
  if (value !== lastEmitted.current) {
    lastEmitted.current = value;
    setLevels(levelsFrom(value, defaultLevelCount));
  }

  function emit(next: string[]): void {
    const joined = joinOeLevels(next);
    lastEmitted.current = joined;
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
