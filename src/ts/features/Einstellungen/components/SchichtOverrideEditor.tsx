import { type FC } from 'react';

import type { BereitschaftSchichtTyp, IPerWeekdaySchicht, IVorgabenUaZ, IVorgabenUvorgabenB } from '@/types';
import { mergePerWeekdaySchicht } from '@/types';
import { SchichtSection } from './ArbeitszeiteingabePanel';

const SCHICHT_LABELS: Record<'frueh' | 'spaet' | 'nacht', string> = { frueh: 'Früh', spaet: 'Spät', nacht: 'Nacht' };
// sonder hat keine Wochentagsstruktur und ist daher nicht per Wochentag überschreibbar.
const OVERRIDABLE_SCHICHTEN: Array<'frueh' | 'spaet' | 'nacht'> = ['frueh', 'spaet', 'nacht'];

type Overrides = NonNullable<IVorgabenUvorgabenB['schichtenOverrides']>;

const cleanOverrides = (next: Overrides): IVorgabenUvorgabenB['schichtenOverrides'] => {
  const entries = Object.entries(next).filter(([, value]) => value !== undefined);
  return entries.length > 0 ? (Object.fromEntries(entries) as IVorgabenUvorgabenB['schichtenOverrides']) : undefined;
};

type SchichtOverrideEditorProps = {
  aZ: IVorgabenUaZ | undefined;
  /** Welche (Nicht-Früh-)Schichten zur Überschreibung angeboten werden (Früh immer, sofern aZ.frueh existiert). */
  schichten: BereitschaftSchichtTyp[];
  overrides: Overrides;
  onChange: (overrides: IVorgabenUvorgabenB['schichtenOverrides']) => void;
};

/**
 * Kontrollierter Editor für optionale per-Wochentag-Overrides je Schicht. Wiederverwendet `SchichtSection`
 * und liefert pro aktivierter Schicht ein vollständiges `IPerWeekdaySchicht` als Snapshot-Override zurück.
 */
export const SchichtOverrideEditor: FC<SchichtOverrideEditorProps> = ({
  aZ,
  schichten,
  overrides,
  onChange,
}: SchichtOverrideEditorProps) => {
  const overridable = OVERRIDABLE_SCHICHTEN.filter(typ =>
    typ === 'frueh' ? !!aZ?.frueh : schichten.includes(typ) && !!aZ?.[typ],
  );
  if (overridable.length === 0) return null;

  const setEnabled = (typ: 'frueh' | 'spaet' | 'nacht', enabled: boolean): void => {
    const next: Overrides = { ...overrides };
    if (enabled) {
      const base = aZ?.[typ];
      if (base) next[typ] = mergePerWeekdaySchicht(base, overrides[typ]);
    } else {
      delete next[typ];
    }
    onChange(cleanOverrides(next));
  };

  const updateOverride = (typ: 'frueh' | 'spaet' | 'nacht', schicht: IPerWeekdaySchicht): void => {
    onChange(cleanOverrides({ ...overrides, [typ]: schicht }));
  };

  return (
    <div className="">
      <label className="form-label fw-semibold small text-uppercase text-muted mb-1">
        Zeiten je Wochentag überschreiben (optional)
      </label>
      {overridable.map(typ => {
        const base = aZ?.[typ];
        const enabled = overrides[typ] !== undefined;
        return (
          <div key={typ} className="border rounded p-2 mb-2">
            <div className="form-check form-switch mb-1">
              <input
                className="form-check-input"
                type="checkbox"
                id={`override-${typ}`}
                checked={enabled}
                onChange={e => setEnabled(typ, (e.target as HTMLInputElement).checked)}
              />
              <label className="form-check-label" htmlFor={`override-${typ}`}>
                {SCHICHT_LABELS[typ]} – eigene Zeiten
              </label>
            </div>
            {enabled && base && (
              <SchichtSection
                title=""
                schicht={mergePerWeekdaySchicht(base, overrides[typ])}
                onChange={schicht => updateOverride(typ, schicht)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
