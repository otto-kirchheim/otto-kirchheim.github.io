import { useState } from 'react';

import { DBButton, DBInput, DBTag, DBTooltip, DBStack } from '@db-ux/react-core-components';

type StuetzpunktTagInputProps = {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
};

/**
 * Tag-Liste freier Stützpunkt-Strings (Abgleich gegen `Pers.ErsteTkgSt`), Eingabe über ein einfaches
 * Textfeld statt `OeLevelBoxes` — Stützpunkt hat keine Ebenen-Hierarchie wie OE.
 *
 * @param props - `label`, `values`/`onChange` (Liste der Stützpunkt-Strings), `disabled`, `placeholder`.
 */
export function StuetzpunktTagInput({
  label,
  values,
  onChange,
  disabled = false,
  placeholder = 'Stützpunkt hinzufügen…',
}: StuetzpunktTagInputProps) {
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
        {values.map((wert, index) => (
          <DBTag
            key={`${wert}-${index}`}
            style={disabled ? undefined : { cursor: 'pointer' }}
            title={disabled ? undefined : 'Zum Bearbeiten anklicken'}
            semantic="informational"
            emphasis="strong"
            behavior={disabled ? 'static' : 'removable'}
            removeButton={`${wert} entfernen`}
            onRemove={() => handleRemove(index)}
            onClick={disabled ? undefined : () => handleEdit(index)}
          >
            {wert}
          </DBTag>
        ))}
      </DBStack>
      {!disabled && (
        <DBStack direction="row" wrap gap="x-small" alignment="center">
          <DBInput
            type="text"
            variant="floating"
            label={placeholder}
            showLabel={false}
            value={inputValue}
            onChange={e => setInputValue((e.target as HTMLInputElement).value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
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
