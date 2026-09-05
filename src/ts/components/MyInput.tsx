import Popover from 'bootstrap/js/dist/popover';
import { Component, createRef, type ChangeEventHandler, type ReactNode, type RefObject } from 'react';

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

export default class MyInput extends Component<TModalBodyInputElementOption> {
  fallbackInputRef = createRef<HTMLInputElement>();
  popoverInstance: Popover | null = null;

  get inputRef(): RefObject<HTMLInputElement | null> {
    return this.props.myRef ?? this.fallbackInputRef;
  }

  componentDidMount(): void {
    this.syncPopover();
  }

  componentDidUpdate(previousProps: Readonly<TModalBodyInputElementOption>): void {
    if (previousProps.popover !== this.props.popover || previousProps.myRef !== this.props.myRef) {
      this.syncPopover();
    }
  }

  componentWillUnmount(): void {
    this.popoverInstance?.dispose();
  }

  syncPopover(): void {
    this.popoverInstance?.dispose();
    this.popoverInstance = null;

    if (this.props.popover && this.inputRef.current) {
      this.popoverInstance = new Popover(this.inputRef.current, this.props.popover);
    }
  }

  render() {
    const {
      myRef: _myRef,
      divClass,
      popover: _popover,
      children,
      invalidFeedbackId,
      invalidFeedbackText,
      ...inputProps
    } = this.props;

    const { dataZulageInputCode, minLength, maxLength, value, onChange, ...restInputProps } = inputProps;
    // Ohne `onChange` waere `value` in React ein schreibgeschuetztes Feld. Die Modals nutzen das
    // Feld als Vorbelegung und lesen den Endwert per Ref aus dem DOM -- das ist `defaultValue`.
    const wert = onChange ? { value, onChange } : { defaultValue: value };
    const normalizedInputProps = {
      ...restInputProps,
      ...wert,
      'data-zulage-input-code': dataZulageInputCode,
      minLength: typeof minLength === 'string' ? Number(minLength) : minLength,
      maxLength: typeof maxLength === 'string' ? Number(maxLength) : maxLength,
    };

    return (
      <div className={divClass ?? 'form-floating'}>
        <input ref={this.inputRef} className="form-control validate" {...normalizedInputProps} />
        <label htmlFor={this.props.id}>{children}</label>
        {invalidFeedbackId ? (
          <div id={invalidFeedbackId} className="invalid-feedback">
            {invalidFeedbackText}
          </div>
        ) : null}
      </div>
    );
  }
}
