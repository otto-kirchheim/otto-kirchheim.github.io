# React-Umbau Frontend — Phase J (detailliert) + Roadmap K–N

> Folgeplan zu `tasks/plan-db-ux-migration.md` (Phasen 0–I).
> Branch: `feat/db-ux` (Frontend) · `feat/db-ux-migration` (Parent-Repo).
> Fortschritt und Phasen-Logs: `tasks/todo.md` — **Status wird dort gepflegt, nicht hier.**

## Status (2026-09-08)

- **Phase J–N: noch nicht gestartet.** Blocker: **Phase I** (Cleanup, Token-Finalisierung,
  „neues Design", Doku) muss erst abgeschlossen sein. Offene I-Punkte siehe `tasks/todo.md`
  (I.4, I.6, I.8, I.9, I.11).
- Dieser Plan liegt als Vorbereitung im Repo, damit die Umsetzung **im Wechsel auf mehreren
  Geräten** ohne Kontextverlust weiterlaufen kann. Bei jedem Gerätewechsel gilt die
  Reihenfolge aus `CLAUDE.md`: erst `tasks/todo.md` lesen und Status synchronisieren.

## Context

Die DB-UX-Migration (`tasks/plan-db-ux-migration.md`, Phasen A–H) ist abgeschlossen;
Phase I läuft. Zwei Dinge sind dabei bewusst liegen geblieben:

1. **Markup statt Komponenten.** Der Großteil der Bedienelemente ist DB-UX-konform
   *gestylt* über CSS-Klassen und `data-*` (`db-button`, `db-tag`, `db-checkbox`,
   `db-textarea`) auf **nativen** `<button>`/`<input>`/`<textarea>` — nicht über
   `@db-ux/react-core-components`. Sweep unter `src/ts`: ~206 `<button className="db-button">`,
   44 `<input type="checkbox">`, 2 `radio`, 2 `<textarea>`. Cluster: Admin (200),
   Einstellungen (24), Bereitschaft/EWT/Neben/EA (~22).
2. **Hybrid-Rendering.** `src/index.html` (1060 Zeilen) trägt Header, Navigation,
   Theme-Umschalter, zwei `<dialog>`, Fußzeile, den kompletten Start-Tab, die
   Berechnung-Tab-Hülle und das gesamte Einstellungen-Formular als statisches HTML;
   `CustomTable` (1448 Zeilen) rendert die Feature-Tabellen als Vanilla-DOM.

**Langfristiges Ziel (User-Vorgabe):** **alles als React**, inklusive `CustomTable`.
`index.html` schrumpft am Ende auf `<head>` + einen React-Root.

Dieser Plan macht **Phase J umsetzbar** und legt **K–N** als Zielbild mit Abhängigkeiten,
Risiken und Aufwandsklasse fest. Jede Folgephase bekommt bei ihrem Start einen eigenen
Planungsdurchgang.

---

## Zielbild und Reihenfolge

| Phase | Inhalt | Vorbedingung | Klasse |
|---|---|---|---|
| **J** | Native Controls → `DBButton`/`DBTag`/`DBCheckbox`/`DBRadio`/`DBTextarea`; `DbFeld`/`DbAuswahl` innen auf `DBInput`/`DBSelect`; `MyButton` auflösen | **Phase I fertig** | **L** (mehrere Wochen) |
| **K** | App-Shell nach React: `DBHeader`/`DBNavigation`/Brand, Theme-Umschalter, `navdrawer`- und `impressum`-Dialog, Fußzeile; `tabController` wird React-State | J | L |
| **L** | Statische Tabs nach React: Start, Berechnung-Hülle, Einstellungen-Formular | K | L–XL |
| **M** | `CustomTable` nach React | L (Einstellungen `#tableVE`) | **XL** (Monate) |
| **N** | `index.html` auf `<head>` + `<div id="app">`; `main.ts` → `main.tsx`, ein `createRoot` | K + L + M | M |

Querschnitt (in J beginnend, über alle Phasen): **`@db-ux/core-foundations` stärker nutzen**.

---

## Rollen der vier `@db-ux`-Pakete

| Paket | Version | Rolle heute | Was sich ändert |
|---|---|---|---|
| `@db-ux/react-core-components` | 5.3.0 | React-Komponenten; genutzt in 10 Dateien (`DBDrawer`, `DBInput`, `DBSelect`, `DBSwitch`, `DBButton`, `DBTooltip`, `DBInfotext`) | **Hauptwerkzeug aller Phasen.** J: Controls; K: `DBHeader`/`DBNavigation`/`DBBrand`/`DBDrawer`; M: `DBTable`-Familie |
| `@db-ux/core-components` | 5.3.0 | CSS-Bundle (`src/scss/db-ux.css`), liefert alle `db-*`-Klassen | bleibt die Stil-Grundlage; nach J/K/L sinkt der Anteil handgeschriebener `db-*`-Klassen |
| `@db-ux/db-theme` | 6.2.0 | Markentheme (`rollup.css`), Fonts/Icons via `trustedDependencies`-postinstall | unverändert; Rest-Aufräumen (ungenutzte Icon-/Font-Gewichte, Marken-Logo-SVG im Precache) bleibt **Phase I** |
| `@db-ux/core-foundations` | 5.3.0 | **wird derzeit nur transitiv über die anderen Bundles genutzt** — kein direkter Import in `src/scss` | **neu direkt nutzen**, siehe unten |

`@db-ux/components` existiert im Projekt nicht und wird nicht gebraucht — die React-Variante
deckt alles ab.

### Querschnitt: `@db-ux/core-foundations` direkt einziehen

`node_modules/@db-ux/core-foundations/build/styles/` bietet ungenutzt:
`helpers/` (`_a11y`, `_focus`, `_divider`, `_display`, `_interactive`, `_functions`,
`_clearfix`, `_shadow-dom` als SCSS-Mixins; dazu `helpers/classes/`),
`density/classes/` (`functional`/`regular`/`expressive`), `colors/classes/`,
`_screen-sizes.scss`, `_normalize.scss`.

- **J-Q1 — helpers-Mixins übernehmen:** `@use '@db-ux/core-foundations/build/styles/helpers'`
  in `styles.scss`/`utilities.scss`; Eigenbau für Fokus-Ringe, visually-hidden, Divider,
  `display`-mit-`[hidden]`-Schutz und Interaktiv-Zustände dagegen ersetzen.
- **J-Q2 — Breakpoints als einzige Quelle:** `_screen-sizes.scss` wird die Referenz für
  `raster.scss` **und** für die handgepflegte Breakpoint-Tabelle in `CustomTable.ts:30`
  (`o.breakpoints`) — dort als exportierte TS-Konstante spiegeln, damit
  `customtable-toggle-*` und CSS nicht auseinanderlaufen. Vorarbeit für Phase M.
- **J-Q3 — `utilities.scss` (534 Z.) / `raster.scss` (77 Z.) gegen foundations abgleichen:**
  ersetzen **nur, was 1:1 passt**; Rest bleibt. Zwei Verträge sind unantastbar
  (`tasks/lessons.md`): die **Ausgabereihenfolge** (`.d-none` muss die übrigen `d-*`
  schlagen, Commit `f190410`) und das Klassen-Inventar wird **per Skript** ermittelt,
  nicht per grep.

Verifikation des Querschnitts: `bun run lint:css` (Ratsche `--max-warnings 93` darf nicht
steigen), Diff nach `stylelint --fix` **immer** ansehen, `verify`-Skill-Sichtprüfung.

---

## Bestandsaufnahme: sind die `components/My*` noch nötig?

Geprüft: alle 13 `My*` + `PasswordStrengthMeter` gegen ihr DB-UX-Pendant.

| Komponente | Zeilen / Nutzer | DB-Pendant | Verdikt |
|---|---|---|---|
| `MyButton` | 63 / 7 (+ intern `MyEditorFooter`, `MyShowFooter`) | `DBButton` (1:1) | **Ersetzbar.** Wert-Add gering: Markup-Stil-`data-*`-Props, `db-button`-Klassenfilter, `dialogDismiss`→`data-dialog-dismiss`. Da J die Buttons ohnehin anfasst → **in J6b auflösen**. |
| `MyInput` | 106 / 17 | `DBInput` + `DBTooltip` | **Behalten.** Enthält, was `DBInput` nicht bietet: Popover-HTML → Tooltip-Zeilen (`hinweisZeilen`), controlled/uncontrolled-Weiche, `invalidFeedback`-Span, `useSofortigeId`, `data-zulage-input-code`. |
| `MySelect` | 56 / 9 | `DBSelect` | **Behalten** (dünn, aber begründet): Options-Array-API, Dayjs-Coercion, controlled/uncontrolled-Weiche, `useSofortigeId`. |
| `MyCheckbox` | 67 / 6 | `DBSwitch` | **Behalten.** 3-stufige controlled/uncontrolled-Logik gegen den React-19-„hängenden Schalter" (`lessons.md`). |
| `PasswordStrengthMeter` | 73 / 5 | — (nutzt `DBInfotext`) | **Behalten.** Domänen-Widget, kein Adapter. |
| `MyDivModal` / `MyFormModal` | 29 / 7 · 31 / 18 | — | **Behalten.** App-Komposition (`dialog-rumpf`/`<form>` + Header + Fehler-Notification + Footer). DB UX v5 hat **keine** Modal-Inhaltskomponente — `DBDrawer` ist nur die Hülle. |
| `MyModalBody` | 16 / 25 | — | **Behalten.** `dialog-koerper` + `#errorMessage`-Senke (Vertrag mit der Validierung). |
| `MyModalHeader` | 43 / 4 | `DBDrawerHeader` (teilw.) | **Behalten, Markup modernisieren.** Rohe `db-button` → `DBButton` (J7). `DBDrawerHeader`-Umstieg bleibt offen: der Header läuft bewusst über `children`, nicht den `DBDrawer.header`-Slot (`showModal.tsx:41-48`, `db-ux/drawer-header-required`-disable) — Thema für Phase K. |
| `MyEditorFooter` / `MyShowFooter` | 18 / 2 · 30 / 5 | `DBDrawerFooter` (Hülle) | **Behalten, Buttons ersetzen** (über J6b). |
| `MyShowElement` | 32 / 3 | — | **Behalten.** Read-only-Label/Wert-Zeile; DB UX hat dafür nichts. |
| `MyHelpModal` | 112 / 2 | — | **Behalten.** Hilfe-Content-Renderer. Rohe `db-button` → J7. |

**Kernaussage:** Kein Modal-/Dialog-`My*` hat ein DB-Pendant — DB UX v5 liefert nur
`DBDrawer` (+ `DBDrawerHeader`/`DBDrawerFooter` als Slots), nicht die Inhalts-Skelette.
Einzig **`MyButton`** ist echt redundant. `MyInput`/`MySelect`/`MyCheckbox` kodieren
React-19-Glue, die die DB-Komponenten nicht mitbringen.

---

# Phase J — Native Controls → `@db-ux/react-core-components`

> **Startbedingung: Phase I abgeschlossen.**

## Komponenten-Mapping (direkt an den Aufrufstellen, keine neuen Wrapper)

| Ist (nativ + `db-*`-Klasse) | Soll |
|---|---|
| `<button className="db-button" data-variant="X" data-color="Y" data-size="Z" onClick disabled>T</button>` | `<DBButton variant="X" size="Z" data-color="Y" onClick disabled>T</DBButton>` |
| Icon-Button `<button className="db-button"><span className="db-icon" data-icon="bin"/></button>` | `<DBButton icon="bin" noText variant="ghost" onClick />` |
| `.knopfgruppe`-Gruppe | Wrapper-`<div role="group">` bleibt, Kinder → `DBButton` |
| `<span className="db-tag" data-semantic="S" data-emphasis="E">T</span>` | `<DBTag semantic="S" emphasis="E">T</DBTag>` |
| Interaktiver Abschnitts-Umschalter `<button className="db-tag">` (`AdminProfileTemplateContentEditor.tsx:82-98`) | je Stelle bewerten: `DBTag` interaktiv (`behavior`, `showCheckState`) · `DBButton variant="ghost"` mit Aktiv-Zustand · `DBTabs`/`DBTabList`, wo es semantisch ein Tab-Wechsel ist |
| `<div className="db-checkbox" data-size="small"><label><input type="checkbox" …/>Label</label></div>` | `<DBCheckbox label="Label" size="small" checked disabled onChange />` |
| `<input type="radio">` (2×) | `<DBRadio label name value checked onChange />` |
| `<div className="db-textarea"><textarea data-custom-validity/></div>` (`FormularEditor.tsx:807-821`, `JsonEditor.tsx:120`) | `<DBTextarea label rows density="functional" validation invalidMessage />` |
| `DbFeld` / `DbAuswahl` **intern** | `DBInput` / `DBSelect` — Wrapper bleibt, nur das Innenleben wird getauscht (J8) |

### Verbindliche Muster

1. **controlled/uncontrolled-Weiche:** mit `onChange` **und** gesetztem `checked`/`value`
   → controlled; sonst `defaultChecked`/`defaultValue`. Sonst „hängender Schalter" unter
   React 19 (`MyCheckbox.tsx:35-46`).
2. **`key` an jeder Renderstelle** für zustandshaltende Kinder (`ArbeitszeiteingabePanel`,
   `VorgabenBWeekRangeEditor`) — bestehende `key`-Props nicht verlieren.
3. **`data-color` bleibt Passthrough-DOM-Attribut** auf `DBButton` (kein `color`-Prop im
   Modell; `MyButton.tsx:52` macht es genauso).
4. **`data-disabler`** auf den Feature-Tab-Buttons (`buttonDisable`) erhalten;
   `buttonDisable.ts`-Selektor gegen die neue Struktur prüfen (`id` wird von DB spät vergeben).
5. **`useSofortigeId`** (`dbFeldHelfer.ts`) überall, wo Bestandscode nach `mount()`
   synchron `document.querySelector('#id')` macht.
6. **`onChange` vs `onInput`:** beide werden durchgereicht; Live-Validierung darf `value`
   nicht `trim()`en. Messwert-Felder `step="any"`.
7. **`bun run test`**, nie `bun test` (Skript setzt `--isolate`).

### Nicht anfassen (`plan-db-ux-migration.md:63-74`)

PDF-Pipeline (`infrastructure/pdf/*`), `nebengeld-shared`, Auth-Utils,
`tokenManagement/*`, `Storage.ts` + localStorage-Schema, `infrastructure/api/*`,
`infrastructure/autoSave/*`, `resourceConfig.ts`, `configDayjs.ts`, `features/*/utils/**`,
`CustomTable`/`customTableRender.ts` (→ Phase M), `src/index.html` (→ Phase K/L), Backend.

## Slices (je 1 PR, „screen für screen", einzeln deploybar)

| # | Slice | Kern-Dateien | Umfang |
|---|---|---|---|
| J0 | **Querschnitt foundations** | `styles.scss`, `utilities.scss`, `raster.scss` + `_screen-sizes.scss`-Spiegel als TS-Konstante | M |
| J1 | **Referenz-Slice** | `Admin/components/AdminProfileTemplateContentEditor.tsx` (14 Controls: `db-button`, `db-tag`, `db-checkbox`) | S |
| J2 | FormularEditor | `FormularEditor/`: `FormularEditor.tsx`, `FeldPanel.tsx`, `FeldZeile.tsx`, `feldPanelGemeinsam.tsx`, `SpalteZeile.tsx`, `TabellenBlock.tsx`, `SonderZeilen.tsx`, `bedingungEditor.tsx`, `aggregationUndRechnung.tsx`, `datenpfadUndFormeln.tsx`, `ListenGruppen.tsx`, `SkalierLeiste.tsx`, `PdfCanvas.tsx`, `SchriftartDialog.tsx`, `SchriftartWahl.tsx` | L |
| J3 | Admin übrige Komponenten | `AdminProfileTemplatesManager`, `AdminUserCard`, `AdminResourceBrowser`, `AdminResourceEditModal`, `AdminUserProfileEditor`, `AdminUserTable`, `AdminUserList`, `AdminDashboard`, `AdminLogBrowser`, `AdminVorgabenEditor`, `JsonEditor`, `OeLevel*`/`OeTagInput`, `BulkEdit*`, `createAdmin*Modal`, `FormularUpload`, `FormularVersionenListe` | L |
| J4 | Einstellungen-Komponenten | `Einstellungen/components/*` (v.a. `ArbeitszeiteingabePanel.tsx`, `FahrzeitenPanel.tsx`) | M |
| J5 | Bereitschaft / EWT / Neben / EA | `features/{Bereitschaft,EWT,Neben,EA}/components/*.tsx`; DOM-String-Parser `berechnenParser`/`schichtParser` in `EwtTab.tsx` prüfen | M |
| J6 | Feature-Tab-Buttons | `{Neben,Bereitschaft,EWT,EA}/*Tab.tsx` (`db-button` + `id` + `data-disabler`) — `buttonDisable.ts` mitziehen | M |
| J6b | **`MyButton` auflösen** | `MyButton.tsx` löschen, Barrel `components/index.ts`, 7 Aufrufer + `MyEditorFooter.tsx`/`MyShowFooter.tsx` → `DBButton`; `MyButton`-Tests | M |
| J7 | `My*`- + `core/`-Rest-Markup | rohe `db-button` in `MyModalHeader.tsx`, `MyHelpModal.tsx`; `core/orchestration/onboarding/createOnboardingGuideModal.tsx`, `core/help/openHelpModal.tsx`, `core/orchestration/auth/components/ConflictReviewBanner.tsx` | S |
| J8 | **`DbFeld`/`DbAuswahl` → `DBInput`/`DBSelect`** | `components/DbFeld.tsx` + Tests; `styles.scss:565-591` (`admin-fahrzeit-*`), `.feldgruppe` gegen die neue DB-Struktur prüfen. Aufrufstellen (31/28 Dateien) bleiben unverändert. | M |
| J9 | Cleanup + Doku | tote `db-*`-Regeln in `styles.scss`/`utilities.scss`; `npx @db-ux/agent-cli` neu; `frontend/CLAUDE.md`, `.claude/skills/{architektur,coding-konventionen}`, `CHANGELOG.md`, Phase-J-Abschnitt in `todo.md`; `graphify update .` | S |

`MyInput`/`MySelect`/`MyCheckbox` und die Modal-Komposita bleiben (s. Bestandsaufnahme);
nur ihr rohes `db-button`-Markup wird ersetzt.

### Entscheidungslog Phase J

- **Umfang:** voller Sweep über alle Features (nicht nur Admin).
- **Muster:** `@db-ux/react-core-components` **direkt** an den Aufrufstellen, **keine** neuen
  Wrapper-Komponenten.
- **`DbFeld`/`DbAuswahl`:** Wrapper bleibt, Innenleben wird auf `DBInput`/`DBSelect`
  getauscht (Option A). Begründung: erfüllt „echte DB-React-Komponente" bei minimalem Diff;
  die Alternative (Wrapper löschen, `DBInput` an ~59 Stellen direkt) bringt keinen
  funktionalen Gewinn, verteilt aber controlled/uncontrolled-Handling, `label`,
  `variant="hidden"`, `density` und die `db-ux/*`-eslint-disables auf 59 Dateien.
- **Einordnung:** eigene Phase J, nicht als I.x angehängt.

---

# Roadmap K–N (Zielbild, je eigener Planungsdurchgang zum Start)

## Phase K — App-Shell nach React (abgeschlossen 2026-09-12)

`src/index.html:38-255` + `:1043-1058` (Header, Navigation, Theme-Umschalter, `navdrawer`,
`impressum`, Fußzeile) werden React, gemountet über `infrastructure/ui/reactRoot.ts`.

**Ergebnis (K0–K7, feat/react-umbau):** `AppFooter.tsx`, `useColorMode.ts`/`ThemeSwitcher.tsx`,
`ImpressumDialog.tsx` (offizielle `DBDrawerHeader`/`DBDrawerFooter`-Slots statt
`MyModalHeader`), `AppHeader.tsx` (`DBHeader`/`DBNavigation`/`DBNavigationItem`),
`activeTabStore.ts`/`useActiveTab.ts`. `navDrawer.ts`, `DBColorToggler.ts`,
`NavDrawerShell.tsx` (Zwischenschritt K4) gelöscht. Kernfund unterwegs: `DBHeader` rendert seine
`children` gleichzeitig ZWEIMAL im DOM (Desktop + Drawer-Kopie, kein Umzugs-Kniff mehr nötig) —
das brach mehrere `querySelector`-Aufrufer, gefixt auf `querySelectorAll`
(`updateTabVisibility.ts`, `auth/index.ts`). Details je Slice in `tasks/todo.md` (Abschnitt
„Aufgaben Phase K") und `CHANGELOG.md` (103–110). Tab-Panel-Inhalte bleiben bewusst statisches
HTML (Phase L).

- `DBHeader` + `DBBrand` + `DBNavigation`/`DBNavigationItem` statt handgeschriebenem
  `db-header`-Markup; Theme-Umschalter (`#bd-theme` + `db-sub-navigation`) als React-Komponente,
  `DBColorToggler`-Logik wird ein Hook (Storage-Key `theme` bleibt).
- `<dialog id="navdrawer">` → `DBDrawer`. **Das löst den `navDrawer.ts`-Kniff auf**, der die
  Navigation heute physisch in die Schublade umzieht, damit die Tab-Ids eindeutig bleiben —
  React kann sie zweimal rendern und die Ids selbst vergeben.
- `<dialog id="impressum">` → `DBDrawer`; `infrastructure/ui/dbDialog.ts`
  (`initStatischeDialoge`) entfällt für diesen Fall.
- `tabController` wird React-State (aktiver Tab + Hash-Sync per Hook). **Kompatibilitätsbrücke
  ist Pflicht:** `data-tab-target`, das `tab:shown`-CustomEvent und die
  `featureLifecycleRegistry`/`syncFeatureTabs`-Verdrahtung müssen bis Phase N weiterlaufen,
  weil `main.ts` und die Feature-`index.ts` daran hängen.
- **Risiken:** Tab-A11y (`role="tablist"`, `aria-selected`, roving `tabindex`) darf nicht
  schlechter werden; das `d-none`-Ein-/Ausblenden der Tabs (Admin, optionale Bereiche)
  wandert von `main.ts:27-28` und `syncFeatureTabs` in den React-State.

## Phase L — Statische Tabs nach React (abgeschlossen 2026-09-12)

| Slice | Inhalt | Anmerkung |
|---|---|---|
| L1 | **Start-Tab** | rein präsentational (Willkommen, 3 Karten, Schnellzugriff, Ladeanzeige, DB-Schwelle) — einfachster Einstieg, guter Beweis für das K-Shell-Muster |
| L2 | **Berechnung-Tab-Hülle** | Titel, Monats-Navigation, `db-table`-Gerüst + `#tbodyBerechnung`-Zeilengenerierung (`BerechnungTableRows.tsx`, eigener Root direkt auf `<tbody>`) |
| L3 | **Einstellungen-Tab** | Toolbar, Jahr-Formular, alle 7 Accordion-Items (`EinstellungenTab.tsx` + `PersoenlicheDatenPanel.tsx`) |

**Ergebnis:** Alle drei Slices mounten React direkt in die jeweilige Tab-Pane (kein Wrapper-Div —
bei L1 zwingend wegen `#start.active > .schwelle`-Kindselektor in `styles.scss`, bei L2/L3 aus
Konsistenz). **Kernerkenntnis aus L3, die den ursprünglichen Plan widerlegt:** Die hier vermutete
Notwendigkeit, `saveEinstellungen`/`generateEingabeMaskeEinstellungen.ts`/`Einstellungen/index.ts`
von `document.querySelector`-Reads auf React-State umzustellen, bestand nicht — diese Dateien
lesen/schreiben ausschließlich per `#Id`-Selektor, unabhängig davon, ob React oder statisches HTML
das Element erzeugt hat. Ein reiner 1:1-Markup-Port genügte für alle drei Slices; keine einzige
Wiring-Datei musste angefasst werden. Details je Slice in `tasks/todo.md` (Abschnitt „Aufgaben
Phase L") und `CHANGELOG.md` (112–114). `#tableVE` bleibt bis Phase M eine `CustomTable`.

## Phase M — `CustomTable` nach React

**Planungssession 2026-09-12 (Web-Recherche + Code-Verifikation vor Umsetzungsstart):**
Bestandsaufnahme korrigiert und Richtung entschieden, siehe „Entscheidung" unten.

`infrastructure/table/` = 1429 Zeilen über `CustomTable.ts` (270), `Row.ts` (138), `Rows.ts` (275),
`Column.ts` (49), `customTableRender.ts` (333), `customTableTypes.ts` (135), `customtable.scss`
(228). **Korrektur:** tatsächlich **6** Instanziierungen (nicht 12 wie in der ersten
Bestandsaufnahme notiert), alle über die Factory `createCustomTable()` (`CustomTable.ts:264`):
`tableBZ` + `tableBE` (`BereitschaftTab.tsx:56,127`), `tableE` (`EwtTab.tsx:55`), `tableN`
(`NebenTab.tsx:39`), `tableEA` (`EaTab.tsx:39`), `tableVE`
(`generateEingabeTabelleEinstellungenVorgabenB.ts:51`). `autoSave.ts` selbst instanziiert keine
Tabelle, sondern konsumiert sie (s. u.).

**Die eigentliche Kopplung ist nicht das Rendering, sondern `infrastructure/autoSave/`:**
`savePipeline.ts` findet Tabellen über `el.instance` (`savePipeline.ts:33`) und arbeitet mit
`Row`/`TableChanges`/`RowState`; `overlapGuard.ts` und `changeTracking.ts` ebenso (zusammen
1651 Zeilen `infrastructure/autoSave/`). DB UX liefert weiterhin **keine** interaktive
DataTable — frisch per `db-ux`-MCP-Tool geprüft (`list_components`, `get_component_props('table')`):
`DBTable`/`DBTableRow`/`DBTableDataCell` sind reine Präsentations-Bausteine (Props nur
`variant`/`size`/`divider`/`columnSizes`/`stickyHeader` — kein Sort-, Edit- oder
Selection-State). Sortierung, Inline-Edit, Soft-Delete/Undo und die Breakpoint-Umschaltung
(`customtable-toggle-*`) bleiben in jedem Fall Eigenbau.

Drei Richtungen standen zur Wahl:

- **M-a Portierung** — `Row`/`Rows`/`Column` bleiben als reine Datenklassen (kein DOM),
  nur `customTableRender.ts` wird durch React-Komponenten über `DBTable` ersetzt; der
  `el.instance`-Vertrag bleibt über einen Ref-Adapter erhalten → `autoSave` unangetastet.
  Kleinster Schnitt.
- **M-b Neubau** — React-Grid mit `useReducer`-State, `autoSave` auf ein neues
  Änderungs-Interface umschreiben. Sauberster Endzustand, reißt aber `savePipeline`,
  `overlapGuard`, `changeTracking`, `persistTableData` und alle 12 Aufrufstellen auf.
- **M-c Fremdbibliothek** — siehe Marktabgleich; kommt praktisch nur als *Variante von M-b*
  in Frage, nicht als Abkürzung.

### Marktabgleich Tabellen-Bibliotheken (Stand 2026-09-08, `npm view`; 2026-09-12 web-verifiziert)

Harte Randbedingung: Phase F hat die Tabellen bereits auf **DB-Table-CSS** gestellt.
Jede Bibliothek, die eigenes DOM oder eigene Styles mitbringt, macht das rückgängig und
bricht die DB-Marken-/A11y-Vorgaben. Es bleibt damit praktisch nur *headless*.

| Paket | Version | Peer React | Unpacked | Urteil |
|---|---|---|---|---|
| **`@tanstack/react-table`** | **9.0.0, seit 2026-08-04 stabil (GA)**, MIT | `>=18` | 134 KB | **Einzige tragfähige Option.** Headless: liefert Spalten-/Zeilenmodell, Sortierung, Filter, Gruppierung — **kein** DOM, **kein** CSS. Verträgt sich mit DB-Table-CSS und React 19. Web-Suche 2026-09-12: v9 nach >2 Jahren Arbeit stabil, kein neuer Herausforderer aufgetaucht. |
| `react-data-grid` | 7.0.0-**beta**.61, MIT | `^19.2` | 373 KB | Beta; eigenes virtualisiertes DOM + eigene Styles → DB-Table-CSS wäre wirkungslos. Raus. |
| `ag-grid-react` | 36.1.0, MIT | 16–19 | 834 KB | Eigenes Theming-System, fortgeschrittene Funktionen nur unter Enterprise-Lizenz. Kollidiert mit DB UX. Raus. |
| `@glideapps/glide-data-grid` | 6.0.3, MIT | max **18** | 3,7 MB | Canvas-Renderer → kein DB-CSS, keine DOM-A11y; zusätzlich `lodash`/`marked`/`react-responsive-carousel`. Raus. |
| `material-react-table` | 3.2.1, MIT | >=18 | 2,1 MB | Zieht MUI + Emotion. Zweites Designsystem. Raus. |
| `mantine-react-table` | 1.3.4, MIT | >=18 | 1,9 MB | Zieht Mantine + Emotion + Tabler-Icons. Raus. |

**Bewertung von TanStack Table für genau diesen Anwendungsfall:** es ersetzt im Wesentlichen
die Sortier- und Spaltenlogik (`Rows.ts` 275 Z. + `Column.ts` 49 Z.). **Nicht** abgedeckt
bleiben die drei Teile, die den Aufwand ausmachen: Inline-Editing, Soft-Delete/Undo und die
Breakpoint-Spaltenumschaltung (`customtable-toggle-*`) — und vor allem **nicht** die
`autoSave`-Kopplung (`el.instance`, `Row`, `TableChanges`, `RowState`), die der eigentliche
Risikoblock ist. Wer TanStack einführt, schreibt das Datenmodell ohnehin neu, macht also
M-b — nur mit zusätzlicher Abhängigkeit.

### Entscheidung (2026-09-12): **M-a Portierung**

Web-Recherche + `db-ux`-MCP-Verifikation bestätigen den Stand vom 2026-09-08 unveraendert:
TanStack Table v9 ist zwar jetzt final (GA), deckt aber weiterhin nicht den eigentlichen
Risikoblock ab (`autoSave`-Kopplung, Inline-Edit, Soft-Delete/Undo, Breakpoint-Umschaltung) —
kein neuer Befund, der M-b/M-c attraktiver macht. Bei nur 6 Instanziierungsstellen (statt der
angenommenen 12) ist zudem auch der Umfang von M-b kleiner als urspruenglich befuerchtet; das
aendert aber nichts am Kernrisiko: `savePipeline`/`overlapGuard`/`changeTracking` haengen exakt
an `Row`/`TableChanges`/`RowState`, nicht an *wie viele* Tabellen sie bedienen.

→ **M-a.** `Row`/`Rows`/`Column` bleiben unveraendert (reine Datenklassen, kein DOM); nur
`customTableRender.ts` (333 Z.) wird durch React-Komponenten ersetzt, die auf `DBTable`/
`DBTableRow`/`DBTableDataCell` aufsetzen. Der `el.instance`-Vertrag bleibt ueber einen
Ref-Adapter erhalten (die React-Tabellenkomponente haengt sich selbst als `.instance` an ihr
Root-Element, exakt wie `CustomTable` es heute tut) — `autoSave` in all seinen drei Dateien
bleibt komplett unangetastet.

### M0/M1 abgeschlossen (2026-09-12) — Kernerkenntnis: keine inkrementelle Slice-Reihenfolge moeglich

Die im Plan vorgesehene Slice-Reihenfolge (M1 EA, M2 Neben, M3 EWT, ...) ging von *pro Tabelle
unabhaengig umstellbaren* Instanzen aus. Das stimmt fuer M-a nicht: `CustomTable.ts` ist EINE
gemeinsame Klasse fuer alle 6 Instanzen. Sobald ihr `draw()`/`drawHeader()`/`drawFooter()`/
`drawRows()` auf React umgestellt ist, gilt das sofort fuer **alle 6 Tabellen gleichzeitig** —
es gibt keinen Mechanismus, nur `tableEA` auf den neuen Renderer zu heben und die anderen 5 beim
alten zu belassen, ausser mit einem Feature-Flag (unnoetige Komplexitaet fuer einen Uebergang,
der ohnehin komplett vollzogen werden soll). Die Slice-Nummern M1–M5 sind damit hinfaellig; M0
und M1 sind faktisch ein einziger Schritt geworden, der alle 6 Instanzen auf einmal umstellt.

**Umsetzung:** `customTableRender.ts` (333 Z., geloescht) → `CustomTableView.tsx`
(`infrastructure/table/`, React-Komponente). `CustomTable.ts`s vier `draw*()`-Methoden rufen
jetzt einheitlich eine private `render()`, die `mount(this.$el, <CustomTableView table={this} />)`
aufruft (`mount()` aus `reactRoot.ts`, per `flushSync` synchron — exakt der bisherige
Render-Vertrag: Aufrufer sehen direkt danach das aktualisierte DOM). `Row.ts`/`Rows.ts`/
`Column.ts` **komplett unveraendert** (kein DOM, riefen schon vorher nur `drawRows()`/
`_notifyChange()` auf `this.CustomTable`). `el.instance`-Vertrag unangetastet: `$el` ist die
`<table>` selbst, React mountet direkt hinein (kein Wrapper-Div, analog L1–L3), `.instance`
bleibt eine normale Property auf dem Element, die React nie anfasst.

**Drei echte Korrekturen unterwegs gefunden** (nicht im Plan vorgesehen):
- `tr.data = row` ist entgegen der ersten Annahme **kein rein renderinternes Bookkeeping**:
  `attachBerechnenToggleListeners.ts` (EWT, `afterDrawRows`-Hook) liest
  `checkbox.closest('tr')?.data`, um die zugehoerige `Row`-Instanz zu finden. Per `ref`-Callback
  in `CustomTableView.tsx` nachgebildet.
- Der mobile Zeilen-Klick-Handler (`showRow` unterhalb des Breakpoints) muss `event.view?.
  innerWidth` lesen, nicht das globale `window.innerWidth` — Unterschied wird in Tests mit
  synthetischen Events sichtbar (kein `view` gesetzt), Puppeteer/echter Browser haette den Bug
  verdeckt.
- `column.html`-Spalten (EWT: `Schicht`/`berechnen`) lieferten bisher rohe HTML-**Strings** fuer
  `dangerouslySetInnerHTML` — funktioniert technisch, ist aber kein sauberes React-Muster
  (insbesondere fuer die interaktive `berechnen`-Checkbox). Umgestellt auf Parser, die JSX direkt
  zurueckgeben (`EwtTab.tsx`s `schichtParser`/`berechnenParser`); der Spaltenvertrag selbst
  (`parser: (value) => string | number`) blieb unveraendert (eine versuchte Typ-Erweiterung auf
  `ReactNode` brach 4 unabhaengige Show/Edit-Modals, die denselben Parser fuer Read-only-Anzeigen
  wiederverwenden — stattdessen lokaler Cast an den beiden `html:true`-Stellen).
- Zeilen-Aktionsknoepfe (Edit/Delete/Undo) und Fusszeilen-Knoepfe (Hinzufuegen/Alle-loeschen/
  Custom) sind jetzt echte `<DBButton>` (User-Korrektur waehrend der Umsetzung) statt der
  Handmarkup-Bruecke `erzeugeDbButton`/`erzeugeDbButtonAusLook` (`infrastructure/ui/dbButton.ts`,
  auf den `DbButtonLook`-Typ eingedampft, den `customButton`-Optionen noch brauchen).

**Ehemals dokumentierte Nebenwirkung, per 2026-09-17 nicht mehr reproduzierbar:** hier stand,
dass ein Klick auf einen Zeilen-Aktionsknopf (Edit/Delete/Undo) `React: "flushSync was called
from inside a lifecycle method"` in der Dev-Konsole ausloest (Ursache damals: alle 6 Tabellen
instanziieren `createCustomTable()` innerhalb des `useEffect()` ihrer Tab-Komponente, `draw()`
ruft intern `mount()`/`flushSync`). Beim Versuch, das im Rahmen der AutoSave-Store-Migration
(siehe `tasks/todo.md` "AutoSave-Badge und Login-Button") als kleineren Zwischenschritt zu
fixen, per Puppeteer gegen `bun run dev:local` neu geprueft (Delete-Klick auf `EaTab`s
`tableEA` UND Edit-Klick, der `showModal()`s verschachteltes `mount()` ausloest): Browser-
Konsole blieb in beiden Faellen sauber, keine `flushSync`-Warnung. Vermutliche Ursache des
Verschwindens: `reactRoot.ts`s Re-Entranz-Guard (`imFlush`/`flushExtern()`, aus einer spaeteren
Phase-N-Aenderung, siehe `tasks/lessons.md`) deckt den Fall inzwischen ab. Kein Code-Fix mehr
noetig -- nur diese Doku war stale.

**Verifiziert:** volle Suite (2119 Tests, inkl. `CustomTable.test.ts` 748 Z. mit einer
Anpassung -- `event.view`-Fix -- und `CustomTable.xss.test.ts` mit einer Anpassung -- neuer
JSX-Vertrag statt HTML-String; `dbButton.test.ts` geloescht, testete nur die entfernte
Vanilla-Bruecke) `&& lint && lint:css && build` gruen. Puppeteer: `tableEA` (Sortierung,
Soft-Delete/Undo, Add/Edit/Delete) und `tableE`/EWT (Berechnen-Schalter, Schicht-Text mit
Zeilenumbruch, `tr.data`-Verknuepfung, Custom-Footer-Button) live gepflasterhaft geprueft, beide
Hell/Dunkel.

**Offen:** `tableN` (Neben), `tableBZ`/`tableBE` (Bereitschaft), `tableVE` (Einstellungen) sind
durch den gemeinsamen Klassen-Umbau technisch bereits auf React umgestellt und von der vollen
Testsuite mitabgedeckt. Nachtrag 2026-09-12: alle vier zusaetzlich per Puppeteer live geprueft
(`tableN`/Neben: 2 sortierte Zeilen inkl. Aktionsspalte; `tableBZ`+`tableBE`/Bereitschaft: je 1
Zeile, `datetimeParser`-Formatierung korrekt; `tableVE`/Einstellungen-Accordion `#collapseThree`:
4 Vorlagen-Zeilen, Breakpoint-Spaltenumschaltung sichtbar bei schmaler Ansicht, Custom-Button
„Standardeinstellungen" rendert). **Damit sind alle 6 Instanzen live bestaetigt**, nicht nur
ueber die Testsuite.

**M6 Cleanup** (noch offen): `CustomTable.ts`/`Row.ts`/`Rows.ts`/`Column.ts`/
`customTableTypes.ts` bleiben (weiterhin die Datenschicht); Doku-Kommentare
(`CLAUDE.md`, `.claude/skills/architektur/SKILL.md`) bereits in dieser Session aktualisiert.

## Phase N — `index.html` auf ein Minimum

**Scope-Korrektur (2026-09-13, vor Umsetzungsstart per Exploration verifiziert):** der Plantext
vom 2026-09-08 war an zwei Stellen ueberholt bzw. zu optimistisch:

- "Feature-`index.ts` (`window.load` → `CustomTable`-Init) → React-Mount" war zum
  Umsetzungszeitpunkt bereits erledigt (nicht Teil dieser Phase): Bereitschaft/EWT/Neben/EA
  laufen laengst ueber `featureLifecycleRegistry.registerFeature()` + `mount()`/`unmount()`
  (identisches Muster wie Admin). Kein `window.load` mehr im Code ausser dem generischen
  `core/bootstrap.ts:29`.
- `dbDialog.ts`/`featureLifecycleRegistry`/`syncFeatureTabs` "entfallen" war zu optimistisch:
  `dbDialog.ts` ist aktiv genutzt (`confirmDialog.ts`, `autoSave/errorHandling.ts`,
  `pdf/signaturDialog.ts`) und mit dem Shell-Umbau nicht verwandt.
  `featureLifecycleRegistry`/`syncFeatureTabs` steuern Ressourcen-Aktivierung
  (Login/Jahr-Wechsel/Save), ebenfalls orthogonal zur Shell. `tabController` bedient neben der
  Haupt-Tab-Gruppe zusaetzlich die Admin-Subnavigation. Alle drei bewusst NICHT Teil von Slice 1
  (siehe unten).

### Slice 1 — Shell-Konsolidierung (abgeschlossen 2026-09-13)

- [x] `src/ts/App.tsx` (neu): bildet die vormalige `index.html`-Body-Struktur 1:1 als JSX nach
      (identische `id`/`class`-Attribute) -- `tabController`, `autoSave`,
      `featureLifecycleRegistry`/`syncFeatureTabs` und der Admin-Sichtbarkeits-Toggle finden ihre
      Elemente weiterhin per `querySelector`, unabhaengig davon ob JSX oder statisches HTML sie
      erzeugt hat (bewaehrtes Phase-L-Muster, jetzt auf die ganze Shell ausgeweitet).
      `AppHeader`/`AppFooter`/`StartTab`/`BerechnungTab`/`EinstellungenTab` sind jetzt echte
      JSX-Kinder statt fuenf separater `mount()`-Aufrufe in eigene Sub-Roots (`#appHeaderRoot`/
      `#appFooterRoot`-Wrapper-Divs komplett entfallen, da nirgends sonst referenziert).
- [x] `main.ts` → `main.tsx`: der Root-Mount laeuft ueber `mount()` (`infrastructure/ui/
      reactRoot.ts`), NICHT ueber ein direktes `createRoot(#app).render(<App/>)` -- siehe
      Kern-Erkenntnis unten. `initTabController()` folgt weiterhin synchron danach.
- [x] `index.html`: Body auf `<noscript>` + `<div id="app">` reduziert, Script-Tag auf
      `main.tsx`.
- [x] Doku aktualisiert: `frontend/CLAUDE.md` (Architektur/Hybrid-Rendering-Abschnitte),
      `tasks/lessons.md`.

**Kern-Erkenntnis (per Puppeteer gefunden, nicht im Plan vorgesehen):** ein reines
`createRoot(#app).render(<App/>)` reicht NICHT aus, um die bestehende Ordering-Invariante aus
`main.ts:91-98` zu erhalten. Es committet das DOM zwar synchron, plant `useEffect`-Hooks (z. B.
`EinstellungenTab`s Tabellen-Erzeugung) aber nur asynchron ein -- der erste
`registerAppStartTask`-Callback (`Einstellungen/index.ts`) lief dadurch vor diesem Effekt und warf
`Tabelle nicht gefunden`. Die alten fuenf `mount()`-Aufrufe hatten dieses Problem nicht, weil
`mount()` per `flushSync` auch passive Effekte synchron abarbeitet. Fix: `main.tsx` mountet die
ganze App ueber denselben `mount()`-Helfer (`createElement(App)`), nicht ueber `createRoot()`
direkt -- ein einziger `flushSync`-Aufruf statt vormals fuenf, Ordering-Garantie identisch.

**Verifiziert:** `bunx tsc --noEmit`/`bun run lint`/`bun run lint:css` sauber (0 Fehler),
`bun test --isolate` 2119/2119 unveraendert, `bun run build` gruen. Puppeteer ohne Backend
(`VorgabenU`-Fixture aus `test/mockData.ts`): kompletter Boot-Log identisch zum Vor-Umbau-Stand
(`boot:berechnung` → `boot:einstellungen` → `cookie:check` → `Benutzer gefunden` → `sr:*` →
`boot:auth` → `boot:main-ui`, kein `pageerror`), Tab-Wechsel per Klick funktioniert
(`location.hash` + `.active`/`.show`-Klassen), Hash-Sync ueberlebt vollen Reload
(`/#Einstellungen` direkt geladen zeigt Einstellungen aktiv), `#start.active > .schwelle`-
Selektor weiterhin erfuellt, verschachtelte `mount()`-Aufrufe (Feature-Tab-Mount +
Tabellen-Modal, siehe Konsolen-Fehler-Fix vom selben Tag) unveraendert warnungsfrei.

### Slice 2 — `tabController`-Pane-Toggle (abgeschlossen 2026-09-13)

- [x] `tabController.ts`s `zeigeTab()`: das `.tab-pane`-Klassen-Toggle (`active`/`show`) der
      Hauptgruppe (`#tabContent`) entfaellt -- `App.tsx`s Panes berechnen ihre Klassen jetzt
      selbst aus `activeTabStore` (`useActiveTab()`, analog `AppHeader.tsx` seit K6). Admins
      Unternavigation bleibt unveraendert am alten, DOM-schreibenden Mechanismus (eigene
      Tab-Gruppe, `istHauptgruppe()` greift dort nicht).
- [x] **Risiko geloest:** `berechnungMonatsFenster.ts`s `tab:shown`-Handler misst `#Berechnung`s
      `clientWidth` und braucht das Pane synchron sichtbar VOR dem Event-Dispatch. Fix:
      `reactRoot.ts` bekommt `flushExtern()` (generalisiert aus `mount()`s bestehendem
      `flushSync`+Re-Entranz-Guard) -- `setAktivenTab()` laeuft in `zeigeTab()` jetzt dadurch,
      React committet die Pane-Sichtbarkeit synchron, bevor `tab:shown` gefeuert wird. Per
      Puppeteer verifiziert: Pane hat `display:block`/`active`/`show` direkt nach `.click()`,
      noch OHNE await/Tick.
- [x] `aktiverTab()` (exportierter Helfer) liest seither `activeTabStore` statt DOM
      (`#tabContent > .tab-pane.active` existiert als geschriebene Klasse dort nicht mehr).
- [x] `test/ui.tabController.test.ts` angepasst: die zwei DOM-Klassen-Assertions fuer
      Hauptgruppen-Panes entfernt (kein React-Baum in diesem Unit-Test, das ist jetzt
      `App.tsx`s Verantwortung) -- Hash-/Store-Assertions unveraendert gruen.

**Nicht angefasst (weiterhin bewusst ausserhalb der Shell):**

- `dbDialog.ts` -- aktiv genutztes, eigenstaendiges System, kein Bezug zur Shell.
- `featureLifecycleRegistry`/`syncFeatureTabs` -- Ressourcen-Aktivierungs-Mounting, unangetastet.
- PWA/Versions-Check/Offline-Banner aus `main.tsx` in einen `useAppBootstrap()`-Hook extrahieren
  (rein kosmetisch, kein funktionaler Gewinn fuer "index.html minimal" -- bewusst nicht gemacht).

**Bei der Verifikation gefundene, nicht Slice-2-bedingte Beobachtung:** in einer
Backend-losen Puppeteer-Session (kein echter Login) bleibt `#berechnung-tab` unsichtbar
(`navigationVisibleStore` vor Login false) und `berechnungMonatsFenster.ts`s Label/Spaltenzahl
populieren sich in diesem Testaufbau nicht. Per `git stash`-A/B-Vergleich gegen den Vor-Slice-2-
Stand bestaetigt: identisches Verhalten, keine Regression -- ausserhalb des Slice-2-Scopes, nicht
behoben.

---

## Verifikation (jeder Slice-PR)

```bash
cd frontend
bun run typecheck          # tsc --noEmit, strict, kein any
bun run lint               # ESLint inkl. @db-ux/core-eslint-plugin, react-hooks
bun run lint:css           # Stylelint-Ratsche (--max-warnings 93 darf nicht steigen)
bun run test               # Bun + happy-dom, --isolate  (NICHT `bun test`)
bun run build              # Vite 8 / Rolldown
```

- **MCP `db-ux__verify_migrated_code`** nach jedem generierten Slice; bei Fehlern fixen,
  max. 3 Runden.
- **`verify`-Skill** (Puppeteer + `google-chrome-stable`, Port 8080, localStorage-Seed
  inkl. `Version`): Klickpfad der berührten Screens — Buttons klickbar und `disabled`
  korrekt, Checkbox-/Radio-Toggle hält (kein React-19-„Hänger"), Tag-Anzeige,
  Textarea-Validierung, Fokusreihenfolge, Tastatur (`Enter`/`Space`).
- **Manuell:** Dark/Light (beide `data-mode` **und** OS-Automatik), Mobile-Viewport < 768 px,
  Deep-Link `#EWT`, „neues Design" eckig (`--db-border-radius-* = 0`) unverändert.
- **Grep-Gate am Ende von J9:** `rg 'className="db-button"' src/ts` und
  `rg '<input type="checkbox"' src/ts` → nur noch dokumentierte Rest-Fälle
  (`src/index.html` bis Phase K/L ausgenommen).
- **Testlücken schließen:** `AdminProfileTemplateContentEditor` hat keinen Render-Test →
  in J1 `test/features/Admin/AdminProfileTemplateContentEditor.test.tsx` anlegen
  (Section-Toggle, Checkbox-Callbacks, `disabled` bei `isSaving`). Ebenso ungetestet und in
  J2 mit je einem schmalen Render-Test zu versehen: `FeldZeile`, `TabellenBlock`,
  `feldPanelGemeinsam`, `SchriftartDialog`.

## Kritische Dateien

- `src/ts/components/DbFeld.tsx` — J8, Kern der Feld-Umstellung
- `src/ts/components/MyButton.tsx` + `components/index.ts` — J6b, Auflösung
- `src/ts/components/{MyModalHeader,MyEditorFooter,MyShowFooter,MyHelpModal}.tsx` — rohes `db-button`-Markup (J7)
- `src/ts/components/dbFeldHelfer.ts` — `useSofortigeId`, `refZusammenfuehren` (wiederverwenden)
- `src/scss/{utilities,raster,styles}.scss` — J0, foundations-Abgleich
- `src/ts/infrastructure/ui/buttonDisable.ts` — Selektor gegen `DBButton` (J6)
- `src/ts/features/Admin/components/AdminProfileTemplateContentEditor.tsx` — Referenz (J1)
- `src/ts/features/Admin/components/FormularEditor/*` — größter Cluster (J2)
- `src/index.html` — Phase K/L
- `src/ts/main.ts` · `infrastructure/ui/{tabController,activeTabStore,dbDialog}.ts` — Phase K/N (`navDrawer.ts` seit K5 gelöscht)
- `src/ts/features/Einstellungen/{index.ts,utils/generateEingabeMaskeEinstellungen.ts}` — Phase L3
- `src/ts/infrastructure/table/*` + `infrastructure/autoSave/{savePipeline,overlapGuard}.ts` — Phase M
- `tasks/plan-db-ux-migration.md`, `tasks/todo.md`, `CHANGELOG.md` — Phasen-Doku
