import type { Drehwinkel, SkalierFaktoren } from './skaliereKonfig';

type Masse = { w: number; h: number };

type Props = {
  /** Referenzgröße der bisherigen Vorlage (aus der Config oder gemessen). */
  alt: Masse | null;
  /** Gemessene Größe der jetzt geladenen Vorlage. */
  neu: Masse | null;
  faktoren: SkalierFaktoren;
  gekoppelt: boolean;
  /** Gesamtes Layout (Felder, Signatur, Tabellen) zusätzlich um diesen Winkel drehen. */
  drehung: Drehwinkel;
  onChange: (next: { faktoren?: SkalierFaktoren; gekoppelt?: boolean; drehung?: Drehwinkel }) => void;
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
    <div className="input-group input-group-sm w-auto">
      <span className="input-group-text px-2">{label}</span>
      <input
        type="number"
        step={schritt}
        className="form-control px-1"
        style={{ maxWidth: '5.5rem' }}
        value={wert}
        onChange={e => {
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
export function SkalierLeiste({ alt, neu, faktoren, gekoppelt, drehung, onChange, onAnwenden, onAbbrechen }: Props) {
  const setze = (teil: Partial<SkalierFaktoren>, g = gekoppelt) =>
    onChange({ faktoren: { ...faktoren, ...teil }, gekoppelt: g });

  return (
    <div className="border border-primary rounded p-2 mb-2 bg-primary-subtle small">
      <div className="d-flex flex-wrap align-items-center gap-2">
        <strong className="me-1">Koordinaten anpassen</strong>
        {alt && (
          <span className="text-body-secondary">
            {alt.w.toFixed(0)}×{alt.h.toFixed(0)}
            {neu ? ` → ${neu.w.toFixed(0)}×${neu.h.toFixed(0)}` : ''} pt
          </span>
        )}
        <div className="form-check mb-0">
          <input
            className="form-check-input"
            type="checkbox"
            id="skalier-gekoppelt"
            checked={gekoppelt}
            onChange={e => {
              const g = (e.target as HTMLInputElement).checked;
              setze(g ? { x: faktoren.y } : {}, g);
            }}
          />
          <label className="form-check-label" htmlFor="skalier-gekoppelt">
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
        <ZahlEingabe label="Versatz X" schritt="0.1" wert={faktoren.dx} onChange={v => setze({ dx: v })} />
        <ZahlEingabe label="Versatz Y" schritt="0.1" wert={faktoren.dy} onChange={v => setze({ dy: v })} />
        <div className="input-group input-group-sm w-auto">
          <span className="input-group-text px-2">Drehen</span>
          <select
            className="form-select px-1"
            style={{ maxWidth: '5rem' }}
            value={String(drehung)}
            onChange={e => onChange({ drehung: Number((e.target as HTMLSelectElement).value) as Drehwinkel })}
          >
            <option value="0">0°</option>
            <option value="90">90°</option>
            <option value="180">180°</option>
            <option value="270">270°</option>
          </select>
        </div>
        <div className="knopfgruppe ms-auto">
          <button type="button" className="db-button" data-variant="brand" onClick={onAnwenden}>
            Anwenden
          </button>
          <button type="button" className="db-button" data-variant="outlined" onClick={onAbbrechen}>
            Abbrechen
          </button>
        </div>
      </div>
      <div className="text-body-secondary mt-1">
        Jede Koordinate wird <code>Wert × Faktor + Versatz</code> (Versatz in PDF-Punkten). Schriftgröße und
        Tabellen-Zeilenhöhe folgen dem Y-Faktor. Die Vorschau zeigt das Ergebnis live.
        {drehung !== 0 && (
          <>
            {' '}
            <strong>Drehen</strong> dreht das ganze Layout (Felder, Signatur, Datentabellen) um {drehung}° um den
            Seitenmittelpunkt.
          </>
        )}
      </div>
    </div>
  );
}
