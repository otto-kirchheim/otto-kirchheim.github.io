import type { Schriftart } from '@otto-kirchheim/nebengeld-shared';
import { DbAuswahl } from '@/components';
import { SCHRIFTARTEN } from './datenKatalog';
import type { VorlageFontFamilie } from './vorlageFonts';
import {
  ABWEICHUNGEN,
  familieFuerSchnitt,
  fehlendeVorlagenSchnitte,
  schnittLabel,
  verdichteSchriftart,
  type Abweichung,
  type Schnitt,
} from './schriftartHelfer';

type Props = {
  value: Schriftart | undefined;
  vorlageFonts: VorlageFontFamilie[];
  onChange: (value: Schriftart | undefined) => void;
};

/**
 * Formularweite Schrift: eine Grundfamilie plus optionale Abweichung je Schnitt. Nötig, weil eine
 * in der Vorlage eingebettete Schrift oft nicht alle Schnitte mitbringt (z.B. nur Regular + Bold) --
 * für den fehlenden Schnitt lässt sich hier gezielt eine Standard-14-Familie wählen.
 */
export function SchriftartWahl({ value, vorlageFonts, onChange }: Props) {
  const objekt = value && typeof value === 'object' ? value : undefined;
  const basis = familieFuerSchnitt(value, 'normal');
  const abweichungen = (): Partial<Record<Abweichung, string>> =>
    objekt ? Object.fromEntries(ABWEICHUNGEN.filter(k => objekt[k] !== undefined).map(k => [k, objekt[k]!])) : {};

  /** Standard-14 immer; eine Vorlagen-Familie nur, wenn sie genau diesen Schnitt mitbringt (oder
   *  bereits gewählt ist, damit ein Bestandswert sichtbar bleibt). */
  const familienFuer = (schnitt: Schnitt, gewaehlt: string) => [
    ...SCHRIFTARTEN.map(f => ({ wert: f.wert, label: f.label })),
    ...vorlageFonts
      .filter(f => f.schnitte[schnitt] || f.id === gewaehlt)
      .map(f => ({
        wert: f.id,
        label: f.schnitte[schnitt] ? f.label : `${f.label} — ohne ${schnittLabel(schnitt)}`,
      })),
  ];

  function setzeBasis(familie: string) {
    onChange(verdichteSchriftart(familie, abweichungen()));
  }

  function setzeAbweichung(schnitt: Abweichung, familie: string) {
    const abw = abweichungen();
    if (familie === '') delete abw[schnitt];
    else abw[schnitt] = familie;
    onChange(verdichteSchriftart(basis, abw));
  }

  const fehlt = fehlendeVorlagenSchnitte(value, vorlageFonts);

  return (
    <div className="d-flex flex-column gap-2">
      <div className="schriftwahl-raster small">
        <label className="schriftwahl-zeile" title="Grundschrift für den gesamten Fließtext">
          <span className="text-muted">Schrift</span>
          <DbAuswahl beschriftung="Grundschrift" dicht value={basis} onChange={e => setzeBasis(e.target.value)}>
            {familienFuer('normal', basis).map(o => (
              <option key={o.wert} value={o.wert}>
                {o.label}
              </option>
            ))}
          </DbAuswahl>
        </label>
        {ABWEICHUNGEN.map(schnitt => {
          const gewaehlt = objekt?.[schnitt] ?? '';
          return (
            <label
              key={schnitt}
              className="schriftwahl-zeile"
              title={`Nur für ${schnittLabel(schnitt)}-Text abweichend (z.B. wenn die Grundschrift diesen Schnitt nicht hat)`}
            >
              <span className="text-muted">{schnittLabel(schnitt)}</span>
              <DbAuswahl
                beschriftung={`Schrift für ${schnittLabel(schnitt)}`}
                dicht
                value={gewaehlt}
                onChange={e => setzeAbweichung(schnitt, e.target.value)}
              >
                <option value="">(wie Schrift)</option>
                {familienFuer(schnitt, gewaehlt).map(o => (
                  <option key={o.wert} value={o.wert}>
                    {o.label}
                  </option>
                ))}
              </DbAuswahl>
            </label>
          );
        })}
      </div>
      {fehlt.length > 0 && (
        <div className="small text-warning-emphasis">
          Die gewählte Schrift bringt {fehlt.map(schnittLabel).join(' und ')} nicht mit — dort setzt der Renderer
          Helvetica im passenden Schnitt. Für einen anderen Ersatz das jeweilige Feld gezielt wählen.
        </div>
      )}
    </div>
  );
}
