import { CATEGORY_LABELS } from '../utils/bulkEditOe';
import type { AdminUserRow, BackendProfileTemplate, BulkApplyCategory } from '../utils/api';

export type ApplySource = 'none' | 'template' | 'user';

const SOURCE_OPTIONS: [ApplySource, string][] = [
  ['none', 'Nichts übernehmen'],
  ['template', 'Vorlage'],
  ['user', 'Muster-Benutzer'],
];

type Props = {
  applySource: ApplySource;
  onApplySourceChange: (source: ApplySource) => void;
  templates: BackendProfileTemplate[];
  templateId: string;
  onTemplateIdChange: (id: string) => void;
  sourceUserId: string;
  onSourceUserIdChange: (id: string) => void;
  selectedUsers: AdminUserRow[];
  categories: BulkApplyCategory[];
  onToggleCategory: (category: BulkApplyCategory) => void;
};

/**
 * "Daten übernehmen von": Radio-Auswahl der Quelle, mit dem passenden Select
 * jeweils direkt unter der gewählten Option eingerückt (statt gemeinsam
 * unterhalb aller Radios), damit die Zugehörigkeit eindeutig ist.
 */
export function BulkEditApplySourceBlock({
  applySource,
  onApplySourceChange,
  templates,
  templateId,
  onTemplateIdChange,
  sourceUserId,
  onSourceUserIdChange,
  selectedUsers,
  categories,
  onToggleCategory,
}: Props) {
  return (
    <div className="border rounded p-3">
      <div className="fw-semibold mb-2">Daten übernehmen von</div>

      <div className="d-flex flex-column gap-2">
        {SOURCE_OPTIONS.map(([value, label]) => (
          <div key={value}>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="bulkApplySource"
                id={`bulkApplySource-${value}`}
                checked={applySource === value}
                onChange={() => onApplySourceChange(value)}
              />
              <label className="form-check-label" htmlFor={`bulkApplySource-${value}`}>
                {label}
              </label>
            </div>

            {value === 'template' && applySource === 'template' && (
              <div className="mt-1 ms-4">
                <select
                  className="form-select form-select-sm"
                  aria-label="Vorlage"
                  value={templateId}
                  onChange={e => onTemplateIdChange((e.target as HTMLSelectElement).value)}
                >
                  <option value="">Vorlage wählen …</option>
                  {templates.map(template => (
                    <option key={template._id} value={template._id}>
                      {template.name} ({template.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {value === 'user' && applySource === 'user' && (
              <div className="mt-1 ms-4">
                <select
                  className="form-select form-select-sm"
                  aria-label="Muster-Benutzer"
                  value={sourceUserId}
                  onChange={e => onSourceUserIdChange((e.target as HTMLSelectElement).value)}
                >
                  <option value="">Benutzer wählen …</option>
                  {selectedUsers.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.fullName || user.userName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>

      {applySource !== 'none' && (
        <div className="mt-3">
          <div className="small text-body-secondary mb-1">
            Persönliche Daten (Name, Personalnummer, Adresse) werden nie übernommen.
          </div>
          <div className="d-flex gap-3 flex-wrap">
            {(Object.keys(CATEGORY_LABELS) as BulkApplyCategory[]).map(category => (
              <div className="form-check" key={category}>
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`bulkCategory-${category}`}
                  checked={categories.includes(category)}
                  onChange={() => onToggleCategory(category)}
                />
                <label className="form-check-label" htmlFor={`bulkCategory-${category}`}>
                  {CATEGORY_LABELS[category]}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
