import { DBButton } from '@db-ux/react-core-components';
import { type FC, type MouseEventHandler } from 'react';

type DbVariante = 'brand' | 'filled' | 'outlined' | 'ghost';
type DbFarbe = 'critical' | 'informational' | 'successful' | 'warning';

type TMyButton = {
  id?: string;
  type?: 'button' | 'reset' | 'submit';
  className?: string;
  ariaLabel?: string;
  dataBsDismiss?: string;
  dataBsTarget?: string;
  text: string;
  clickHandler?: MouseEventHandler<HTMLButtonElement>;
  /** DB-Button-Attribute -- so geschrieben, wie sie auch im Markup stehen. */
  'data-variant'?: DbVariante;
  'data-color'?: DbFarbe;
  'data-size'?: 'small' | 'medium';
  'data-width'?: 'full';
};

const MyButton: FC<TMyButton> = ({
  id,
  type = 'button',
  className,
  ariaLabel,
  dataBsDismiss,
  dataBsTarget,
  text,
  clickHandler,
  'data-variant': variant = 'brand',
  'data-color': color,
  'data-size': size,
  'data-width': width,
}: TMyButton) => {
  // `db-button` setzt DBButton selbst -- doppelt in der Klassenliste waere nur Rauschen.
  const rest = (className ?? '')
    .split(/\s+/)
    .filter(k => k && k !== 'db-button')
    .join(' ');

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
