import { DBInput, DBTooltip } from '@db-ux/react-core-components';
import { useRef, type ChangeEventHandler, type FC, type ReactNode, type RefObject } from 'react';

import { refZusammenfuehren, useSofortigeId } from './dbFeldHelfer';

type TModalBodyInputElementOption = {
  /** React 19 vererbt `children` nicht mehr implizit (Preact tat das). */
  children?: ReactNode;
  myRef?: RefObject<HTMLInputElement | null>;
  type: string;
  id: string;
  name: string;
  value?: string | number;
  step?: string;
  divClass?: string;
  required?: boolean;
  disabled?: boolean;
  dataZulageInputCode?: string;
  pattern?: string;
  autoComplete?:
    'on' | 'off' | 'username' | 'username webauthn' | 'current-password' | 'new-password' | 'email' | 'tel';
  popover?: {
    content: string;
    title?: string;
    trigger?:
      'click' | 'hover' | 'focus' | 'manual' | 'click hover' | 'click focus' | 'hover focus' | 'click hover focus';
    placement?: 'top' | 'right' | 'left' | 'bottom';
    html?: boolean;
  };
  min?: string;
  max?: string;
  minLength?: number | string;
  maxLength?: number | string;
  list?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  invalidFeedbackId?: string;
  invalidFeedbackText?: string;
};

/**
 * Der frühere Bootstrap-Popover nahm HTML-Schnipsel entgegen (`'-Mindestens 8 Zeichen <br/>'`).
 * Der DB-Tooltip bekommt Text, deshalb werden Zeilenumbrüche hier zu echten Zeilen.
 */
export function hinweisZeilen(content: string): string[] {
  return content
    .split(/<br\s*\/?>/i)
    .map(zeile => zeile.replace(/<[^>]+>/g, '').trim())
    .filter(Boolean);
}

/** `form-floating` ist Bootstrap-Layout; DBInput bringt sein Label-Layout selbst mit. */
export function feldKlassen(divClass?: string): string {
  return (divClass ?? '')
    .split(/\s+/)
    .filter(k => k && k !== 'form-floating')
    .join(' ');
}

const MyInput: FC<TModalBodyInputElementOption> = props => {
  const {
    myRef,
    divClass,
    popover,
    children,
    invalidFeedbackId,
    invalidFeedbackText,
    dataZulageInputCode,
    minLength,
    maxLength,
    value,
    onChange,
    ...inputProps
  } = props;

  const eigeneRef = useRef<HTMLInputElement>(null);
  useSofortigeId(eigeneRef, props.id);

  // Ohne `onChange` waere `value` in React ein schreibgeschuetztes Feld. Die Modals nutzen das
  // Feld als Vorbelegung und lesen den Endwert per Ref aus dem DOM -- das ist `defaultValue`.
  const wert = onChange ? { value, onChange } : { defaultValue: value };
  const hinweis = popover ? hinweisZeilen(popover.content) : [];

  return (
    <div className={feldKlassen(divClass)}>
      {/* `type` und die Laengenbegrenzungen kommen ueber die Props der Aufrufstelle. */}
      {/* eslint-disable-next-line db-ux/input-type-required, db-ux/form-validation-message-required */}
      <DBInput
        ref={refZusammenfuehren(eigeneRef, myRef)}
        label={typeof children === 'string' ? children : props.name}
        {...inputProps}
        {...wert}
        data-zulage-input-code={dataZulageInputCode}
        minLength={typeof minLength === 'string' ? Number(minLength) : minLength}
        maxLength={typeof maxLength === 'string' ? Number(maxLength) : maxLength}
      >
        {popover ? (
          <DBTooltip placement={popover.placement ?? 'top'}>
            {popover.title ? <strong>{popover.title}</strong> : null}
            {hinweis.map(zeile => (
              <span key={zeile}>{zeile}</span>
            ))}
          </DBTooltip>
        ) : null}
        {invalidFeedbackId ? (
          <div id={invalidFeedbackId} className="invalid-feedback">
            {invalidFeedbackText}
          </div>
        ) : null}
      </DBInput>
    </div>
  );
};

export default MyInput;
