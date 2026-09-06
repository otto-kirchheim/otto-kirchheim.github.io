import { DBButton } from '@db-ux/react-core-components';
import { type FC, type MouseEventHandler } from 'react';

import { buttonLook } from '@/infrastructure/ui/dbButton';

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
  const { variant, color, size, width, rest } = buttonLook(className);

  return (
    <DBButton
      className={rest || undefined}
      id={id}
      aria-label={ariaLabel ?? text}
      type={type}
      variant={variant}
      size={size}
      width={width}
      data-color={color}
      // Bootstrap steuert die Modals bis Phase E weiterhin ueber diese Attribute.
      data-bs-dismiss={dataBsDismiss}
      data-bs-target={dataBsTarget}
      onClick={clickHandler}
    >
      {text}
    </DBButton>
  );
};

export default MyButton;
