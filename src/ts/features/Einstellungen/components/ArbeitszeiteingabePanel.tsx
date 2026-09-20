import { type JSX, useEffect, useRef, useState } from 'react';

import { DBButton, DBDivider, DBHeadingH5, DBTag, DBTooltip } from '@db-ux/react-core-components';
import { DbFeld, MyCheckbox } from '@/components';
import type { IVorgabenUaZ, IPerWeekdaySchicht, ISchichtZeiten, SchichtBase } from '@/types';
import { groupBySchedule, isOvernightSchicht } from '@/types';
import { setArbeitszeitPanelState } from './arbeitszeitPanelState';

const DAY_LABELS = ['', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;
const DEFAULT_REGELARBEITSTAGE = [1, 2, 3, 4, 5];

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
 * Editor einer Schicht je Wochentag: Regelarbeitstage, Zeitgruppen (Standard und Abweichungen) und Anlegen neuer Zeitvarianten. Ist auch im `SchichtOverrideEditor` im Einsatz.
 *
 * @param props - `title` (leer = keine Überschrift), `schicht` und `onChange`.
 */
export function SchichtSection({
  title,
  schicht,
  onChange,
}: {
  title: string;
  schicht: IPerWeekdaySchicht;
  onChange: (s: IPerWeekdaySchicht) => void;
}): JSX.Element {
  const regelarbeitstage = schicht.regelarbeitstage?.length ? schicht.regelarbeitstage : DEFAULT_REGELARBEITSTAGE;
  const groups = groupBySchedule(schicht);

  const [addingOverride, setAddingOverride] = useState(false);
  const [newDays, setNewDays] = useState<number[]>([]);
  const [newConfig, setNewConfig] = useState<SchichtBase>(schicht.default);

  /**
   * Schaltet einen Regelarbeitstag um. Entspricht das Ergebnis Mo-Fr, wird `regelarbeitstage` als Standard weggelassen.
   *
   * @param day - Wochentag 1 (Mo) bis 7 (So).
   */
  const toggleDay = (day: number): void => {
    const rat = schicht.regelarbeitstage?.length ? schicht.regelarbeitstage : DEFAULT_REGELARBEITSTAGE;
    const newRat = rat.includes(day) ? rat.filter(d => d !== day) : [...rat, day].sort((a, b) => a - b);
    onChange({
      ...schicht,
      regelarbeitstage:
        newRat.length === 5 && newRat.every((d, i) => d === DEFAULT_REGELARBEITSTAGE[i]) ? undefined : newRat,
    });
  };

  /**
   * Übernimmt geänderte Zeiten einer Gruppe. Betrifft sie den Standard, wird `default` ersetzt und Abweichungen, die danach gleich sind, entfallen; sonst wird je Tag nur der Unterschied zum Standard als Override gespeichert.
   *
   * @param days - Wochentage der bearbeiteten Gruppe.
   * @param updatedConfig - Neue Zeiten der Gruppe.
   */
  const updateGroup = (days: number[], updatedConfig: SchichtBase): void => {
    const newSchicht = { ...schicht };

    const isDefaultGroup = days.every(d => {
      const override = schicht.overrides?.[d as keyof NonNullable<IPerWeekdaySchicht['overrides']>];
      return !override;
    });

    if (isDefaultGroup) {
      newSchicht.default = updatedConfig;
      if (newSchicht.overrides) {
        const cleaned = { ...newSchicht.overrides };
        for (const key of Object.keys(cleaned) as unknown as Array<keyof NonNullable<typeof cleaned>>) {
          const ov = cleaned[key];
          if (!ov) continue;
          const resolved = { ...updatedConfig, ...ov };
          if (
            resolved.beginn === updatedConfig.beginn &&
            resolved.ende === updatedConfig.ende &&
            resolved.pause === updatedConfig.pause
          ) {
            delete cleaned[key];
          }
        }
        newSchicht.overrides = Object.keys(cleaned).length > 0 ? cleaned : undefined;
      }
    } else {
      const newOverrides = { ...(schicht.overrides ?? {}) } as Record<number, Partial<SchichtBase>>;
      for (const day of days) {
        const override: Partial<SchichtBase> = {};
        if (updatedConfig.beginn !== newSchicht.default.beginn) override.beginn = updatedConfig.beginn;
        if (updatedConfig.ende !== newSchicht.default.ende) override.ende = updatedConfig.ende;
        if (updatedConfig.pause !== newSchicht.default.pause) override.pause = updatedConfig.pause;

        if (Object.keys(override).length > 0) {
          newOverrides[day] = override;
        } else {
          delete newOverrides[day];
        }
      }
      newSchicht.overrides =
        Object.keys(newOverrides).length > 0 ? (newOverrides as IPerWeekdaySchicht['overrides']) : undefined;
    }

    onChange(newSchicht);
  };

  /**
   * Speichert die Zeitvariante aus dem Anlege-Formular für die gewählten Tage (nur abweichende Felder) und setzt das Formular zurück. Ohne gewählte Tage passiert nichts.
   */
  const saveNewOverride = (): void => {
    if (newDays.length === 0) return;
    const newOverrides = { ...(schicht.overrides ?? {}) } as Record<number, Partial<SchichtBase>>;
    for (const day of newDays) {
      const override: Partial<SchichtBase> = {};
      if (newConfig.beginn !== schicht.default.beginn) override.beginn = newConfig.beginn;
      if (newConfig.ende !== schicht.default.ende) override.ende = newConfig.ende;
      if (newConfig.pause !== schicht.default.pause) override.pause = newConfig.pause;
      if (Object.keys(override).length > 0) newOverrides[day] = override;
    }
    onChange({
      ...schicht,
      overrides: Object.keys(newOverrides).length > 0 ? (newOverrides as IPerWeekdaySchicht['overrides']) : undefined,
    });
    setAddingOverride(false);
    setNewDays([]);
    setNewConfig(schicht.default);
  };

  /**
   * Entfernt die Overrides der Tage; sie fallen auf den Standard zurück.
   *
   * @param days - Wochentage, deren Abweichung entfällt.
   */
  const deleteOverride = (days: number[]): void => {
    const newOverrides = { ...(schicht.overrides ?? {}) } as Record<number, Partial<SchichtBase>>;
    for (const day of days) delete newOverrides[day];
    onChange({
      ...schicht,
      overrides: Object.keys(newOverrides).length > 0 ? (newOverrides as IPerWeekdaySchicht['overrides']) : undefined,
    });
  };

  /**
   * Prüft, ob die Gruppe eine löschbare Zeitvariante ist.
   *
   * @param days - Wochentage einer Gruppe.
   * @returns `true`, wenn mindestens ein Tag eine Abweichung vom Standard hat.
   */
  const isOverrideGroup = (days: number[]): boolean => days.some(d => d in (schicht.overrides ?? {}));

  return (
    <div>
      {title && <DBHeadingH5 paragraphSpacing>{title}</DBHeadingH5>}
      <WeekdayChips regelarbeitstage={regelarbeitstage} onToggle={toggleDay} />
      <div className="mt-2">
        {groups.map(group => (
          <ScheduleGroupRow
            key={group.days.join(',')}
            days={group.days}
            config={group.config}
            defaultConfig={schicht.default}
            onUpdate={updatedConfig => updateGroup(group.days, updatedConfig)}
            onDelete={isOverrideGroup(group.days) ? () => deleteOverride(group.days) : undefined}
          />
        ))}
        {addingOverride ? (
          <div className="border p-2 mt-2">
            <p className="small text-muted fw-semibold text-uppercase mb-2">Neue Zeitvariante</p>
            <div className="d-flex gap-1 mb-2">
              {regelarbeitstage.map(day => (
                <DBButton
                  key={day}
                  type="button"
                  variant={newDays.includes(day) ? 'brand' : 'outlined'}
                  size="small"
                  style={{ minWidth: '2.5rem' }}
                  onClick={() =>
                    setNewDays(prev => (prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]))
                  }
                >
                  {DAY_LABELS[day]}
                </DBButton>
              ))}
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <DbFeld
                type="time"
                beschriftung="Beginn"
                dicht
                huelleStyle={{ width: '7rem' }}
                value={newConfig.beginn}
                onChange={e => setNewConfig(prev => ({ ...prev, beginn: e.target.value }))}
              />
              <span>–</span>
              <DbFeld
                type="time"
                beschriftung="Ende"
                dicht
                huelleStyle={{ width: '7rem' }}
                value={newConfig.ende}
                onChange={e => setNewConfig(prev => ({ ...prev, ende: e.target.value }))}
              />
              {isOvernightSchicht(newConfig) && (
                <DBTag semantic="neutral" emphasis="strong" style={{ fontSize: '0.65rem' }}>
                  +1 Tag
                </DBTag>
              )}
              <div className="d-flex align-items-center gap-1">
                <DbFeld
                  type="number"
                  beschriftung="Pause in Minuten"
                  dicht
                  feldKlasse="text-center"
                  huelleStyle={{ width: '4rem' }}
                  value={newConfig.pause}
                  min={0}
                  step={5}
                  onChange={e => setNewConfig(prev => ({ ...prev, pause: Number(e.target.value) }))}
                />
                <span className="text-muted small">min</span>
              </div>
              <DBButton
                type="button"
                className="ms-auto"
                variant="filled"
                data-color="successful"
                size="small"
                icon="check"
                noText
                onClick={saveNewOverride}
                disabled={newDays.length === 0}
              >
                <DBTooltip>Übernehmen</DBTooltip>
              </DBButton>
              <DBButton
                type="button"
                variant="outlined"
                size="small"
                icon="cross"
                noText
                onClick={() => {
                  setAddingOverride(false);
                  setNewDays([]);
                }}
              >
                <DBTooltip>Abbrechen</DBTooltip>
              </DBButton>
            </div>
          </div>
        ) : (
          <DBButton
            type="button"
            className="mt-2 d-flex align-items-center gap-1"
            variant="outlined"
            size="small"
            icon="plus"
            onClick={() => {
              setAddingOverride(true);
              setNewConfig(schicht.default);
            }}
          >
            Zeitvariante
          </DBButton>
        )}
      </div>
    </div>
  );
}

