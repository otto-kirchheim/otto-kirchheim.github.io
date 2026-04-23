import { useState } from 'preact/hooks';

type OeTagInputProps = {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function OeTagInput({
  label,
  values,
  onChange,
  disabled = false,
  placeholder = 'OE hinzufügen…',
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

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  }

  return (
    <div class="mb-2">
      <label class="form-label fw-semibold small mb-1">{label}</label>
      <div class="d-flex flex-wrap gap-1 mb-1">
        {values.length === 0 && <span class="text-body-secondary small fst-italic">Keine</span>}
        {values.map((oe, index) => (
          <span key={`${oe}-${index}`} class="badge bg-primary d-inline-flex align-items-center gap-1 py-1 px-2">
            {oe}
            {!disabled && (
              <button
                type="button"
                class="btn-close btn-close-white ms-1"
                style="font-size: 0.55em"
                aria-label={`${oe} entfernen`}
                onClick={() => handleRemove(index)}
              />
            )}
          </span>
        ))}
      </div>
      {!disabled && (
        <div class="input-group input-group-sm">
          <input
            type="text"
            class="form-control form-control-sm"
            placeholder={placeholder}
            value={inputValue}
            onInput={e => setInputValue((e.target as HTMLInputElement).value)}
            onKeyDown={handleKeyDown}
          />
          <button
            class="btn btn-outline-primary btn-sm"
            type="button"
            onClick={handleAdd}
            disabled={!inputValue.trim()}
          >
            <span class="material-icons-round" style="font-size: 1rem; vertical-align: middle">
              add
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
