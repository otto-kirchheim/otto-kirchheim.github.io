import { useId } from 'react';
import { MyCheckbox } from '@/components';
import { useColorMode } from './useColorMode';

/**
 * Vereinfacht auf einen simplen Hell/Dunkel-Schalter (vorher: Hell/Dunkel/Auto-Flyout-Menue) --
 * das Flyout funktionierte im `DBControlPanelNavigation`s horizontal scrollendem `<menu>` nicht
 * mehr zuverlaessig (Shell-Umbau, siehe `AppHeader.tsx`). `useColorMode()`s zugrunde liegender
 * Store kennt weiterhin `'auto'` (Erststart folgt der OS-Praeferenz, `Storage`-Default) -- der
 * Schalter selbst bietet nur noch die beiden expliziten Zustaende an, ein Klick verlaesst
 * `'auto'` endgueltig zugunsten des jeweils angezeigten Zustands.
 *
 * KEIN `<li>`-Wrapper mehr (Nachtrag): sitzt seit dem `actions2`-Umbau nicht mehr in
 * `DBControlPanelNavigation`s `<menu>`, sondern direkt in `actions2` (Desktop: eigener Slot;
 * Mobile: `DBDrawerFooter`) -- ein `<li>` ausserhalb jeder Liste waere ungueltiges HTML.
 */
export default function ThemeSwitcher() {
  const [theme, setTheme] = useColorMode();
  const id = useId();
  const istDunkel = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <MyCheckbox
      id={id}
      checked={istDunkel}
      iconLeading="moon"
      iconTrailing="sun"
      visualAid
      changeHandler={event => setTheme(event.target.checked ? 'dark' : 'light')}
    >
      <span className="visually-hidden">Dunkles Design</span>
    </MyCheckbox>
  );
}
