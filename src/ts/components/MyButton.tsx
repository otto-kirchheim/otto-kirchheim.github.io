import { DBButton } from '@db-ux/react-core-components';
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

type DbButtonLook = {
  variant: 'brand' | 'filled' | 'outlined' | 'ghost';
  color?: 'critical' | 'informational' | 'successful' | 'warning';
  size?: 'small' | 'medium';
  width?: 'full';
  rest: string;
};

/**
 * Uebersetzt die Bootstrap-Button-Klassen der Aufrufstellen in DB-UX-Props, damit die
 * ~20 `<MyButton className="btn btn-...">` unveraendert bleiben koennen. Alles, was hier
 * nicht erkannt wird (Layout-Klassen wie `text-start`), geht als `className` weiter --
 * solange Bootstrap noch im Build ist, wirkt es dort.
 */
export function buttonLook(className: string): DbButtonLook {
  const klassen = className.split(/\s+/).filter(Boolean);
  const look: DbButtonLook = { variant: 'filled', rest: '' };
  const uebrig: string[] = [];

  for (const k of klassen) {
    switch (k) {
      case 'btn':
        break;
      case 'btn-primary':
        look.variant = 'brand';
        break;
      case 'btn-secondary':
        look.variant = 'filled';
        break;
      case 'btn-danger':
        look.variant = 'filled';
        look.color = 'critical';
        break;
      case 'btn-info':
        look.variant = 'filled';
        look.color = 'informational';
        break;
      case 'btn-success':
        look.variant = 'filled';
        look.color = 'successful';
        break;
      case 'btn-warning':
        look.variant = 'filled';
        look.color = 'warning';
        break;
      case 'btn-outline-primary':
      case 'btn-outline-secondary':
        look.variant = 'outlined';
        break;
      case 'btn-outline-info':
        look.variant = 'outlined';
        look.color = 'informational';
        break;
      case 'btn-outline-danger':
        look.variant = 'outlined';
        look.color = 'critical';
        break;
      case 'btn-link':
        look.variant = 'ghost';
        break;
      case 'btn-sm':
        look.size = 'small';
        break;
      case 'btn-lg':
        look.size = 'medium';
        break;
      case 'w-100':
        look.width = 'full';
        break;
      default:
        uebrig.push(k);
    }
  }

  look.rest = uebrig.join(' ');
  return look;
}

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
