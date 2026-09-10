import { FIELD_LABELS, type SimpleFieldKey } from '../utils/bulkEditOe';
import { DbFeld } from '@/components';

export const SIMPLE_FIELD_KEYS: SimpleFieldKey[] = ['betrieb', 'gewerk', 'ersteTkgSt', 'ersteTkgStAdresse'];

export type SimpleFieldState = { enabled: boolean; value: string };

type Props = {
  fields: Record<SimpleFieldKey, SimpleFieldState>;
  onChange: (key: SimpleFieldKey, patch: Partial<SimpleFieldState>) => void;
};

/** "Weitere Felder setzen": Betrieb/Gewerk/Erste TkgSt/TkgSt Adresse als Checkbox+Textfeld. */
export function BulkEditSimpleFieldsBlock({ fields, onChange }: Props) {
  return (
    <div className="border p-3">
      <div className="fw-semibold mb-2">Weitere Felder setzen</div>
      <div className="d-flex flex-column gap-2">
        {SIMPLE_FIELD_KEYS.map(key => (
          <div key={key}>
            <div>
              <div className="db-checkbox" data-size="small">
                <label>
                  <input
                    type="checkbox"
                    id={`bulkSimple-${key}`}
                    checked={fields[key].enabled}
                    onChange={e => onChange(key, { enabled: (e.target as HTMLInputElement).checked })}
                  />
                  {FIELD_LABELS[key]}
                </label>
              </div>
            </div>
            {fields[key].enabled && (
              <div className="mt-1 ms-4">
                <DbFeld
                  type="text"
                  beschriftung={`Neuer Wert für ${FIELD_LABELS[key]}`}
                  dicht
                  placeholder={FIELD_LABELS[key]}
                  value={fields[key].value}
                  onChange={e => onChange(key, { value: e.target.value })}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
