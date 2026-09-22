import { DBButton } from '@db-ux/react-core-components';
import { type ComponentProps, type FC } from 'react';

import AutoSaveBadge from './AutoSaveBadge';
import useButtonLoading from '@/shared/ui/button-loading/useButtonLoading';
import useGlobalDisabled from '@/shared/ui/button-loading/useGlobalDisabled';
import type { TResourceKey } from '@/types';

type TDBLoadingButton = ComponentProps<typeof DBButton> & {
  id: string;
  /** Text waehrend des Ladens; ohne Angabe bleiben die normalen `children` stehen. */
  loadingText?: string;
  /** Zeigt ein AutoSave-Status-Badge (Ecke) fuer diese Ressourcen -- siehe `AutoSaveBadge.tsx`. */
  autoSaveResources?: readonly TResourceKey[];
};

/**
 * `DBButton`, dessen Ladezustand `setLoading(id)`/`clearLoading(id)` von aussen steuern
 * (Business-Logik ausserhalb von React, z.B. `loginUser.ts`). `data-react-loading="true"` sagt
 * den beiden Funktionen, den Zustand ueber den `buttonLoadingStore` statt per `replaceChildren`
 * zu setzen (das wuerde den React-Baum zerstoeren).
 *
 * Props: `DBButton`-Props plus `id` (Schluessel im Loading-Store), `loadingText` (Text
 *   waehrend des Ladens) und `autoSaveResources` (blendet ein AutoSave-Badge ein).
 */
const DBLoadingButton: FC<TDBLoadingButton> = ({
  id,
  type,
  icon,
  disabled,
  loadingText,
  autoSaveResources,
  className,
  children,
  ...rest
}) => {
  const loading = useButtonLoading(id);
  const globalDisabled = useGlobalDisabled();

  return (
    <DBButton
      id={id}
      type={type}
      data-react-loading="true"
      icon={loading ? undefined : icon}
      showIcon={!loading}
      disabled={disabled || loading || globalDisabled}
      className={autoSaveResources ? [className, 'position-relative'].filter(Boolean).join(' ') : className}
      {...rest}
    >
      {loading && <span className="laedt me-1" data-size="small" role="status" aria-hidden="true" />}
      {loading && loadingText ? loadingText : children}
      {autoSaveResources && <AutoSaveBadge resources={autoSaveResources} />}
    </DBButton>
  );
};
export default DBLoadingButton;
