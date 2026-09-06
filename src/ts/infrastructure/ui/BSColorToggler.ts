import Storage from '../storage/Storage';

type Theme = 'light' | 'dark' | 'auto';

export default function initializeColorModeToggler() {
  'use strict';

  const getStoredTheme = (): Theme => Storage.get<Theme>('theme', { default: 'auto' });

  const setStoredTheme = (theme: Theme) => Storage.set('theme', theme);

  const getPreferredTheme = (): Theme =>
    getStoredTheme() || window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  const preferredTheme = getPreferredTheme();

  const setTheme = (theme: Theme) => {
    const effektiv =
      theme === 'auto' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;

    document.documentElement.setAttribute('data-bs-theme', effektiv);
    // DB UX arbeitet mit `light-dark()`; das loest nur auf, wenn `color-scheme` gesetzt ist.
    // Bei 'auto' bleibt die OS-Automatik erhalten, statt sie auf den Momentanwert einzufrieren.
    document.documentElement.style.colorScheme = theme === 'auto' ? 'light dark' : effektiv;
  };

  setTheme(preferredTheme);

  /**
   * Spiegelt das aktive Thema in die Kopfzeile: Das Symbol des gewaehlten Eintrags wird auf
   * den Schalter uebernommen. DB-Symbole haengen an `data-icon` bzw. an der `app-icon`-Klasse
   * (Eigenbau `theme-auto`) -- kopiert wird deshalb die Symbol-Beschreibung, nicht Text.
   */
  const showActiveTheme = (theme: Theme, focus = false) => {
    const themeSwitcher = document.querySelector<HTMLButtonElement>('#bd-theme');
    if (!themeSwitcher) return;

    const themeSwitcherText = document.querySelector<HTMLSpanElement>('#bd-theme-text');
    const activeThemeIcon = document.querySelector<HTMLSpanElement>('.theme-icon-active');
    const btnToActive = document.querySelector<HTMLButtonElement>(`[data-bs-theme-value="${theme}"]`);
    if (!themeSwitcherText || !activeThemeIcon || !btnToActive) return;

    const quelle = btnToActive.querySelector<HTMLSpanElement>('.db-icon, .app-icon');
    if (!quelle) return;

    document.querySelectorAll('[data-bs-theme-value]').forEach(element => {
      element.classList.remove('active');
      element.setAttribute('aria-pressed', 'false');
    });

    btnToActive.classList.add('active');
    btnToActive.setAttribute('aria-pressed', 'true');

    activeThemeIcon.className = `${quelle.className} theme-icon-active`;
    if (quelle.dataset['icon']) activeThemeIcon.dataset['icon'] = quelle.dataset['icon'];
    else delete activeThemeIcon.dataset['icon'];

    themeSwitcher.setAttribute('aria-label', `${themeSwitcherText.textContent} (${theme})`);
    themeSwitcher.setAttribute('aria-expanded', 'false');

    if (focus) themeSwitcher.focus();
  };

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const storedTheme = getStoredTheme();
    if (storedTheme !== 'light' && storedTheme !== 'dark') setTheme(getPreferredTheme());
  });

  showActiveTheme(preferredTheme);

  document.querySelector<HTMLButtonElement>('#bd-theme')?.addEventListener('click', event => {
    const schalter = event.currentTarget as HTMLButtonElement;
    schalter.setAttribute('aria-expanded', String(schalter.getAttribute('aria-expanded') !== 'true'));
  });

  document.querySelectorAll('[data-bs-theme-value]').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const theme = toggle.getAttribute('data-bs-theme-value') as Theme;
      setStoredTheme(theme);
      setTheme(theme);
      showActiveTheme(theme, true);
    });
  });
}
