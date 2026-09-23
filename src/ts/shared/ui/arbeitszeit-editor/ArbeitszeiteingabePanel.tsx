import { type JSX, useEffect, useRef, useState } from 'react';

import { DBDivider, DBHeadingH5 } from '@db-ux/react-core-components';
import { DbFeld } from '@/shared/ui/form/DbFeld';
import MyCheckbox from '@/shared/ui/form/MyCheckbox';
import type { IVorgabenUaZ, IPerWeekdaySchicht, ISchichtZeiten, SchichtBase } from '@/types';
import { setArbeitszeitPanelState } from './arbeitszeitPanelState';
import { SchichtSection } from './SchichtSection';

interface PanelProps {
  initialValues: IVorgabenUaZ;
  onChange?: (value: IVorgabenUaZ) => void;
}

/**
 * Editor für die Arbeitszeiten (Früh-, Spät-, Nacht- und Sonderschicht, Fahrzeit Wohnung/Arbeitsort). Meldet jeden Stand an `arbeitszeitPanelState` und optional an `onChange`.
 *
 * @param props - `initialValues`: Anfangswerte der Arbeitszeiten; `onChange`: wird nach jeder Änderung mit dem neuen Stand gerufen.
 */
export function ArbeitszeiteingabePanel({ initialValues, onChange }: PanelProps): JSX.Element {
  const [aZ, setAZ] = useState<IVorgabenUaZ>(initialValues);
  const panelStateRef = useRef<IVorgabenUaZ>(initialValues);
  // Neueste `onChange`-Referenz halten, ohne den `[aZ]`-Effect bei jeder neuen Funktions-Identität neu zu feuern.
  // Zuweisung im Effect (nicht im Render), damit React 19 die Ref nicht beim Rendern beschrieben sieht; der Effect steht
  // bewusst VOR dem `[aZ]`-Effect, der die Ref liest.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  /**
   * Wendet eine Änderung an und aktualisiert Ref, Panel-State und React-State synchron, damit `saveEinstellungen()` den Stand auch vor dem nächsten Effect lesen kann.
   *
   * @param updater - Berechnet aus dem aktuellen Stand den neuen.
   */
  const updatePanelState = (updater: (current: IVorgabenUaZ) => IVorgabenUaZ): void => {
    const next = updater(panelStateRef.current);
    panelStateRef.current = next;
    setArbeitszeitPanelState(next);
    setAZ(next);
  };

  // Kein Effect für `initialValues`: der `key`-Prop im Parent sorgt für einen vollständigen Remount. Ein Effect hier würde
  // `aZ` bei jedem Parent-Re-Render (z.B. nach `onChange`) zurücksetzen und eine Endlosschleife auslösen.

  useEffect(() => {
    panelStateRef.current = aZ;
    setArbeitszeitPanelState(aZ);
    onChangeRef.current?.(aZ);
  }, [aZ]);

  /**
   * Ersetzt die Frühschicht.
   *
   * @param schicht - Neue Frühschicht.
   */
  const updateFrueh = (schicht: IPerWeekdaySchicht) => updatePanelState(current => ({ ...current, frueh: schicht }));
  /**
   * Ersetzt die Spätschicht.
   *
   * @param schicht - Neue Spätschicht.
   */
  const updateSpaet = (schicht: IPerWeekdaySchicht) => updatePanelState(current => ({ ...current, spaet: schicht }));
  /**
   * Ersetzt die Nachtschicht.
   *
   * @param schicht - Neue Nachtschicht.
   */
  const updateNacht = (schicht: IPerWeekdaySchicht) => updatePanelState(current => ({ ...current, nacht: schicht }));
  /**
   * Ersetzt die Sonderschicht.
   *
   * @param sonder - Neue Sonderschicht.
   */
  const updateSonder = (sonder: ISchichtZeiten) => updatePanelState(current => ({ ...current, sonder }));
  /**
   * Setzt die Fahrzeit Wohnung/Arbeitsort.
   *
   * @param v - Fahrzeit als `HH:mm`.
   */
  const updateFahrzeit = (v: string) => updatePanelState(current => ({ ...current, fahrzeit: v }));

  return (
    <div>
      <FahrzeitInput value={aZ.fahrzeit} onChange={updateFahrzeit} />
      <div className="raster abstand-0">
        <div className="sp-lg-6 arbeitszeit-col-left">
          <DBDivider width="full" />
          <SchichtSection title="Frühschicht" schicht={aZ.frueh} onChange={updateFrueh} />
          <DBDivider width="full" />
          <OptionalSchichtSection
            title="Spätschicht"
            schicht={aZ.spaet}
            defaultTemplate={{ beginn: '14:00', ende: '22:00', pause: 30 }}
            onChange={updateSpaet}
          />
        </div>
        <div className="sp-lg-6 arbeitszeit-col-right">
          <DBDivider width="full" />
          <OptionalSchichtSection
            title="Nachtschicht"
            schicht={aZ.nacht}
            defaultTemplate={{ beginn: '19:45', ende: '06:15', pause: 45 }}
            defaultRegelarbeitstage={[1, 2, 3, 4, 5]}
            onChange={updateNacht}
          />
          <DBDivider width="full" />
          <SonderSection sonder={aZ.sonder} onChange={updateSonder} />
        </div>
      </div>
    </div>
  );
}

