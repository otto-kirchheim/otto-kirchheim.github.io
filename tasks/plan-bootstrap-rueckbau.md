# Plan: Bootstrap-Rückbau (DB-nativ) – 2026-10-03

## Auftrag und Entscheidungen

User 2026-10-03: „entferne alle Rückstände von Bootstrap“, Umfang **komplett**, Zielbild **DB-nativ direkt** (kein
Zwischenschritt über umbenannte Utilities). Bootstrap selbst (Paket, CSS, JS, `data-bs-*`) ist seit Phase H raus; übrig ist
die eigene Utility-Schicht `src/scss/utilities.scss` mit Bootstrap-Namen und alles, was darauf aufbaut.

Vorgaben, die gelten: keine `stylelint-disable`-Kommentare, Werte nur als DB-Tokens (`lint:css --max-warnings 0`), ein
Commit je grünem Batch mit Rückfrage, `bun run format` vor Commit, Token-Check vor jedem Batch, Sichtprüfung durch den User.

## Bestand (2026-10-03)

163 Klassen, ca. 2000 Vorkommen in 100 Dateien (`className`, `class: [...]`, `classList.*`):

| Familie | Vorkommen | Dateien | Beispiele |
| --- | ---: | ---: | --- |
| Abstände | 649 | 93 | `mb-1` 105, `mb-0` 81, `mb-2` 70, `p-2` 38, `py-0` 29 |
| Flex/Gap | 587 | 67 | `d-flex` 147, `align-items-center` 94, `gap-2` 93, `flex-wrap` 40 |
| Typo | 386 | 81 | `small` 181, `fw-semibold` 71, `text-center` 30, `text-uppercase` 18 |
| Farben | 220 | 68 | `text-body-secondary` 87, `text-muted` 66, `bg-body-secondary` 10, `text-bg-warning` 5 |
| Rahmen/Schatten | 84 | 43 | `border` 46, `border-bottom` 8, `shadow-sm` 7 |
| Display | 79 | 29 | `d-none` 20 (auch per JS), `d-lg-table-cell`, `d-sm-none` |
| Größen | 31 | 17 | `w-100` 12, `h-100` 8, `w-auto` 7 |
| Position | 21 | 5 | `position-absolute`, `top-50`, `translate-middle` |
| Tab-Zustand | 3 (+ CSS) | 2 | `tab-pane fade show active`, `tab-content` (`tabController.ts`, `App.tsx`, Admin) |

Je Bereich: `pages/admin/ui` 766 (25 Dateien), `pages/admin/ui/FormularEditor` 426 (17), `features/ber/ui` 170 (9),
`shared/ui` 128 (11), `features/auth/ui` 67, `features/ewt/ui` 66, `pages/admin/features` 57, `pages/start/ui` 55,
`pages/einstellungen` 66, `features/ez/ui` 47, `features/onboarding/ui` 43, `shared/lib` 35, `pages/berechnung/ui` 23,
`app/App.tsx` 22, `pages/admin/index.tsx` 19, Rest < 15. Dazu 19 Testdateien mit Klassen-Selektoren, Bootstrap-Markup in
`test/mockData.ts`, Kommentare/JSDoc („Bootstrap-Klasse für die Randfarbe“ u. a.).

## Ersatz (Zielbild)

DB liefert: `DBStack` (`direction`, `gap` 3xs–3xl/none, `alignment`, `justifyContent`, `wrap`, `variant="divider"`),
`DBSection`/`DBCard`/`DBDivider`/`DBBadge`/`DBTag`/`DBNotification`, Klassen `db-font-size-*`, `db-headline-size-*`,
Attribut `data-emphasis`, `db-color-*`/`data-color` (stellt `--db-adaptive-*` um), `db-divider-*`. **Keine** Abstands-,
Display- oder Positions-Utilities.

