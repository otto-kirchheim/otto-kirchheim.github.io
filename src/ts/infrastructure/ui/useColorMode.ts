import { useCallback, useEffect, useState } from 'react';
import Storage from '../storage/Storage';

export type Theme = 'light' | 'dark' | 'auto';

function praeferiertDunkel(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function effektivesTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'auto' ? (praeferiertDunkel() ? 'dark' : 'light') : theme;
}

function wendeThemeAn(theme: Theme): void {
  const effektiv = effektivesTheme(theme);
  document.documentElement.setAttribute('data-mode', effektiv);
  // DB UX arbeitet mit `light-dark()`; das loest nur auf, wenn `color-scheme` gesetzt ist.
  // Bei 'auto' bleibt die OS-Automatik erhalten, statt sie auf den Momentanwert einzufrieren.
  document.documentElement.style.colorScheme = theme === 'auto' ? 'light dark' : effektiv;
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
 */
export function useColorMode(): [Theme, (neu: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(() => Storage.get<Theme>('theme', { default: 'auto' }));

  useEffect(() => {
    wendeThemeAn(theme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const beiAenderung = () => {
      if (theme === 'auto') wendeThemeAn('auto');
    };
    media.addEventListener('change', beiAenderung);
    return () => media.removeEventListener('change', beiAenderung);
  }, [theme]);

  const setTheme = useCallback((neu: Theme) => {
    Storage.set('theme', neu);
    setThemeState(neu);
  }, []);

  return [theme, setTheme];
}
