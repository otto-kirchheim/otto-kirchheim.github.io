import { DBButton, DBStack } from '@db-ux/react-core-components';

import { DbFeld } from '@/shared/ui/form/DbFeld';
import type { AdminVorlagenEditorProps } from '../../adminFeatures';
import type { FahrzeitRow } from './fahrzeit';

/**
 * Editor der Fahrzeit-Einträge (Key, Beschreibung, Wert je Zeile).
 *
 * @param props - Entwurf (`value`), `onChange` fuer jede Aenderung, `disabled` waehrend des Speicherns.
 */
export default function FahrzeitEditor({
  templateId,
  value: rows,
  onChange,
  disabled,
}: AdminVorlagenEditorProps<FahrzeitRow[]>) {
  /** Haengt eine leere Zeile an. */
  const hinzufuegen = () => onChange([...rows, { key: '', text: '', value: '' }]);

  /**
   * Aendert ein Feld einer Zeile.
   *
   * @param index - Zeilenindex.
   * @param field - Geaendertes Feld.
   * @param value - Neuer Wert.
   */
  const aendere = (index: number, field: keyof FahrzeitRow, value: string) => {
    const next = [...rows];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  /**
   * Entfernt eine Zeile.
   *
   * @param index - Zeilenindex.
   */
  const entferne = (index: number) => onChange(rows.filter((_, i) => i !== index));

  return (
    <div className="border p-2 mb-2">
      <DBStack direction="row" wrap alignment="center" justifyContent="space-between" gap="none" className="mb-1">
        <label className="small fw-semibold mb-0">Fahrzeit-Einträge</label>
        <DBButton type="button" variant="outlined" size="small" onClick={hinzufuegen} disabled={disabled} data-disabler>
          Zeile hinzufügen
        </DBButton>
      </DBStack>
      <DBStack direction="column" gap="x-small">
        {rows.length === 0 && <small className="text-body-secondary">Keine Fahrzeit-Einträge vorhanden.</small>}
        {rows.map((row, index) => (
          <div className="raster align-items-end abstand-2" key={`${templateId}-fz-${index}`}>
            <div>
              <DBStack direction="row" alignment="end" gap="x-small" className="feldgruppe admin-fahrzeit-input-group">
                <DbFeld
                  beschriftung="Key"
                  className="admin-fahrzeit-key"
                  placeholder="Key"
                  value={row.key}
                  onChange={e => aendere(index, 'key', (e.target as HTMLInputElement).value)}
                />

                <DbFeld
                  beschriftung="Beschreibung"
                  className="admin-fahrzeit-text"
                  placeholder="Beschreibung"
                  value={row.text}
                  onChange={e => aendere(index, 'text', (e.target as HTMLInputElement).value)}
                />

                <DbFeld
                  beschriftung="Wert"
                  className="admin-fahrzeit-value"
                  type="time"
                  placeholder="Wert"
                  value={row.value}
                  onChange={e => aendere(index, 'value', (e.target as HTMLInputElement).value)}
                />

                <DBButton
                  type="button"
                  variant="outlined"
                  data-color="critical"
                  onClick={() => entferne(index)}
                  disabled={disabled}
                  data-disabler
                >
                  <span className="d-none d-sm-inline">Löschen</span>
                  <span className="d-sm-none">X</span>
                </DBButton>
              </DBStack>
            </div>
          </div>
        ))}
      </DBStack>
    </div>
  );
}
