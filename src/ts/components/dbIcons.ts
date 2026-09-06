/**
 * Material-Icon-Name -> DB-UX-Icon-Name.
 *
 * Freigegeben am 2026-09-06 (Vergleichsseite alt/neu). Zwei Motive gibt es im DB-Satz nicht;
 * sie sind nach DB-Regelwerk aus je zwei offiziellen Icons zusammengesetzt und liegen als
 * SVG unter `src/icons/` (erzeugt von `scripts/icon-varianten.py`):
 * `theme-auto` (Sonne + Mond) und `filter-off` (Trichter mit 2-dp-Durchstreichung).
 */
export const EIGENE_ICONS = ['theme-auto', 'filter-off'] as const;
export type EigenesIcon = (typeof EIGENE_ICONS)[number];

export const DB_ICON = {
  // --- Aktionen
  add: 'plus',
  add_circle_outlined: 'plus',
  remove: 'minus',
  edit: 'pen',
  edit_note: 'pen',
  delete: 'bin',
  undo: 'undo',
  save: 'save',
  download: 'download',
  refresh: 'circular_arrows',
  replay: 'circular_arrows',
  check: 'check',
  close: 'cross',
  content_copy: 'copy',
  open_in_new: 'arrow_up_right',
  visibility: 'eye',
  filter_list: 'funnel',
  format_align_left: 'list',
  calculate: 'bar_chart',
  picture_as_pdf: 'document',

  expand_less: 'chevron_up',
  expand_more: 'chevron_down',
  highlight_alt: 'location_crosshairs',
  crop_free: 'resize',

  // --- Navigation und Richtung
  arrow_upward: 'arrow_up',
  arrow_downward: 'arrow_down',
  arrow_right_alt: 'arrow_right',
  chevron_left: 'chevron_left',
  chevron_right: 'chevron_right',

  // --- Personen und Verwaltung
  person: 'person',
  group: 'persons',
  person_search: 'magnifying_glass',
  manage_accounts: 'profile_card',
  admin_panel_settings: 'shield_check',
  badge: 'id_card',
  work: 'person',
  password: 'key',

  // --- Kontakt und Orte
  phone: 'telephone',
  mail: 'envelope',
  home: 'house',
  home_work: 'house',
  business: 'market',
  flag: 'map',
  train: 'train',
  drive_eta: 'car',

  // --- Zustand und Hinweise
  warning: 'exclamation_mark_triangle',
  history: 'counter_clockwise_clock',
  schedule: 'clock',
  power_settings_new: 'start',
  power_off: 'stop',
  error: 'exclamation_mark_circle',
  error_outline: 'exclamation_mark_circle',
  help_outline: 'question_mark_circle',
  lightbulb: 'light_bulb',
  settings: 'gear_wheel',
  tune: 'sliders_horizontal',
  link: 'link_chain',
  link_off: 'unlink_chain',
  event_available: 'calendar',
  memory: 'pulse_wave',
  add_chart: 'line_chart',
  light_mode: 'sun',
  dark_mode: 'moon',

  // --- Geld
  payments: 'cash',
  balance: 'euro_sign',
  alt_route: 'changeover',
} as const satisfies Record<string, string>;

export type MaterialIcon = keyof typeof DB_ICON;

/** Groessenklassen des Design-Systems; sie setzen `--db-icon-font-size`. */
export const ICON_GROESSE = {
  '2xs': 'db-font-size-2xs',
  xs: 'db-font-size-xs',
  sm: 'db-font-size-sm',
  md: 'db-font-size-md',
  lg: 'db-font-size-lg',
} as const;
