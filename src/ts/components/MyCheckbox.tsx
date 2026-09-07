import { DBSwitch } from '@db-ux/react-core-components';
import { useRef, type ChangeEventHandler, type FC, type ReactNode, type Ref } from 'react';

import { refZusammenfuehren, useSofortigeId } from './dbFeldHelfer';

type TMyCheckbox = {
  className?: string;
  name?: string;
  id: string;
  children: ReactNode;
  checked?: boolean;
  disabled?: boolean;
  myRef?: Ref<HTMLInputElement>;
  changeHandler?: ChangeEventHandler<HTMLInputElement>;
};

/*
 * Alle Aufrufstellen meinen Schalter, nicht Haken -- deshalb `DBSwitch` und nicht `DBCheckbox`.
 * App-eigene Klassen (z.B. `bereitschaft`, Rasterspalten) reicht `className` durch.
 */
const MyCheckbox: FC<TMyCheckbox> = ({ className, changeHandler, children, id, myRef, checked, ...inputProps }) => {
  // Ohne Handler ist `checked` in React schreibgeschuetzt; die Aufrufer meinen eine Vorbelegung.
  const zustand = changeHandler ? { checked } : { defaultChecked: checked };
  const eigeneRef = useRef<HTMLInputElement>(null);
  useSofortigeId(eigeneRef, id);

  // Einfache Beschriftungen als `label` (Barrierefreiheit, db-ux/form-label-required);
  // die zwei Aufrufstellen mit mehrzeiligem Markup (`<br />`, `<small>`) bleiben Kinder.
  const textLabel = typeof children === 'string' ? children : undefined;

  return (
    <DBSwitch
      className={className || undefined}
      id={id}
      label={textLabel}
      aria-label={textLabel ? undefined : (inputProps.name ?? id)}
      onChange={changeHandler}
      ref={refZusammenfuehren(eigeneRef, myRef)}
      {...zustand}
      {...inputProps}
    >
      {textLabel ? null : children}
    </DBSwitch>
  );
};
export default MyCheckbox;
