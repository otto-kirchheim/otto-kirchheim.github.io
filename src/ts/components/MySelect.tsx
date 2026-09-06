import { DBSelect } from '@db-ux/react-core-components';
import type { Dayjs } from 'dayjs';
import { useRef, type ChangeEventHandler, type FC, type RefObject } from 'react';

import { refZusammenfuehren, useSofortigeId } from './dbFeldHelfer';

type TMySelect = {
  myRef?: RefObject<HTMLSelectElement | null>;
  id: string;
  title: string;
  value?: string | number | Dayjs;
  className: string;
  required?: boolean;
  changeHandler?: ChangeEventHandler<HTMLSelectElement>;
  options: {
    value?: string | number;
    text: string;
    disabled?: boolean;
    selected?: boolean;
    html?: boolean;
  }[];
};

const MySelect: FC<TMySelect> = ({ myRef, className, options, changeHandler, title, value, id, ...selectProps }) => {
  const wert = typeof value === 'object' ? value?.toString() : value;
  // React kennt nur "controlled" (value + onChange) oder "uncontrolled" (defaultValue). Ohne
  // Handler waere `value` ein schreibgeschuetztes Feld -- die Aufrufer nutzen das Feld aber als
  // Vorbelegung und lesen den Wert spaeter per Ref aus.
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
