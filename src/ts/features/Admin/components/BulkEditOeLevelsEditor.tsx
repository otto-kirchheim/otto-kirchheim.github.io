import { OE_TARGET_LABELS } from '../utils/bulkEditOe';
import { OeLevelInputs } from './OeLevelInputs';
import type { BulkOeTargetField } from '../utils/api';

const TARGETS: BulkOeTargetField[] = ['pers', 'teamOes', 'organizationOes'];

type Props = {
  levelValues: string[];
  placeholders: string[];
  onChangeLevel: (index: number, value: string) => void;
  onAddLevel: () => void;
  onRemoveLevel: () => void;
  applyTo: Set<BulkOeTargetField>;
  onToggleTarget: (target: BulkOeTargetField) => void;
};

/**
 * Gemeinsamer Ersetzen-Block: eine Ebenen-Editor-UI, deren Eingabe wahlweise
 * auf Pers.OE und/oder jeden Eintrag der Team-/Org-Admin-OE-Listen angewendet
 * wird (Mehrfachauswahl der Ziele). Die Boxen erscheinen erst mit einem Ziel;
 * die aktuellen Werte stehen nur als Platzhalter darin, damit ausschließlich
 * tatsächlich eingetippte Ebenen ersetzt werden.
 */
export function BulkEditOeLevelsEditor({
  levelValues,
  placeholders,
  onChangeLevel,
  onAddLevel,
  onRemoveLevel,
  applyTo,
  onToggleTarget,
}: Props) {
  return (
    <div>
      <div class="fw-semibold small mb-1">Ebenen ersetzen in</div>

      <div class="d-flex flex-wrap gap-3 mb-2">
        {TARGETS.map(target => (
          <div class="form-check" key={target}>
            <input
              class="form-check-input"
              type="checkbox"
              id={`bulkOeTarget-${target}`}
              checked={applyTo.has(target)}
              onChange={() => onToggleTarget(target)}
            />
            <label class="form-check-label" for={`bulkOeTarget-${target}`}>
              {OE_TARGET_LABELS[target]}
            </label>
          </div>
        ))}
      </div>

      {applyTo.size > 0 && (
        <>
          <OeLevelInputs
            levels={levelValues}
            placeholders={placeholders}
            highlightFilled
            ariaLabel={index => `Ebene ${index + 1} ersetzen`}
            onChangeLevel={onChangeLevel}
            onAddLevel={onAddLevel}
            onRemoveLevel={onRemoveLevel}
          />
          <div class="small text-body-secondary mt-1">
            Nur <span class="fw-semibold text-warning">hervorgehobene</span> Ebenen werden ersetzt — in Listen bei
            jedem Eintrag, der die Ebene hat.
          </div>
        </>
      )}
    </div>
  );
}
