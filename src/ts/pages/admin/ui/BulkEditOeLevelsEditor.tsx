import { OE_TARGET_LABELS } from '../model/bulkEditOe';
import { OeLevelInputs } from './OeLevelInputs';
import type { BulkOeTargetField } from '../api/api';
import { DBCheckbox, DBStack } from '@db-ux/react-core-components';

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
      <div className="fett zelle-klein luft-unten-2xs">Ebenen ersetzen in</div>

      <DBStack direction="row" wrap gap="small" className="luft-unten-xs">
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
      </DBStack>

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
          <div className="zelle-klein farbe-gedaempft luft-oben-2xs">
            Nur <span className="fett farbe-warnung">hervorgehobene</span> Ebenen werden ersetzt — in Listen bei jedem
            Eintrag, der die Ebene hat.
          </div>
        </>
      )}
    </div>
  );
}
