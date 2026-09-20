import { type JSX, useEffect, useRef, useState } from 'react';

import { DbAuswahl, DbFeld } from '@/components';
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

// Alte Werte wie "0:30" auf "HH:mm" heben, sonst zeigt ein `type="time"`-Input sie leer an.
/**
 * Normalisiert die Fahrzeit jeder Zeile über `normalizeTimeString`.
 *
 * @param rows - Gespeicherte Fahrzeit-Zeilen.
 * @returns Kopie der Zeilen mit normalisiertem `value`.
 */
const normalizeInitialRows = (rows: IVorgabenUfZ[]): IVorgabenUfZ[] =>
  rows.map(row => ({ ...row, value: normalizeTimeString(row.value) }));

/**
 * Editor für die Fahrzeiten je Tätigkeitsstätte (Zeilen hinzufügen, ändern, verschieben, löschen, sortieren). Meldet jeden Stand an `fahrzeitPanelState`.
 *
 * @param props - `initialRows`: Fahrzeit-Zeilen aus den gespeicherten Vorgaben.
 */
export function FahrzeitenPanel({ initialRows }: PanelProps): JSX.Element {
  const [rows, setRows] = useState<IVorgabenUfZ[]>(() => normalizeInitialRows(initialRows));
  const [sort, setSort] = useState<SortState>(null);
  const [sortFeld, setSortFeld] = useState<SortField>('key');
  const rowsRef = useRef<IVorgabenUfZ[]>(rows);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const focusRowIndex = useRef<number | null>(null);

  // Stand synchron an `fahrzeitPanelState` melden: `saveEinstellungen()` kann ihn lesen, bevor ein Effect gelaufen ist
  // (gleiche Begründung wie im `ArbeitszeiteingabePanel`).
  /**
   * Wendet eine Änderung an und aktualisiert Ref, Panel-State und React-State gemeinsam.
   *
   * @param updater - Berechnet aus den aktuellen Zeilen die neuen.
   */
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

  /**
   * Hängt eine leere Zeile an und fokussiert deren erstes Feld.
   */
  const addRow = (): void => {
    focusRowIndex.current = rows.length;
    updateRows(current => [...current, { key: '', text: '', value: '' }]);
  };

  /**
   * Setzt ein Feld einer Zeile.
   *
   * @param index - Zeilenindex.
   * @param field - Geändertes Feld.
   * @param value - Neuer Feldwert.
   */
  const updateRow = (index: number, field: FahrzeitField, value: string): void => {
    updateRows(current => current.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  /**
   * Entfernt die Zeile.
   *
   * @param index - Zeilenindex.
   */
  const removeRow = (index: number): void => {
    updateRows(current => current.filter((_, i) => i !== index));
  };

  /**
   * Tauscht die Zeile mit ihrem Nachbarn.
   *
   * @param index - Zeilenindex.
   * @param direction - Verschieberichtung; am Rand passiert nichts.
   */
  const moveRow = (index: number, direction: 'up' | 'down'): void => {
    updateRows(current => {
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  // Sortiert die vorhandenen Zeilen einmalig (kein Live-Sort, damit Tippen die Zeile nicht verschiebt).
  // Erneuter Aufruf für dieselbe Spalte dreht die Richtung um; Icons wie in `CustomTableView.tsx`.
  /**
   * Sortiert nach der Spalte (`asc`, bei erneutem Aufruf derselben Spalte `desc`).
   *
   * @param field - Spalte, nach der sortiert wird.
   */
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

  /**
   * Wählt das Sortier-Icon einer Spalte.
   *
   * @param field - Sortierspalte.
   * @returns Icon-Name: Pfeil nach oben/unten für die aktive Spalte, sonst `arrows_vertical`.
   */
  const sortIcon = (field: SortField): 'arrows_vertical' | 'arrow_up' | 'arrow_down' =>
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
      {/* Sortier-Leiste für das Karten-Layout: unter sm blendet `styles.scss` den Tabellenkopf samt Sortier-Knöpfen aus
          (`#collapseFour table thead`), darum eigene Auswahl + Knopf. Ab sm ist sie ausgeblendet. */}
      <DBStack
        direction="row"
        wrap={false}
        gap="small"
        alignment="end"
        className="fahrzeiten-sortierung"
        role="group"
        aria-label="Sortierung"
      >
        <DbAuswahl
          beschriftung="Sortieren nach"
          beschriftungZeigen
          dicht
          value={sortFeld}
          onChange={e => setSortFeld(e.target.value as SortField)}
        >
          <option value="key">Tätigkeitsstätte</option>
          <option value="text">Beschreibung</option>
        </DbAuswahl>
        <DBButton
          type="button"
          variant="outlined"
          size="medium"
          icon={sortIcon(sortFeld)}
          onClick={() => toggleSort(sortFeld)}
        >
          Sortieren
        </DBButton>
      </DBStack>
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
                    {/* Ab sm steht die Beschriftung im Tabellenkopf; darunter (Karten-Layout) zeigt sie das Feld selbst. */}
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
