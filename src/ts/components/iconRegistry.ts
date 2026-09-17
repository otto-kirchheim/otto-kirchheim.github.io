/**
 * Icon-Satz-Registry -- Single Source of Truth fuer den Wechsel des Icon-Satzes.
 *
 * HINTERGRUND
 * Der aktuelle Satz kommt aus `@db-ux/db-theme-icons` und steht unter der DB-Font-Lizenz
 * (Nutzung nur im DB-Kontext, keine oeffentliche Weitergabe). Fuer ein oeffentliches Hosting
 * muss der Satz gegen einen freien tauschbar sein -- ohne die ~160 `data-icon`-Aufrufstellen
 * anzufassen.
 *
 * MECHANIK (CSS-Remap-Layer)
 * DB-UX rendert Icons ueber `[data-icon]::before { content: var(--db-icon, attr(data-icon)) }`
 * mit einer Ligatur-Schrift. Der Name im `data-icon` IST die Ligatur. `--db-icon` ist der vom
 * Design-System vorgesehene Override. `scripts/gen-iconset.mts` erzeugt aus dieser Registry
 * `src/scss/iconset.<satz>.css` mit Regeln `[data-icon="<db>"]{--db-icon:"<ziel>"}`.
 *
 * SWAP-RUNBOOK (z. B. auf Material Symbols)
 *   1. `bun run icons:gen`  -> schreibt/aktualisiert `src/scss/iconset.material.css`.
 *   2. `src/scss/db-ux.css`: den auskommentierten `@import './iconset.material.css'` aktivieren.
 *   3. `src/scss/styles.scss`: den Block `ICON-SATZ` aktivieren -- `@font-face` (Material-Symbols-
 *      woff2 LOKAL buendeln, nicht vom Google-CDN: CSP + oeffentliches Hosting), plus
 *      `--db-icon-font-family` und `font-variation-settings`.
 *   4. `@db-ux/db-theme*` aus `package.json` entfernen, `ASSET_*`-Secrets aus dem CI nehmen
 *      (siehe deploy.yml). DB-Schriften (`--db-font-family-sans/-head`) separat auf eine freie
 *      Alternative setzen; `--db-logo-url` durch ein freigegebenes Asset ersetzen.
 *   5. OFFEN (bewusst nicht Teil dieser Vorbereitung): core-components rendert intern ~15
 *      eigene Icon-Namen (Checkbox-Haken, `.db-select`-Chevron, `.db-notification`-Symbole,
 *      Such-Lupe). Diese sind KEINE `data-icon`-Attribute, sondern `--db-icon`/`--db-icon-*`
 *      in `@db-ux/core-components/build/styles/bundle.css`. Beim echten Swap zusaetzlich
 *      remappen -- Kandidaten: `check`, `check_circle`, `chevron_left`, `chevron_right`,
 *      `circle_small`, `exclamation_mark_circle`, `exclamation_mark_triangle`,
 *      `information_circle`, `magnifying_glass`, `minus` sowie die `--db-icon-trailing`-
 *      Defaults (`arrow_right`, `arrow_up_right`, `calendar`, `check`, `check_circle`,
 *      `chevron_down`, `chevron_right`, `clock`, `cross`). Pseudo-Element-Faelle brauchen
 *      Selektor-genaue Gegenregeln in derselben `iconset.*.css`.
 *
 * Eigenbau-Motive `theme-auto` und `filter-off` (`src/icons/`, ueber `.app-icon`-Maske, nicht
 * ueber die Icon-Schrift) und `none` (DB-Logo-Abschaltung) sind hier bewusst NICHT enthalten.
 *
 * Spiegel-Datei: `dbIcons.ts` haelt die (vor dem React-Umbau freigegebene) Gegenrichtung
 * Material -> DB fuer die alte Vergleichsseite. Diese Registry ist die maszgebliche Quelle.
 */

/** Ziel-Icon in einem anderen Satz plus optionaler Hinweis, wo die Entsprechung ungenau ist. */
export interface IconZiel {
  /** Ligatur-/Symbolname in Material Symbols. */
  material: string;
  /** Gesetzt, wenn Material das DB-Motiv nur annaehernd trifft -- beim Swap sichten. */
  hinweis?: string;
}

/**
 * Jeder DB-UX-Icon-Name, der im `src/` in einem `data-icon` landen kann (statische Attribute,
 * Ternary-Ausdruecke und die JS-Abbildungstabellen in `AutoSaveBadge.tsx`/`CustomSnackbar.ts`).
 * `test/iconRegistry.test.ts` prueft, dass keine Aufrufstelle einen Namen nutzt, der hier fehlt.
 */
