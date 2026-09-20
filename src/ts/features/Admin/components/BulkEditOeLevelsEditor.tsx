import { OE_TARGET_LABELS } from '../utils/bulkEditOe';
import { OeLevelInputs } from './OeLevelInputs';
import type { BulkOeTargetField } from '../utils/api';
import { DBCheckbox } from '@db-ux/react-core-components';

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
 *
 * @param props - Ebenenwerte, Platzhalter, Ebenen-Callbacks sowie gewählte Ziele (`applyTo`) mit `onToggleTarget`.
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
      <div className="fw-semibold small mb-1">Ebenen ersetzen in</div>

      <div className="d-flex flex-wrap gap-3 mb-2">
        {TARGETS.map(target => (
          <div key={target}>
            <DBCheckbox
              size="small"
              id={`bulkOeTarget-${target}`}
              label={OE_TARGET_LABELS[target]}
              checked={applyTo.has(target)}
              onChange={() => onToggleTarget(target)}
            />
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
          <div className="small text-body-secondary mt-1">
            Nur <span className="fw-semibold text-warning">hervorgehobene</span> Ebenen werden ersetzt — in Listen bei
            jedem Eintrag, der die Ebene hat.
          </div>
        </>
      )}
    </div>
  );
}