/**
 * Wochentag-Schalter Mo bis So für die Regelarbeitstage.
 *
 * @param props - `regelarbeitstage` (aktive Tage 1-7) und `onToggle`.
 */
function WeekdayChips({
  regelarbeitstage,
  onToggle,
}: {
  regelarbeitstage: number[];
  onToggle: (day: number) => void;
}): JSX.Element {
  return (
    <div className="d-flex flex-wrap gap-1">
      {[1, 2, 3, 4, 5, 6, 7].map(day => (
        <DBButton
          key={day}
          type="button"
          variant={regelarbeitstage.includes(day) ? 'brand' : 'outlined'}
          size="small"
          style={{ minWidth: '2.5rem' }}
          onClick={() => onToggle(day)}
        >
          {DAY_LABELS[day]}
        </DBButton>
      ))}
    </div>
  );
}

/**
 * Zeile einer Zeitgruppe: Anzeige mit Bearbeiten-Modus für Beginn, Ende und Pause bzw. "Arbeitsfrei".
 *
 * @param props - `days`, `config` (`null` = arbeitsfrei), `defaultConfig`, `onUpdate` und optional `onDelete` (nur bei Abweichungen).
 */
function ScheduleGroupRow({
  days,
  config,
  defaultConfig,
  onUpdate,
  onDelete,
}: {
  days: number[];
  config: SchichtBase | null;
  defaultConfig: SchichtBase;
  onUpdate: (newConfig: SchichtBase) => void;
  onDelete?: () => void;
}): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState<SchichtBase>(config ?? defaultConfig);

  const dayLabel = days.map(d => DAY_LABELS[d]).join(' ');
  const overnight = config ? isOvernightSchicht(config) : false;

  if (config === null) {
    return (
      <div className="d-flex align-items-center py-1 text-muted small">
        <span className="fw-medium me-auto" style={{ minWidth: '7rem' }}>
          {dayLabel}
        </span>
        <span className="fst-italic">Arbeitsfrei</span>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="d-flex align-items-center gap-2 py-1 flex-wrap">
        <span className="fw-medium" style={{ minWidth: '7rem' }}>
          {dayLabel}
        </span>
        <DbFeld
          type="time"
          beschriftung="Beginn"
          dicht
          huelleStyle={{ width: '7rem' }}
          value={local.beginn}
          onChange={e => setLocal(prev => ({ ...prev, beginn: e.target.value }))}
        />
        <span>–</span>
        <DbFeld
          type="time"
          beschriftung="Ende"
          dicht
          huelleStyle={{ width: '7rem' }}
          value={local.ende}
          onChange={e => setLocal(prev => ({ ...prev, ende: e.target.value }))}
        />
        {isOvernightSchicht(local) && (
          <DBTag semantic="neutral" emphasis="strong" style={{ fontSize: '0.65rem' }}>
            +1 Tag
          </DBTag>
        )}
        <div className="d-flex align-items-center gap-1">
          <DbFeld
            type="number"
            beschriftung="Pause in Minuten"
            dicht
            feldKlasse="text-center"
            huelleStyle={{ width: '4rem' }}
            value={local.pause}
            min={0}
            step={5}
            onChange={e => setLocal(prev => ({ ...prev, pause: Number(e.target.value) }))}
          />
          <span className="text-muted small">min</span>
        </div>
        <DBButton
          type="button"
          variant="filled"
          data-color="successful"
          size="small"
          icon="check"
          noText
          onClick={() => {
            onUpdate(local);
            setEditing(false);
          }}
        >
          <DBTooltip>Übernehmen</DBTooltip>
        </DBButton>
        <DBButton
          type="button"
          variant="outlined"
          size="small"
          icon="cross"
          noText
          onClick={() => {
            setLocal(config);
            setEditing(false);
          }}
        >
          <DBTooltip>Abbrechen</DBTooltip>
        </DBButton>
      </div>
    );
  }

  return (
    <div className="d-flex align-items-center py-1">
      <DBButton
        type="button"
        className="d-flex align-items-center flex-wrap gap-2 flex-grow-1 text-start text-decoration-none text-body px-0"
        variant="ghost"
        iconTrailing="pen"
        onClick={() => {
          setLocal(config);
          setEditing(true);
        }}
      >
        <span className="fw-medium" style={{ minWidth: '5rem' }}>
          {dayLabel}
        </span>
        <span className="text-nowrap">
          {config.beginn} – {config.ende}
        </span>
        {overnight && (
          <DBTag semantic="neutral" emphasis="strong" style={{ fontSize: '0.65rem' }}>
            +1 Tag
          </DBTag>
        )}
        <span className="text-muted small">{config.pause > 0 ? `${config.pause} min` : 'keine Pause'}</span>
      </DBButton>
      {onDelete && (
        <DBButton
          type="button"
          className="text-danger px-1"
          variant="ghost"
          size="small"
          icon="bin"
          noText
          onClick={onDelete}
        >
          <DBTooltip>Zeitvariante löschen</DBTooltip>
        </DBButton>
      )}
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
