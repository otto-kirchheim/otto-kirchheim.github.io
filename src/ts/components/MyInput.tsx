import Popover from 'bootstrap/js/dist/popover';
import type { RefObject } from 'preact';
import { Component, createRef } from 'preact';

type TModalBodyInputElementOption = {
  myRef?: RefObject<HTMLInputElement>;
  type: string;
  id: string;
  name: string;
  value?: string | number;
  divClass?: string;
  required?: boolean;
  disabled?: boolean;
  pattern?: string;
  autoComplete?:
    | 'on'
    | 'off'
    | 'username'
    | 'username webauthn'
    | 'current-password'
    | 'new-password'
    | 'email'
    | 'tel';
  popover?: {
    content: string;
    title?: string;
    trigger?:
      | 'click'
      | 'hover'
      | 'focus'
      | 'manual'
      | 'click hover'
      | 'click focus'
      | 'hover focus'
      | 'click hover focus';
    placement?: 'top' | 'right' | 'left' | 'bottom';
    html?: boolean;
  };
  min?: string;
  max?: string;
  minLength?: number | string;
  maxLength?: number | string;
  onInput?: (this: HTMLInputElement, ev: Event) => void;
  invalidFeedbackId?: string;
  invalidFeedbackText?: string;
};

export default class MyInput extends Component<TModalBodyInputElementOption> {
  fallbackInputRef = createRef<HTMLInputElement>();
  popoverInstance: Popover | null = null;

  get inputRef(): RefObject<HTMLInputElement> {
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

    const normalizedInputProps = {
      ...inputProps,
      minLength: typeof inputProps.minLength === 'string' ? Number(inputProps.minLength) : inputProps.minLength,
      maxLength: typeof inputProps.maxLength === 'string' ? Number(inputProps.maxLength) : inputProps.maxLength,
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
