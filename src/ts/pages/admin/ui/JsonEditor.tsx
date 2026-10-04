import { useState } from 'react';
import { DBButton, DBTag, DBTextarea, DBTooltip, DBStack } from '@db-ux/react-core-components';

type Props = {
  value: string;
  onChange: (raw: string) => void;
  error?: string;
};

/**
 * Fasst den JSON-Text für die Kopfzeile zusammen (Typ/Größe als Label, Vorschau der Inhalte als Hinweis).
 *
 * @param raw - Roher JSON-Text aus dem Editor.
 * @returns `label` und `hint` für die Anzeige; `valid` ist `false`, wenn `raw` kein gültiges JSON ist.
 */
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

/**
 * Kurzvorschau eines Array-Elements: bei Objekten die ersten zwei Schlüssel, sonst der auf 30 Zeichen gekürzte Wert.
 *
 * @param v - Beliebiger JSON-Wert.
 * @returns Vorschautext; `'null'` für `null`/`undefined`.
 */
function previewValue(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'object') {
    const keys = Object.keys(v as object);
    return `{${keys.slice(0, 2).join(', ')}${keys.length > 2 ? ', …' : ''}}`;
  }
  return String(v).slice(0, 30);
}

/**
 * Zeilenzahl der Textarea passend zum Inhalt, begrenzt auf 5 bis 24.
 *
 * @param raw - Aktueller Editortext.
 * @returns Anzahl sichtbarer Zeilen.
 */
function autoRows(raw: string): number {
  const lines = (raw.match(/\n/g) ?? []).length + 1;
  return Math.min(24, Math.max(5, lines + 1));
}

/**
 * Einklappbarer JSON-Editor mit Kopfzeile (Typ, Vorschau, Formatieren) und Textarea; markiert ungültiges JSON und externe Fehler.
 *
 * @param props - `value` (JSON-Text), `onChange` (neuer Rohtext) und optional `error` (externe Fehlermeldung).
 */
export function JsonEditor({ value, onChange, error }: Props) {
  const [open, setOpen] = useState(false);

  const { label, hint, valid } = buildSummary(value);
  const hasError = Boolean(error) || !valid;

  /**
   * Formatiert den Text mit zwei Leerzeichen Einrückung; bei ungültigem JSON bleibt er unverändert.
   */
  function handleFormat() {
    try {
      onChange(JSON.stringify(JSON.parse(value), null, 2));
    } catch {
      /* ungültig – kein Format */
    }
  }

  return (
    <div className={`json-editor ${hasError ? 'json-editor--fehler' : open ? 'json-editor--offen' : ''}`}>
      {/* Kopfzeile: immer sichtbar, klappt den Editor auf/zu */}
      <div
        className={`json-editor__kopf ${hasError ? 'json-editor__kopf--fehler' : ''} ${open ? 'json-editor__kopf--offen' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span
          className="db-icon farbe-gedaempft nicht-schrumpfen db-font-size-xs"
          data-icon={open ? 'chevron_up' : 'chevron_down'}
        />

        <DBTag className="nicht-schrumpfen" semantic={hasError ? 'critical' : 'neutral'} emphasis="strong">
          {label}
        </DBTag>

        {!open && hint && (
          <span
            className="farbe-gedaempft abschneiden"
            style={{ fontSize: '0.7rem', fontFamily: 'monospace', minWidth: '0' }}
          >
            {hint}
          </span>
        )}

        <DBStack
          direction="row"
          gap="2x-small"
          className="knopf-rechts nicht-schrumpfen"
          onClick={e => e.stopPropagation()}
        >
          {open && (
            <DBButton
              type="button"

              variant="outlined"
              size="small"
              style={{ fontSize: '0.75rem' }}
              icon="list"
              onClick={handleFormat}
              title="JSON formatieren"
            >
              <span className="luft-links-2xs ab-sm-inline">Format</span>
            </DBButton>
          )}
          <DBButton
            type="button"

            variant="outlined"
            size="small"
            style={{ fontSize: '0.75rem' }}
            icon={open ? 'cross' : 'pen'}
            noText
            onClick={() => setOpen(o => !o)}
          >
            <DBTooltip>{open ? 'Einklappen' : 'Bearbeiten'}</DBTooltip>
          </DBButton>
        </DBStack>
      </div>

      {open && (
        <div className="json-editor__inhalt">
          <DBTextarea
            className="json-editor__textarea"
            data-density="functional"
            id={`json-${label}`}
            label={label}
            showLabel={false}
            data-custom-validity={hasError ? 'invalid' : undefined}
            rows={autoRows(value)}
            style={{
              fontSize: '0.72rem',
              resize: 'vertical',
              minHeight: '80px',
              lineHeight: '1.45',
              // Inline statt `.font-monospace` am Wrapper: DBTextarea setzt font-family direkt am
              // <textarea>, eine vom Wrapper geerbte Schrift würde dagegen verlieren.
              fontFamily: 'var(--db-font-family-mono, ui-monospace, "SFMono-Regular", "Menlo", monospace)',
            }}
            value={value}
            onChange={e => onChange((e.target as HTMLTextAreaElement).value)}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
          />
          {hasError && (
            <div className="zelle-klein luft-oben-2xs farbe-gefahr">
              <span
                className="db-icon luft-rechts-2xs db-font-size-xs"
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
