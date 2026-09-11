import { CATEGORY_LABELS } from '../utils/bulkEditOe';
import type { AdminUserRow, BackendProfileTemplate, BulkApplyCategory } from '../utils/api';
import { DBCheckbox, DBRadio } from '@db-ux/react-core-components';
import { DbAuswahl } from '@/components';

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
    <div className="border p-3">
      <div className="fw-semibold mb-2">Daten übernehmen von</div>

      <div className="d-flex flex-column gap-2">
        {SOURCE_OPTIONS.map(([value, label]) => (
          <div key={value}>
            <DBRadio
              size="small"
              name="bulkApplySource"
              id={`bulkApplySource-${value}`}
              label={label}
              checked={applySource === value}
              onChange={() => onApplySourceChange(value)}
            />

            {value === 'template' && applySource === 'template' && (
              <div className="mt-1 ms-4">
                <DbAuswahl
                  beschriftung="Vorlage wählen"
                  dicht
                  value={templateId}
                  onChange={e => onTemplateIdChange((e.target as HTMLSelectElement).value)}
                >
                  <option value="">Vorlage wählen …</option>
                  {templates.map(template => (
                    <option key={template._id} value={template._id}>
                      {template.name} ({template.code})
                    </option>
                  ))}
                </DbAuswahl>
              </div>
            )}

            {value === 'user' && applySource === 'user' && (
              <div className="mt-1 ms-4">
                <DbAuswahl
                  beschriftung="Muster-Benutzer wählen"
                  dicht
                  value={sourceUserId}
                  onChange={e => onSourceUserIdChange((e.target as HTMLSelectElement).value)}
                >
                  <option value="">Benutzer wählen …</option>
                  {selectedUsers.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.fullName || user.userName}
                    </option>
                  ))}
                </DbAuswahl>
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
              <div key={category}>
                <DBCheckbox
                  id={`bulkCategory-${category}`}
                  label={CATEGORY_LABELS[category]}
                  checked={categories.includes(category)}
                  onChange={() => onToggleCategory(category)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
