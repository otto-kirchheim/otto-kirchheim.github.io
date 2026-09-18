import type { CSSProperties } from 'react';
import { DBButton, DBTooltip } from '@db-ux/react-core-components';
import { DbFeld } from '@/components';
import { MAX_OE_LEVELS } from '../utils/bulkEditOe';

type OeLevelInputsProps = {
  levels: string[];
  placeholders?: string[];
  onChangeLevel: (index: number, value: string) => void;
  onAddLevel?: () => void;
  onRemoveLevel?: () => void;
  disabled?: boolean;
  ariaLabel: (index: number) => string;
  /** Ausgefüllte Ebenen farblich absetzen — nötig, wo Platzhalter den Alt-Wert zeigen. */
  highlightFilled?: boolean;
};

/**
 * Trenner vor `index` in der kanonischen Schreibweise: `.` nach der ersten
 * Ebene, sonst `-`. Die letzte Ebene bekommt keinen Bindestrich, solange sie
 * leer oder eine Teamnummer ist — beides erzeugt in `joinOeLevels` ebenfalls
 * keinen; der Bindestrich erscheint erst, sobald dort etwas anderes als eine
 * Zahl steht.
 */
function separatorBefore(levels: string[], index: number): string {
  if (index === 1) return '.';

  const trimmed = levels.map(level => level.trim());
  let lastFilled = -1;
  for (let i = 0; i < trimmed.length; i++) if (trimmed[i]) lastFilled = i;

  if (index === trimmed.length - 1 && trimmed[index] === '') return '';
  if (index === lastFilled && lastFilled >= 3 && /^\d+$/.test(trimmed[index])) return '';
  return '-';
}

function widthFor(value: string, placeholder: string): CSSProperties {
  const chars = Math.max(2, value.length, placeholder.length);
  return { width: `calc(${chars}ch + 1.5rem)` };
}

/** Reine Darstellung einer OE-Kette als ein Textfeld je Ebene (positionsgebunden, leere Ebenen bleiben erhalten). */
export function OeLevelInputs({
  levels,
  placeholders = [],
  onChangeLevel,
  onAddLevel,
  onRemoveLevel,
  disabled = false,
  ariaLabel,
  highlightFilled = false,
}: OeLevelInputsProps) {
  const canAdd = onAddLevel && !disabled && levels.length < MAX_OE_LEVELS;
  const canRemove = onRemoveLevel && !disabled && levels.length > 1;

  return (
    <div className="d-flex flex-wrap align-items-center gap-1">
      {levels.map((level, index) => {
        const placeholder = placeholders[index] ?? '';
        const changed = highlightFilled && level.trim() !== '';
        return (
          <div key={index} className="d-flex align-items-center gap-1">
            {index > 0 && <span className="text-body-secondary">{separatorBefore(levels, index)}</span>}
            <DbFeld
              type="text"
              beschriftung={ariaLabel(index)}
              dicht
              feldKlasse={`oe-level-input${changed ? ' border-warning border-2 fw-semibold' : ''}`}
              huelleStyle={widthFor(level, placeholder)}
              placeholder={placeholder}
              value={level}
              disabled={disabled}
              onChange={e => onChangeLevel(index, e.target.value)}
            />
          </div>
        );
      })}
      {canRemove && (
        <DBButton
          type="button"
          className="px-1 py-0"
          variant="outlined"
          size="small"
          icon="minus"
          noText
          aria-label="Letzte Ebene entfernen"
          onClick={onRemoveLevel}
        >
          <DBTooltip>Letzte Ebene entfernen</DBTooltip>
        </DBButton>
      )}
      {canAdd && (
        <DBButton
          type="button"
          className="px-1 py-0"
          variant="outlined"
          size="small"
          icon="plus"
          noText
          aria-label="Ebene hinzufügen"
          onClick={onAddLevel}
        >
          <DBTooltip>Ebene hinzufügen</DBTooltip>
        </DBButton>
      )}
    </div>
  );
}
