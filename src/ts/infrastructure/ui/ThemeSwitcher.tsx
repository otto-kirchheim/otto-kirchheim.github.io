import { useState } from 'react';
import { useColorMode, type Theme } from './useColorMode';

const THEME_ICON: Record<Theme, { klasse: string; icon?: string }> = {
  light: { klasse: 'db-icon', icon: 'sun' },
  dark: { klasse: 'db-icon', icon: 'moon' },
  auto: { klasse: 'app-icon app-icon--theme-auto' },
};

const THEME_LABEL: Record<Theme, string> = { light: 'Hell', dark: 'Dunkel', auto: 'Auto' };

/**
 * Phase K2: React-Ersatz fuer den Theme-Umschalter aus `index.html` (`#bd-theme` +
 * `#bd-theme-menu`), bisher von `DBColorToggler.ts` bedient. Wird in das statische
 * `<li class="db-navigation-item">` gemountet (`index.html`), das die Positionierung im
 * Nav-Flow noch uebernimmt -- entfaellt vollstaendig in K5 (`DBNavigation`).
 *
 * `#bd-theme-menu` bleibt eine feste Id (nicht `useId()`): `styles.scss:1022` verankert den
 * Flyout darueber, und die Komponente wird -- wie schon der Vorgaenger -- genau einmal
 * gerendert (die mobile Schublade zieht denselben DOM-Knoten per `navDrawer.ts` um, statt ihn
 * zu duplizieren).
 */
export default function ThemeSwitcher() {
  const [theme, setTheme] = useColorMode();
  const [offen, setOffen] = useState(false);

  function waehle(neu: Theme): void {
    setTheme(neu);
    setOffen(false);
    document.getElementById('bd-theme')?.focus();
  }

  return (
    <>
      <button
        type="button"
        className="db-navigation-item-expand-button"
        id="bd-theme"
        aria-haspopup="true"
        aria-expanded={offen}
        aria-controls="bd-theme-menu"
        aria-label={`Design auswählen (${theme})`}
        onClick={() => setOffen(vorher => !vorher)}
      >
        <span className={`${THEME_ICON[theme].klasse} theme-icon-active`} data-icon={THEME_ICON[theme].icon} />
        <span className="d-lg-none" id="bd-theme-text">
          Design auswählen
        </span>
      </button>
      <menu className="db-sub-navigation" id="bd-theme-menu" aria-labelledby="bd-theme">
        {(Object.keys(THEME_LABEL) as Theme[]).map(wert => (
          <li className="db-navigation-item" role="presentation" key={wert}>
            <button
              type="button"
              data-theme-value={wert}
              className={theme === wert ? 'active' : undefined}
              aria-pressed={theme === wert}
              onClick={() => waehle(wert)}
            >
              <span className={THEME_ICON[wert].klasse} data-icon={THEME_ICON[wert].icon} />
              {THEME_LABEL[wert]}
            </button>
          </li>
        ))}
      </menu>
    </>
  );
}
