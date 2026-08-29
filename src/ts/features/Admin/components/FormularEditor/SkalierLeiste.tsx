import type { SkalierFaktoren } from './skaliereKonfig';

type Masse = { w: number; h: number };

type Props = {
  /** Referenzgröße der bisherigen Vorlage (aus der Config oder gemessen). */
  alt: Masse | null;
  /** Gemessene Größe der jetzt geladenen Vorlage. */
  neu: Masse | null;
  faktoren: SkalierFaktoren;
  gekoppelt: boolean;
  onChange: (next: { faktoren: SkalierFaktoren; gekoppelt: boolean }) => void;
  onAnwenden: () => void;
  onAbbrechen: () => void;
};

function ZahlEingabe({
  label,
  wert,
  schritt,
  onChange,
}: {
  label: string;
  wert: number;
  schritt: string;
  onChange: (v: number) => void;
}) {
  return (
    <div class="input-group input-group-sm w-auto">
      <span class="input-group-text px-2">{label}</span>
      <input
        type="number"
        step={schritt}
        class="form-control px-1"
        style="max-width:5.5rem"
        value={wert}
        onInput={e => {
          const v = Number((e.target as HTMLInputElement).value);
          if (Number.isFinite(v)) onChange(v);
        }}
      />
    </div>
  );
}

/**
 * Inline-Leiste über dem Canvas (kein Modal, damit die Live-Vorschau der Rechtecke sichtbar
 * bleibt). Jede Koordinate wird `wert * faktor + versatz`. Beim „Anwenden" landen die neuen Zahlen
 * in der Konfiguration; danach wird die Leiste geschlossen.
 */
export function SkalierLeiste({ alt, neu, faktoren, gekoppelt, onChange, onAnwenden, onAbbrechen }: Props) {
  const setze = (teil: Partial<SkalierFaktoren>, g = gekoppelt) =>
    onChange({ faktoren: { ...faktoren, ...teil }, gekoppelt: g });

  return (
    <div class="border border-primary rounded p-2 mb-2 bg-primary-subtle small">
      <div class="d-flex flex-wrap align-items-center gap-2">
        <strong class="me-1">Koordinaten anpassen</strong>
        {alt && (
          <span class="text-body-secondary">
            {alt.w.toFixed(0)}×{alt.h.toFixed(0)}
            {neu ? ` → ${neu.w.toFixed(0)}×${neu.h.toFixed(0)}` : ''} pt
          </span>
        )}
        <div class="form-check mb-0">
          <input
            class="form-check-input"
            type="checkbox"
            id="skalier-gekoppelt"
            checked={gekoppelt}
            onChange={e => {
              const g = (e.target as HTMLInputElement).checked;
              setze(g ? { x: faktoren.y } : {}, g);
            }}
          />
          <label class="form-check-label" for="skalier-gekoppelt">
            X=Y
          </label>
        </div>
        {gekoppelt ? (
          <ZahlEingabe label="Faktor" schritt="0.001" wert={faktoren.y} onChange={v => setze({ x: v, y: v })} />
        ) : (
          <>
            <ZahlEingabe label="Faktor X" schritt="0.001" wert={faktoren.x} onChange={v => setze({ x: v })} />
            <ZahlEingabe label="Faktor Y" schritt="0.001" wert={faktoren.y} onChange={v => setze({ y: v })} />
          </>
        )}
        <ZahlEingabe label="Versatz X" schritt="1" wert={faktoren.dx} onChange={v => setze({ dx: v })} />
        <ZahlEingabe label="Versatz Y" schritt="1" wert={faktoren.dy} onChange={v => setze({ dy: v })} />
        <div class="btn-group btn-group-sm ms-auto">
          <button type="button" class="btn btn-primary" onClick={onAnwenden}>
            Anwenden
          </button>
          <button type="button" class="btn btn-outline-secondary" onClick={onAbbrechen}>
            Abbrechen
          </button>
        </div>
      </div>
      <div class="text-body-secondary mt-1">
        Jede Koordinate wird <code>Wert × Faktor + Versatz</code> (Versatz in PDF-Punkten). Schriftgröße und
        Tabellen-Zeilenhöhe folgen dem Y-Faktor. Die Vorschau zeigt das Ergebnis live.
      </div>
    </div>
  );
}