| Bootstrap | Ersatz |
| --- | --- |
| `div.d-flex` + `flex-column`/`gap-*`/`align-items-*`/`justify-content-*`/`flex-wrap` | `<DBStack direction gap alignment justifyContent wrap>` (Gap-Stufen 1→`2xs`, 2→`xs`, 3→`sm`, 4→`md`, 5→`xl` wie bisher) |
| Flex auf `span`/`button`/`td`/`li`, `flex-grow-1`/`flex-shrink-0` an Kindern | komponenteneigene Klasse (Token-Werte) |
| Abstände `m*`/`p*` | zuerst über `gap` des Eltern-`DBStack` auflösen; sonst komponenteneigene Klasse |
| `small`, `fs-*` | `db-font-size-*` (Wert je Stufe im Spike prüfen) |
| `fw-semibold`/`fw-bold`/`fw-medium` | `data-emphasis="strong"` bzw. komponenteneigene Klasse (Spike: was `data-emphasis` genau setzt) |
| `text-body-secondary`, `text-muted` | Klasse mit `color: var(--db-adaptive-on-bg-basic-emphasis-80-default)` (Stufe im Spike festlegen) |
| `text-danger`/`-success`/`-warning`/`-primary`, `text-bg-*`, `bg-*-subtle` | `data-color`/`db-color-*` am Element bzw. `DBBadge`/`DBTag`/`DBNotification` mit `semantic` |
| `border`, `border-*`, `rounded*`, `shadow*` | `DBCard` (`elevationLevel`, `behavior`), `DBDivider`, `db-divider-*` oder komponenteneigene Klasse |
| `d-none` per JS | `hidden`-Attribut bzw. React-Bedingung; responsive `d-*-none`/`d-*-table-cell` → komponenteneigene Klasse mit `@media` (Breakpoints aus `_breakpoints.scss`) |
| `w-100`/`h-100`/`w-auto`, Position/`translate-*` | komponenteneigene Klasse |
| `tab-pane fade show active`, `tab-content` | eigene Namen in `tabController.ts`/`App.tsx`/Admin (Zustand per `data-`Attribut oder `hidden`) |
| `visually-hidden` | DB-Komponenten-Props (`showLabel={false}` u. ä.), sonst eigene Klasse auf Basis `%a11y-visually-hidden` aus `@db-ux/core-foundations` |

Komponenteneigene Klassen: kebab-case/BEM, in `styles.scss` (bzw. der vorhandenen Komponenten-Datei) beim Bereich der
Komponente, nur `db-*`-Tokens.

### Vorrang: Props der DB-Komponenten (User-Hinweis 2026-10-03)

Reihenfolge je Stelle: (1) Prop der DB-Komponente, (2) passende DB-Komponente statt rohem Element, (3) DB-Klasse/Attribut,
(4) erst dann eigene Klasse. Steuernde Props laut `@db-ux/react-core-components` 5.6 (`dist/components/*/model.d.ts`):

| Komponente | Props für Größe/Abstand/Darstellung |
| --- | --- |
| `DBButton` | `size` small/medium, `width` full/auto, `variant` outlined/brand/filled/ghost, `noText`, `icon`/`iconLeading`/`iconTrailing`, `wrap` |
| `DBLink` | `size` medium/small, `variant` adaptive/brand/inline, `content` external/internal, `wrap` |
| `DBBadge` | `size`, `semantic`, `emphasis` weak/strong, `placement` inline/corner-*, `wrap` |
| `DBTag` | `semantic`, `emphasis`, `behavior` static/removable, `overflow`, `noText` |
| `DBCard` | `spacing` none/small/medium/large, `elevationLevel` 1–3, `behavior` static/interactive |
| `DBSection` | `spacing` none/small/medium/large, `width` full/large/medium/small |
| `DBStack` | `gap` none/3x-small…3x-large, `direction`, `alignment`, `justifyContent`, `wrap`, `variant` simple/divider |
| `DBDivider` | `margin` none/_, `variant` horizontal/vertical, `emphasis`, `width` |
| `DBHeading*` | `size` 3xs–3xl, `fontWeight` black/light, `alignment` start/center/end, `paragraphSpacing` |
| `DBInfotext` | `size`, `semantic`, `icon`/`showIcon`, `wrap` -- Ersatz für Hinweistexte `small text-muted`/`text-body-secondary` |
| `DBNotification` | `variant` docked/standalone/overlay, `semantic`, `linkVariant` |
| `DBCheckbox`/`DBSwitch`/`DBRadio` | `size` |
| `DBTooltip` | `placement`, `emphasis`, `width` auto/fixed, `variant`, `wrap` |
| `DBTable` | `size` x-small…large, `variant` flat/zebra/spaced, `divider`, `mobileVariant` table/list, `stickyHeader`, `width` |
| `DBDialog`/`DBDrawer` | `containerSize` small/medium/large/full, `backdrop`, `direction`/`position` (Drawer) |
| `DBAccordion` | `variant` divider/card |

