import type { Dayjs } from 'dayjs';
import { type FC, type ChangeEventHandler, type RefObject } from 'react';

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
  // Vorbelegung und lesen den Wert spaeter per Ref aus (Preact-Verhalten).
  const vorauswahl = wert ?? options.find(o => o.selected)?.value ?? undefined;
  const gesteuert = changeHandler !== undefined && wert !== undefined;

  return (
    <div className={className}>
      <select
        ref={myRef}
        id={id}
        className="form-select validate"
        onChange={changeHandler}
        {...(gesteuert ? { value: wert } : { defaultValue: vorauswahl })}
        {...selectProps}
      >
        {options.map(optionObject => (
          <option key={optionObject.text} value={optionObject.value ?? ''} disabled={optionObject.disabled}>
            {optionObject.text}
          </option>
        ))}
      </select>
      <label className="form-label" htmlFor={id}>
        {title}
      </label>
    </div>
  );
};

export default MySelect;
