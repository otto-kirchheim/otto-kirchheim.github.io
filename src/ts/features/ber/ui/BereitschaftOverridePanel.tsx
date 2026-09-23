import { DBButton, DBCheckbox, DBHeadingH6 } from '@db-ux/react-core-components';
import { type FC, type JSX, useEffect, useState } from 'react';

import { DbFeld } from '@/components';
import type { BereitschaftRuntimeOverrides } from '../model/bereitschaftRuntimeOverrides';
import type { BereitschaftSchichtTyp, ISchichtZeiten, IVorgabenUaZ, IVorgabenUvorgabenB } from '@/types';
import { SchichtOverrideEditor } from '@/features/ber/ui/SchichtOverrideEditor';

/**
 * Kompaktes Zeitfeld für Beginn/Ende der Sonderschicht (Label folgt aus der Id: endet sie auf "Ende", "Ende", sonst "Beginn").
 *
 * @param id - Feld-Id.
 * @param value - Aktueller Wert ("HH:mm").
 * @param onChange - Wird bei Änderung mit dem neuen Wert aufgerufen.
 * @returns Das Eingabefeld.
 */
const createSonderTimeInput = (id: string, value: string, onChange: (value: string) => void): JSX.Element => (
  <DbFeld
    type="time"
    id={id}
    beschriftung={id.endsWith('Ende') ? 'Ende' : 'Beginn'}
    dicht
    huelleStyle={{ width: '7rem' }}
    value={value}
    onChange={e => onChange(e.target.value)}
  />
);

type BereitschaftOverridePanelProps = {
  aZ: IVorgabenUaZ | undefined;
  onChange: (overrides: BereitschaftRuntimeOverrides | undefined) => void;
};

/**
 * Optionaler Abschnitt im „Neue Bereitschaft eingeben"-Modal: erlaubt, die Arbeitszeiten je Wochentag
 * für genau diesen Eintrag zu überschreiben (gleicher Editor wie im VorgabenB-Editor). Rendert nichts,
 * wenn keine Frühschicht konfiguriert ist.
 *
 * @param props - `aZ` (Arbeitszeit-Vorgabe) und `onChange` (meldet die Overrides; `undefined` = keine).
 */
export const BereitschaftOverridePanel: FC<BereitschaftOverridePanelProps> = ({
  aZ,
  onChange,
}: BereitschaftOverridePanelProps) => {
  const [open, setOpen] = useState(false);
  const [overrides, setOverrides] = useState<NonNullable<IVorgabenUvorgabenB['schichtenOverrides']>>({});
  const [sonderOverride, setSonderOverride] = useState<ISchichtZeiten | undefined>(undefined);
  const [sonderActive, setSonderActive] = useState(false);

  // `#sonder` liegt außerhalb dieser Komponente (createAddModalBereitschaftsZeit); sein Zustand wird hier gespiegelt.
  useEffect(() => {
    const checkbox = document.querySelector<HTMLInputElement>('#sonder');
    if (!checkbox) return;

    /** Übernimmt den Zustand der `#sonder`-Checkbox. */
    const handleChange = () => {
      setSonderActive(checkbox.checked);
    };

    // Initialer Zustand -- per Microtask, damit kein synchroner setState im Effect-Body liegt
    // (react-hooks/set-state-in-effect).
    queueMicrotask(() => setSonderActive(checkbox.checked));

    checkbox.addEventListener('change', handleChange);
    return () => checkbox.removeEventListener('change', handleChange);
  }, []);

  if (!aZ?.frueh) return null;

  const activeSchichten: BereitschaftSchichtTyp[] = [
    'frueh',
    ...(aZ?.spaet?.aktiv ? (['spaet'] as BereitschaftSchichtTyp[]) : []),
    ...(aZ?.nacht?.aktiv ? (['nacht'] as BereitschaftSchichtTyp[]) : []),
  ];

  /**
   * Übernimmt geänderte Schicht-Overrides und meldet sie zusammen mit der Sonderschicht-Überschreibung.
   *
   * @param next - Neue Overrides aus dem Editor; `undefined` = keine.
   */
  const handleEditor = (next: IVorgabenUvorgabenB['schichtenOverrides']): void => {
    setOverrides(next ?? {});
    onChange(next ? { ...next, sonderOverride } : sonderOverride ? { sonderOverride } : undefined);
  };

  /**
   * Übernimmt eine geänderte Sonderschicht-Überschreibung und meldet sie zusammen mit den Schicht-Overrides.
   *
   * @param next - Neue Arbeitszeit der Sonderschicht; `undefined` = zurückgesetzt.
   */
  const handleSonderChange = (next: ISchichtZeiten | undefined): void => {
    setSonderOverride(next);
    onChange(next ? { ...overrides, sonderOverride: next } : Object.keys(overrides).length > 0 ? overrides : undefined);
  };

  /**
   * Klappt den Override-Bereich auf/zu. Zugeklappt gelten keine Overrides; beim Aufklappen werden die
   * bereits erfassten wieder angewendet.
   *
   * @param next - `true` = aufgeklappt.
   */
  const toggleOpen = (next: boolean): void => {
    setOpen(next);
    onChange(
      next
        ? { ...(Object.keys(overrides).length > 0 ? overrides : {}), ...(sonderOverride ? { sonderOverride } : {}) }
        : undefined,
    );
  };

  return (
    <div>
      <DBCheckbox
        className="bereitschaft"
        size="small"
        id="azOverride"
        label="Andere Arbeitszeiten hinterlegen"
        checked={open}
        onChange={e => toggleOpen(e.target.checked)}
      />
      {open && (
        <div className="border p-2 mt-1">
          <SchichtOverrideEditor aZ={aZ} schichten={activeSchichten} overrides={overrides} onChange={handleEditor} />
          {aZ.sonder.aktiv && sonderActive && (
            <div className="mt-3 pt-3 border-top">
              <div className="d-flex align-items-center gap-2 mb-2">
                <DBHeadingH6 className="mb-0">Sonderschicht</DBHeadingH6>
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
                  <DbFeld
                    type="number"
                    beschriftung="Pause in Minuten"
                    dicht
                    feldKlasse="text-center"
                    huelleStyle={{ width: '4rem' }}
                    value={sonderOverride?.pause ?? aZ.sonder.pause}
                    min={0}
                    step={5}
                    onChange={e =>
                      handleSonderChange({
                        aktiv: true,
                        beginn: sonderOverride?.beginn ?? aZ.sonder.beginn,
                        ende: sonderOverride?.ende ?? aZ.sonder.ende,
                        pause: Number(e.target.value),
                      })
                    }
                  />
                  <span className="text-muted small">min</span>
                </div>
                <DBButton
                  type="button"
                  className="ms-auto"
                  variant="outlined"
                  size="small"
                  onClick={() => handleSonderChange(undefined)}
                >
                  {sonderOverride ? 'Zurücksetzen' : 'Deaktivieren'}
                </DBButton>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
