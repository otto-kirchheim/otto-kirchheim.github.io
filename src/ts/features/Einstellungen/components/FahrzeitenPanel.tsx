import { type JSX, useEffect, useRef, useState } from 'react';

import { DbFeld } from '@/components';
import type { IVorgabenUfZ } from '@/types';
import { normalizeTimeString } from '@/infrastructure/validation/timeString';
import { DBButton, DBStack, DBTooltip } from '@db-ux/react-core-components';
import { setFahrzeitPanelState } from './fahrzeitPanelState';

interface PanelProps {
  initialRows: IVorgabenUfZ[];
}

const FIELD_LABELS = { key: 'Tätigkeitsstätte', text: 'Beschreibung', value: 'Fahrzeit' } as const;
type FahrzeitField = keyof typeof FIELD_LABELS;

type SortField = 'key' | 'text';
type SortState = { field: SortField; direction: 'asc' | 'desc' } | null;

const SORT_BUTTON_STYLE = {
  background: 'none',
  border: 'none',
  padding: 0,
  font: 'inherit',
  color: 'inherit',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
} as const;

// Legacy-Werte wie "0:30" auf "HH:mm" heben – ein type="time"-Input zeigt sie sonst leer an
const normalizeInitialRows = (rows: IVorgabenUfZ[]): IVorgabenUfZ[] =>
  rows.map(row => ({ ...row, value: normalizeTimeString(row.value) }));

export function FahrzeitenPanel({ initialRows }: PanelProps): JSX.Element {
  const [rows, setRows] = useState<IVorgabenUfZ[]>(() => normalizeInitialRows(initialRows));
  const [sort, setSort] = useState<SortState>(null);
  const rowsRef = useRef<IVorgabenUfZ[]>(rows);
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

  // Sortiert die bestehenden Zeilen einmalig neu (kein persistenter Live-Sort -- Tippen in
  // einer Zeile soll sie nicht mitten in der Eingabe verschieben); erneuter Klick auf dieselbe
  // Spalte dreht die Richtung um, analog dem Sortier-Icon-Muster aus `CustomTable`
  // (`arrows_vertical`/`arrow_up`/`arrow_down`, siehe `customTableRender.ts`).
  const toggleSort = (field: SortField): void => {
    const direction = sort?.field === field && sort.direction === 'asc' ? 'desc' : 'asc';
    setSort({ field, direction });
    updateRows(current =>
      [...current].sort((a, b) => {
        const cmp = a[field].localeCompare(b[field], 'de', { sensitivity: 'base' });
        return direction === 'asc' ? cmp : -cmp;
      }),
    );
  };

  const sortIcon = (field: SortField): string =>
    sort?.field === field ? (sort.direction === 'asc' ? 'arrow_up' : 'arrow_down') : 'arrows_vertical';

  return (
    <div
      className="db-table mt-3"
      data-width="full"
      data-variant="zebra"
      data-divider="both"
      data-size="small"
      data-interactive="true"
    >
      <table aria-describedby="titelTkgSt">
        <thead>
          <tr className="align-middle text-center" data-sub-header-emphasis="weak">
            <th id="titelTkgSt">
              <button type="button" style={SORT_BUTTON_STYLE} onClick={() => toggleSort('key')}>
                Tätigkeitsstätte
                <span className="db-icon db-font-size-sm" data-icon={sortIcon('key')} aria-hidden="true" />
              </button>
            </th>
            <th className="w40">
              <button type="button" style={SORT_BUTTON_STYLE} onClick={() => toggleSort('text')}>
                Beschreibung
                <span className="db-icon db-font-size-sm" data-icon={sortIcon('text')} aria-hidden="true" />
              </button>
            </th>
            <th className="w20">Fahrzeit</th>
            <th className="fahrzeiten-aktionen-spalte">Aktionen</th>
          </tr>
        </thead>
        <tbody ref={tbodyRef}>
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="text-body-secondary text-center">
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
                    {/* Die Beschriftung steht ab md im Tabellenkopf; darunter (Karten-Layout)
                        zeigt sie das Feld selbst -- fruehere `input-group-text`-Vorsatzbox. */}
                    <DbFeld
                      className="fahrzeit-feld"
                      beschriftungZeigen
                      dicht
                      type={field === 'value' ? 'time' : 'text'}
                      beschriftung={FIELD_LABELS[field]}
                      feldKlasse="text-center"
                      ungueltig={hasContent && field !== 'text' && row[field] === ''}
                      placeholder={field === 'text' ? 'optional' : undefined}
                      value={row[field]}
                      onChange={e => updateRow(index, field, e.target.value)}
                    />
                  </td>
                ))}
                <td className="text-center align-middle">
                  <DBStack
                    direction="row"
                    wrap={false}
                    gap="2x-small"
                    className="fahrzeiten-aktionen"
                    role="group"
                    aria-label="Zeilen-Aktionen"
                  >
                    <DBButton
                      type="button"
                      variant="outlined"
                      icon="arrow_up"
                      noText
                      onClick={() => moveRow(index, 'up')}
                      disabled={index === 0}
                      aria-label="Nach oben verschieben"
                    >
                      <DBTooltip>Nach oben</DBTooltip>
                    </DBButton>
                    <DBButton
                      type="button"
                      variant="outlined"
                      icon="arrow_down"
                      noText
                      onClick={() => moveRow(index, 'down')}
                      disabled={index === rows.length - 1}
                      aria-label="Nach unten verschieben"
                    >
                      <DBTooltip>Nach unten</DBTooltip>
                    </DBButton>
                    <DBButton
                      type="button"
                      variant="outlined"
                      data-color="critical"
                      icon="bin"
                      noText
                      onClick={() => removeRow(index)}
                      aria-label="Zeile löschen"
                    >
                      <DBTooltip>Zeile löschen</DBTooltip>
                    </DBButton>
                  </DBStack>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <DBButton
        type="button"
        className="d-flex align-items-center gap-1 mt-md-2"
        variant="filled"
        size="small"
        icon="plus"
        onClick={addRow}
      >
        Zeile hinzufügen
      </DBButton>
    </div>
  );
}
