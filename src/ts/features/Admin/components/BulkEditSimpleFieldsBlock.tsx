import { FIELD_LABELS, type SimpleFieldKey } from '../utils/bulkEditOe';

export const SIMPLE_FIELD_KEYS: SimpleFieldKey[] = ['betrieb', 'gewerk', 'ersteTkgSt', 'ersteTkgStAdresse'];

export type SimpleFieldState = { enabled: boolean; value: string };

type Props = {
  fields: Record<SimpleFieldKey, SimpleFieldState>;
  onChange: (key: SimpleFieldKey, patch: Partial<SimpleFieldState>) => void;
};

/** "Weitere Felder setzen": Betrieb/Gewerk/Erste TkgSt/TkgSt Adresse als Checkbox+Textfeld. */
export function BulkEditSimpleFieldsBlock({ fields, onChange }: Props) {
  return (
    <div className="border rounded p-3">
      <div className="fw-semibold mb-2">Weitere Felder setzen</div>
      <div className="d-flex flex-column gap-2">
        {SIMPLE_FIELD_KEYS.map(key => (
          <div key={key}>
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id={`bulkSimple-${key}`}
                checked={fields[key].enabled}
                onChange={e => onChange(key, { enabled: (e.target as HTMLInputElement).checked })}
              />
              <label className="form-check-label fw-semibold" htmlFor={`bulkSimple-${key}`}>
                {FIELD_LABELS[key]}
              </label>
            </div>
            {fields[key].enabled && (
              <div className="mt-1 ms-4">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder={FIELD_LABELS[key]}
                  aria-label={FIELD_LABELS[key]}
                  value={fields[key].value}
                  onChange={e => onChange(key, { value: (e.target as HTMLInputElement).value })}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
