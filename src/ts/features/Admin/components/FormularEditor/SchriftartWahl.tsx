import type { Schriftart } from '@otto-kirchheim/nebengeld-shared';
import { SCHRIFTARTEN } from './datenKatalog';
import type { VorlageFontFamilie } from './vorlageFonts';

export const SCHNITTE = [
  { key: 'normal', label: 'Normal' },
  { key: 'fett', label: 'Fett' },
  { key: 'kursiv', label: 'Kursiv' },
  { key: 'fettKursiv', label: 'Fett+Kursiv' },
] as const;
export type Schnitt = (typeof SCHNITTE)[number]['key'];
type Abweichung = 'fett' | 'kursiv' | 'fettKursiv';
const ABWEICHUNGEN: Abweichung[] = ['fett', 'kursiv', 'fettKursiv'];

function schnittLabel(schnitt: Schnitt): string {
  return SCHNITTE.find(s => s.key === schnitt)!.label;
}

/** Familie eines Schnitts: `schriftart` ist eine Familie für alle vier oder ein Objekt je Schnitt
 *  (fehlt ein Schnitt, gilt `normal`, sonst `'helvetica'`). Spiegelt `build.ts`. */
export function familieFuerSchnitt(schriftart: Schriftart | undefined, schnitt: Schnitt): string {
  if (!schriftart) return 'helvetica';
  if (typeof schriftart === 'string') return schriftart;
  return schriftart[schnitt] ?? schriftart.normal ?? 'helvetica';
}

/** Familien-Label für einen Auswahlwert (Standard-14 oder `vorlage:<Name>`). */
export function familieLabel(wert: string): string {
  return SCHRIFTARTEN.find(f => f.wert === wert)?.label ?? `${wert.replace(/^vorlage:/, '')} (Vorlage)`;
}

/** Knappe Beschreibung der aktuellen Schriftwahl für den Öffnen-Button -- z.B. `"Times +1"`. */
export function schriftKurz(value: Schriftart | undefined): string {
  const basis = familieFuerSchnitt(value, 'normal');
  if (!value || typeof value === 'string') return familieLabel(basis);
  const abweichungen = ABWEICHUNGEN.filter(k => value[k] !== undefined && value[k] !== basis).length;
  return abweichungen > 0 ? `${familieLabel(basis)} +${abweichungen}` : familieLabel(basis);
}

/** Kurzliste der Schnitte, die eine eingebettete Familie mitbringt -- z.B. `"normal/fett"`. */
export function schnitteText(familie: VorlageFontFamilie): string {
  return (
    SCHNITTE.filter(s => familie.schnitte[s.key])
      .map(s => s.label.toLowerCase())
      .join('/') || '—'
  );
}

/**
 * Schnitte, deren aufgelöste Familie eine eingebettete `vorlage:`-Schrift ist, die genau diesen
 * Schnitt NICHT mitbringt -- dort setzt der Renderer Helvetica im passenden Schnitt. Grundlage für
 * die Warnung im Editor.
 */
export function fehlendeVorlagenSchnitte(
  schriftart: Schriftart | undefined,
  vorlageFonts: VorlageFontFamilie[],
): Schnitt[] {
  return SCHNITTE.filter(s => {
    const familie = familieFuerSchnitt(schriftart, s.key);
    if (!familie.startsWith('vorlage:')) return false;
    const font = vorlageFonts.find(f => f.id === familie);
    return font !== undefined && !font.schnitte[s.key];
  }).map(s => s.key);
}

/** Grundfamilie + Schnitt-Abweichungen zurück auf die knappste `Schriftart`: ein String (bzw.
 *  `undefined` bei Helvetica), wenn keine echte Abweichung bleibt, sonst das Objekt. */
export function verdichteSchriftart(basis: string, abw: Partial<Record<Abweichung, string>>): Schriftart | undefined {
  const echte = ABWEICHUNGEN.filter(k => abw[k] !== undefined && abw[k] !== basis);
  if (echte.length === 0) return basis === 'helvetica' ? undefined : basis;
  const objekt: Extract<Schriftart, object> = { normal: basis };
  for (const k of echte) objekt[k] = abw[k];
  return objekt;
}

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
    <div class="d-flex flex-column gap-1">
      <div class="d-flex flex-wrap align-items-center gap-2 small">
        <label class="d-flex align-items-center gap-1" title="Grundschrift für den gesamten Fließtext">
          <span class="text-muted">Schrift</span>
          <select
            class="form-select form-select-sm w-auto"
            value={basis}
            onChange={e => setzeBasis((e.target as HTMLSelectElement).value)}
          >
            {familienFuer('normal', basis).map(o => (
              <option key={o.wert} value={o.wert}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {ABWEICHUNGEN.map(schnitt => {
          const gewaehlt = objekt?.[schnitt] ?? '';
          return (
            <label
              key={schnitt}
              class="d-flex align-items-center gap-1"
              title={`Nur für ${schnittLabel(schnitt)}-Text abweichend (z.B. wenn die Grundschrift diesen Schnitt nicht hat)`}
            >
              <span class="text-muted">{schnittLabel(schnitt)}</span>
              <select
                class="form-select form-select-sm w-auto"
                value={gewaehlt}
                onChange={e => setzeAbweichung(schnitt, (e.target as HTMLSelectElement).value)}
              >
                <option value="">(wie Schrift)</option>
                {familienFuer(schnitt, gewaehlt).map(o => (
                  <option key={o.wert} value={o.wert}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
      {fehlt.length > 0 && (
        <div class="small text-warning-emphasis">
          Die gewählte Schrift bringt {fehlt.map(schnittLabel).join(' und ')} nicht mit — dort setzt der Renderer
          Helvetica im passenden Schnitt. Für einen anderen Ersatz das jeweilige Feld gezielt wählen.
        </div>
      )}
    </div>
  );
}
