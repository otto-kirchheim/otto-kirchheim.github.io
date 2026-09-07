import { useId, type ChangeEventHandler, type CSSProperties, type ReactNode, type Ref } from 'react';

/**
 * Kompakte Eingabefelder ohne sichtbare Beschriftung (Panels, Zeilen-Editoren, Werkzeugleisten).
 *
 * Bootstrap stylte ein nacktes `<input class="form-control">`; DB stylt `input`/`select` nur
 * innerhalb einer `db-input`/`db-select`-Huelle, und die verlangt ein `<label>`. Diese Huelle an
 * rund 60 Stellen von Hand zu wiederholen (inklusive erfundener `id`s fuer `htmlFor`) waere der
 * Hauptteil des Umbaus -- deshalb steht sie hier einmal. `useId()` liefert die Verknuepfung
 * Label <-> Feld; damit bekommen die Felder nebenbei einen zugaenglichen Namen, den sie unter
 * Bootstrap ueberwiegend nicht hatten.
 *
 * Sichtbare Beschriftung: `beschriftungZeigen`. Gedraengte Groesse (Ersatz fuer
 * `form-control-sm`/`form-select-sm`): `dicht`.
 */
type GemeinsameProps = {
  beschriftung: string;
  beschriftungZeigen?: boolean;
  dicht?: boolean;
  className?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  style?: CSSProperties;
  title?: string;
};

function huellenAttribute({
  beschriftungZeigen,
  dicht,
  klasse,
}: {
  beschriftungZeigen?: boolean;
  dicht?: boolean;
  klasse: string;
}) {
  return {
    className: klasse,
    ...(beschriftungZeigen ? {} : { 'data-hide-label': 'true' }),
    ...(dicht ? { 'data-density': 'functional' } : {}),
  };
}

type DbFeldProps = GemeinsameProps & {
  type: string;
  value?: string | number;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  placeholder?: string;
  list?: string;
  readOnly?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  onBlur?: ChangeEventHandler<HTMLInputElement>;
  /** Klasse am `<input>` selbst (z.B. `text-center`), nicht an der Huelle. */
  feldKlasse?: string;
  /** Ersetzt Bootstraps `is-invalid`: DB faerbt ueber `data-custom-validity`. */
  ungueltig?: boolean;
  /** Breite/Abstand gehoeren an die Huelle, damit das Feld sie ausfuellt. */
  huelleStyle?: CSSProperties;
  feldRef?: Ref<HTMLInputElement>;
};

export function DbFeld({
  beschriftung,
  beschriftungZeigen,
  dicht,
  className = '',
  id,
  feldKlasse,
  huelleStyle,
  ungueltig,
  feldRef,
  ...feldProps
}: DbFeldProps) {
  const erzeugteId = useId();
  const feldId = id ?? erzeugteId;

  return (
    <div
      {...huellenAttribute({ beschriftungZeigen, dicht, klasse: `db-input ${className}`.trim() })}
      style={huelleStyle}
    >
      <label htmlFor={feldId}>{beschriftung}</label>
      {/* eslint-disable-next-line db-ux/form-validation-message-required */}
      <input
        ref={feldRef}
        id={feldId}
        className={feldKlasse}
        data-custom-validity={ungueltig ? 'invalid' : undefined}
        aria-invalid={ungueltig || undefined}
        {...feldProps}
      />
    </div>
  );
}

type DbAuswahlProps = GemeinsameProps & {
  value?: string | number;
  onChange?: ChangeEventHandler<HTMLSelectElement>;
  children: ReactNode;
  huelleStyle?: CSSProperties;
};

export function DbAuswahl({
  beschriftung,
  beschriftungZeigen,
  dicht,
  className = '',
  id,
  children,
  huelleStyle,
  ...feldProps
}: DbAuswahlProps) {
  const erzeugteId = useId();
  const feldId = id ?? erzeugteId;

  return (
    <div
      {...huellenAttribute({ beschriftungZeigen, dicht, klasse: `db-select ${className}`.trim() })}
      style={huelleStyle}
    >
      <label htmlFor={feldId}>{beschriftung}</label>
      {/* Die Optionen kommen von der Aufrufstelle; das sieht die statische Regel nicht. */}
      {/* eslint-disable-next-line db-ux/select-requires-options */}
      <select id={feldId} {...feldProps}>
        {children}
      </select>
    </div>
  );
}
