import { DBButton } from '@db-ux/react-core-components';
import { type ComponentProps, type FC } from 'react';

import useButtonLoading from '@/infrastructure/ui/useButtonLoading';
import useGlobalDisabled from '@/infrastructure/ui/useGlobalDisabled';

type TDBLoadingButton = ComponentProps<typeof DBButton> & {
  id: string;
  /** Text waehrend des Ladens; ohne Angabe bleiben die normalen `children` stehen. */
  loadingText?: string;
};

/**
 * `DBButton`, dessen Ladezustand `setLoading(id)`/`clearLoading(id)` von aussen steuern
 * (Business-Logik ausserhalb von React, z.B. `saveDaten.ts`, `submitBereitschaftsZeiten.ts`).
 * `data-react-loading="true"` sagt den beiden Funktionen, den Zustand ueber den
 * `buttonLoadingStore` statt per `replaceChildren` zu setzen -- siehe dort fuer den Grund.
 */
const DBLoadingButton: FC<TDBLoadingButton> = ({ id, type, icon, disabled, loadingText, children, ...rest }) => {
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
      {...rest}
    >
      {loading && <span className="laedt me-1" data-size="small" role="status" aria-hidden="true" />}
      {loading && loadingText ? loadingText : children}
    </DBButton>
  );
};
export default DBLoadingButton;
