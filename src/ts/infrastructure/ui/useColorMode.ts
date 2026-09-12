import { useCallback, useSyncExternalStore } from 'react';
import Storage from '../storage/Storage';

export type Theme = 'light' | 'dark' | 'auto';

type Listener = () => void;

function praeferiertDunkel(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function effektivesTheme(t: Theme): 'light' | 'dark' {
  return t === 'auto' ? (praeferiertDunkel() ? 'dark' : 'light') : t;
}

function wendeThemeAn(t: Theme): void {
  const effektiv = effektivesTheme(t);
  document.documentElement.setAttribute('data-mode', effektiv);
  // DB UX arbeitet mit `light-dark()`; das loest nur auf, wenn `color-scheme` gesetzt ist.
  // Bei 'auto' bleibt die OS-Automatik erhalten, statt sie auf den Momentanwert einzufrieren.
  document.documentElement.style.colorScheme = t === 'auto' ? 'light dark' : effektiv;
}

let theme: Theme | null = null;
const listeners = new Set<Listener>();

/** Erst beim ersten Zugriff initialisieren, nicht beim Modul-Import (Test-Isolation). */
function sicherstellenInitialisiert(): void {
  if (theme !== null) return;
  theme = Storage.get<Theme>('theme', { default: 'auto' });
  wendeThemeAn(theme);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (theme === 'auto') wendeThemeAn('auto');
  });
}

function getTheme(): Theme {
  sicherstellenInitialisiert();
  return theme as Theme;
}

function subscribeTheme(listener: Listener): () => void {
  sicherstellenInitialisiert();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setTheme(neu: Theme): void {
  sicherstellenInitialisiert();
  if (neu === theme) return;
  theme = neu;
  Storage.set('theme', neu);
  wendeThemeAn(neu);
  for (const listener of listeners) listener();
}

/**
 * Ersetzt `DBColorToggler.ts` (Phase K2). Storage-Key `theme` sowie die `data-mode`/
 * `color-scheme`-Logik am `<html>`-Element bleiben identisch zum Vanilla-Vorgaenger.
 *
 * BUGFIX gegenueber dem Vorgaenger: dessen `getPreferredTheme()` bildete
 * `getStoredTheme() || matchMedia(...).matches ? 'dark' : 'light'`. `||` bindet staerker als
 * `?:`, das Ergebnis war also `(getStoredTheme() || matches) ? 'dark' : 'light'` -- und weil
 * `getStoredTheme()` wegen `default: 'auto'` IMMER einen truthy String liefert, war das
 * Anfangstheme bei jedem Laden `'dark'`, unabhaengig vom gespeicherten Wert oder der
 * OS-Praeferenz (Puppeteer-verifiziert: nur der explizite Klick auf einen Theme-Button traf
 * den korrekten, separaten Codepfad). Hier wird das gespeicherte Theme direkt verwendet.
 *
 * Modul-globaler Store statt lokalem `useState` (Nachtrag Phase K5): `DBHeader` rendert seine
 * `children` zweimal (Desktop-Kopfzeile + Drawer-Kopie) -- `ThemeSwitcher` mountet dadurch
 * zweimal gleichzeitig. Mit lokalem State haette jede Kopie ihr eigenes, unsynchronisiertes
 * `theme` gehabt (ein Klick in der einen Kopie liesse die andere veraltet anzeigen).
 * `useSyncExternalStore` haelt beide Instanzen auf demselben Wert.
 */
export function useColorMode(): [Theme, (neu: Theme) => void] {
  const aktuellesTheme = useSyncExternalStore(subscribeTheme, getTheme);
  const setzeTheme = useCallback((neu: Theme) => setTheme(neu), []);
  return [aktuellesTheme, setzeTheme];
}