Befund Bestand: Utilities direkt an DB-Komponenten 111 x `DBButton` (`py-0` 26, `p-0` 15 -- vermutlich Ersatz für
`size="small"`, bisher nur 19 x genutzt; `ms-auto`, `d-flex`), 33+29+15+6 x `DBHeading*` (`mb-*`, `fw-*` -> `size`/
`fontWeight`/`paragraphSpacing`), 28 x `DBStack` (`mb-*`/`my-*` -> `gap` am Eltern-Stack, `w-100`), 24 x `DBCard` (`shadow*`,
`border-0`, `h-100` -> `elevationLevel`/`spacing`), 20 x `DBNotification` (`py-2`, `small` -> `variant`), 16 x `DBTag`
(`text-success` -> `semantic`), 7 x `DBSection` (`text-center`), 7 x `DBCheckbox` (`m-0`/`mb-1`). Rohes Markup: `div` 977
(`d-flex` 123 -> `DBStack`), `span` 249 und `p` 191 (`small`/`text-muted`/`fw-semibold` -> `DBInfotext` bzw. Typo-Klassen).

## Verifikation je Batch

1. **Sichtvergleich**: Puppeteer-Skript (Fake-Backend aus `scripts/livetest.ts` wiederverwenden) fotografiert feste Ansichten
   (Start, Berechnung Desktop/Mobil, Einstellungen, je Modul-Tab + Dialoge, Admin-Unter-Tabs, FormularEditor; Hell/Dunkel)
   vor dem Batch (Baseline) und danach; Pixel-Diff je Ansicht, Abweichungen begründen oder beheben.
2. Gate: `typecheck`, `lint`, `lint:css`, `test`, `build`, `format`.
3. Schutztest (ab R1, Ratsche): zählt Bootstrap-Utility-Klassen in `src/ts`; Grenze sinkt je Batch, am Ende 0.
4. Sichtprüfung durch den User, dann Commit.

## Batches

- [x] R0 Werkzeug + Spike (2026-10-03): `scripts/sichtvergleich.ts` (4 Browser parallel, 24 Ansichten je Farbschema/
      Viewport, voller Lauf ca. 85 s, zwei Laeufe ohne Aenderung 88/88 pixelgleich); Fake-Backend mit festen Admin-Daten
      (`scripts/livetest/adminDaten.ts`, vorher waren alle Admin-Tabs leer); Schutztest `test/app/bootstrapRueckbau.test.ts`
      (eingefrorene Klassenliste `bootstrapKlassen.json`, Grenze 2024).
- [x] R1 `app/`, `widgets/`, `shared/model`, `shared/lib` (2026-10-03): Tab-Zustand (`hidden` statt `tab-pane fade show
      active`, Panel-Erkennung ueber `role="tabpanel"`, Berechtigung `data-gesperrt`), JS-Umschaltungen auf `hidden`,
      Act-As-Hinweis, Hilfedialog, `ThemeSwitcher`, Admin-Panes; HTML-Dialoge Speicherfehler (`db-stack`/`db-infotext`/
      `db-color-critical`, Kopf jetzt hellrot statt vollrot) und Unterschrift (`db-infotext`).
- [x] R2 `shared/ui` (2026-10-03): Arbeitszeit-Editor (`DBStack`, `DBInfotext`, `<strong>`, Komponentenklassen
      `schicht-*`), `berechnungBausteine`, `PasswordStrengthMeter`, Dialog-Fehler (`dialog-fehler`), `MyModalBody`
      (`db-color-critical`), `CustomTableView`-Knopfleiste, `DBLoadingButton`, `MyShowElement` (`anzeige-zeile`,
      Label `<strong>`), `feld-zentriert`. `.db-stack` zusaetzlich `block-size: auto` (Stack in gestreckter Rasterzelle
      ueberlappte). Ratsche zaehlt jetzt auch `divClass`/`feldKlasse`/... der My*-Wrapper: 1877.

### Festgelegt im Spike

- **Sichtbarkeit:** `hidden`-Attribut (DB-Komponenten pruefen `:not([hidden])`; global `[hidden] { display: none !important }`
  in `styles.scss` fuer eigene Klassen mit `display`). Kein `d-none` mehr, auch nicht per JS (`el.hidden = …`).
