import { useState } from 'react';

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

export function OeTagInput({
  label,
  values,
  onChange,
  disabled = false,
  placeholder = 'OE hinzufügen…',
  defaultLevelCount = 1,
}: OeTagInputProps) {
  const [inputValue, setInputValue] = useState('');

  function handleAdd() {
    const trimmed = inputValue.trim();
    if (!trimmed || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
    setInputValue('');
  }

  function handleRemove(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  return (
    <div className="mb-2">
      <label className="form-label fw-semibold small mb-1">{label}</label>
      <div className="d-flex flex-wrap gap-1 mb-1">
        {values.length === 0 && <span className="text-body-secondary small fst-italic">Keine</span>}
        {values.map((oe, index) => (
          <span key={`${oe}-${index}`} className="badge bg-primary d-inline-flex align-items-center gap-1 py-1 px-2">
            {oe}
            {!disabled && (
              <button
                type="button"
                className="btn-close btn-close-white ms-1"
                style={{ fontSize: '0.55em' }}
                aria-label={`${oe} entfernen`}
                onClick={() => handleRemove(index)}
              />
            )}
          </span>
        ))}
      </div>
      {!disabled && (
        <div className="d-flex flex-wrap align-items-center gap-2">
          <span className="text-body-secondary small">{placeholder}</span>
          <OeLevelBoxes value={inputValue} onChange={setInputValue} defaultLevelCount={defaultLevelCount} />
          <button
            className="btn btn-outline-primary btn-sm"
            type="button"
            onClick={handleAdd}
            disabled={!inputValue.trim()}
          >
            <span className="db-icon db-font-size-sm" data-icon="plus" style={{ verticalAlign: 'middle' }} />
          </button>
        </div>
      )}
    </div>
  );
}
