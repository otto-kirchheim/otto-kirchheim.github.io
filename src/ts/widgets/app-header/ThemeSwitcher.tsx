import { useId } from 'react';
import { MyCheckbox } from '@/components';
import { useColorMode } from './useColorMode.ts';

/**
 * Hell/Dunkel-Schalter. Der Store hinter `useColorMode()` kennt zusaetzlich `'auto'` (Erststart,
 * folgt der OS-Praeferenz); der Schalter zeigt dann den effektiven Zustand, und ein Klick
 * verlaesst `'auto'` zugunsten von `'dark'`/`'light'`.
 *
 * Bewusst ohne `<li>`-Wrapper: Der Schalter sitzt direkt in `actions2` von `AppHeader.tsx`
 * (Desktop: eigener Slot; Mobil: `DBDrawerFooter`), also in keiner Liste.
 */
export default function ThemeSwitcher() {
  const [theme, setTheme] = useColorMode();
  const id = useId();
  const istDunkel = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <MyCheckbox
      id={id}
      schalter
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
