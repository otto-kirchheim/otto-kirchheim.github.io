import { useCallback, useSyncExternalStore } from 'react';
import Storage from '../storage/Storage';

export type Theme = 'light' | 'dark' | 'auto';

type Listener = () => void;

/**
 * Liest die OS-Farbschema-Praeferenz.
 *
 * @returns `true`, wenn das System ein dunkles Schema bevorzugt.
 */
function praeferiertDunkel(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Loest `auto` anhand der OS-Praeferenz auf.
 *
 * @param t - Gewaehltes Theme.
 * @returns `light` oder `dark`.
 */
function effektivesTheme(t: Theme): 'light' | 'dark' {
  return t === 'auto' ? (praeferiertDunkel() ? 'dark' : 'light') : t;
}

/**
 * Setzt `data-mode` und `color-scheme` am `<html>`-Element passend zum Theme.
 *
 * @param t - Anzuwendendes Theme.
 */
function wendeThemeAn(t: Theme): void {
  const effektiv = effektivesTheme(t);
  document.documentElement.setAttribute('data-mode', effektiv);
  // DB UX arbeitet mit `light-dark()`; das loest nur auf, wenn `color-scheme` gesetzt ist.
  // Bei 'auto' bleibt die OS-Automatik erhalten, statt sie auf den Momentanwert einzufrieren.
  document.documentElement.style.colorScheme = t === 'auto' ? 'light dark' : effektiv;
}

let theme: Theme | null = null;
const listeners = new Set<Listener>();

/**
 * Erst beim ersten Zugriff initialisieren, nicht beim Modul-Import (Test-Isolation): laedt das gespeicherte
 * Theme (Default `auto`), wendet es an und folgt OS-Aenderungen, solange `auto` aktiv ist.
 */
function sicherstellenInitialisiert(): void {
  if (theme !== null) return;
  theme = Storage.get<Theme>('theme', { default: 'auto' });
  wendeThemeAn(theme);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (theme === 'auto') wendeThemeAn('auto');
  });
}

/**
 * Snapshot-Getter fuer `useSyncExternalStore`.
 *
 * @returns Aktuelles Theme.
 */
function getTheme(): Theme {
  sicherstellenInitialisiert();
  return theme as Theme;
}

/**
 * Subscribe-Funktion fuer `useSyncExternalStore`.
 *
 * @param listener - Wird bei jeder Theme-Aenderung aufgerufen.
 * @returns Funktion zum Abmelden des Listeners.
 */
function subscribeTheme(listener: Listener): () => void {
  sicherstellenInitialisiert();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Setzt das Theme, speichert es, wendet es an und benachrichtigt alle Listener (kein Effekt bei gleichem Wert).
 *
 * @param neu - Neues Theme.
 */
function setTheme(neu: Theme): void {
  sicherstellenInitialisiert();
  if (neu === theme) return;
  theme = neu;
  Storage.set('theme', neu);
  wendeThemeAn(neu);
  for (const listener of listeners) listener();
}

/**
 * Theme-Zustand (`light`/`dark`/`auto`) als modulglobaler Store fuer React. Gespeichert wird unter dem
 * Storage-Key `theme`; angewendet werden `data-mode` und `color-scheme` am `<html>`-Element.
 *
 * Modulglobal statt lokalem `useState`: `DBHeader` rendert seine `children` zweimal (Desktop-Kopfzeile +
 * Drawer-Kopie), `ThemeSwitcher` mountet dadurch doppelt. `useSyncExternalStore` haelt beide Instanzen
 * auf demselben Wert; mit lokalem State zeigte die andere Kopie nach einem Klick ein veraltetes Theme.
 *
 * @returns Tupel aus aktuellem Theme und Setter.
 */
export function useColorMode(): [Theme, (neu: Theme) => void] {
  const aktuellesTheme = useSyncExternalStore(subscribeTheme, getTheme);
  const setzeTheme = useCallback((neu: Theme) => setTheme(neu), []);
  return [aktuellesTheme, setzeTheme];
}
