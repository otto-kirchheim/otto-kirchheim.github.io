/** Payload-Grenze im Backend (`oeLevelsSchema.max(10)`); real kommen max. ~7 Ebenen vor. */
export const MAX_OE_LEVELS = 10;

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

function widthFor(value: string, placeholder: string): string {
  const chars = Math.max(2, value.length, placeholder.length);
  return `width: calc(${chars}ch + 1.5rem)`;
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
    <div class="d-flex flex-wrap align-items-center gap-1">
      {levels.map((level, index) => {
        const placeholder = placeholders[index] ?? '';
        const changed = highlightFilled && level.trim() !== '';
        return (
          <div key={index} class="d-flex align-items-center gap-1">
            {index > 0 && <span class="text-body-secondary">{separatorBefore(levels, index)}</span>}
            <input
              type="text"
              class={`form-control form-control-sm oe-level-input${changed ? ' border-warning border-2 fw-semibold' : ''}`}
              style={widthFor(level, placeholder)}
              aria-label={ariaLabel(index)}
              placeholder={placeholder}
              value={level}
              disabled={disabled}
              onInput={e => onChangeLevel(index, (e.target as HTMLInputElement).value)}
            />
          </div>
        );
      })}
      {canRemove && (
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary px-1 py-0"
          aria-label="Letzte Ebene entfernen"
          onClick={onRemoveLevel}
        >
          <span class="material-icons-round" style="font-size: 0.9rem; vertical-align: middle">
            remove
          </span>
        </button>
      )}
      {canAdd && (
        <button
          type="button"
          class="btn btn-sm btn-outline-primary px-1 py-0"
          aria-label="Ebene hinzufügen"
          onClick={onAddLevel}
        >
          <span class="material-icons-round" style="font-size: 0.9rem; vertical-align: middle">
            add
          </span>
        </button>
      )}
    </div>
  );
}
