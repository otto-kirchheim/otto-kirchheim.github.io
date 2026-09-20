import { DBButton, DBCheckbox, DBStack } from '@db-ux/react-core-components';
import { DbAuswahl, DbFeld } from '@/components';
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

/**
 * Zahlenfeld für einen Skalier-Parameter; ungültige Eingaben werden verworfen.
 *
 * @param props - Beschriftung, aktueller Wert, Schrittweite und `onChange`, das nur endliche Zahlen erhält.
 */
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
    <DbFeld
      beschriftung={label}
      beschriftungZeigen
      dicht
      className="w-auto"
      type="number"
      step={schritt}
      huelleStyle={{ maxWidth: '5.5rem' }}
      value={wert}
      onChange={e => {
        const v = Number(e.target.value);
        if (Number.isFinite(v)) onChange(v);
      }}
    />
  );
}

/**
 * Inline-Leiste über dem Canvas (kein Modal, damit die Live-Vorschau der Rechtecke sichtbar bleibt).
 * Jede Koordinate wird `wert * faktor + versatz`. Beim „Anwenden" landen die neuen Zahlen in der
 * Konfiguration; danach wird die Leiste geschlossen.
 *
 * @param props - Alte/neue Seitenmaße, Faktoren, Kopplung X=Y, Drehwinkel sowie `onChange`, `onAnwenden` und `onAbbrechen`.
 */
export function SkalierLeiste({ alt, neu, faktoren, gekoppelt, drehung, onChange, onAnwenden, onAbbrechen }: Props) {
  /**
   * Meldet die Faktoren samt Kopplung an `onChange`.
   *
   * @param teil - Zu ändernde Faktoren.
   * @param g - Kopplung X=Y; Standard ist der aktuelle Wert.
   */
  const setze = (teil: Partial<SkalierFaktoren>, g = gekoppelt) =>
    onChange({ faktoren: { ...faktoren, ...teil }, gekoppelt: g });

  return (
    <div className="border border-primary p-2 mb-2 bg-primary-subtle small">
      <DBStack direction="row" wrap alignment="center" gap="x-small">
        <strong className="me-1">Koordinaten anpassen</strong>
        {alt && (
          <span className="text-body-secondary">
            {alt.w.toFixed(0)}×{alt.h.toFixed(0)}
            {neu ? ` → ${neu.w.toFixed(0)}×${neu.h.toFixed(0)}` : ''} pt
          </span>
        )}
        <div className="mb-0">
          <DBCheckbox
            size="small"
            id="skalier-gekoppelt"
            label="X=Y"
            checked={gekoppelt}
            onChange={e => {
              const g = (e.target as HTMLInputElement).checked;
              setze(g ? { x: faktoren.y } : {}, g);
            }}
          />
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
        <DbAuswahl
          beschriftung="Drehen"
          beschriftungZeigen
          dicht
          className="w-auto"
          huelleStyle={{ maxWidth: '5rem' }}
          value={String(drehung)}
          onChange={e => onChange({ drehung: Number(e.target.value) as Drehwinkel })}
        >
          <option value="0">0°</option>
          <option value="90">90°</option>
          <option value="180">180°</option>
          <option value="270">270°</option>
        </DbAuswahl>
        <DBStack direction="row" wrap gap="2x-small" className="ms-auto">
          <DBButton type="button" variant="brand" onClick={onAnwenden}>
            Anwenden
          </DBButton>
          <DBButton type="button" variant="outlined" onClick={onAbbrechen}>
            Abbrechen
          </DBButton>
        </DBStack>
      </DBStack>
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