- **Tab-Panels:** `hidden` = aktiver Tab (React), `data-gesperrt` = Berechtigung (JS); keine Klassen.
- **`DBStack`-`gap`:** Namen entsprechen den Tokens (`x-small` = `xs`, `small` = `sm` …), Standard ohne Angabe `small`.
- **Abstaende von `p`/`ul` im Stack:** nur unteren Rand der Elemente zuruecksetzen (`margin-block-end: 0` je Bereich), der
  obere Rand gehoert zum bisherigen Bild.
- **Knopf in `DBNotification`:** in den Inhalt (`DBStack`), nicht in den `link`-Slot (DB legt einen `.db-button` dort als
  Schliessen-Knopf oben rechts ab).
- **Grauer Hinweistext:** `DBInfotext` (Standard `adaptive` ist gedaempft grau, Schrift `body-sm`); ohne Symbol
  `showIcon={false}` (HTML `data-show-icon-leading="false"`). User-Entscheid 2026-10-03.
- **Schrift:** `small` -> `<small>`/`data-font-size="sm"` bzw. `DBInfotext`; fett -> `<strong>` (User-Entscheid).
- **Farbiger Grund + Text** (`text-bg-*`): `db-color-<semantik>` (setzt Grund `bg-basic-level-1` und Text `emphasis-100`).
- **Knopf links in einem Spalten-Stack:** eigener `DBStack alignment="start"` statt Wrapper-`div` (ein `div` folgt
  `text-align` des Bereichs).
- **HTML-Strings** (Dialoge per `erzeugeDbDialog`): DB-Klassen mit Daten-Attributen (`db-stack` + `data-gap`/
  `data-direction`, `db-infotext`, `db-color-*`).
- **Responsiv:** `-md-` der alten Utilities = DB `md` (64em/1024px), in eigenen Klassen `@media (min-width: #{bp.$md}px)`.

- [x] R3 `features/auth`, `features/onboarding` (2026-10-03): Login-/Registrieren-/Reset-Dialog (`Gruppe` in `shared/ui/gruppe`), Konflikt-Banner, Ersteinrichtungs-Panel. Ratsche 1768. Nebenbei: Rollen-Abzeichen einzeilig (`rollen-tag`), Berechnung-Labelspalte wieder 11.5rem, Tabellen-Knopfleiste sticky
- [x] R4 `features/ber` (2026-10-03): Hinweise `DBNotification`, Gruppen `Gruppe`, Zeilen `DBStack`; Ratsche 1593. Offen fuer R10: `db-table` (DB-Klasse, steht wegen Regel in `utilities.scss` in der Ratschen-Liste) aus Liste nehmen und Regel nach `styles.scss`
- [x] R5 `features/ewt`, `features/ez`, `features/ea` (2026-10-03): Tab-Koepfe, Dialoge, Zulagen-Einstellungen. Ratsche 1454
- [x] R6 `pages/start`, `pages/berechnung`, `pages/einstellungen` (2026-10-03): Start pixelgleich. Ratsche 1311
- [x] R7 `pages/admin/ui` ohne FormularEditor (2026-10-03): Skript-Umstellung + Nacharbeit, `admin.scss`. Ratsche 527
- [ ] R8 `pages/admin/ui/FormularEditor` – ca. 430
- [ ] R9 `pages/admin/features`, `pages/admin/index.tsx` – ca. 75
- [ ] R10 Abschluss: `utilities.scss` auf den Rest prüfen und löschen, Tests/`mockData.ts`, Kommentare, `CLAUDE.md`,
      Schutztest auf 0

## Risiken

- JS/Tests hängen an Klassen (`classList.add('d-none')`, `querySelector('.d-none')`, `tab-pane`): je Batch per grep in
  `src` **und** `test` suchen.
- `DBStack` setzt eigene Defaults (Gap, `inline-size: 100%`, `overflow`; siehe `.db-stack`-Override in `styles.scss`).
- Kaskade: `utilities.scss` arbeitet mit `!important`; komponenteneigene Klassen ohne `!important` verlieren gegen noch
  vorhandene Utilities am selben Element -- Element je Umbau vollständig umstellen.
- Lesson `d-none`-Reihenfolge (`tasks/lessons.md`): Anzeige-Umschaltungen bevorzugt über `hidden`/React-Bedingung.
