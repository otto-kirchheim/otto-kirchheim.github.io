import { type JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { IVorgabenUfZ } from '@/types';
import { setFahrzeitPanelState } from './fahrzeitPanelState';

interface PanelProps {
  initialRows: IVorgabenUfZ[];
}

const FIELD_LABELS = { key: 'Tätigkeitsstätte', text: 'Beschreibung', value: 'Fahrzeit' } as const;
type FahrzeitField = keyof typeof FIELD_LABELS;

export function FahrzeitenPanel({ initialRows }: PanelProps): JSX.Element {
  const [rows, setRows] = useState<IVorgabenUfZ[]>(initialRows);
  const rowsRef = useRef<IVorgabenUfZ[]>(initialRows);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const focusRowIndex = useRef<number | null>(null);

  // Bridge synchron beim Update setzen: saveEinstellungen() liest den State ggf. bevor
  // ein Effect gelaufen ist (gleiche Begründung wie im ArbeitszeiteingabePanel).
  const updateRows = (updater: (current: IVorgabenUfZ[]) => IVorgabenUfZ[]): void => {
    const next = updater(rowsRef.current);
    rowsRef.current = next;
    setFahrzeitPanelState(next);
    setRows(next);
  };

  useEffect(() => {
    rowsRef.current = rows;
    setFahrzeitPanelState(rows);
  }, [rows]);

  useEffect(() => {
    if (focusRowIndex.current === null) return;
    const input = tbodyRef.current?.querySelector<HTMLInputElement>(
      `tr[data-row-index="${focusRowIndex.current}"] input`,
    );
    focusRowIndex.current = null;
    input?.focus();
  }, [rows]);

  const addRow = (): void => {
    focusRowIndex.current = rows.length;
    updateRows(current => [...current, { key: '', text: '', value: '' }]);
  };

  const updateRow = (index: number, field: FahrzeitField, value: string): void => {
    updateRows(current => current.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const removeRow = (index: number): void => {
    updateRows(current => current.filter((_, i) => i !== index));
  };

  const moveRow = (index: number, direction: 'up' | 'down'): void => {
    updateRows(current => {
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  return (
    <div>
      <table class="table table-bordered table-striped table-hover mt-3" aria-describedby="titelTkgSt">
        <thead>
          <tr class="table-primary align-middle text-center">
            <th id="titelTkgSt">Tätigkeitsstätte</th>
            <th class="w40">Beschreibung</th>
            <th class="w20">Fahrzeit</th>
            <th class="fahrzeiten-aktionen-spalte">Aktionen</th>
          </tr>
        </thead>
        <tbody ref={tbodyRef}>
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} class="text-body-secondary text-center">
                Keine Fahrzeiten hinterlegt.
              </td>
            </tr>
          )}
          {rows.map((row, index) => {
            const fields = Object.keys(FIELD_LABELS) as FahrzeitField[];
            // Teilweise gefüllte Zeile: leere Pflichtfelder (Tätigkeitsstätte, Fahrzeit) als
            // ungültig markieren; Beschreibung ist optional. Vollständig leere Zeilen werden
            // beim Speichern still verworfen und sind daher gültig.
            const hasContent = fields.some(field => row[field] !== '');
            return (
              <tr key={index} data-row-index={index}>
                {fields.map(field => (
                  <td key={field}>
                    <div class="input-group input-group-sm input-group-mobile-fahrzeit">
                      <span class="input-group-text d-md-none">{FIELD_LABELS[field]}</span>
                      <input
                        type={field === 'value' ? 'time' : 'text'}
                        class={`form-control text-center${
                          hasContent && field !== 'text' && row[field] === '' ? ' is-invalid' : ''
                        }`}
                        aria-label={FIELD_LABELS[field]}
                        placeholder={field === 'text' ? 'optional' : undefined}
                        value={row[field]}
                        onInput={e => updateRow(index, field, (e.target as HTMLInputElement).value)}
                      />
                    </div>
                  </td>
                ))}
                <td class="text-center align-middle">
                  <div class="btn-group btn-group-sm fahrzeiten-aktionen" role="group" aria-label="Zeilen-Aktionen">
                    <button
                      type="button"
                      class="btn btn-outline-secondary"
                      onClick={() => moveRow(index, 'up')}
                      disabled={index === 0}
                      title="Nach oben"
                      aria-label="Nach oben verschieben"
                    >
                      <span class="material-icons-round small-icons">arrow_upward</span>
                    </button>
                    <button
                      type="button"
                      class="btn btn-outline-secondary"
                      onClick={() => moveRow(index, 'down')}
                      disabled={index === rows.length - 1}
                      title="Nach unten"
                      aria-label="Nach unten verschieben"
                    >
                      <span class="material-icons-round small-icons">arrow_downward</span>
                    </button>
                    <button
                      type="button"
                      class="btn btn-outline-danger"
                      onClick={() => removeRow(index)}
                      title="Zeile löschen"
                      aria-label="Zeile löschen"
                    >
                      <span class="material-icons-round small-icons">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button
        type="button"
        class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
        onClick={addRow}
      >
        <span class="material-icons-round small-icons">add</span>
        Zeile hinzufügen
      </button>
    </div>
  );
}
