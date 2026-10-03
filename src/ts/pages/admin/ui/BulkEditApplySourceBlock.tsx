import { CATEGORY_LABELS } from '../model/bulkEditOe';
import { Gruppe } from '@/shared/ui/gruppe/Gruppe';
import type { AdminUserRow, BackendProfileTemplate, BulkApplyCategory } from '../api/api';
import { DBCheckbox, DBRadio, DBStack } from '@db-ux/react-core-components';
import { DbAuswahl } from '@/shared/ui/form/DbFeld';

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
 *
 * @param props - Gewählte Quelle, Vorlagen bzw. Muster-Benutzer mit Auswahl und die zu übernehmenden Kategorien samt Callbacks.
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
    <Gruppe>
      <div className="fett luft-unten-xs">Daten übernehmen von</div>

      <DBStack direction="column" gap="x-small">
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
              <div className="luft-oben-2xs luft-links-md">
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
              <div className="luft-oben-2xs luft-links-md">
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
      </DBStack>

      {applySource !== 'none' && (
        <div className="luft-oben-sm">
          <div className="zelle-klein farbe-gedaempft luft-unten-2xs">
            Persönliche Daten (Name, Personalnummer, Adresse) werden nie übernommen.
          </div>
          <DBStack direction="row" wrap gap="small">
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
          </DBStack>
        </div>
      )}
    </Gruppe>
  );
}
