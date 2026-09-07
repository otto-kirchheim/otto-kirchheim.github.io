import {
  useId,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
} from 'react';

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
  /** Klasse an der Huelle -- Layout (Breite, Abstand) gehoert hierhin. */
  className?: string;
  /** Ohne `id` verknuepft `useId()` Label und Feld. */
  id?: string;
  /** Breite/Abstand gehoeren an die Huelle, damit das Feld sie ausfuellt. */
  huelleStyle?: CSSProperties;
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

type DbFeldProps = GemeinsameProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'id' | 'ref'> & {
    /** Klasse am `<input>` selbst (z.B. `text-center`), nicht an der Huelle. */
    feldKlasse?: string;
    /** Ersetzt Bootstraps `is-invalid`: DB faerbt ueber `data-custom-validity`. */
    ungueltig?: boolean;
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

type DbAuswahlProps = GemeinsameProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'id' | 'ref'> & {
    children: ReactNode;
    feldRef?: Ref<HTMLSelectElement>;
  };

export function DbAuswahl({
  beschriftung,
  beschriftungZeigen,
  dicht,
  className = '',
  id,
  children,
  huelleStyle,
  feldRef,
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
      <select ref={feldRef} id={feldId} {...feldProps}>
        {children}
      </select>
    </div>
  );
}
