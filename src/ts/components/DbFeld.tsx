import { DBInput, DBSelect } from '@db-ux/react-core-components';
import {
  useId,
  useRef,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
} from 'react';

import {
  refZusammenfuehren,
  STANDARD_UNGUELTIG_MELDUNG,
  useSofortigeHuelleStyle,
  useSofortigeId,
  useSofortigeKlasse,
} from './dbFeldHelfer';

/**
 * Props von `DbFeld`/`DbAuswahl`: kompakte Eingabefelder ohne sichtbare Beschriftung (Panels,
 * Zeilen-Editoren, Werkzeugleisten). Sichtbar wird das Label mit `beschriftungZeigen`, die
 * gedraengte Groesse (`data-density="functional"`) kommt mit `dicht`.
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

type DbFeldProps = GemeinsameProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'id' | 'ref' | 'onInput'> & {
    /** Klasse am `<input>` selbst (z.B. `text-center`), nicht an der Huelle. */
    feldKlasse?: string;
    /** Markiert das Feld als ungueltig (DB faerbt ueber `data-custom-validity`). */
    ungueltig?: boolean;
    feldRef?: Ref<HTMLInputElement>;
  };

/**
 * Duenner Wrapper um `DBInput` mit der kompakteren Aufrufstellen-API (verstecktes Label per
 * Default, `dicht`, `huelleStyle`, `feldKlasse`). `DBInput` erzeugt Huelle und `<label>`-
 * Verknuepfung selbst.
 *
 * Props: `GemeinsameProps`, `feldKlasse` (Klasse am `<input>`), `ungueltig`, `feldRef`
 *   sowie alle weiteren `<input>`-Attribute.
 */
export function DbFeld({
  beschriftung,
  beschriftungZeigen,
  dicht,
  className,
  id,
  feldKlasse,
  huelleStyle,
  ungueltig,
  feldRef,
  ...feldProps
}: DbFeldProps) {
  const erzeugteId = useId();
  const feldId = id ?? erzeugteId;
  const eigeneRef = useRef<HTMLInputElement>(null);
  useSofortigeId(eigeneRef, feldId);
  useSofortigeKlasse(eigeneRef, feldKlasse);
  useSofortigeHuelleStyle(eigeneRef, huelleStyle);

  return (
    // `type` kommt ueber die Props der Aufrufstelle; die statische Regel sieht das nicht.
    // eslint-disable-next-line db-ux/input-type-required
    <DBInput
      ref={refZusammenfuehren(eigeneRef, feldRef)}
      id={feldId}
      label={beschriftung}
      showLabel={beschriftungZeigen === true}
      data-density={dicht ? 'functional' : undefined}
      className={className}
      validation={ungueltig ? 'invalid' : undefined}
      invalidMessage={STANDARD_UNGUELTIG_MELDUNG}
      {...feldProps}
    />
  );
}

type DbAuswahlProps = GemeinsameProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'id' | 'ref' | 'onInput'> & {
    children: ReactNode;
    feldRef?: Ref<HTMLSelectElement>;
  };

/**
 * Duenner Wrapper um `DBSelect` mit derselben kompakten API wie `DbFeld`; die `<option>`-Eintraege
 * kommen als `children`.
 *
 * Props: `GemeinsameProps`, `children` (Optionen), `feldRef` sowie alle weiteren
 *   `<select>`-Attribute.
 */
export function DbAuswahl({
  beschriftung,
  beschriftungZeigen,
  dicht,
  className,
  id,
  children,
  huelleStyle,
  feldRef,
  ...feldProps
}: DbAuswahlProps) {
  const erzeugteId = useId();
  const feldId = id ?? erzeugteId;
  const eigeneRef = useRef<HTMLSelectElement>(null);
  useSofortigeId(eigeneRef, feldId);
  useSofortigeHuelleStyle(eigeneRef, huelleStyle);

  return (
    // Die Optionen kommen als `children` von der Aufrufstelle; das sieht die statische Regel nicht.
    // eslint-disable-next-line db-ux/select-requires-options
    <DBSelect
      ref={refZusammenfuehren(eigeneRef, feldRef)}
      id={feldId}
      label={beschriftung}
      showLabel={beschriftungZeigen === true}
      data-density={dicht ? 'functional' : undefined}
      className={className}
      {...feldProps}
    >
      {children}
    </DBSelect>
  );
}
