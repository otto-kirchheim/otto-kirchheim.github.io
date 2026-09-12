import { DBDrawer, DBDrawerHeader } from '@db-ux/react-core-components';
import { schliesseNavSchublade } from './navDrawer';

/**
 * Phase K4: `<dialog id="navdrawer">` (index.html) als React-Huelle. Der Navigationsinhalt
 * zieht weiterhin per `navDrawer.ts`s Umzugs-Kniff (`prepend()`) zwischen Kopfzeile und
 * `.db-header-drawer-navigation` um -- das entfaellt erst in K5, wenn `DBHeader`/`DBNavigation`
 * die Navigation selbst zweimal rendern koennen. Diese Komponente wird bewusst NUR EINMAL
 * gemountet und danach nie neu gerendert (kein `open`-Prop, kein State hier): `navDrawer.ts`
 * steuert den zugrundeliegenden `<dialog>` weiterhin direkt per `showModal()`/`close()`, exakt
 * wie zuvor bei der statischen Auszeichnung -- React kennt diesen Zustand schlicht nicht.
 *
 * `onClose={schliesseNavSchublade}` ist trotzdem noetig, nicht nur Kosmetik: `DBDrawer`s eigener
 * Tastatur-/Klick-Handler ruft bei Escape immer `event.preventDefault()` (unterdrueckt damit den
 * nativen Cancel-Schliess-Weg) und bei Klick auf den Schliessen-Knopf `event.stopPropagation()`
 * (unterbindet damit `navDrawer.ts`s eigene Klick-Delegation auf `document`) -- ohne eigenes
 * `onClose` wuerden Escape und der Schliessen-Knopf ins Leere laufen. Backdrop-Klick und Klicks
 * auf `[data-tab-target]` bleiben unveraendert Sache von `navDrawer.ts`s Delegation.
 *
 * `aria-labelledby` kommt jetzt automatisch von `DBDrawerHeader` (verlinkt auf "Nebengeld" statt
 * des bisherigen manuellen `aria-label="Menü"`) -- wie schon bei `ImpressumDialog` (K3).
 */
export default function NavDrawerShell() {
  return (
    <DBDrawer
      id="navdrawer"
      className="db-header-drawer"
      direction="to-right"
      rounded
      showSpacing
      onClose={schliesseNavSchublade}
      header={<DBDrawerHeader text="Nebengeld" closeButtonText="Schließen" />}
    >
      <div className="db-header-drawer-navigation" />
    </DBDrawer>
  );
}
