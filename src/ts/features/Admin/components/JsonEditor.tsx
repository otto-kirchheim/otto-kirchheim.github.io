import { useState } from 'preact/hooks';

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
      class={`border rounded ${hasError ? 'border-danger' : open ? 'border-primary-subtle' : 'border-secondary-subtle'}`}
    >
      {/* Kopfzeile / Summary – immer sichtbar, zum Auf-/Zuklappen */}
      <div
        class={`d-flex align-items-center gap-2 px-2 py-1 ${hasError ? 'bg-danger-subtle' : 'bg-body-secondary'} ${open ? 'border-bottom' : ''}`}
        style="cursor:pointer;user-select:none;border-radius:inherit"
        onClick={() => setOpen(o => !o)}
      >
        <span class="material-icons-round text-muted flex-shrink-0" style="font-size:0.95rem">
          {open ? 'expand_less' : 'expand_more'}
        </span>

        <span class={`badge flex-shrink-0 ${hasError ? 'bg-danger' : 'bg-secondary'}`}>{label}</span>

        {!open && hint && (
          <span class="text-muted text-truncate" style="font-size:0.7rem;font-family:monospace;min-width:0">
            {hint}
          </span>
        )}

        <div class="ms-auto d-flex gap-1 flex-shrink-0" onClick={e => (e as MouseEvent).stopPropagation()}>
          {open && (
            <button
              class="btn btn-sm btn-outline-secondary py-0"
              style="font-size:0.75rem"
              onClick={handleFormat}
              title="JSON formatieren"
            >
              <span class="material-icons-round" style="font-size:0.8rem;vertical-align:middle">
                format_align_left
              </span>
              <span class="ms-1 d-none d-sm-inline">Format</span>
            </button>
          )}
          <button
            class="btn btn-sm btn-outline-secondary py-0"
            style="font-size:0.75rem"
            onClick={() => setOpen(o => !o)}
            title={open ? 'Einklappen' : 'Bearbeiten'}
          >
            <span class="material-icons-round" style="font-size:0.8rem;vertical-align:middle">
              {open ? 'close' : 'edit'}
            </span>
          </button>
        </div>
      </div>

      {/* Editor */}
      {open && (
        <div class="p-2">
          <textarea
            class={`form-control form-control-sm font-monospace w-100${hasError ? ' is-invalid' : ''}`}
            rows={autoRows(value)}
            style="font-size:0.72rem;resize:vertical;min-height:80px;line-height:1.45"
            value={value}
            onInput={e => onChange((e.target as HTMLTextAreaElement).value)}
            spellcheck={false}
            autocomplete="off"
            autocorrect="off"
          />
          {hasError && (
            <div class="small mt-1 text-danger">
              <span class="material-icons-round me-1" style="font-size:0.85rem;vertical-align:middle">
                error_outline
              </span>
              {error ?? 'Ungültiges JSON'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
