import { joinOeLevels } from '@/infrastructure/data/oeLevels';
import { OeLevelInputs } from './OeLevelInputs';

export type AdminOeActionMode = 'none' | 'add' | 'remove';
export type AdminOeActionState = { mode: AdminOeActionMode; value: string; levels: string[] };

const MODE_OPTIONS: [AdminOeActionMode, string][] = [
  ['none', 'Keine Änderung'],
  ['add', 'Hinzufügen'],
  ['remove', 'Entfernen'],
];

type Props = {
  field: 'teamOes' | 'organizationOes';
  label: string;
  action: AdminOeActionState;
  onChange: (patch: Partial<AdminOeActionState>) => void;
  existingPaths: string[];
  defaultLevelCount: number;
  /** Gemeinsame Ebenen der Auswahl als Vorlage für den neuen Pfad. */
  placeholders: string[];
};

/**
 * Hinzufügen/Entfernen ganzer OE-Pfade in Team-/Org-Admin-OE-Listen (Ersetzen läuft über
 * BulkEditOeLevelsEditor). Beim Hinzufügen füllen die Platzhalter der Auswahl alle Ebenen,
 * die leer bleiben — anders als beim Ersetzen muss hier ein vollständiger Pfad entstehen.
 */
export function BulkEditAdminOesBlock({
  field,
  label,
  action,
  onChange,
  existingPaths,
  defaultLevelCount,
  placeholders,
}: Props) {
  function effectivePath(levels: string[]): string {
    if (!levels.some(level => level.trim())) return '';
    return joinOeLevels(levels.map((level, index) => level.trim() || placeholders[index] || ''));
  }

  function updateLevels(levels: string[]): void {
    onChange({ levels, value: effectivePath(levels) });
  }

  function selectMode(mode: AdminOeActionMode): void {
    onChange({ mode, value: '', levels: Array.from({ length: Math.max(1, defaultLevelCount) }, () => '') });
  }

  return (
    <div>
      <div className="fw-semibold small mb-1">{label}</div>
      <div className="d-flex gap-3 mb-1 flex-wrap">
        {MODE_OPTIONS.map(([mode, modeLabel]) => (
          <div className="form-check" key={mode}>
            <input
              className="form-check-input"
              type="radio"
              name={`bulkAdminOe-${field}`}
              id={`bulkAdminOe-${field}-${mode}`}
              checked={action.mode === mode}
              onChange={() => selectMode(mode)}
            />
            <label className="form-check-label" htmlFor={`bulkAdminOe-${field}-${mode}`}>
              {modeLabel}
            </label>
          </div>
        ))}
      </div>

      {action.mode === 'add' && (
        <>
          <OeLevelInputs
            levels={action.levels}
            placeholders={placeholders}
            highlightFilled
            ariaLabel={index => `${label}: Ebene ${index + 1}`}
            onChangeLevel={(index, value) =>
              updateLevels(action.levels.map((level, i) => (i === index ? value : level)))
            }
            onAddLevel={() => updateLevels([...action.levels, ''])}
            onRemoveLevel={() => updateLevels(action.levels.slice(0, -1))}
          />
          <div className="small text-body-secondary mt-1">
            {action.value ? (
              <>
                Wird hinzugefügt: <span className="fw-semibold">{action.value}</span>
              </>
            ) : (
              'Leere Ebenen werden aus dem Platzhalter übernommen.'
            )}
          </div>
        </>
      )}

      {action.mode === 'remove' && (
        <select
          className="form-select form-select-sm"
          aria-label={`${label} entfernen`}
          value={action.value}
          onChange={e => onChange({ value: (e.target as HTMLSelectElement).value })}
        >
          <option value="">Pfad wählen …</option>
          {existingPaths.map(path => (
            <option key={path} value={path}>
              {path}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
