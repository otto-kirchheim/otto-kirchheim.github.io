import { useState } from 'react';

type Props = {
  value: string;
  onChange: (raw: string) => void;
  error?: string;
};

function buildSummary(raw: string): { label: string; hint: string; valid: boolean } {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const count = parsed.length;
      const hint = count > 0 ? previewValue(parsed[0]) : '—';
      return { label: `Array [${count}]`, hint, valid: true };
    }
    if (parsed !== null && typeof parsed === 'object') {
      const keys = Object.keys(parsed as object);
      const hint = keys.slice(0, 3).join(', ') + (keys.length > 3 ? ', …' : '');
      return { label: `Objekt {${keys.length}}`, hint, valid: true };
    }
    return { label: String(parsed), hint: '', valid: true };
  } catch {
    return { label: 'Ungültiges JSON', hint: '', valid: false };
  }
}

function previewValue(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'object') {
    const keys = Object.keys(v as object);
    return `{${keys.slice(0, 2).join(', ')}${keys.length > 2 ? ', …' : ''}}`;
  }
  return String(v).slice(0, 30);
}

function autoRows(raw: string): number {
  const lines = (raw.match(/\n/g) ?? []).length + 1;
  return Math.min(24, Math.max(5, lines + 1));
}

export function JsonEditor({ value, onChange, error }: Props) {
  const [open, setOpen] = useState(false);

  const { label, hint, valid } = buildSummary(value);
  const hasError = Boolean(error) || !valid;

  function handleFormat() {
    try {
      onChange(JSON.stringify(JSON.parse(value), null, 2));
    } catch {
      /* ungültig – kein Format */
    }
  }

  return (
    <div
      className={`border rounded ${hasError ? 'border-danger' : open ? 'border-primary-subtle' : 'border-secondary-subtle'}`}
    >
      {/* Kopfzeile / Summary – immer sichtbar, zum Auf-/Zuklappen */}
      <div
        className={`d-flex align-items-center gap-2 px-2 py-1 ${hasError ? 'bg-danger-subtle' : 'bg-body-secondary'} ${open ? 'border-bottom' : ''}`}
        style={{ cursor: 'pointer', userSelect: 'none', borderRadius: 'inherit' }}
        onClick={() => setOpen(o => !o)}
      >
        <span
          className="db-icon text-muted flex-shrink-0 db-font-size-xs"
          data-icon={open ? 'chevron_up' : 'chevron_down'}
        />

        <span className={`badge flex-shrink-0 ${hasError ? 'bg-danger' : 'bg-secondary'}`}>{label}</span>

        {!open && hint && (
          <span
            className="text-muted text-truncate"
            style={{ fontSize: '0.7rem', fontFamily: 'monospace', minWidth: '0' }}
          >
            {hint}
          </span>
        )}

        <div className="ms-auto d-flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {open && (
            <button
              className="db-button py-0"
              data-variant="outlined"
              data-size="small"
              style={{ fontSize: '0.75rem' }}
              onClick={handleFormat}
              title="JSON formatieren"
            >
              <span className="db-icon db-font-size-2xs" data-icon="list" style={{ verticalAlign: 'middle' }} />
              <span className="ms-1 d-none d-sm-inline">Format</span>
            </button>
          )}
          <button
            className="db-button py-0"
            data-variant="outlined"
            data-size="small"
            style={{ fontSize: '0.75rem' }}
            onClick={() => setOpen(o => !o)}
            title={open ? 'Einklappen' : 'Bearbeiten'}
          >
            <span
              className="db-icon db-font-size-2xs"
              data-icon={open ? 'cross' : 'pen'}
              style={{ verticalAlign: 'middle' }}
            />
          </button>
        </div>
      </div>

      {/* Editor */}
      {open && (
        <div className="p-2">
          <textarea
            className={`form-control form-control-sm font-monospace w-100${hasError ? ' is-invalid' : ''}`}
            rows={autoRows(value)}
            style={{ fontSize: '0.72rem', resize: 'vertical', minHeight: '80px', lineHeight: '1.45' }}
            value={value}
            onChange={e => onChange((e.target as HTMLTextAreaElement).value)}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
          />
          {hasError && (
            <div className="small mt-1 text-danger">
              <span
                className="db-icon me-1 db-font-size-xs"
                data-icon="exclamation_mark_circle"
                style={{ verticalAlign: 'middle' }}
              />
              {error ?? 'Ungültiges JSON'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
