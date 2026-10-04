import { DBSelect } from '@db-ux/react-core-components';
import type { Dayjs } from 'dayjs';
import { useRef, type ChangeEventHandler, type ComponentProps, type FC, type RefObject } from 'react';

import { refZusammenfuehren, STANDARD_UNGUELTIG_MELDUNG, useSofortigeId } from './dbFeldHelfer';

/** Von `DBSelect`s eigenem Prop-Typ abgeleitet statt einer Hand-Allowlist -- siehe `MyInput.tsx`.
 *  `className` gehoert der Huelle (`<div>`), nicht `DBSelect` -- deshalb ausgenommen und unten neu typisiert. */
type TMySelect = Omit<
  ComponentProps<typeof DBSelect>,
  'ref' | 'label' | 'value' | 'onChange' | 'className' | 'invalidMessage' | 'children' | 'options'
> & {
  myRef?: RefObject<HTMLSelectElement | null>;
  id: string;
  title: string;
  value?: string | number | Dayjs;
  className?: string;
  /** Ungueltig-Meldung des DB-Felds. Ohne Angabe gilt `STANDARD_UNGUELTIG_MELDUNG`. */
  invalidMessage?: string;
  changeHandler?: ChangeEventHandler<HTMLSelectElement>;
  options: {
    value?: string | number;
    text: string;
    disabled?: boolean;
    selected?: boolean;
    html?: boolean;
  }[];
};

/**
 * `DBSelect` mit der Aufrufstellen-API der Modals: `title` als Label, Optionen als Liste und
 * Huelle mit `className`. Mit `changeHandler` UND `value` gesteuert, sonst ungesteuert mit
 * Vorauswahl (`value` bzw. die Option mit `selected`).
 *
 * Props: `TMySelect`; `id`, `title` und `options` sind Pflicht.
 */
const MySelect: FC<TMySelect> = ({
  myRef,
  className,
  options,
  changeHandler,
  title,
  value,
  id,
  invalidMessage,
  ...selectProps
}) => {
  const wert = typeof value === 'object' ? value?.toString() : value;
  // Ohne Handler waere `value` in React schreibgeschuetzt -- die Aufrufer nutzen das Feld aber als
  // Vorbelegung und lesen den Wert spaeter per Ref aus (dann `defaultValue`).
  const vorauswahl = wert ?? options.find(o => o.selected)?.value ?? undefined;
  const gesteuert = changeHandler !== undefined && wert !== undefined;
  const eigeneRef = useRef<HTMLSelectElement>(null);
  useSofortigeId(eigeneRef, id);

  return (
    <div className={className}>
      {/* Die Optionen kommen aus `options.map(...)`; das sieht die statische Regel nicht. */}
      {/* eslint-disable-next-line db-ux/select-requires-options */}
      <DBSelect
        ref={refZusammenfuehren(eigeneRef, myRef)}
        id={id}
        label={title}
        invalidMessage={invalidMessage ?? STANDARD_UNGUELTIG_MELDUNG}
        onChange={changeHandler}
        {...(gesteuert ? { value: wert } : { defaultValue: vorauswahl })}
        {...selectProps}
      >
        {options.map(optionObject => (
          <option key={optionObject.text} value={optionObject.value ?? ''} disabled={optionObject.disabled}>
            {optionObject.text}
          </option>
        ))}
      </DBSelect>
    </div>
  );
};

export default MySelect;