/**
 * Zeitfeld für die Fahrzeit Wohnung/Arbeitsort.
 *
 * @param props - `value`: Fahrzeit als `HH:mm`; `onChange`: wird mit dem neuen Wert gerufen.
 */
function FahrzeitInput({ value, onChange }: { value: string; onChange: (v: string) => void }): JSX.Element {
  return (
    <div className="db-input" data-icon="car">
      <label htmlFor="fahrzeit">Fahrzeit Wohnung / Arbeitsort</label>
      <input
        type="time"
        id="fahrzeit"
        value={value}
        onChange={e => onChange((e.target as HTMLInputElement).value)}
        required
      />
    </div>
  );
}

/**
 * Abschnitt für eine abschaltbare Schicht (Spät/Nacht): Checkbox "aktiv" plus `SchichtSection`, solange aktiv.
 *
 * @param props - `title`, `schicht`, `defaultTemplate` (Zeiten beim erstmaligen Aktivieren), optional `defaultRegelarbeitstage` und `onChange`.
 */
function OptionalSchichtSection({
  title,
  schicht,
  defaultTemplate,
  defaultRegelarbeitstage,
  onChange,
}: {
  title: string;
  schicht: IPerWeekdaySchicht;
  defaultTemplate: SchichtBase;
  defaultRegelarbeitstage?: number[];
  onChange: (s: IPerWeekdaySchicht) => void;
}): JSX.Element {
  const enabled = schicht.aktiv;

  /**
   * Schaltet die Schicht um. Beim Deaktivieren bleibt die Konfiguration erhalten; beim Aktivieren ohne gespeicherte Zeiten (`default.beginn` leer) wird `defaultTemplate` verwendet.
   */
  const handleToggle = () => {
    if (enabled) {
      onChange({ ...schicht, aktiv: false });
    } else {
      const hasConfig = schicht.default.beginn !== '';
      onChange(
        hasConfig
          ? { ...schicht, aktiv: true }
          : { aktiv: true, default: defaultTemplate, regelarbeitstage: defaultRegelarbeitstage },
      );
    }
  };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
        <DBHeadingH5 className="mb-0">{title}</DBHeadingH5>
        <MyCheckbox className="ms-2" size="small" id={`toggle-${title}`} checked={enabled} changeHandler={handleToggle}>
          aktiv
        </MyCheckbox>
      </div>
      {enabled && <SchichtSection title="" schicht={schicht} onChange={onChange} />}
    </div>
  );
}

/**
 * Abschnitt für die Sonderschicht: Checkbox "aktiv" plus Beginn, Ende und Pause, solange aktiv.
 *
 * @param props - `sonder` und `onChange`.
 */
function SonderSection({
  sonder,
  onChange,
}: {
  sonder: ISchichtZeiten;
  onChange: (s: ISchichtZeiten) => void;
}): JSX.Element {
  const enabled = sonder.aktiv;

  /**
   * Übernimmt einzelne Felder in die Sonderschicht.
   *
   * @param partial - Zu ändernde Felder der Sonderschicht.
   */
  const update = (partial: Partial<ISchichtZeiten>) => onChange({ ...sonder, ...partial });

  return (
    <div>
      <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
        <DBHeadingH5 className="mb-0">Sonderschicht</DBHeadingH5>
        <MyCheckbox
          className="ms-2"
          size="small"
          id="toggle-sonder"
          checked={enabled}
          changeHandler={() => onChange({ ...sonder, aktiv: !enabled })}
        >
          aktiv
        </MyCheckbox>
      </div>
      {enabled && (
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <DbFeld
            type="time"
            beschriftung="Beginn"
            dicht
            huelleStyle={{ width: '7rem' }}
            value={sonder.beginn}
            onChange={e => update({ beginn: e.target.value })}
          />
          <span>–</span>
          <DbFeld
            type="time"
            beschriftung="Ende"
            dicht
            huelleStyle={{ width: '7rem' }}
            value={sonder.ende}
            onChange={e => update({ ende: e.target.value })}
          />
          <div className="d-flex align-items-center gap-1">
            <DbFeld
              type="number"
              beschriftung="Pause in Minuten"
              dicht
              feldKlasse="text-center"
              huelleStyle={{ width: '4rem' }}
              value={sonder.pause}
              min={0}
              step={5}
              onChange={e => update({ pause: Number(e.target.value) })}
            />
            <span className="text-muted small">min</span>
          </div>
        </div>
      )}
    </div>
  );
}
