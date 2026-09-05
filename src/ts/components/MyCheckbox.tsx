import { type FC, type ChangeEventHandler, type ReactNode, type Ref } from 'react';

type TMyCheckbox = {
  className: string;
  id: string;
  children: ReactNode;
  checked?: boolean;
  disabled?: boolean;
  myRef?: Ref<HTMLInputElement>;
  changeHandler?: ChangeEventHandler<HTMLInputElement>;
};

const MyCheckbox: FC<TMyCheckbox> = ({ className, changeHandler, children, id, myRef, checked, ...inputProps }) => {
  // Ohne Handler ist `checked` in React schreibgeschuetzt; die Aufrufer meinen eine Vorbelegung.
  const zustand = changeHandler ? { checked } : { defaultChecked: checked };

  return (
    <div className={className}>
      <input
        type="checkbox"
        className="form-check-input"
        id={id}
        onChange={changeHandler}
        ref={myRef}
        {...zustand}
        {...inputProps}
      />
      <label className="form-check-label" htmlFor={id}>
        {children}
      </label>
    </div>
  );
};
export default MyCheckbox;
