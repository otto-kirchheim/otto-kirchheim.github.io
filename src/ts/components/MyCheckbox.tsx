import type { ComponentChild, FunctionalComponent, GenericEventHandler, Ref } from 'preact';

type TMyCheckbox = {
  className: string;
  id: string;
  children: ComponentChild;
  checked?: boolean;
  disabled?: boolean;
  myRef?: Ref<HTMLInputElement>;
  changeHandler?: GenericEventHandler<HTMLInputElement>;
};

const MyCheckbox: FunctionalComponent<TMyCheckbox> = ({
  className,
  changeHandler,
  children,
  id,
  myRef,
  ...inputProps
}) => {
  return (
    <div className={className}>
      <input
        type="checkbox"
        className="form-check-input"
        id={id}
        onChange={changeHandler}
        ref={myRef}
        {...inputProps}
      />
      <label className="form-check-label" htmlFor={id}>
        {children}
      </label>
    </div>
  );
};
export default MyCheckbox;
