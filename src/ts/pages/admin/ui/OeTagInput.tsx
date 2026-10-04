import { useState } from 'react';

import { DBButton, DBTag, DBTooltip, DBStack } from '@db-ux/react-core-components';
import { OeLevelBoxes } from './OeLevelBoxes';

type OeTagInputProps = {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Anzahl leerer Eingabefelder für einen neuen Pfad (i.d.R. Tiefe der aktuellen OE). */
  defaultLevelCount?: number;
};

/**
 * Tag-Liste von OE-Pfaden mit Eingabe über `OeLevelBoxes`; ein Tag anklicken übernimmt ihn zum Bearbeiten in die Eingabe.
 *
 * @param props - `label`, `values`/`onChange` (Liste der OE-Strings), `disabled`, `placeholder` und `defaultLevelCount`.
 */
export function OeTagInput({
  label,
  values,
  onChange,
  disabled = false,
  placeholder = 'OE hinzufügen…',
  defaultLevelCount = 1,
}: OeTagInputProps) {
  const [inputValue, setInputValue] = useState('');

  /**
   * Fügt die getrimmte Eingabe der Liste hinzu und leert sie; leere Eingaben und Duplikate werden ignoriert.
   */
  function handleAdd() {
    const trimmed = inputValue.trim();
    if (!trimmed || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
    setInputValue('');
  }

  /**
   * Entfernt den Eintrag an `index` aus der Liste.
   *
   * @param index - Position des Tags in `values`.
   */
  function handleRemove(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  /**
   * Übernimmt den Tag an `index` in die Eingabe und entfernt ihn aus der Liste (Bearbeiten statt nur
   * Löschen). `DBTag` ruft in `onRemove` `stopPropagation()`, der X-Knopf löst das Bearbeiten daher nicht aus.
   *
   * @param index - Position des Tags in `values`.
   */
  function handleEdit(index: number) {
    setInputValue(values[index]);
    onChange(values.filter((_, i) => i !== index));
  }

  return (
    <div className="luft-unten-xs">
      <label className="fett zelle-klein luft-unten-2xs">{label}</label>
      <DBStack direction="row" wrap gap="2x-small" className="luft-unten-2xs">
        {values.length === 0 && <span className="farbe-gedaempft zelle-klein kursiv">Keine</span>}
        {values.map((oe, index) => (
          <DBTag
            key={`${oe}-${index}`}
            style={disabled ? undefined : { cursor: 'pointer' }}
            title={disabled ? undefined : 'Zum Bearbeiten anklicken'}
            semantic="informational"
            emphasis="strong"
            behavior={disabled ? 'static' : 'removable'}
            removeButton={`${oe} entfernen`}
            onRemove={() => handleRemove(index)}
            onClick={disabled ? undefined : () => handleEdit(index)}
          >
            {oe}
          </DBTag>
        ))}
      </DBStack>
      {!disabled && (
        <DBStack direction="row" wrap gap="x-small" alignment="center">
          <span className="farbe-gedaempft zelle-klein">{placeholder}</span>
          <OeLevelBoxes value={inputValue} onChange={setInputValue} defaultLevelCount={defaultLevelCount} />
          <DBButton
            variant="outlined"
            size="small"
            type="button"
            icon="plus"
            noText
            aria-label="Wert hinzufügen"
            onClick={handleAdd}
            disabled={!inputValue.trim()}
          >
            <DBTooltip>Wert hinzufügen</DBTooltip>
          </DBButton>
        </DBStack>
      )}
    </div>
  );
}
