import { DBLoadingIndicator } from '@db-ux/react-core-components';
import { useSyncExternalStore } from 'react';

import { abonniereZustand, leseZustand } from './pullZustand';

/**
 * Kreis des Zum-Aktualisieren-Ziehens: ein `DBLoadingIndicator`, der sich mit der Zugstrecke fuellt (ab der Schwelle gruen,
 * Klasse `ptr-indikator--bereit` am Container) und nach dem Ausloesen als Dauer-Spinner laeuft. Der Zustand bleibt immer
 * `active`: `state="successful"` tauscht Spinner und Symbol im Layout und liess den Kreis springen. Zustand: `pullZustand.ts`.
 */
export function PullIndikator() {
  const { fortschritt, laedt } = useSyncExternalStore(abonniereZustand, leseZustand);

  return (
    <DBLoadingIndicator
      variant="circular"
      size="medium"
      showLabel={false}
      indeterminate={laedt}
      value={Math.round(fortschritt * 100)}
      max={100}
      state="active"
    >
      Aktualisieren
    </DBLoadingIndicator>
  );
}
