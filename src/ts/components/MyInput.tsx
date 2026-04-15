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
  onChange?: (this: HTMLInputElement, ev: Event) => void;
  invalidFeedbackId?: string;
  invalidFeedbackText?: string;
};

export default class MyInput extends Component<TModalBodyInputElementOption> {
  input = this.props.myRef ?? createRef<HTMLInputElement>();
  popoverInstance: Popover | null = null;

  componentDidMount(): void {
    if (this.props.popover && this.input.current) {
      this.popoverInstance = new Popover(this.input.current, this.props.popover);
    }
  }

  componentWillUnmount(): void {
    this.popoverInstance?.dispose();
  }

  render() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { myRef, divClass, popover, children, invalidFeedbackId, invalidFeedbackText, ...inputProps } = this.props;

    const normalizedInputProps = {
      ...inputProps,
      minLength: typeof inputProps.minLength === 'string' ? Number(inputProps.minLength) : inputProps.minLength,
      maxLength: typeof inputProps.maxLength === 'string' ? Number(inputProps.maxLength) : inputProps.maxLength,
    };

    return (
      <div className={divClass ?? 'form-floating'}>
        <input ref={this.input} className="form-control validate" {...normalizedInputProps} />
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
