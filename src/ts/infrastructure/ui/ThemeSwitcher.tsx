import { useId, useRef, useState } from 'react';
import { useColorMode, type Theme } from './useColorMode';

const THEME_ICON: Record<Theme, { klasse: string; icon?: string }> = {
  light: { klasse: 'db-icon', icon: 'sun' },
  dark: { klasse: 'db-icon', icon: 'moon' },
  auto: { klasse: 'app-icon app-icon--theme-auto' },
};

const THEME_LABEL: Record<Theme, string> = { light: 'Hell', dark: 'Dunkel', auto: 'Auto' };

/**
 * Phase K2: React-Ersatz fuer den Theme-Umschalter aus `index.html` (`#bd-theme` +
 * `#bd-theme-menu`), bisher von `DBColorToggler.ts` bedient. Wird als `<li>` in die Navigation
 * gerendert (`AppHeader.tsx`).
 *
 * Ids ueber `useId()` statt fest (Nachtrag Phase K5): `DBHeader` rendert seine `children`
 * zweimal (Desktop-Kopfzeile + Drawer-Kopie) -- mit festen `id="bd-theme"`/`id="bd-theme-menu"`
 * gaebe es doppelte Ids im DOM. `aria-controls`/`aria-labelledby` bleiben dadurch weiterhin
 * korrekt INNERHALB derselben Instanz verknuepft. Die Positionierungsregel in `styles.scss`
 * haengt deshalb an der Klasse `.theme-umschalter-menu`, nicht mehr an der (jetzt dynamischen)
 * Id. Fokus nach Auswahl laeuft ueber `useRef` statt `document.getElementById('bd-theme')` --
 * sonst wuerde ein Klick in der Drawer-Kopie den Fokus auf die (ggf. unsichtbare) Desktop-Kopie
 * springen lassen.
 */
export default function ThemeSwitcher() {
  const [theme, setTheme] = useColorMode();
  const [offen, setOffen] = useState(false);
  const toggleId = useId();
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  function waehle(event: { stopPropagation(): void }, neu: Theme): void {
    event.stopPropagation();
    setTheme(neu);
    setOffen(false);
    toggleRef.current?.focus();
  }

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        className="db-navigation-item-expand-button"
        id={toggleId}
        aria-haspopup="true"
        aria-expanded={offen}
        aria-controls={menuId}
        aria-label={`Design auswählen (${theme})`}
        onClick={event => {
          // `DBHeader`s mobiler Drawer schliesst bei JEDEM Klick, dessen Ziel
          // `.closest('.db-navigation-item')` matcht (siehe `header.js`/`isEventTargetNavigationItem`
          // im DB-UX-Paket) -- dieser Knopf sitzt in genau so einem `<li>`. Ohne
          // `stopPropagation()` schliesst ein Klick hier die ganze Schublade statt nur das
          // Untermenue zu oeffnen (Bug-Fund: Burger-Menue schliesst beim Theme-Klick komplett).
          event.stopPropagation();
          setOffen(vorher => !vorher);
        }}
      >
        <span className={`${THEME_ICON[theme].klasse} theme-icon-active`} data-icon={THEME_ICON[theme].icon} />
        <span className="d-md-none">Design auswählen</span>
      </button>
      <menu className="db-sub-navigation theme-umschalter-menu" id={menuId} aria-labelledby={toggleId}>
        {(Object.keys(THEME_LABEL) as Theme[]).map(wert => (
          <li className="db-navigation-item" role="presentation" key={wert}>
            <button
              type="button"
              data-theme-value={wert}
              className={theme === wert ? 'active' : undefined}
              aria-pressed={theme === wert}
              onClick={event => waehle(event, wert)}
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
