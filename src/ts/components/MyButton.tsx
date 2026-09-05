import { type FC, type MouseEventHandler } from 'react';

type TMyButton = {
  id?: string;
  type?: 'button' | 'reset' | 'submit';
  className?: string;
  ariaLabel?: string;
  dataBsDismiss?: string;
  dataBsTarget?: string;
  text: string;
  clickHandler?: MouseEventHandler<HTMLButtonElement>;
};

const MyButton: FC<TMyButton> = ({
  id,
  type = 'button',
  className = 'btn btn-primary',
  ariaLabel,
  dataBsDismiss,
  dataBsTarget,
  text,
  clickHandler,
}: TMyButton) => {
  return (
    <button
      className={className}
      id={id}
      aria-label={ariaLabel ?? text}
      type={type}
      data-bs-dismiss={dataBsDismiss}
      data-bs-target={dataBsTarget}
      onClick={clickHandler}
    >
      {text}
    </button>
  );
};

export default MyButton;
