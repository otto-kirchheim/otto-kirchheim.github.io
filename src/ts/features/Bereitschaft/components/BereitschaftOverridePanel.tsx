import { type FC, type JSX, useEffect, useState } from 'react';

import type { BereitschaftRuntimeOverrides } from '../utils/bereitschaftRuntimeOverrides';
import type { BereitschaftSchichtTyp, ISchichtZeiten, IVorgabenUaZ, IVorgabenUvorgabenB } from '@/types';
import { SchichtOverrideEditor } from '@/features/Einstellungen/components/SchichtOverrideEditor';

const createSonderTimeInput = (id: string, value: string, onChange: (value: string) => void): JSX.Element => (
  <input
    type="time"
    id={id}
    className="form-control form-control-sm"
    style={{ width: '7rem' }}
    value={value}
    onChange={e => onChange((e.target as HTMLInputElement).value)}
  />
);

type BereitschaftOverridePanelProps = {
  aZ: IVorgabenUaZ | undefined;
  onChange: (overrides: BereitschaftRuntimeOverrides | undefined) => void;
};

/**
 * Optionaler Abschnitt im „Neue Bereitschaft eingeben"-Modal: erlaubt, die aZ-Arbeitszeiten je Wochentag
 * für genau diesen Eintrag zu überschreiben (gleicher Editor wie im VorgabenB-Editor).
 */
export const BereitschaftOverridePanel: FC<BereitschaftOverridePanelProps> = ({
  aZ,
  onChange,
}: BereitschaftOverridePanelProps) => {
  const [open, setOpen] = useState(false);
  const [overrides, setOverrides] = useState<NonNullable<IVorgabenUvorgabenB['schichtenOverrides']>>({});
  const [sonderOverride, setSonderOverride] = useState<ISchichtZeiten | undefined>(undefined);
  const [sonderActive, setSonderActive] = useState(false);

  // Beobachte den #sonder Checkbox und aktualisiere sonderActive reaktiv
  useEffect(() => {
    const checkbox = document.querySelector<HTMLInputElement>('#sonder');
    if (!checkbox) return;

    const handleChange = () => {
      setSonderActive(checkbox.checked);
    };

    // Initialer Zustand
    setSonderActive(checkbox.checked);

    checkbox.addEventListener('change', handleChange);
    return () => checkbox.removeEventListener('change', handleChange);
  }, []);

  if (!aZ?.frueh) return null;

  const activeSchichten: BereitschaftSchichtTyp[] = [
    'frueh',
    ...(aZ?.spaet?.aktiv ? (['spaet'] as BereitschaftSchichtTyp[]) : []),
    ...(aZ?.nacht?.aktiv ? (['nacht'] as BereitschaftSchichtTyp[]) : []),
  ];

  const handleEditor = (next: IVorgabenUvorgabenB['schichtenOverrides']): void => {
    setOverrides(next ?? {});
    onChange(next ? { ...next, sonderOverride } : sonderOverride ? { sonderOverride } : undefined);
  };

  const handleSonderChange = (next: ISchichtZeiten | undefined): void => {
    setSonderOverride(next);
    onChange(next ? { ...overrides, sonderOverride: next } : Object.keys(overrides).length > 0 ? overrides : undefined);
  };

  const toggleOpen = (next: boolean): void => {
    setOpen(next);
    // Bei deaktiviertem Schalter gelten keine Overrides; beim Aktivieren die bereits erfassten anwenden.
    onChange(
      next
        ? { ...(Object.keys(overrides).length > 0 ? overrides : {}), ...(sonderOverride ? { sonderOverride } : {}) }
        : undefined,
    );
  };

  return (
    <div className="col-12">
      <div className="form-check form-switch bereitschaft">
        <input
          className="form-check-input"
          type="checkbox"
          id="azOverride"
          checked={open}
          onChange={e => toggleOpen((e.target as HTMLInputElement).checked)}
        />
        <label className="form-check-label" htmlFor="azOverride">
          Andere Arbeitszeiten hinterlegen
        </label>
      </div>
      {open && (
        <div className="border rounded p-2 mt-1">
          <SchichtOverrideEditor aZ={aZ} schichten={activeSchichten} overrides={overrides} onChange={handleEditor} />
          {aZ.sonder.aktiv && sonderActive && (
            <div className="mt-3 pt-3 border-top">
              <div className="d-flex align-items-center gap-2 mb-2">
                <h6 className="mb-0">Sonderschicht</h6>
                <span className="text-muted small">eigene Arbeitszeit für diesen Eintrag</span>
              </div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                {createSonderTimeInput('sonderOverrideBeginn', sonderOverride?.beginn ?? aZ.sonder.beginn, beginn =>
                  handleSonderChange({
                    aktiv: true,
                    beginn,
                    ende: sonderOverride?.ende ?? aZ.sonder.ende,
                    pause: sonderOverride?.pause ?? aZ.sonder.pause,
                  }),
                )}
                <span>–</span>
                {createSonderTimeInput('sonderOverrideEnde', sonderOverride?.ende ?? aZ.sonder.ende, ende =>
                  handleSonderChange({
                    aktiv: true,
                    beginn: sonderOverride?.beginn ?? aZ.sonder.beginn,
                    ende,
                    pause: sonderOverride?.pause ?? aZ.sonder.pause,
                  }),
                )}
                <div className="d-flex align-items-center gap-1">
                  <input
                    type="number"
                    className="form-control form-control-sm text-center"
                    style={{ width: '4rem' }}
                    value={sonderOverride?.pause ?? aZ.sonder.pause}
                    min={0}
                    step={5}
                    onChange={e =>
                      handleSonderChange({
                        aktiv: true,
                        beginn: sonderOverride?.beginn ?? aZ.sonder.beginn,
                        ende: sonderOverride?.ende ?? aZ.sonder.ende,
                        pause: Number((e.target as HTMLInputElement).value),
                      })
                    }
                  />
                  <span className="text-muted small">min</span>
                </div>
                <button
                  type="button"
                  className={`btn btn-sm ${sonderOverride ? 'btn-outline-secondary' : 'btn-outline-secondary'} ms-auto`}
                  onClick={() => handleSonderChange(undefined)}
                >
                  {sonderOverride ? 'Zurücksetzen' : 'Deaktivieren'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
