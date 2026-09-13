import { DBSwitch } from '@db-ux/react-core-components';
import { useRef, type ChangeEventHandler, type ComponentProps, type FC, type ReactNode, type Ref } from 'react';

import { refZusammenfuehren, STANDARD_UNGUELTIG_MELDUNG, useSofortigeId } from './dbFeldHelfer';

/** Von `DBSwitch`s eigenem Prop-Typ abgeleitet statt einer Hand-Allowlist -- siehe `MyInput.tsx`
 *  fuer die Begruendung. */
type TMyCheckbox = Omit<
  ComponentProps<typeof DBSwitch>,
  'ref' | 'label' | 'checked' | 'defaultChecked' | 'onChange' | 'children' | 'id'
> & {
  id: string;
  children: ReactNode;
  /** Gesteuerter Zustand -- der Aufrufer haelt den Wert per `changeHandler` in Sync. */
  checked?: boolean;
  /** Ungesteuerte Vorbelegung -- fuer Aufrufer, die `changeHandler` nur fuer einen
   *  Seiteneffekt (z.B. ein Feld ein-/ausblenden) nutzen und den Wert per DOM auslesen. */
  defaultChecked?: boolean;
  myRef?: Ref<HTMLInputElement>;
  changeHandler?: ChangeEventHandler<HTMLInputElement>;
};

/*
 * Alle Aufrufstellen meinen Schalter, nicht Haken -- deshalb `DBSwitch` und nicht `DBCheckbox`.
 * App-eigene Klassen (z.B. `bereitschaft`, Rasterspalten) reicht `className` durch.
 */
const MyCheckbox: FC<TMyCheckbox> = ({
  className,
  changeHandler,
  children,
  id,
  myRef,
  checked,
  defaultChecked,
  ...inputProps
}) => {
  // Explizites `defaultChecked` -> immer ungesteuert. Sonst: mit `changeHandler` UND
  // gesetztem `checked` gesteuert (Aufrufer synct den Wert), andernfalls Vorbelegung.
  // (Ein `changeHandler`, der `checked` NICHT nachfuehrt, wuerde den Schalter sonst in
  // React 19 auf den Ausgangswert zuruecksetzen -- er "haengt".)
  const zustand =
    defaultChecked !== undefined
      ? { defaultChecked }
      : changeHandler && checked !== undefined
        ? { checked }
        : { defaultChecked: checked };
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
      invalidMessage={STANDARD_UNGUELTIG_MELDUNG}
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
