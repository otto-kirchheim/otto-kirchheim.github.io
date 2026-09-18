import { DBInput, DBTooltip } from '@db-ux/react-core-components';
import { useRef, type ChangeEventHandler, type ComponentProps, type FC, type ReactNode, type RefObject } from 'react';

import { refZusammenfuehren, STANDARD_UNGUELTIG_MELDUNG, useSofortigeId } from './dbFeldHelfer';

/**
 * Von `DBInput`s eigenem Prop-Typ abgeleitet statt einer Hand-Allowlist: jede DBInput-Faehigkeit
 * (Density, Icons, Message-Groessen, Datalist, ...) ist dadurch automatisch an jeder Aufrufstelle
 * verfuegbar, auch neue, ohne dass diese Datei angefasst werden muss. Nur die Felder, die MyInput
 * selbst berechnet oder mit eigener Logik belegt, werden ausgenommen und unten neu typisiert.
 */
type TModalBodyInputElementOption = Omit<
  ComponentProps<typeof DBInput>,
  | 'ref'
  | 'label'
  | 'value'
  | 'onChange'
  | 'invalidMessage'
  | 'minLength'
  | 'maxLength'
  | 'children'
  | 'id'
  | 'name'
  | 'type'
  | 'popover'
> & {
  /** React 19 vererbt `children` nicht mehr implizit (Preact tat das). */
  children?: ReactNode;
  myRef?: RefObject<HTMLInputElement | null>;
  id: string;
  name: string;
  type: string;
  value?: string | number;
  divClass?: string;
  dataZulageInputCode?: string;
  popover?: {
    content: string;
    title?: string;
    trigger?:
      'click' | 'hover' | 'focus' | 'manual' | 'click hover' | 'click focus' | 'hover focus' | 'click hover focus';
    placement?: 'top' | 'right' | 'left' | 'bottom';
    html?: boolean;
  };
  minLength?: number | string;
  maxLength?: number | string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  invalidFeedbackId?: string;
  invalidFeedbackText?: string;
  /** Ungueltig-Meldung des DB-Felds. Ohne Angabe gilt `STANDARD_UNGUELTIG_MELDUNG` -- sonst
   *  zeigt `DBInput` seine eingebaute `TODO: Add an invalidMessage`-Notiz. */
  invalidMessage?: string;
};

/**
 * Der frühere Bootstrap-Popover nahm HTML-Schnipsel entgegen (`'-Mindestens 8 Zeichen <br/>'`).
 * Der DB-Tooltip bekommt Text, deshalb werden Zeilenumbrüche hier zu echten Zeilen.
 */
function hinweisZeilen(content: string): string[] {
  return content
    .split(/<br\s*\/?>/i)
    .map(zeile => zeile.replace(/<[^>]+>/g, '').trim())
    .filter(Boolean);
}

const MyInput: FC<TModalBodyInputElementOption> = props => {
  const {
    myRef,
    divClass,
    popover,
    children,
    invalidFeedbackId,
    invalidFeedbackText,
    invalidMessage,
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
    <div className={divClass}>
      {/* `type` und die Laengenbegrenzungen kommen ueber die Props der Aufrufstelle. */}
      {/* eslint-disable-next-line db-ux/input-type-required */}
      <DBInput
        ref={refZusammenfuehren(eigeneRef, myRef)}
        label={typeof children === 'string' ? children : props.name}
        invalidMessage={invalidMessage ?? invalidFeedbackText ?? STANDARD_UNGUELTIG_MELDUNG}
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
        {/* Nur fuer Aufrufer OHNE `invalidFeedbackText` (z.B. `createEditorModalEWT.tsx`s
            Zeitfehler-Validierung): die brauchen ein stabiles, leeres Element mit `id`, das sie
            per `querySelector(...).textContent = ...` zur Laufzeit selbst befuellen -- eigene
            Geschaeftsregel-Validierung, kein natives HTML5-`required`/`pattern`. Ist `invalidFeedbackText`
            gesetzt, uebernimmt bereits `invalidMessage` oben (Zeile 86) die native DBInput-Anzeige;
            dieser Span wuerde denselben Text sonst zusaetzlich DAUERHAFT (nicht nur bei Invalid-Status)
            anzeigen -- Duplikat statt Fallback. */}
        {invalidFeedbackId && !invalidFeedbackText ? (
          <span id={invalidFeedbackId} className="db-infotext" data-semantic="critical" data-size="small" />
        ) : null}
      </DBInput>
    </div>
  );
};

export default MyInput;