export const ICON_REGISTRY = {
  // --- Pfeile und Chevrons
  arrow_down: { material: 'arrow_downward' },
  arrow_right: { material: 'arrow_right_alt' },
  arrow_up: { material: 'arrow_upward' },
  arrow_up_right: { material: 'open_in_new', hinweis: 'DB-Motiv "in neuem Kontext oeffnen"' },
  chevron_down: { material: 'expand_more' },
  chevron_left: { material: 'chevron_left' },
  chevron_right: { material: 'chevron_right' },
  chevron_up: { material: 'expand_less' },

  // --- Aktionen
  bin: { material: 'delete' },
  circular_arrows: { material: 'refresh' },
  copy: { material: 'content_copy' },
  cross: { material: 'close' },
  download: { material: 'download' },
  menu: { material: 'menu' },
  minus: { material: 'remove' },
  pen: { material: 'edit' },
  plus: { material: 'add' },
  resize: { material: 'open_in_full', hinweis: 'DB_ICON alt: crop_free; ggf. crop_free' },
  save: { material: 'save' },
  undo: { material: 'undo' },

  // --- Status und Hinweise
  check: { material: 'check' },
  check_circle: { material: 'check_circle' },
  cloud: { material: 'cloud' },
  cloud_upload: { material: 'cloud_upload' },
  exclamation_mark_circle: { material: 'error' },
  exclamation_mark_triangle: { material: 'warning' },
  information_circle: { material: 'info' },
  question_mark_circle: { material: 'help' },
  wifi_disabled: { material: 'wifi_off' },

  // --- Objekte und Navigation
  bar_chart: { material: 'bar_chart' },
  calendar: { material: 'calendar_today', hinweis: 'DB_ICON alt: event_available' },
  document: { material: 'description', hinweis: 'DB_ICON alt: picture_as_pdf' },
  envelope: { material: 'mail' },
  eye: { material: 'visibility' },
  funnel: { material: 'filter_list' },
  gear_wheel: { material: 'settings' },
  house: { material: 'home' },
  key: { material: 'key' },
  line_chart: { material: 'show_chart', hinweis: 'DB_ICON alt: add_chart' },
  link_chain: { material: 'link' },
  unlink_chain: { material: 'link_off' },
  list: { material: 'format_list_bulleted', hinweis: 'DB_ICON alt: format_align_left' },
  location_crosshairs: {
    material: 'my_location',
    hinweis: 'DB_ICON alt: highlight_alt; ggf. center_focus_strong',
  },
  magnifying_glass: { material: 'search' },
  map: { material: 'map' },
  market: { material: 'storefront', hinweis: 'DB_ICON alt: business' },
  pulse_wave: { material: 'monitoring', hinweis: 'DB_ICON alt: memory; ggf. vital_signs' },
  sliders_horizontal: { material: 'tune' },

  // --- Personen und Verwaltung
  id_card: { material: 'badge' },
  person: { material: 'person' },
  persons: { material: 'group' },
  profile_card: {
    material: 'contact_page',
    hinweis: 'DB_ICON alt: manage_accounts; badge kollidiert mit id_card',
  },
  shield_check: { material: 'verified_user', hinweis: 'DB_ICON alt: admin_panel_settings' },

  // --- Kontakt, Orte, Verkehr
  car: { material: 'directions_car' },
  telephone: { material: 'call', hinweis: 'ggf. phone' },
  train: { material: 'train' },

  // --- Geld
  cash: { material: 'payments' },
  changeover: { material: 'swap_horiz', hinweis: 'DB_ICON alt: alt_route' },
  euro_sign: { material: 'euro', hinweis: 'ggf. euro_symbol' },

  // --- Theme-Umschalter
  moon: { material: 'dark_mode' },
  sun: { material: 'light_mode' },
} as const satisfies Record<string, IconZiel>;

/** DB-UX-Icon-Name, der in dieser App vorkommt und remapbar ist. */
export type DbIconName = keyof typeof ICON_REGISTRY;

/** Alle bekannten DB-Icon-Namen (fuer Generator und Tests). */
export const DB_ICON_NAMES = Object.keys(ICON_REGISTRY) as DbIconName[];

/**
 * Namen, die wie ein Icon aussehen, aber keiner Icon-Schrift folgen und deshalb nicht
 * remappt werden: Eigenbau-SVG ueber `.app-icon`-Maske und die DB-Logo-Abschaltung.
 */
export const NICHT_REMAPPT = ['theme-auto', 'filter-off', 'none'] as const;
