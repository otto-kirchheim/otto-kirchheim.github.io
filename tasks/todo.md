# Aktueller Plan: Lint-Warnungen abbauen (I.9 + stylelint-Ratsche) - 2026-09-09

## Ausgangslage

User-Auftrag: alle offenen Warnungen fixen, `eslint-disable` nur im Ausnahmefall.
Stand: `lint` 0 Fehler / 21 Warnungen, `lint:css` 0 Fehler / 90 Warnungen.

Antworten aus der Rueckfrage: Umfang = ESLint (21) + stylelint (90); Verifikation =
typecheck + test + Review (kein Browser-Verify); Zielkonflikte = Ref-Pattern/Umbau statt disable.

## Analyse (2026-09-09)

### ESLint 21 -- zwei Klassen

1. `react-hooks/set-state-in-effect` (~14x) + gepaarte `react-hooks/exhaustive-deps` (~7x) in
   ~13 Admin-/Bereitschaft-Komponenten. Keiner der Loader (`load`/`reload`/`reloadUsers`/
   `loadPageWith`) ist `useCallback`; die Effekte rufen sie synchron -> `setLoading(true)` im
   synchronen Effektpfad. Sauberer Fix je Komponente: Loader in `useCallback`, Fetch im Effekt
   als async-IIFE (setState nur nach `await`), `loading` initial `true` fuer den Mount,
   Refetch = stale-while-revalidate (kein Spinner mehr beim Filterwechsel). Das ist eine
   Verhaltensaenderung pro Komponente und beruehrt jede Admin-Datenansicht.
2. Reine "State beim Prop-Wechsel zuruecksetzen"-Faelle (`adminDashboardCharts` `setEventsPage(0)`
   auf `[heap]`, `PdfCanvas` `setAngezeigt(seiteIndex)` auf `[seiteIndex]`,
   `AdminUserList` `setSelectedIds(new Set())` auf Filterwechsel): React-idiomatisch via
   prev-value-Ref + Anpassung in der Render-Phase. Klein, testbar.

### stylelint 90 -- grosser Anteil dokumentierte False Positives

`tasks/lessons.md` Z. 53 haelt fest: die `db-ux/*`-Regeln laufen bewusst als Ratsche
(severity warning + `--max-warnings`), NICHT als Fix-Auftrag, weil das Plugin
`gap: $wert` / `gap: var(--token)` / `calc(...)` nicht als Token erkennt.
Betroffen davon hier u.a.: `raster.scss` `var(--raster-abstand,0)`, `utilities.scss` `$wert`
(SCSS-Mixin-Parameter), `styles.scss` `calc(...)`/`min(...)`, `1px`-Haarlinien (kein
`db-sizing`-Token fuer 1px), `border-radius: 50%` (Kreis -- Formensprache ist sonst eckig).
Echte, mechanisch ersetzbare Faelle: die festen `0.25/0.35/0.5/0.75rem`- und `8px`-Spacings.
Ersatz durch `db-spacing-fixed-*` aendert die Optik (Werte liegen zwischen den Token-Stufen)
-> visuelle Regressionsgefahr ohne Browser-Verify.

## Befund nach erstem Versuch (2026-09-09) -- Sackgasse

`adminDashboardCharts` (`setEventsPage(0)` auf `[heap]`) auf das offizielle React-Muster
"State in der Render-Phase via prev-Ref anpassen" umgestellt -> `set-state-in-effect` weg,
dafuer **zwei** neue `react-hooks/refs`-Warnungen ("Cannot access refs during render").
Die Projekt-Config (`eslint-plugin-react-hooks@7`, Compiler-Regeln inkl. `refs`) ist strenger
als die React-Doku und lehnt **beide** Muster ab. Aenderung wieder verworfen.

Konsequenz: warnungsfrei geht nur ueber Architektur:
- Derived-State-Resets: `key`-Prop am Elternteil setzen (aendert die Elternkomponenten).
- Fetch/Loading: raus aus `useEffect` -- Suspense + `use()` oder eine Data-Fetching-Schicht
  (React Query o.ae., aktuell nicht im Projekt).

Beides ist ein groesserer Umbau mit Regressionsrisiko in jeder Admin-Ansicht, ohne
Browser-Verifikation nicht verantwortbar. Deckt sich mit der Team-Entscheidung (I.9-Zurueckstellung)
und der `lessons.md`-Ratschen-Philosophie.

## Empfehlung -- mit User zu klaeren

1. ESLint 21: als dokumentierte Ausnahme unter der (nicht-brechenden) Warnschwelle lassen,
   ODER gezielter Architektur-Umbau je Komponente MIT Browser-Verify (`verify`-Skill), 1-2
   Komponenten pro Sitzung.
2. stylelint 90: Ratsche ist projektgewollt. Falls doch Abbau -> nur die exakt token-gleichen
   Spacings, Rest (var()/$wert/calc()/1px/50%) bleibt per Definition.
3. Kein pauschales `eslint-disable` -- brächte nichts ausser Rauschen.

---

# Aktueller Plan: Formular-Vorlagen-Cache im Hintergrund vorwaermen - 2026-09-09

## Ausgangslage

`formularVersionCache` (+ `vorlagenPdfCache`) in `infrastructure/pdf/formularCache.ts` fuellt sich
heute nur *nach* dem ersten erfolgreichen PDF-Export (`loeseVersionAuf`/`holeVorlageAlsDatei` in
`ladeFormular.ts`). Luecke: Export online gestartet, Verbindung faellt weg, erster Export des
Monats -> Cache-Miss -> Abbruch. Ziel: die zum gewaehlten Monat gueltige ("neueste") Version +
zugehoerige Vorlagen-PDF proaktiv, komplett im Hintergrund und nicht blockierend cachen.
Backend hat keinen "newest"-Endpunkt fuer Member (`GET /formulare/:f` verlangt `stichtag`,
`liste` ist TEAM_ADMIN) -> Prefetch immer pro konkretem Stichtag = 1. des gewaehlten Monats.

## Aufgaben

Status 2026-09-09: umgesetzt. Hinweis 5: Datei liegt als `test/pdf.warmeFormularCaches.test.ts`;
Offline-Skip von `warmeVorlagenCache` selbst nicht per Test abgedeckt (bräuchte FetchRetry-Mock),
die `navigator.onLine`-Guard ist eine Zeile und per Lesen geprüft.

- [x] **1 `ladeFormular.ts`:** optionaler `still`-Schalter an `loeseVersionAuf` +
      `holeVorlageAlsDatei` (unterdrueckt `zeigeOfflineHinweis()` fuer den Warmlauf).
      Neu exportiert: `warmeVorlagenCache(formular, stichtag)` -- nur online
      (`navigator.onLine !== false`), loest die Version frisch auf (ueberschreibt die
      gecachte -> haelt "neueste" aktuell), zieht die Vorlagen-PDF nur wenn noch nicht in
      `vorlagenPdfCache`, schluckt jeden Fehler.
- [x] **2 Neu `infrastructure/pdf/warmeFormularCaches.ts`:** `aktivierteTabs` -> FormularCode
      (`bereitschaft`,`ewt`,`neben`->`ez`,`ea`), Stichtag `dayjs([jahr, monat-1, 1])`,
      sequentiell mit `requestIdleCallback`-Planung (Fallback `setTimeout`), voll detached.
- [x] **3 Hook in `loadUserDaten.ts`** nach `syncFeatureTabs(...)`:
      `void warmeFormularCaches(vorgabenU.Einstellungen?.aktivierteTabs, monat, jahr)` --
      laeuft bei Login und jedem Jahr-/Monatswechsel.
- [x] **4 `vite.config.ts` workbox:** eigener Runtime-Cache `formular-vorlagen-cache` fuer
      `/api/v2/(formulare|vorlagen)/` (NetworkFirst, 30 Tage, eigene `maxEntries`), VOR der
      generischen `/api/v2/`-Regel -- sonst verdraengen die Binaer-PDFs die 50 Eintraege der
      `api-cache` und verfallen nach 1 h.
- [x] **5 Tests** `test/warmeFormularCaches.test.ts`: Mapping, Skip-wenn-gecacht,
      wirft-nie, Offline-Skip.
- [x] **6 Doku:** `frontend/CHANGELOG.md`, ggf. `tasks/lessons.md`, `graphify update .`.

### Verifikation

- `bun run typecheck && bun run lint && bun run lint:css && bun run test && bun run build`
- `dist/sw.js` enthaelt `formular-vorlagen-cache` und den `(formulare|vorlagen)`-Pattern
- Kein zusaetzlicher `await` im `loadUserDaten`-Pfad (Warmlauf blockiert nichts) -- per Lesen
  der Aufrufstelle geprueft.

---

# Aktueller Plan: DB-UX-Migration -- Phase I (Cleanup, Token-Finalisierung, Doku) - 2026-09-08

## Ausgangslage

Gesamtplan `tasks/plan-db-ux-migration.md`, Phase I. Phase H ist abgeschlossen und gepusht
(`feat/db-ux` @ 5a8b4dd). Baseline heute verifiziert: `typecheck` 0, `lint` 0 Fehler /
28 Alt-Warnungen, `lint:css` 0 Fehler / 93 Warnungen, `test` 2084 pass / 0 fail / 2 skip
(1 sporadischer Flake im Erstlauf, im Rerun gruen), `build` gruen (Precache 59 / 4,5 MB).

Design-Grundlage neu abgeglichen mit dem DB-Marketingportal ("neues Design"):
Prinzipien, Markenfarben, Logo, Layout, Icons, Schwelle -- Kernwerte in der Referenz-Memory
`db-brand-farben-neues-design`. Wichtigste harte Regel fuer Phase I: **DB Red (`#EC0016`)
nie als Hintergrundflaeche** -> PWA-`theme_color` wird Weiss/Cold Black, nicht rot.
`#EC0016` deckt sich mit `@db-ux/db-theme` 6.2 `--db-brand-origin-base` und ist der
Barrierefreiheits-Rotton fuer UI.

## Aufgaben

- [x] **I.1 btn-Residuen sauber ziehen.** `customButton`-API nimmt jetzt `look?: DbButtonLook`
      (DB-Semantik) statt `classes: string[]`. Neu: `erzeugeDbButtonAusLook` in `dbButton.ts`;
      `erzeugeDbButton(string[])` bleibt als duenner Wrapper fuer die `customTableRender`-Defaults
      (Add/Delete/Undo). Call-Sites `EwtTab.tsx` + `generateEingabeTabelleEinstellungenVorgabenB.ts`
      auf `look: { variant: 'filled' }`; `CustomTable.test.ts` mitgezogen. tsc/lint/betroffene
      Tests gruen.
- [x] **I.2 Layer-Modell.** ENTSCHEIDUNG (User delegiert): `customtable.css` bleibt bewusst
      unlayered -- Verschieben nach `@layer app` wuerde seine `!important`-Regeln hinter
      `@layer db-ux` fallen lassen (bei `!important` kehrt sich die Layer-Rangfolge um) und
      der unlayered `styles.scss`-Hover wuerde die Fehlerzeilen-Warnfarbe ueberschreiben.
      Das 3-Stufen-Modell (`db-ux` < `app` < unlayered) ist jetzt in `layers.scss`
      ausfuehrlich als bewusste Entscheidung dokumentiert. Kein Code-Umbau.
- [x] **I.3 Marken-Logos aus dem Build halten.** PostCSS-Plugin `dropDbSubBrandLogos` in
      `vite.base-config.ts` (`css.postcss.plugins`) entfernt alle `[data-logo=db-*]`-Regeln,
      bevor Vite die `url()` aufloest. Ergebnis: `dist/assets/logo-*.svg` 13 -> 0
      (Default-Logo wird jetzt als data-URI inlined), Precache 59 -> 47 Eintraege,
      4526 -> 4436 KiB. `light-dark(` weiter 870 (esbuild-Minifier intakt). Build gruen.
- [ ] **I.4 Ungenutzte Icon-/Font-Gewichte.** Precache-globIgnores stehen schon (italic,
      black, digital, head, db-*.woff2). Gegenpruefen welche woff2 real im Build sind und ob
      weitere Schnitte raus koennen; Build-seitig (nicht nur Precache) ungenutzte Schnitte
      ausschliessen wenn moeglich.
- [x] **I.5 PWA-Farben.** `vite.config.ts` `theme_color` + `background_color` = `#ffffff`.
      `src/index.html`: eine `<meta name="theme-color">` -> zwei mediengescopte
      (`light` = `#ffffff`, `dark` = `#16181b`, der Cold-Black-Ton des DB-Themes). DB erlaubt
      kein rotes Fill -> Browserleiste folgt dem App-Grund. Manifest im Build verifiziert.
- [ ] **I.6 Bundle-Budget** gegen die Spike-Zahlen (React-Runtime ~60 KB gz, DB-UX-CSS
      ~84 KB gz) im Bundle-Report/CHANGELOG festhalten; `globPatterns` final pruefen.
- [x] **I.7 data-density / data-color final.** User-Freigabe: `functional`, kein globales
      `data-color`. `src/index.html` `<html data-density="regular">` -> `"functional"`.
      (Global `data-color="red"` haette die ganze Flaeche/Text rot gefaerbt -> DB-Regelbruch;
      Rot bleibt Akzent ueber `--db-brand-*`.) Kein Test asserted `regular`.
- [ ] **I.8 Dark-Mode-QA end-to-end.** Alle Tabs + je ein Modal, Hell/Dunkel/Auto, Mobile,
      Deep-Link. `verify`-Skill + manuelle Sichtpruefung.
- [ ] **I.9 ESLint-Config aufraeumen + 28 Warnungen.** React-19-`react-hooks/refs`-Hinweise
      (Preact-Muster: `ref.current = x` im Render) in den Admin-/Einstellungen-Komponenten
      sauber auf `useEffect`/`useLatestRef` ziehen. `@db-ux/core-eslint-plugin` /
      `@db-ux/core-stylelint` optional pruefen.
- [ ] **I.10 `@db-ux/agent-cli`** final neu ausfuehren, `.github/copilot-instructions.md`
      committen (Token liegt evtl. ohne `workflows`-Permission -> nicht an `.github/workflows/`
      pushen, aber `copilot-instructions.md` ist ok).
- [ ] **I.11 Doku (Done-Kriterium).** `frontend/CLAUDE.md`, `.claude/skills/architektur`,
      `.claude/skills/verify`, `.claude/skills/bootstrap` (entfernen/umschreiben), Root
      `../CLAUDE.md` + `../WORKSPACE.md` + `frontend/.claude/README.md`,
      `frontend/CHANGELOG.md` (69), `graphify update .`.
- [x] **I.12 Gitlink-Bump Frontend im Parent -- verifiziert, in Sync.** Parent-HEAD-Gitlink
      fuer `frontend` = `5a8b4dd` = aktueller `frontend`-HEAD. (`b2903e2` aus der Uebergabe
      existiert in diesem Repo nicht -- vermutlich Tippfehler; der Fakt "Gitlink zeigt aufs
      richtige Commit" stimmt.) Nach dem naechsten Frontend-Commit erneut noetig.
- [x] **I.10 `@db-ux/agent-cli` + `.github/copilot-instructions.md`.** `@db-ux/agent-cli@^5.3.0`
      als devDependency (bunx erzeugt ephemere `/tmp/bunx-...`-Pfade in der Ausgabe -> nicht
      committbar). `.amazonq/rules` bewusst NICHT erzeugt (Projekt nutzt GitHub Copilot, nicht
      Amazon Q; agent-cli erzeugt sonst beides). `.github/copilot-instructions.md` (222 Z.,
      stabile `node_modules/@db-ux/...`-Pfade) neu generiert -- committbar.
- [x] **I.13 Nav-Elemente vereinheitlicht (User-Fund).** Einstellungen + Admin von
      `<button role="tab">` auf `<a role="tab" href="#Einstellungen|#Admin" data-tab-target>`
      (Icon-/Text-Spans unveraendert) -> alle Haupttabs sind jetzt gleichartige, per
      Rechts-/Mittelklick deeplinkbare Links. Browser-verifiziert: Klick setzt Hash + aktiviert
      Panel, `tagName === 'A'`. Verbleibende Buttons sind alle begruendet: `#bd-theme`
      (Popup-Trigger) und die Admin-Unternavigation (`<button role="tab">` fuer Nicht-URL-
      Sub-Tabs = korrektes ARIA-APG-Muster) -- die `styles.scss`-Regel
      `.db-navigation-item > button:not(.db-navigation-item-expand-button)` bleibt fuer die
      Admin-Unternavigation noetig.
- [ ] **I.14 CLAUDE.md-Drift.** `frontend/CLAUDE.md` "Starten" nennt `bun run start` /
      `bun run preview` (Port 8082) -- Scripts heissen `dev` / `dev:local`, `preview` schreibt
      nach `../public/public`. Bei I.11 mitziehen.

## I.15 Sichtkorrekturen (laufende visuelle QA mit dem User, 2026-09-08)

- [x] **I.15a Tabellen-Fussknoepfe ohne Abstand.** `customTableRender.renderFooter` gab dem
      `divFooter` nur `justify-content-sm-evenly` -- das Element war aber `display:block`,
      also griff weder `justify-content` noch `gap`. Jetzt
      `d-flex flex-wrap gap-2 justify-content-center justify-content-sm-evenly`.
- [x] **I.15b Text-Markierung beim Ziehen** im `VorgabenBWeekRangeEditor` (Wochen-Chips):
      `userSelect: 'none'` am `.d-grid`-Container.
- [x] **I.15c EWT-Anzeige-Modal `ab/an` bzw. `von/bis`** klebten am Abschnittstitel und
      standen nicht auf einer Linie mit den Zeitwerten. `createTitle` + getrennte
      `createShowElement`-Paare -> ein `createZeitBlock` je Abschnitt; Pfeilzeile, Kuerzel und
      Zeitwerte teilen jetzt EIN CSS-Grid (`.ewt-zeit`, feste Aussenspalten `4.5rem 1fr 4.5rem`)
      -> Ab-Pfeil / `ab`|`von` / linker Zeitwert stehen senkrecht uebereinander, ebenso rechts.
      Alte `.icon-ewt*`-Regeln entfernt. Browser-verifiziert (Mobil-Viewport, Anzeige-Modal).
- [x] **I.15d Fehlende Abschlusslinie / Zeilentrenner der Tabellen.** Ursache: `utilities.scss`
      erzwingt `.db-table > table { display: table }` (statt DBs Grid), DBs Default aber ist
      `border-collapse: separate` -- und bei `separate` rendern `border`-Regeln an `<tr>` NICHT.
      Damit waren DBs `:is(tfoot,tbody) tr { border-block-end }` komplett wirkungslos (keine
      Zeilentrenner, keine untere Linie). `customtable.css`: `table.customtable {
      border-collapse: collapse; }` -> DBs Rahmenregeln greifen wie vorgesehen.
      Browser-verifiziert Hell + Dunkel (EWT-Tabelle mit 4 Zeilen): Zeilentrenner + untere
      Abschlusslinie da, keine doppelten Rahmen.
- [x] **I.15e Button-Farben vereinheitlicht** (User-Freigabe: Schema OK). Konvention:
      Primaer/Bestaetigen = `brand`, destruktiv = `outlined`+`critical` (weniger Gewicht),
      neutral/schliessen/abbrechen = `filled`, Zeilen-Aktionen = `outlined`.
      - `customTableRender.renderFooter`: "Alle Zeilen loeschen" `filled`+`critical` ->
        `outlined`+`critical`; "Neue Zeile" bleibt `brand`.
      - `MyShowFooter`: "Loeschen" `filled`+`critical` -> `outlined`+`critical` (Test mit).
      - Zeilen-Edit/Delete/Undo waren schon `outlined` (neutral/critical/warning) -- ok.
      - `MyEditorFooter` (Submit `brand` / Abbrechen `filled`) -- schon konform.
- [x] **I.15f Waagerechter Scrollbalken ab 1024px (User-Fund).** Ab `64em` laeuft die
      Navigation waagerecht; der Design-Auswahl-Flyout (`#bd-theme-menu`, 280px,
      `position: absolute`, `visibility: hidden`) war an der linken Kante verankert -> klappte
      nach rechts auf und ragte auch unsichtbar ueber den Viewport -> `scrollWidth` > Breite.
      Fix: im `@media (min-width: 64em)`-Block `#bd-theme-menu { inset-inline: auto 0; }` ->
      rechtsbuendig, oeffnet nach links/unten. Browser-verifiziert 1024-1600px: kein Overflow.
- [x] **I.15g "Alle Zeilen loeschen" bei leerer Tabelle** wurde nicht mehr ausgeblendet:
      der Empty-State suchte `tfoot .btn-danger` -- die Klasse gibt es seit Phase F nicht mehr
      (DB-Button traegt `data-variant`). Marker-Klasse `customtable-delete-all` am Knopf,
      Selektor angepasst. (Latent seit Phase F, vom User-QA aufgedeckt.)
- [x] **I.15h "Start" als eigener Nav-Eintrag entfernt (User-Fund).** Die Wortmarke
      (`.db-brand` / `#brand-start-tab`, `data-tab-target="start"`) IST der Start-Schalter --
      der Listeneintrag war redundant. `#berechnung-tab` (erster immer sichtbarer Eintrag)
      bekommt `tabindex="0"` fuer den initialen Tastaturfokus der Tabliste; Onboarding-Schluss
      `springeZu('#start-tab')` -> `'#brand-start-tab'`. Browser-verifiziert: Marke -> `#start`
      aktiv, kein Overflow.
- [x] **I.15i Formensprache "von rund zu eckig" (User-Fund, DB "neues Design").** Alle
      `--db-border-radius-*`-Tokens am `:root` (`styles.scss`, unlayered) auf `0` --
      Karten, Knoepfe, Felder, Tags, Akkordeon, Drawer, Notifications usw. haben jetzt
      90-Grad-Ecken. `--db-border-radius-full` bleibt fuer inhaerent runde Elemente (Radio,
      Switch, Passwort-Staerke-Balken). Deckt sich mit deutschebahn.com. Browser-verifiziert.
- [x] **I.15j DB-Schwelle -- offizielle Geometrie + Farbe.** User hat die offiziellen Assets
      (`src/icons/DB_Schwelle*/Screen/…`, SVG+PNG, alle Farbvarianten) ins Repo gelegt.
      `--schwelle-motiv` = Inline-SVG mit der **exakten S-Varianten-Geometrie** (viewBox
      1304x240, 11 Balken, Raster 120, Breite 24 -> 104) als Maske; `background-color:
      #ff002b` (Dynamic Red, exakter Asset-Farbwert). `.schwelle` in `styles.scss`, Hoehe
      `--db-sizing-regular-md` / ab 48em `-lg`. Platzierung: waagerecht an der Oberkante des
      `#start`-Panels, `mask ... right center / 66% 100%` -> rechtsbuendig ~2/3, dicke Balken
      in der oberen rechten Ecke, diagonal gegenueber der Wortmarke, 1x pro Viewport.
      Browser-verifiziert Hell (rot auf weiss) + Dunkel (rot auf Cold Black -- DB-konforme
      Sekundaervariante). Nicht ins Bundle gezogen (Maske ist Inline-Data-URI).

      **Optional, falls gewuenscht:** DB zeigt die horizontale Variante meist an der
      UNTERkante (Balken in die untere rechte Ecke); Oberkante ist hier eine Web-Adaption
      (Kopfzeile = oberer Rahmen). Alternativ: subtile Hintergrund-Variante (Grau-Balken
      vollflaechig, Text ueberlagert) -- nie mit der prominenten kombinieren.

## Verifikation

- `bun run release:check` gruen (`typecheck` 0 / `lint` 0 Fehler / `lint:css` 0 Fehler /
  `test` >= 2084 pass / `build` gruen).
- `dist/assets/logo-*.svg` = 1 statt 13; Precache-Groesse gesunken; im CHANGELOG belegt.
- `grep -c 'light-dark(' dist/assets/*.css` weiterhin > 800 (esbuild-Minifier, Phase-B-Falle).
- `verify`-Skill: Vollpfad Hell/Dunkel/Auto, Mobile, Deep-Link `#EWT`, 0 Konsolenfehler.
- PWA: `theme_color`/`background_color`/`<meta>` = DB-Werte; kein schwarzes Splash.

## Review (Zwischenstand 2026-09-08, Ende Session 2)

**Erledigt & verifiziert:** I.1, I.2, I.3, I.5, I.7, I.10, I.12, I.13, I.14, I.15a-j
(j = erste Version), I.15d. Doku (I.11) teilweise: `CHANGELOG.md` (69),
`frontend/CLAUDE.md` (Scripts/Styling), `.claude/skills/verify`, `graphify update .`.

Checkpoint: `typecheck` 0 · `lint` 0/28 · `lint:css` 0/92 · `test` 2084/0/2 · `build` gruen ·
`light-dark(` 870 · Precache 47 / 4438 KiB.

QA-Sweep Hell/Dunkel **Desktop + Mobile**: keine Regressionen aus eckig / functional /
Schwelle / Button-Farben / `border-collapse`. Konsolenfehler nur backend-bedingt.
Confirm-Dialog-"OK" bleibt bewusst `filled`+`critical` (Primaeraktion des Dialogs).

**Feinschliff / mit User:** I.15j (Schwelle: Wachstum/Position/Groesse, evtl. offizielles SVG).

**I.9 teilweise:** 28 -> 21 ESLint-Warnungen. Erledigt: 2 verwaiste `eslint-disable`
(`DbFeld`), `ArbeitszeiteingabePanel` (latest-ref jetzt im Effect), `OeLevelBoxes`
(`useRef` -> `useState`, React-Muster "State beim Prop-Wechsel anpassen"), `PdfCanvas`
(`liveAnzeige` einmal berechnet, scoped `eslint-disable` mit Begruendung -- pdf.js-Viewport
gehoert nicht in State). Tests: OeLevelBoxes 23/0, betroffene 77/0, Suite 2084/0.
**Rest (21):** ~13 "setState synchron im Effect", ~7 `exhaustive-deps` -- nuancierte
Faelle in komplexen Admin-Komponenten, seit Phase A bewusst zurueckgestellt; niedriger
Nutzen (Warnungen, kein CI-Fehler) vs. echtes Regressionsrisiko. Einzeln mit Testabdeckung
angehen oder bewusst als dokumentierte Ausnahme lassen.

**Session 3 (2026-09-08, Forts.):**
- **I.15j Schwelle final:** offizielle Standard-Geometrie (nicht S), am UNTEREN Rand des
  `#start`-Panels, buendig an der fixierten Fusszeile (kein Abstand), kein Scrollbalken auf
  keinem Tab. `#start.active`-Layout (nicht `#start` -- sonst schob das per `opacity`
  versteckte Panel die anderen Tabs weg). Farbvarianten: primaerer Einsatz, durchgaengig Rot.
- **DB-Neo-PDF-Schriften (User-Wunsch, neues Feature):** `db-sans`/`db-head` im Formular-
  Vorlagen-Editor waehlbar, `build.ts` bettet sie per fontkit/subset ein. `dbFonts.ts` (neu),
  `datenKatalog.SCHRIFTARTEN`, `SchriftartDialog`-Vorschau. `import.meta.glob` lazy +
  try/catch (Bun-Test-kompatibel). PDF/Admin-Tests 547/0.
- **I.15k Admin-Dashboard:** fehlender vertikaler Abstand zwischen der Karten-Reihe und der
  Memory-Karte (`mb-4` an der `.raster`-Reihe). Start-Schnellzugriff `abstand-2` -> `abstand-3`
  (gleicher Gitterabstand wie die Karten darueber).
- **I.15l Schriftart-Dialog** neu formatiert: 4 ausgerichtete Zeilen (Grid, feste
  Beschriftungsspalte) statt umbrechender Inline-Reihe (`.schriftwahl-raster`).
- **I.15m Leere Tabelle:** fehlende Oberkante (Kopf ist bei Leerstand ausgeblendet) --
  `tr.customtable-empty` bekommt `border-block-start` (customtable.css).
- **I.15n `MyCheckbox` haengende Schalter (React 19).** `MyCheckbox` war gesteuert, sobald
  ein `changeHandler` gesetzt war -- Aufrufer mit reinem Seiteneffekt-Handler (Feld
  ein-/ausblenden, ohne den Wert nachzufuehren) liessen den Schalter auf dem Ausgangswert
  haengen. Neu: explizites `defaultChecked` -> immer ungesteuert. Umgestellt: Bereitschafts-
  Zeitraum-Modal "Sonderschicht"/"Nachtschicht", EWT-Anzeige-Modal "Berechnen?". ("Spaetschicht"
  hat gar keinen Handler -> war nie betroffen; Admin-Checkboxen fuehren den Wert per `useState`
  nach -> korrekt gesteuert.)
- **I.15o AutoSave-Zustandspunkt auf `db-badge` umgestellt (User-Fund).** War ein
  zurechtgestutztes `db-tag` (beschriftete Chip-Komponente, hier als Icon-Punkt missbraucht,
  `!important`-Padding gegen die Mindestmasse). `@db-ux/core-components` hat dafuer die eigene
  Komponente **`db-badge`** -- mit `data-placement="corner-top-right"` (absolute Positionierung,
  ersetzt die Bootstrap-Klassen `position-absolute top-0 start-100 translate-middle`),
  `data-semantic` (Farbe) und `data-emphasis="strong"` (Vollfarbe). `.autosave-badge` hat jetzt
  nur noch `z-index` + `pointer-events: none`; alle Farb-/Groessen-/Padding-Regeln weg.
  `db-badge` ist bewusst rund (`--db-border-radius-full`) -- so sieht DB Badges/Status-Punkte
  vor, das ist KEIN Verstoss gegen "rund zu eckig" (das betrifft Container/Flaechen).
  Icon-Markup nach DB-`DBIcon`-Muster: `<span class="db-icon" data-icon="…">` OHNE eigene
  `db-font-size-*`-Klasse (Groesse steuert `db-badge`). `lint:css` 91 -> 90. Tests 2084/0.
- **I.9:** 28 -> 21 Warnungen (2 verwaiste Direktiven, ArbeitszeiteingabePanel, OeLevelBoxes,
  PdfCanvas). Rest = nuancierte setState-im-Effect/exhaustive-deps, seit Phase A zurueckgestellt.

## I.16 -- EWT-Anzeige-Modal + weitere QA-Funde (User, laufend) -- GEBÜNDELT ABARBEITEN

- [x] **EWT-Anzeige "Berechnen?"-Schalter ohne Wirkung.** Der `changeHandler` holte die Zeile
      per `e.target.closest('.modal').row` -- `#modal` ist eine ID, keine Klasse -> `null` ->
      Handler crasht. Jetzt die `row` direkt aus dem Aufruf-Closure (`createShowModalEWT.tsx`).
- [x] **EWT-Anzeige: "Tag:" ohne Abstand zum Wert.** `createTagElement` jetzt
      `divClass="raster mb-1"`, `labelClass="sp-4 sp-sm-5 ..."`, `spanClass="sp-8 sp-sm-7 ..."`
      -> Label und Wert teilen das 12-Spalten-Raster (`raster.scss`).
- [x] **EWT-Anzeige: `<hr />` rendert als Punkt.** Jetzt `<hr className="ewt-trenner" />` plus
      Regel in `styles.scss`. Ursache war die UA-Regel `hr { margin-inline: auto }` -- als
      Auto-Margin im Grid-Item schlaegt sie `justify-self: stretch`, das `hr` schrumpft auf 0.
      Fix: `margin-inline: 0` + `inline-size: 100%` + `grid-column: 1 / -1`.
      Browser-verifiziert (Mobil, 420px): Trennerbreite 406px, Hoehe 1px.

**Browser-Verifikation EWT-Anzeige-Modal (2026-09-09, `scratchpad/ewt.mjs`, Mobil 420px):**
- Schalter "Berechnen?": Row-State `unchanged` -> `modified`, `cells.berechnen` gekippt,
  `localStorage.dataE[0].berechnen` aktualisiert. ✓
- "Tag:" Label/Wert: Abstand 7px, auf einer Zeile. ✓
- `.ewt-trenner`: 406px breit, 1px hoch -- Linie, kein Punkt. ✓
- Gates: typecheck 0, lint 0/21, lint:css 0/90, test 2084/0/2, build gruen (966 Module).
- [x] **Admin-Benutzerliste-Filter: Label mal oben (Rolle), mal unten (Name/OE).**
      "Name"/"OE" hatten die `DbFeld`-Beschriftung versteckt (`data-hide-label`) + ein zweites
      `<label>` NACH dem Feld (Beschriftung unter dem Feld, doppeltes `for`-Label). Jetzt alle
      drei `DbFeld`/`DbAuswahl` mit `beschriftungZeigen`, kein Zusatz-`<label>`. Browser-
      verifiziert (`scratchpad/filter.mjs`): 3x `labelAboveField: true`, `dupLabels: 1`.
- [x] **Bereitschaftseinsatz-Modal: Warnhinweis "noch nicht gespeicherter Zeitraum"
      verschwindet nicht.** Ursache: der `onEvent('data:changed')`-Listener, der den Hinweis
      bei Sync ausblendet, wurde ueber `modal.addEventListener('hide.bs.modal', unsub)`
      aufgeraeumt -- `hide.bs.modal` ist ein Bootstrap-Event und feuert seit Phase H nie mehr.
      Pro Dialog-Oeffnung lief also ein Listener auf; die geleakten Listener aus frueheren
      Oeffnungen zeigen auf detachte `bzSyncHintRef`-Knoten und stoerten die Sichtbarkeits-
      logik. Neu: `beiModalSchliessen(cleanup)` (`components/showModal.tsx`, MutationObserver
      auf `#modal`), in **6** Dialogen (EA/Neben/Bereitschaftseinsatz je Add + Editor).
      Browser-verifiziert (`scratchpad/be-hint.mjs`): Hinweis blendet nach BZ-Sync +
      `data:changed{BZ}` aus (`display:none`); Oeffnen/Schliessen/Neu-Oeffnen ohne
      Listener-Aufbau (genau 1 Hinweis-Knoten, genau 1 Style-Write). Test-Mocks fuer
      `@/components` in 3 Dateien um `beiModalSchliessen` ergaenzt. Suite 2084/0/2.
- [x] **EWT-Anzeige "Berechnen?"-Schalter nach oben rechts** (User-Wunsch). Schalter + Tag
      teilen eine Flex-Zeile (`.ewt-kopf` in `styles.scss`); der Schalter belegt keine eigene
      Rasterzeile mehr. Browser-verifiziert Desktop + Mobil: rechtsbuendig, Rest nicht verschoben.
- [x] **AutoSave-Zustandspunkt "fehlerhaft".** Zwei Bugs: (1) `initAutoSaveIndicator()`
      sprang bei `badgeElements.size > 0` raus -- Feature-Tabs fuellen die Map per
      `registerAutoSaveButton()` (in `LOGIN_INIT_SEQUENCE` vor `ui:autoSaveIndicator`), ohne
      den Status-Listener zu registrieren -> Badges wurden nie aktualisiert. Guard jetzt auf
      `if (unsubscribe)`. (2) `db-badge`-Klasse setzt `--db-icon-font-size` nicht -> Icon-Glyph
      auf 0, Punkt wirkte leer. `.autosave-badge` setzt Icon-Groesse + hellen Ring
      (`box-shadow`). Browser-verifiziert: 5 Semantiken, Icon sichtbar, Ecke sauber abgesetzt.
      (Voller Save-Flow -> Badge-Status im Puppeteer-Harness nicht reproduzierbar wegen
      dyn.-Import-Modulidentitaet; Look + Guard-Logik geprueft.)
- [x] **`border-radius: 0` -- Nebenwirkungen systematisch geprüft.** Kritisch nur das `<hr>`:
      als Flex-/Grid-Kind kollabiert es auf Breite 0 (UA `hr { margin-inline: auto }` schlägt
      `stretch`). Global gefixt: `hr { margin-inline: 0 }` in `styles.scss`. Betraf Einstellungen
      ("Sichtbare Bereiche"/AutoSave-Trenner, `d-flex`) + VE-Modale (`.raster`). Browser-
      verifiziert (`scratchpad/hr.mjs`): 5x `<hr>` jetzt 457-958px statt 0. Unkritisch:
      Passwort-Stärke-Balken (`--db-border-radius-full` -> pill), AutoSave-Punkt (`db-badge`,
      rund), `type="range"`-Slider (UA). Keine `db-progress`/`db-slider`/Avatar im Einsatz.

**Noch offen:**
- **I.4** -- geklaert (Entscheidung, kein Code): ungenutzte woff2-Schnitte bleiben bewusst im
  Build. `@font-face`-`src` laedt der Browser erst beim tatsaechlichen Glyph-Rendering -> fuer
  echte Nutzer 0 Byte. Der Precache ist ueber `globIgnores` bereits eng (nur die 4
  Fliesstext-Schnitte). Build-seitiges Strippen braechte nur ein kleineres Deploy-Artefakt,
  riskiert aber einen synthetisierten Fallback-Satz. Begruendung steht im CHANGELOG (69).
- **I.6** -- erledigt: Bundle-Budget vs. Phase-0-Spike im CHANGELOG (69) festgehalten
  (React-Runtime 59 KB gz, DB-UX+App-CSS 92 KB gz, 32 woff2 / 1,82 MB, Precache 47 / 4,3 MB).
- **I.11** -- `frontend/CLAUDE.md` (Scripts/Styling), `.claude/skills/verify`,
  `.claude/skills/architektur` (Modal-Teardown + `beiModalSchliessen`), `../WORKSPACE.md`
  (React 19 / Bootstrap raus / neues Design), `CHANGELOG.md` (69). `frontend/.claude/README.md`
  + Root `../CLAUDE.md` sind generisch/Workflow -> kein Phase-I-Drift. `graphify update .` gelaufen.
- **I.9** -- 28 -> 21 ESLint-Warnungen. Rest (~13 setState-im-Effect, ~7 exhaustive-deps in
  verschachtelten Admin-Komponenten) bewusst als dokumentierte Ausnahme belassen: Warnungen,
  kein CI-Fehler; echtes Regressionsrisiko > Nutzen. Einzeln mit Testabdeckung angehen, wenn
  die Komponenten ohnehin angefasst werden (Phase J).
- Gitlink-Bump im Parent nach dem naechsten Frontend-Commit (weiterhin offen).

## Review Phase I -- Abschluss (2026-09-09, Session 4)

**Committed auf `feat/db-ux`** (noch nicht gepusht):
- `5ba1231` Phase-I-Sammelstand (eckig, Schwelle, PDF-Schriften, PWA-Farben, Button-Konvention,
  Marken-Logos raus, I.9 teilweise, Doku)
- `ab2fa1f` EWT-Anzeige-Modal: `<hr>`-Trenner + "Berechnen?"-Schalter aendert Row-State
- `36abbf8` Dialog-Sync-Hinweise: Listener-Leak (totes `hide.bs.modal`) -> `beiModalSchliessen()`,
  6 Dialoge
- `ce00ec5` EWT-Schalter oben rechts (`.ewt-kopf`) + AutoSave-Zustandspunkt sichtbar
  (Guard-Bug `if (unsubscribe)` + Icon-Groesse + Ring)
- `799ab5d` Admin-Benutzerliste-Filter: Beschriftungen einheitlich oben
- `bc5e830` `<hr>` als Flex-/Grid-Kind global gefixt (`hr { margin-inline: 0 }`)

**Checkpoint (2026-09-09):** `typecheck` 0 · `lint` 0/21 · `lint:css` 0/90 · `test` 2084/0/2 ·
`build` gruen (966 Module) · `graphify update .` gelaufen (3630 Nodes).

**Browser-verifiziert (Puppeteer, Chrome headless gegen Dev-Server):** EWT-Anzeige-Modal
(Schalter kippt Row-State + `localStorage.dataE`, Trenner voll breit, Schalter oben rechts,
Desktop + Mobil 420px) · Bereitschaftseinsatz-Sync-Hinweis (blendet nach BZ-Sync aus, kein
Listener-Aufbau ueber Oeffnen/Schliessen/Neu-Oeffnen) · Admin-Filter (3x Label oben, kein
Doppel-`for`) · AutoSave-Badge-Optik (5 Semantiken, Icon sichtbar) · Einstellungen-`<hr>`
(457-958px statt 0).

**Bewusst offen gelassen:** I.9-Rest (21 Warnungen, dokumentierte Ausnahme) · Gitlink-Bump
Parent (nach Push) · voller Save-Flow -> AutoSave-Badge-Status im Harness nicht reproduzierbar
(Optik + Guard-Logik geprueft).

---

# Laufend: React-Umbau Phase J-N - Start 2026-09-11

Plan: `tasks/plan-react-umbau.md`. Branch `feat/react-umbau` (Frontend + Parent).

**Phase I ist abgeschlossen** (geprueft 2026-09-11): Abschluss-Commit `ede59c5`, Review-Abschnitt
weiter oben, `lint` 0 Fehler / 21 Warnungen = der dokumentierte Ausnahmezustand. Bewusst offen
geblieben und kein Blocker fuer J: I.9-Rest (21 Warnungen, Sackgassen-Analyse oben), I.4
(Entscheidung ohne Code). I.8 war nie abgehakt, inhaltlich aber durch den QA-Sweep
Hell/Dunkel Desktop+Mobile erledigt.

Ziel (User-Vorgabe): **alles als React**, inklusive `CustomTable`; `index.html` schrumpft am
Ende auf `<head>` + einen React-Root.

- **J** Native Controls -> `@db-ux/react-core-components` (`DBButton`/`DBTag`/`DBCheckbox`/
  `DBRadio`/`DBTextarea` direkt an den Aufrufstellen); `DbFeld`/`DbAuswahl` innen auf
  `DBInput`/`DBSelect`; `MyButton` aufloesen. Querschnitt: `@db-ux/core-foundations`
  (helpers-Mixins, `_screen-sizes.scss` als einzige Breakpoint-Quelle, `utilities.scss`/
  `raster.scss` abgleichen).
- **K** App-Shell nach React (`DBHeader`/`DBNavigation`/Brand, Theme-Umschalter, `navdrawer`
  + `impressum` als `DBDrawer`, Fusszeile; `tabController` wird React-State).
- **L** Statische Tabs nach React (Start, Berechnung-Huelle, Einstellungen-Formular).
- **M** `CustomTable` nach React -- offene Weiche M-a/M-b/M-c, Marktabgleich im Plan
  (Ergebnis: nur `@tanstack/react-table` waere headless-kompatibel, ersetzt aber nur die
  Sortierlogik; Tendenz M-a Portierung).
- **N** `index.html` auf `<head>` + `<div id="app">`, `main.ts` -> `main.tsx`.

## Aufgaben Phase J (erst nach Phase I abhaken)

- [x] **J-0 Plan im Repo ablegen.** `tasks/plan-react-umbau.md` angelegt, Querverweis in
      `tasks/plan-db-ux-migration.md`, dieser Abschnitt. Grund: Umsetzung laeuft im Wechsel
      auf mehreren Geraeten -- Status wird hier gepflegt, nicht im Plan.
- [x] **J0 Querschnitt foundations -- Breakpoint-Teil (J-Q2) erledigt** (2026-09-11, Branch
      `feat/react-umbau`). `raster.scss`, `utilities.scss`, `customtable.scss` (vorher `.css`)
      und `CustomTable.ts` beziehen die Schwellen jetzt aus
      `src/scss/_breakpoints.scss` (xs-xl aus `@db-ux/core-foundations`, `xxl` als
      Projekt-Erweiterung auf 2560, weil DB bei `xl` endet und die EWT-Tabelle eine Stufe
      darueber braucht); `infrastructure/ui/breakpoints.ts` ist der TS-Spiegel. Skala bewusst
      gewechselt (480/576/768/992/1200/1400 -> 320/768/1024/1440/1920/2560).
      Spaltenstufen ALLER Tabellen neu beurteilt -- ein reiner
      Skalentausch haette Kernspalten zu weit nach oben geschoben (EWT bei 1000 px: 4 von 14).
      Details im `CHANGELOG.md` (91).
      **J-Q1 erledigt:** Von den helpers-Mixins ist genau eines uebernommen -- das
      `[hidden]`-Muster aus `_display.scss` (die `d-*`-Klassen schlugen mit ihrem `!important`
      die UA-Regel `[hidden]`, `el.hidden = true` war damit wirkungslos). Der Rest passt
      NICHT und bleibt bewusst Eigenbau, jeweils mit Grund: `%a11y-visually-hidden` nutzt das
      abgekuendigte `clip: rect()` (Projektfassung mit `clip-path` ist moderner),
      `get-focus-placeholder` ist ein `:focus-visible`-Ring in Informational-Farbe (das
      einzige Outline im Projekt ist die Onboarding-Hervorhebung in Markenfarbe), `divider`
      hat kein Gegenstueck (keine handgebauten Trenner-Pseudoelemente), `interactive-bg`
      zielt auf Disabled-bewusste Button-Hintergruende (die 9 `:hover` im Projekt sitzen auf
      Tabellenzeilen), `px-to-em` hat keinen Eigenbau mehr.
      **J-Q3 erledigt:** foundations liefert kein Utility-System (nur Tokens + 9 Klassen
      `db-divider-*`/`db-focus-default`) -- es gibt nichts 1:1 zu ersetzen. Das
      Skript-Inventar aus dem gebauten CSS zeigt 697 von 901 Utility-Klassen ungenutzt
      (3,6 KB gz); auf Entscheidung des Users bleiben sie stehen, weil ein vollstaendiges
      Raster gewollt ist. Der Dateikopf von `utilities.scss` behauptete das Gegenteil und
      wurde korrigiert.
- [ ] **J1 Referenz-Slice** `AdminProfileTemplateContentEditor.tsx` (+ neuer Render-Test).
- [ ] **J2 FormularEditor** (15 Dateien, + schmale Render-Tests fuer `FeldZeile`,
      `TabellenBlock`, `feldPanelGemeinsam`, `SchriftartDialog`).
- [ ] **J3 Admin uebrige Komponenten.**
- [ ] **J4 Einstellungen-Komponenten.**
- [ ] **J5 Bereitschaft / EWT / Neben / EA.**
- [ ] **J6 Feature-Tab-Buttons** (`data-disabler` + `buttonDisable.ts`-Selektor pruefen).
- [ ] **J6b `MyButton` aufloesen** -> `DBButton`.
- [ ] **J7 `My*`- + `core/`-Rest-Markup.**
- [ ] **J8 `DbFeld`/`DbAuswahl` -> `DBInput`/`DBSelect`** (Wrapper bleibt, Innenleben
      getauscht; Aufrufstellen unveraendert).
- [ ] **J9 Cleanup + Doku** (Grep-Gate, `agent-cli`, CLAUDE.md/Skills/CHANGELOG,
      `graphify update .`).

**Verifikation je Slice:** `bun run typecheck && bun run lint && bun run lint:css &&
bun run test && bun run build` + MCP `db-ux__verify_migrated_code` + `verify`-Skill fuer die
beruehrten Screens + manuell Hell/Dunkel/Auto und Mobile.

---

# Aktueller Plan: DB-UX-Migration -- Phase H (Bootstrap vollstaendig raus) - 2026-09-08

## Ausgangslage

Gesamtplan `tasks/plan-db-ux-migration.md`, Phase H. Vorarbeit lag als WIP-Commit `1979676` vor
(Modal-Huellen, Raster/Akkordeon, Buttons, Formulare, Bootstrap-JS; Alerts -> `db-notification`,
Badges -> `db-tag`, `spinner-border` -> `.laedt`). Offen waren 5 rote Tests, die Karten, die
Reste (`nav-*`, `table-*`, `fade`, `list-group`) und der Utility-Sweep.

## Aufgaben

- [x] **H.1 Rote Tests.** `JsonEditor` hatte als einziges Badge noch `badge bg-*`; der Test war
      schon auf `.db-tag` umgestellt. Markup nachgezogen, die stehengebliebene
      `bg-danger`-Zusicherung auf `data-semantic="critical"`.
- [x] **H.2 Karten** -> `db-card` (8 Dateien). Karten mit Kopf-/Fusszeile bekommen
      `data-spacing="none"`, damit die Abschnitte die volle Breite behalten.
- [x] **H.3 Navigation** -> `db-navigation`/`db-navigation-item` mit `data-active`
      (Admin-Unternavigation, Ressourcen-Reiter, Seiten-Reiter im Formular-Editor). Die
      Admin-Unternavigation ist jetzt eine Liste statt achtmal desselben Blocks.
- [x] **H.4 Tabellen** -> `db-table`-Huelle (7 Stellen), `table-responsive` entfaellt.
      Nested Label-Tabellen der Berechnung als `berechnung-label-tabelle` ausgenommen.
- [x] **H.5 Reste:** `list-group` -> `trennliste`, `spinner-grow` -> `.laedt`, letzte
      `badge`/`text-bg-*` -> `db-tag`, AutoSave-Punkt auf `data-semantic`.
- [x] **H.6 `src/scss/utilities.scss`** (neu, `@layer app`): Hilfsklassen mit Bootstrap-Namen
      auf DB-Tokens, dazu `tab-pane`/`fade` und die Gegenregeln aus `bridge.css`.
- [x] **H.7 Bootstrap raus:** SCSS-Import, `~bootstrap`-Alias, `bridge.css`, Layer auf
      `db-ux, app`, Pakete deinstalliert. `data-bs-*` umbenannt, `--bs-*` auf DB-Tokens,
      `BSColorToggler` -> `DBColorToggler`.
- [x] **H.8 Doku:** `CHANGELOG.md` (67), `CLAUDE.md`, `../WORKSPACE.md`,
      `.claude/skills/architektur`, `.claude/skills/coding-konventionen`.
- [x] **H.9 Stylelint als Gate** (Nachtrag auf Zuruf): `stylelint.config.mjs` lauffaehig gemacht
      (SCSS-Parser fehlte, `//` war ein Syntaxfehler), `bun run lint:css` + `lint:css:fix` neu,
      eingehaengt in `release:check`, `lint-staged` und `deploy.yml`. Die `db-ux/*`-Token-Regeln
      laufen als Ratsche (`--max-warnings 93`), alles andere ist `error` und steht auf 0.

## Verifikation

- `bunx --bun tsc --noEmit` 0, `bun run lint` 0 Fehler / 28 Alt-Warnungen,
  `bun run lint:css` 0 Fehler / 93 Warnungen (unter der Grenze),
  `bun run test` **2084 pass / 0 fail** (2 skip), `bun run build` gruen (Precache 59 / 4,5 MB).
- Grep: `data-bs-` = 0, `--bs-` = 0 in `src/` und `test/`; `bootstrap` nur noch in erklaerenden
  Kommentaren und im app-eigenen Modul `core/bootstrap.ts` (Init-Sequenz, keine Bibliothek).
- Browser (Chrome headless gegen den Dev-Server): Layer-Reihenfolge `db-ux, app`; 0 Bootstrap-
  Klassen und 0 `data-bs-*` im DOM; 20 Hilfsklassen-Stichproben mit den erwarteten Werten
  (`d-flex` flex, `gap-2` 8px, `mb-3` 12px, `border` 1px solid, `rounded` 8px, `small` 14px,
  `visually-hidden` absolute, …); Tabwechsel setzt Panel + `data-active` + Hash
  (`#Einstellungen`); Startkarten 381x134 px mit 12 px Polster; Admin-Unternavigation
  waagerecht mit Aktiv-Markierung; Hell/Dunkel setzen `data-mode` und tauschen Grund
  (`#16181b` / `#fff`) und Text; 0 Konsolenfehler.

## Funde

1. **`db-card` polstert aussen.** Bootstraps `card-header`/`card-footer` sitzen randlos an der
   Kartenkante. Mit DBs Standardpolster stuenden sie eingerueckt im Kasten -- deshalb
   `data-spacing="none"` plus Abstand an den Abschnitten, wo eine Kopfzeile existiert.
2. **`db-table` scrollt selbst** (`overflow: auto` bei `data-width="full"`) -- `table-responsive`
   war an den bereits migrierten Tabellen doppelt gemoppelt. `#Berechnung .table-responsive`
   (JS-Messung der Fensterbreite + Media-Query) musste auf `.db-table` umgehaengt werden.
3. **Ein Perl-Ersetzungslauf hat `${isSelfRow ? …}` in Template-Literalen verschluckt** --
   `${…}` ist auch in Perl eine Variableninterpolation. Beide Stellen (`AdminUserCard`,
   `AdminUserTable`) haetten still ihre Rahmenmarkierung verloren; der Diff hat es gezeigt.
   Lehre steht in `tasks/lessons.md`.
4. **Bootstraps Abstandsskala und die DB-Skala decken sich nicht.** `mb-3` ist jetzt 12 px statt
   16 px (`--db-spacing-fixed-sm`), `p-2` bleibt 8 px. Bewusste Entscheidung: Klassennamen
   behalten, Werte aus den Tokens -- sonst haetten die Abstaende zwei Systeme gemischt.
5. **`body` hat keinen eigenen Hintergrund mehr** (Bootstrap setzte ihn). Der Grund kommt vom
   `<html>` aus dem DB-Theme (`#16181b` / `#fff`), gemessen im Browser -- kein weisses Aufblitzen.
6. **`stylelint --fix` hat eine Regression eingebaut.** `stylelint-use-logical` fasst mehrere
   `top`/`right`/`bottom`/`left` in einem Block zu `inset: logical …` zusammen. Diese Kurzform
   unterstuetzt kein Browser -- alle sechs Positionsvarianten der Snackbar waeren still auf die
   Grundstellung zurueckgefallen. Datei zurueckgenommen, die fuenf Eigenschaften per `except`
   vom Autofix ausgenommen. Ein Autofix eines Linters ist kein Freifahrtschein; der Diff gehoert
   angesehen.

## Offen / Naechste Phase

- Phase I (Cleanup): `data-density`/`data-color` final, Marken-Logos und Icon-Gewichte aus dem
  Build halten, `manifest.theme_color`/`<meta name="theme-color">` (heute `#212529`) auf
  DB-Werte, `customtable.css` in `@layer app`, `npx @db-ux/agent-cli` neu ausfuehren.
- Die 28 Lint-Warnungen (React-19-Hinweise auf Preact-Muster) sind weiterhin offen.
- Gitlink-Bump des Frontends im Parent-Repo steht aus.

---

# Aktueller Plan: DB-UX-Migration -- Phase E (Modal-Infrastruktur -> DB-Drawer) - 2026-09-06

## Ausgangslage

Gesamtplan `tasks/plan-db-ux-migration.md`, Phase E. DB UX v5 hat keine Modal-Komponente;
`DBDrawer` ist das Pendant und baut auf nativem `<dialog>`. 21 Aufrufstellen von `showModal`,
dazu drei Vanilla-Dialoge (Bestaetigung, AutoSave-Fehler, Unterschrift) und zwei
eigenstaendige (Hilfe, Platzhalter-Hilfe im FormularEditor).

## Aufgaben

- [x] `components/showModal.tsx` auf `DBDrawer`; Vertrag (`#modal` synchron, `.row`/`.role`,
      Feld-Ids) unveraendert; `data-bs-dismiss="modal"` per Delegation
- [x] `infrastructure/ui/dbDialog.ts` (neu) als Vanilla-Gegenstueck inkl. `escapeSchliesst`
- [x] `confirmDialog`, AutoSave-Fehlerdialog, Signatur-Dialoge, Hilfe, Platzhalter-Hilfe
- [x] Alle `Modal.getInstance(...)?.hide()` -> `schliesseModal()` (17 Dateien); `schliesseModal`
      und `oeffneDrawer` ueber den `@/components`-Barrel
- [x] Kopfzeilen im DB-Drawer-Aufbau (`MyModalHeader`, Signatur-Dialoge)
- [x] Impressum von `data-bs-toggle="modal"` auf `data-dialog-target`
- [x] Admin-Unternavigation auf den `tabController` (Tab-Gruppen statt fester `#tabContent`)
- [x] Unterschriftenfeld nutzt im Querformat die volle Breite
- [x] Tooltip in `AdminUserCard` auf `title` (Bootstrap-Tooltip seit Phase F weg)
- [x] Tests: 17 Dateien von der Bootstrap-Attrappe auf `schliesseModal`/`<dialog>` umgestellt,
      `HTMLDialogElement`-Polyfill in `test/setupBun.ts`

## Verifikation

- `bun run lint` 0 Fehler, `bun run test` 2083/2083 gruen, `bun run build` erfolgreich.
- Puppeteer-Smokes gegen den Dev-Server: EWT-Dialog oeffnet mit erreichbaren Feld-Ids
  (`#Tag`), Desktop als Seitenpanel und Handy in voller Breite; Impressum oeffnet und
  schliesst ueber X und Fusszeilen-Knopf; Unterschriftenfeld im Querformat 685x274 statt
  603x241 px.

## Offen / Naechste Phasen

- `CustomSnackbar` auf DB-Notification-Optik (kosmetisch).
- H (Bootstrap raus -- inkl. der `.modal-*`-Huellen und der letzten Plugins `Collapse`,
  `Popover`), danach I (Cleanup).

---

# Aktueller Plan: DB-UX-Migration -- Phase D (App-Shell / Navigation / index.html) - 2026-09-06

## Ausgangslage

Gesamtplan `tasks/plan-db-ux-migration.md`, Phase D. Die Kopfzeile war Bootstrap-`navbar` mit
`.offcanvas`, `.nav-pills`, `data-bs-toggle="pill"` und dem `Tab`-Plugin. Abweichung vom Plan:
statt einer React-Shell bleibt die Kopfzeile statisches Markup mit DB-Klassen. Grund: rund 15
Stellen ausserhalb der Kopfzeile schalten Nav-Eintraege ueber feste Ids und `d-none`
(`auth/index.ts`, `logoutUser`, `updateTabVisibility`, Schnellzugriff, Onboarding). Eine
React-Shell haette all das mitziehen muessen; `DBHeader` rendert die Navigation ausserdem
zweimal, was die Ids doppelt vergeben haette.

## Aufgaben

- [x] `infrastructure/ui/tabController.ts` -- Panelwechsel, `aria-selected`, Hash, `tab:shown`,
      Tastatursteuerung, `setzeTabSichtbar`
- [x] `infrastructure/ui/navDrawer.ts` -- mobile Schublade (`<dialog class="db-drawer">`),
      Navigation zieht um statt doppelt zu existieren
- [x] `index.html`: DB-Header-Markup, Tab-Eintraege als `<a href="#Ziel" data-tab-target>`
- [x] `main.ts`: `Tab`/`Offcanvas`/`Dropdown` raus, Controller rein, Hash ueber
      `zeigeTabAusHash()`
- [x] `logoutUser`, `onboardingValidation`, `berechnungMonatsFenster` auf Controller/`tab:shown`
- [x] `BSColorToggler` auf DB-Sub-Navigation; Symbolabgleich ueber `data-icon`/`app-icon`
- [x] Dev-Service-Worker hinter `PWA_DEV=true` (lieferte alte Stylesheets aus)
- [x] Tests: `test/ui.tabController.test.ts` (neu), `logoutUser`- und Onboarding-Test auf den
      Controller umgestellt, Icon-Test kennt DBs `none`-Sentinel
- [x] Doku: `CHANGELOG.md`, `.claude/skills/architektur/SKILL.md`

## Verifikation

- `bun run lint` 0 Fehler, `bun run test` 2083/2083 gruen, `bun run build` erfolgreich.
- Kopfleisten-Smoke (Puppeteer, `scratchpad/smoke/kopf.mjs`) gegen den echten Dev-Server:
  Tabwechsel setzt Panel + `data-active` + `aria-selected` + Hash (`#Berechnung`),
  `history.back()` schaltet zurueck, Schublade oeffnet mit der Navigation darin
  (`doppelteIds: 1`), Schliessen holt sie in die Kopfzeile zurueck.
- Design-Smoke: Untermenue oeffnet per Hover, Auswahl "Hell" setzt `data-bs-theme=light` und
  tauscht das Symbol (`moon` -> `sun`), `aria-label` folgt.
- Sichtpruefung Desktop (1500px) und Handy (420px) inklusive offener Schublade.

## Offen / Naechste Phasen

- E (Modal-Infrastruktur -> DB-Drawer), H (Bootstrap raus), I (Cleanup).
- `Collapse` und `Popover` sind weiterhin Bootstrap (Einstellungen-Akkordeons) -- Phase H.

---

# Aktueller Plan: DB-UX-Migration -- Phase F (CustomTable auf DB-Table-CSS) - 2026-09-06

## Kontext

Gesamtplan `tasks/plan-db-ux-migration.md`, Phase F. Es gibt **keine** interaktive
DB-Tabellen-Komponente -- nur die CSS-Klassen aus `@db-ux/core-components`. Die eigene
Sortier-/Inline-Edit-/Soft-Delete-Logik der `CustomTable`-Klasse bleibt vollstaendig
erhalten; ausgetauscht wird nur die Praesentation.

Geprueft vorab: DB erwartet `<div class="db-table" data-width="full">` als Huelle um eine
normale `<table>`; Varianten ueber `data-variant="spaced"`, `data-divider`,
`data-sub-header-emphasis`, `data-interactive`. Der DB-Tooltip ist reines CSS
(`<i role="tooltip" class="db-tooltip">`) -- die Bootstrap-Tooltip-JS-Komponente entfaellt
damit ersatzlos (sie war die 7. Bootstrap-JS-Abhaengigkeit).

## Plan

- [x] **F.1 Button-Mapping teilen.** `buttonLook` aus `components/MyButton.tsx` nach
      `infrastructure/ui/dbButton.ts` verschieben und um einen Vanilla-Helfer ergaenzen
      (`erzeugeDbButton`), damit React-Adapter und `customTableRender` dieselbe Zuordnung
      Bootstrap-Klasse -> DB-Prop nutzen. Schichtregel: `components/` darf
      `infrastructure/` importieren, nicht umgekehrt.
- [x] **F.2 `customTableRender.ts`:** Footer- und Zeilen-Buttons ueber den Helfer;
      `customButton.classes`-Konvention bleibt (Aufrufstellen unveraendert).
- [x] **F.3 Tabellen-Markup:** `<div class="db-table" data-width="full">` statt
      `table table-bordered table-striped table-hover align-middle` -- 5 Tabellen in den
      Feature-Tabs plus die beiden in `index.html`.
- [x] **F.4 Tooltips:** `bootstrap/js/dist/tooltip` raus aus `customTableRender.ts` und
      `AdminUserList.tsx`; stattdessen ein `db-tooltip`-Element im jeweiligen Elternknoten.
- [x] **F.5 `customtable.css`** auf DB-Tokens (heute 17 `--bs-*`-Zugriffe und
      `[data-bs-theme='light']`-Selektoren); Responsive-Breakpoints bleiben JS-seitig.
- [x] **F.6 Schalter in DOM-Strings:** `berechnenParser` und `schichtParser` in `EwtTab.tsx`
      erzeugen `.form-check.form-switch`-Markup -> DB-Switch-Markup.

## Verifikationskriterien (F)

- `typecheck`, `lint`, `test`, `build` gruen.
- Browser: Sortierung (auf/ab/neutral), Inline-Editing, Zeile hinzufuegen/loeschen/
  wiederherstellen, "Alle Zeilen loeschen", Fehlerzeile mit Tooltip, Schalter in der
  EWT-Tabelle, Responsive-Umbruch je Breakpoint.
- Grep: `bootstrap/js/dist/tooltip` = 0.

## Review (F)

**Ergebnis 2026-09-06:** `typecheck`/`lint`/`build` gruen, `bun run test` 2077/0. Browser mit
echten EWT-Daten: 11 Zeilen, 25 DB-Buttons, **0** Bootstrap-Buttons, Sortier-Icon als Glyph,
Schalter als DB-Toggle, Kopfzeile lesbar, keine Konsolenfehler.

**Der Fund der Phase:** `.db-table table { display: grid }` -- DB legt Tabellen als CSS-Grid
aus und zaehlt die Spalten per `:has()`-Kette bis 20. Die `CustomTable` braucht aber
`colspan` (Fusszeile, Leer-Meldung, Inline-Editor) und blendet Spalten je Breakpoint aus;
im Grid-Modell landeten alle Fuss-Buttons in einer schmalen Spalte (Screenshot). Deshalb
bleibt `table.customtable` beim nativen Table-Layout -- Farben, Rahmen und Abstaende kommen
weiter aus dem DB-Layer. Das ist die zweite Stelle nach den Listen-Bullets, an der DB-CSS
globale Elementregeln setzt, die der Bestand anders braucht.

**Weiterer Fund:** `table-primary` an der Kopfzeile faerbte den Text schwarz, sobald die
Bootstrap-`table`-Klasse weg war -- auf dunklem Grund unlesbar. Ersetzt durch
`data-sub-header-emphasis="weak"`, das DB in beiden Modi korrekt aufloest.

**Nachtrag aus dem Sichttest des Users:** vier Korrekturen -- Marker der Aktionsspalte stand
ueber statt neben den Buttons (DB-Buttons sind Flex-Container), Zebra-Streifen fehlten
(`data-variant="zebra"` ist das Gegenstueck zu `table-striped`), Sortier-Icons waren als
`sort_up`/`sort_down` nicht zuzuordnen (jetzt schlichte Pfeile) und ohne `data-divider="both"`
fehlten die Spaltenlinien. Dazu `data-size="small"` plus `white-space: nowrap` gegen die
doppelt hohe Zeile -- mit Ausnahme von `.cell-multiline` (Zulagen-Liste), die weiter umbricht.
**Der eigentliche Fehler dabei:** der Layout-Override hing an `table.customtable`, die
Berechnungstabelle heisst aber `table-Berechnung` und lag noch im Grid-Modell (Kopf und Rumpf
liefen auseinander). Die Regel steht jetzt in `bridge.css` und gilt fuer alle Tabellen in einer
`db-table`-Huelle. Die sticky Label-Spalte der Berechnungstabelle nimmt ihren Hintergrund
per `inherit` aus der Zeile, statt stur die Seitenfarbe zu setzen -- sonst laeuft der
Zebra-Streifen bzw. das Kopfband dort nicht durch.

**Offen:** Die Admin-Tabellen (`table table-sm table-hover`, ~30 Stellen) sind noch Bootstrap;
sie gehoeren zu Phase H. Der `+`-Marker fuer eingeklappte Spalten ist unveraendertes
Bestandsverhalten.

---

# Aktueller Plan: DB-UX-Migration -- Phase G (Material Icons -> DB-Icons) - 2026-09-06

## Kontext

Gesamtplan `tasks/plan-db-ux-migration.md`, Phase G. 59 verschiedene Material-Icons an 138
Stellen in 39 Dateien. Der DB-Satz hat 451 Motive, deckt aber nicht alles ab -- fuer die
Luecken erlaubt das DB-Regelwerk (Marketingportal, Funktionale Icons) **Komposition**
(zwei bestehende Icons verbinden) und **Durchstreichung** (2-dp-Linie plus Verschnitt);
Raster 24 dp, Schutzraum 2 dp, Strichstaerke 2 dp.

## Plan -- FERTIG

- [x] **G.1 Inventur + Mapping-Vorschlag.** 59 Namen erhoben, 39 mit direktem Gegenstueck,
      20 fachliche Entscheidungen.
- [x] **G.2 Vergleichsseite** (Artifact) mit gerendertem Alt/Neu und je 2--4 Alternativen;
      Freigabe durch den User am 2026-09-06 (5C `market`, 8D `theme-auto`, 10D `filter-off`,
      11C `pulse_wave`, 16C `person`, sonst Empfehlung).
- [x] **G.3 Eigenbau-Varianten** `scripts/icon-varianten.py` -> `src/icons/theme-auto.svg`,
      `src/icons/filter-off.svg`; eingebunden als CSS-Maske (`.app-icon`).
- [x] **G.4 Mapping-Modul** `src/ts/components/dbIcons.ts`.
- [x] **G.5 Codemod** ueber TSX, DOM-String-Templates und `index.html`; Groessen aus
      Inline-`fontSize`/`small-icons`/`big-icons` auf `db-font-size-*` abgebildet.
- [x] **G.6 Imperative Stellen** (AutoSave-Badge, Tabellen-Fehlerzeile) auf `dataset.icon`.
- [x] **G.7 Material-Icons entfernt:** Dependency, SCSS-Import, Vite-Preload, Alias.

## Verifikationskriterien (G)

- Grep `material-icons` in `src/` = 0.
- `typecheck`, `lint`, `test`, `build` gruen.
- Browser: jedes `.db-icon[data-icon]` hat ein Glyph (kein leeres `::before`), Eigenbau-Icons
  rendern ueber die Maske.

## Review (G)

**Ergebnis 2026-09-06:** 39 Dateien geaendert, 135 DB-Icons + 3 Eigenbau-Stellen.
`typecheck`/`lint`/`build` gruen, `bun run test` **2074/0**. Browser-Pruefung auf der
Startseite: 94 Icons im DOM, **keins ohne Glyph**, 0 `material-icons-round`-Reste,
Groessen 20/24/28 px, keine Konsolenfehler.

**Zwei Dinge, die der Plan nicht auf dem Schirm hatte:**
1. `.db-icon` setzt `font-size: 0 !important` -- die bisherige Groessensteuerung ueber
   `font-size` (Inline-Styles, `.small-icons`, `.big-icons`) war damit wirkungslos. Die
   Groesse kommt jetzt aus `--db-icon-font-size`, gesetzt ueber die DB-Klassen
   `db-font-size-2xs|xs|sm|md|lg`; der Codemod hat die alten rem/px-Werte darauf abgebildet.
2. Zwei Motive fehlen im Satz. Statt semantisch schiefer Ersatzicons sind sie nach
   DB-Regelwerk zusammengesetzt: `theme-auto` (Sonne + Mond) und `filter-off` (Trichter
   durchgestrichen). Beim ersten Versuch lief der Strich falsch herum -- die offiziellen
   `*_disabled`-Icons streichen von unten links nach oben rechts -- und der Modifikator sass
   auf dem Rand statt im 2-dp-Schutzraum; beides nach Sichtvergleich mit `eye_disabled`
   korrigiert. `link_chain` durchgestrichen wurde verworfen (Strich laeuft parallel zur Kette,
   unleserlich), dafuer gibt es `unlink_chain` offiziell.

**Nacharbeit nach dem Sichttest des Users (gleicher Tag).** Der Codemod ersetzt nur, was er
als Literal sieht -- drei Fehlerklassen blieben:
1. `data-icon={...}` mit JSX-Ausdruck (13 Stellen) trug weiter Material-Namen. Symptom: leere
   Dashboard-Kacheln, roter Ersatzpunkt in Listen. Lehre: nach so einem Codemod **jeden**
   Icon-Namen gegen den echten Satz pruefen, nicht nur die Literale -- dafuer gibt es jetzt
   `test/icons.dbSet.test.ts`.
2. `customtable.css` setzte Sortier-Icons per `content:` als Material-Ligatur und erzwang
   `font-family: 'Material Icons Round' !important`. Ohne die Schrift stand der Name als Text
   in der Kopfzeile. Jetzt `data-icon` am Element.
3. Rote Punkte vor Navigations- und Listeneintraegen: DB setzt `list-style-type:
   var(--db-list-bullet)`, was Bootstraps `list-style: none` aus dem unteren Layer schlaegt.
   Bridge-Regel ergaenzt -- dieselbe Klasse Problem wie bei den Checkbox-Groessen (DB stylt
   `input[type=checkbox]` global auf 32 px).

**Offen:** Die Icon-Fonts des DB-Satzes liegen als eigene woff2 im Build (`db-*.woff2`, aus
dem Precache ausgenommen, siehe Phase B). Ob die App wirklich alle Icon-Gewichte braucht,
klaert Phase I. Eigene, selbst gezeichnete Symbole kann der User spaeter unter `src/icons/`
ergaenzen -- Einbindung wie bei den beiden erzeugten.

---

# Aktueller Plan: DB-UX-Migration -- Phase C (Basiskomponenten -> DB React Components) - 2026-09-06

## Kontext

Gesamtplan `tasks/plan-db-ux-migration.md`, Phase C. `src/ts/components/*` werden duenne
Adapter ueber `@db-ux/react-core-components@5.3.0`. Barrel und Props bleiben stabil, damit die
Aufrufstellen (MyInput 17x, MySelect 9x, MyButton/MyCheckbox je 6x, PasswordStrengthMeter 5x)
unveraendert bleiben. Die Bootstrap-Modal-Shell bleibt bis Phase E.

**Geprueft vorab (installiertes Paket, nicht geraten):**
- Alle relevanten DB-Komponenten sind `forwardRef` -- `myRef` zeigt weiter auf das echte
  `<input>`/`<select>`, die `submit*`-Utilities lesen also unveraendert per Ref/`querySelector`.
- `DBInput` reicht `pattern`, `autoComplete`, `list`, `min`/`max`/`step`, `readOnly` durch,
  **aber kein `defaultValue`** -- es setzt immer `value={props.value}` und haengt intern
  `onChange`/`onInput` an. Fuer die Vorbelegungs-Felder (siehe A2) heisst das: `value` NICHT
  durchreichen, sondern den Startwert nach dem Mounten ueber die Ref ins DOM schreiben.
  Sonst friert React das Feld wieder ein.
- `@db-ux/core-eslint-plugin@5.3.0` existiert.

## Plan

- [x] **C.1 Deps + Lint.** `@db-ux/react-core-components@5.3.0` (erledigt, keine peerDeps --
      `react` wird aus dem Root aufgeloest, kein doppeltes React). `@db-ux/core-eslint-plugin`
      als devDependency + Flat-Config-Eintrag.
- [x] **C.2 `MyButton` -> `DBButton`.** `text` -> children, `clickHandler` -> `onClick`,
      `className`-Bootstrap-Varianten -> `variant`; `dataBsDismiss`/`dataBsToggle` weiter als
      DOM-Attribute durchreichen (Bootstrap-Modal lebt noch).
- [x] **C.3 `MyCheckbox` -> `DBCheckbox`.** `children` -> `label`, `changeHandler` ->
      `onChange`; Vorbelegung ohne Handler wie in A2 (`defaultChecked`-Ersatz per Ref).
- [x] **C.4 `MySelect` -> `DBSelect`.** `options`-Array -> `<option>`-Kinder, `title` ->
      `label`, Vorauswahl analog C.3.
- [x] **C.5 `MyInput` -> `DBInput`.** Bootstrap-`Popover` (+ `@popperjs/core`-Nutzung in
      dieser Datei) raus -> `message`/`DBInfotext` bzw. `DBTooltip`; `invalidFeedback*` ->
      `invalidMessage`; Klassenkomponente wird Funktionskomponente. Startwert per Ref.
- [x] **C.6 `PasswordStrengthMeter`** auf DB-Tokens + `DBInfotext`, Bewertungslogik unveraendert.
- [x] **C.7 Aufrufstellen + Tests** nachziehen, wo sich Props doch aendern; Test-Doubles in
      `test/reactRender.ts` an die neue Struktur anpassen.

## Verifikationskriterien (C)

- `bun run typecheck`, `bun run lint` (inkl. neuem DB-Plugin), `bun run test` gruen.
- `bun run build` gruen.
- `verify`-Skill: je Feature ein Add- und ein Edit-Modal, Auth-Formulare, Validierungsfehler,
  **Tippen in vorbelegten Feldern** (die A2-Falle), Tastatur-Fokus, Hell/Dunkel.

## Review (C)

**Ergebnis 2026-09-06:** `typecheck`/`lint`/`build` gruen, `bun run test` **2074/0** (4 neue
Tests fuer `buttonLook`/`MyButton`). Kein Feature-Modul musste angefasst werden -- die
Adapter behalten die bisherigen Props.

**Der Fund der Phase:** die DB-Komponenten vergeben ihre `id` erst in einem `useEffect`.
Direkt nach `mount()`/`showModal()` steht sie also **nicht** im DOM -- gemessen: `#berechnen`
fehlt sofort, ist nach einem Tick da. Der Bestandscode sucht seine Felder aber synchron
(`document.querySelector('#Tag')?.addEventListener(...)` unmittelbar nach `showModal()` in
`createAddModalEWT`), und das `?.` verschluckt den Fehlschlag lautlos -- der Buchungstag
haette einfach nicht mehr mitgezaehlt. Ein zweites `flushSync` in `mount()` half nicht
(Passive Effects laufen erst im naechsten Tick). Loesung: `useSofortigeId` schreibt die `id`
im `useLayoutEffect`, der noch im `flushSync`-Commit laeuft. Im Browser bestaetigt: alle drei
Feld-ids stehen sofort nach `showModal`.

**Weitere Anpassungen, die der Plan nicht vorhergesehen hatte:**
- `DBInput` reicht kein `defaultValue`-Prop weiter *als eigenes Prop*, laesst es aber ueber
  seinen `default*`-Passthrough durch -- die A2-Regel (Vorbelegung = `defaultValue`, sonst
  friert React das Feld ein) gilt also unveraendert weiter und ist in allen drei Feld-Adaptern
  umgesetzt. Browser-Gegenprobe: Tippen im vorbelegten Feld ergibt `vorbelegtX`.
- Der Ungueltig-Zustand lief bisher ueber `is-invalid` + Bootstraps Geschwister-Selektor.
  Im DB-Markup greift beides nicht mehr; deshalb setzen `createEditorModalEWT` und
  `addressValidation` zusaetzlich `data-custom-validity` und `.db-input .invalid-feedback`
  wird per CSS sichtbar geschaltet. Gemessen: Feldfarbe wechselt auf den kritischen Ton,
  Fehlertext erscheint in Rot.
- Die DB-Lint-Regeln melden bei generischen Adaptern zwangslaeufig Fehlalarme
  (`select-requires-options` bei `options.map(...)`, `input-type-required` beim Prop-Spread) --
  begruendet deaktiviert; `form-label-required` war dagegen ein echter Fund und wurde
  behoben (Text-Label als `label`-Prop statt nur als Kind).

**Offen / bewusst nicht in C:** Die Bootstrap-Modal-Shell (`showModal`, `MyFormModal`,
`MyDivModal`, `MyModalHeader/Body`) bleibt bis Phase E. Die Buttons in den Feature-Tabs
(`*Tab.tsx`) sind rohes Bootstrap-Markup, kein `MyButton` -- die kommen mit Phase D.
Der globale Bootstrap-`Popover`-Init in `main.ts` bleibt, weil `index.html` noch zwei
`data-bs-toggle="popover"`-Trigger hat.

---

# Aktueller Plan: DB-UX-Migration -- Phase B (DB-UX-CSS-Layer + db-theme + Token-Bridge) - 2026-09-06

## Kontext

Gesamtplan `tasks/plan-db-ux-migration.md`, Phase B. Ziel: DB-UX-CSS und `db-theme` liegen
neben Bootstrap im Build, ohne dass sich das Aussehen ausser dem Markenfarbton aendert.
Cascade Layers halten die Reihenfolge fest, eine Bridge mappt die real genutzten `--bs-*`-
Variablen auf DB-Tokens. Keine Komponente wird in dieser Phase ausgetauscht (das ist Phase C).

Voraussetzung erfuellt: `frontend/.env` enthaelt `ASSET_PASSWORD` + `ASSET_INIT_VECTOR`
(Install-Zeit-Env fuer das `db-theme`-Postinstall, **nicht** `VITE_`-Praefix).
`build.cssMinify: 'esbuild'` + `esbuild`-devDependency sind bereits aus A1.9 vorhanden.

## Plan

- [x] **B.1 Deps + `trustedDependencies`.** `@db-ux/core-foundations`, `@db-ux/core-components`
      (5.3.0), `@db-ux/db-theme` (6.2.0) als `dependencies`. `trustedDependencies` um
      `@db-ux/db-theme`, `-fonts`, `-icons`, `-illustrative-icons` ergaenzen (Spike: `db-theme`
      allein reicht nicht, die drei Asset-Pakete haben eigene Postinstalls).
- [x] **B.2 `scripts/install.sh`** (neu): laedt `.env` und ruft `bun install` mit den
      `ASSET_*`-Variablen als echter Prozess-Env auf.
- [x] **B.3 `.github/workflows/deploy.yml`:** `ASSET_PASSWORD`/`ASSET_INIT_VECTOR` als `env:`
      am Install-Step, neuer `typecheck`-Step vor dem Build. **Repo-Secrets muss der User
      selbst anlegen** -- ohne sie baut CI ohne Markenassets.
- [x] **B.4 `src/scss/layers.scss`** (neu): `@layer bootstrap, db-ux, bridge, app;` als
      allererster Import; `styles.scss` kapselt den Bootstrap-Import in `@layer bootstrap`.
- [x] **B.5 `src/scss/db-ux.css`** (neu): `db-theme/build/styles/rollup.css` und
      `core-components/build/styles/bundle.css`, beide `layer(db-ux)`.
- [x] **B.6 `main.ts`:** Importreihenfolge `layers.scss` -> `db-ux.css` -> `styles.scss`.
- [x] **B.7 `src/scss/bridge.css`** (`@layer bridge`): die real genutzten `--bs-*` auf
      DB-Tokens mappen (inkl. der Subtle-/Emphasis-Varianten aus `customtable.css`).
- [x] **B.8 `BSColorToggler.ts`** erweitern (nicht ersetzen): zusaetzlich `color-scheme` am
      `<html>`; `data-density="regular"` in `index.html`.
- [x] **B.9 Fonts:** DB Screen Sans in Preload (`unplugin-inject-preload`) und Precache;
      `globPatterns` eingrenzen (Spike: 32 woff2 / ~1,8 MB kaemen sonst zum heutigen
      3,2-MB-Precache dazu).

## Verifikationskriterien (B)

- `bun run build` gruen; `grep -o 'light-dark(' dist/assets/*.css | wc -l` deutlich > 800
  (nicht `grep -c` -- minifiziertes CSS ist eine Zeile).
- `bun run typecheck`, `bun run lint`, `bun run test` weiter gruen.
- Precache-Groesse bewusst gepruefte Zahl (Ausgabe von `vite-plugin-pwa`).
- `verify`-Skill: Screens optisch unveraendert bis auf Markenfarbton, Dark/Light in beiden
  Modi (Toggle + OS-Automatik), `--db-*`-Tokens am `:root` vorhanden.

## Review (B)

**Ergebnis 2026-09-06:** `typecheck`/`lint`/`test` (2070/0)/`build` gruen. Gebautes CSS
1,56 MB roh / 118 KB gz (vorher 35 KB gz -- die 84 KB gz aus dem Spike bestaetigt).
`grep -o 'light-dark(' dist/assets/*.css | wc -l` = **870**, der Minifier-Fall aus Phase 0
tritt mit `cssMinify: 'esbuild'` also nicht ein. Precache 59 Eintraege / 4,9 MB (ohne die
Font-Ausnahmen waeren es 87 / 6,5 MB; Ausgangswert vor Phase B: 43 / 3,4 MB -- der Rest ist
das DB-CSS selbst).

**Browser (Chrome headless):** Layer-Reihenfolge im CSSOM `bootstrap, db-ux, bridge, app`;
`--db-adaptive-bg-basic-level-1-default` und `--db-brand-origin-default` loesen am `:root` auf;
Body-Hintergrund/-Text wechseln in Hell (`#fff`/`#16181b`) und Dunkel (`#16181b`/`#edeef0`),
Auto-Modus behaelt `color-scheme: light dark`; Schrift ist "DB Neo Screen Sans";
`.btn-primary` ist DB-Rot `rgb(236, 0, 22)`. Die A1-Smokes (Feature-Tabs, Modal-Pfad) laufen
unveraendert 17/17 gruen, 0 Konsolenfehler.

**Nachtrag zum Plan:** Die Bridge allein faerbt die Bootstrap-Komponenten nicht um -- Bootstrap
kompiliert `--bs-btn-bg` & Co. aus der SCSS-Variablen `$primary`, ein `var()`-Override am
`:root` erreicht sie nie. Deshalb zusaetzlich `$primary: #ec0016` (= `--db-brand-origin-default`,
in beiden Modi identisch) vor dem Bootstrap-Import. Ohne das waere "optisch unveraendert bis
auf Markenfarbton" nicht erfuellt gewesen, weil alle Buttons Bootstrap-Blau geblieben waeren.

**Offen / bewusst nicht in B:** `--bs-btn-*` und die Radius-Variablen bleiben Bootstrap
(Phase C/H). Die GitHub-Repo-Secrets `ASSET_PASSWORD`/`ASSET_INIT_VECTOR` sind **noch nicht
angelegt** -- bis dahin baut CI ohne Markenassets (Build gruen, aber Systemschrift statt
DB Neo Screen Sans). Das DB-CSS ist als Ganzes im Bundle; Ausduennen erst in Phase I, wenn
feststeht, welche Komponenten wirklich genutzt werden.

---

# Aktueller Plan: DB-UX-Migration -- Phase A1 (Preact -> React 19) - 2026-09-05

## Kontext

Gesamtplan `tasks/plan-db-ux-migration.md`, Phase A1. Groesste Risikophase: Framework-Wechsel
**ohne** DB-UX-Code, damit React-19-Umstellung und Design-System-Umstellung getrennt
verifizierbar bleiben. Branch `feat/db-ux`.

**Wichtig:** A1 stellt nur die *App* auf React um; die 33 Preact-rendernden Testdateien
gehoerten zu **A2**. Geplant war ein roter `bun run test` zwischen beiden Phasen --
tatsaechlich lief A2 in derselben Sitzung direkt hinterher, der rote Zwischenstand wurde also
nie committet. Verifikationsanker fuer A1 sind `typecheck` + `build` + `verify`-Skill.

Inventur (2026-09-05, gemessen): 48 Dateien importieren aus `preact`, 37 aus `preact/hooks`,
3 aus `preact/compat`. Symbole: `createRef` 19x, `render` 12x, `FunctionalComponent` 12x,
`RefObject`/`ComponentChild` je 3x, `Fragment`/`ComponentChildren`/`Component`/
`GenericEventHandler` je 2x, `VNode`/`Ref`/`MouseEventHandler`/`JSX`/`h` je 1x.
Hooks: `useState` 32x, `useEffect` 25x, `useMemo` 7x, `useRef` 6x.

## Plan -- FERTIG (2026-09-06)

- [x] **A1.1 Deps + Config.** Rein: `react@19.2.8`, `react-dom@19.2.8`, `@types/react`,
      `@types/react-dom`, `@vitejs/plugin-react-swc@4.3.3`, `esbuild@0.28.2`. Raus: `preact`,
      `@preact/preset-vite`. `trustedDependencies: ["@swc/core"]`. `vite.config.ts`:
      `preact({...})` -> `react()`. `tsconfig.json`: `jsxImportSource: "react"`,
      `types: ["bun-types","react","react-dom"]`.
- [x] **A1.2 `infrastructure/ui/reactRoot.ts`** (neu): `WeakMap<Element, Root>`-Cache,
      `mount(el, node)` / `unmount(el)`, Rendern per `flushSync`. Der bestehende Code liest
      direkt nach dem Rendern aus dem DOM (Bootstrap-Modals, CustomTable, Signatur-Dialog) --
      Preacts `render` war synchron, `root.render` ist es nicht. Barrel `ui/index.ts` mitgezogen.
- [x] **A1.3 Import-Codemod** (74 Dateien): `preact`/`preact/hooks` -> `react`,
      `preact/compat`-`createPortal` -> `react-dom`, `FunctionalComponent`->`FC`,
      `ComponentChild(ren)`->`ReactNode`, `VNode`->`ReactElement`; `import 'preact/debug'` und
      der `@jsxImportSource preact`-Pragma raus. Grep-Gate: 0 Treffer fuer `preact` in `src/`.
- [x] **A1.4 Handverlesen:** `h()` -> `createElement` (`generateEingabeMaskeEinstellungen.ts`),
      `GenericEventHandler` -> React-Handler, `preact.JSX.Element` -> `React.JSX.Element`,
      DOM-`MouseEvent`/`PointerEvent`-Parameter auf die React-Typen (alias-importiert, wo der
      DOM-Typ im selben Modul weiterlebt), `canvasKoordinate` nimmt nur noch `{clientX, clientY}`.
- [x] **A1.5 JSX-Attribut-Codemod:** 1301x `class=`->`className=`, 25x `for=`->`htmlFor=`,
      128x String-`style="a: b"` -> `style={{ a: 'b' }}`. Der Codemod maskiert String- und
      Template-Literale, damit die DOM-String-Templates (`EwtTab.tsx`) unberuehrt bleiben --
      drei Dateien mussten wegen deutscher Anfuehrungszeichen (`„X"`) im JSX-Text nachgezogen
      werden, weil das lose `"` die Maskierung verschob.
- [x] **A1.6 `render()`-Aufrufstellen** (12 Dateien) auf `mount`/`unmount`. In
      `ConflictReviewBanner.tsx` hiess der Parameter selbst `mount` -> `container`.
- [x] **A1.7 Refs, Events, Controlled Inputs.** `RefObject<T>` -> `RefObject<T | null>`
      (React-19-`createRef`). `onSubmit` als `SubmitEventHandler`, Handler-Fabriken auf
      `SubmitEvent<HTMLFormElement>`. Alle 79 JSX-`onInput=` -> `onChange=` (React fuehrt
      `onChange` ueber das Value-Tracking; `value` ohne `onChange` waere ein Read-only-Feld).
      `MyInput`/`MyCheckbox`/`MySelect` schalten ohne Handler auf `defaultValue`/`defaultChecked`
      um -- das ist die Preact-Semantik "Vorbelegung, Endwert per Ref aus dem DOM".
      `<option selected>` -> `defaultValue` am `<select>`; die zwei Hidden-Inputs in
      `createEditorModalVE.tsx` sind jetzt `readOnly`. Fehlende `key`s in `AdminLogBrowser`
      (Fragment statt `<>`) und `createShowModalBereitschaft` ergaenzt.
- [x] **A1.8 ESLint:** `eslint-plugin-react` (flat + `jsx-runtime`) und
      `eslint-plugin-react-hooks@7` ergaenzt. `settings.react.version` fest auf `19.2` --
      `detect` laesst Plugin 7.37 unter ESLint 10 abstuerzen (`context.getFilename` fehlt).
      `react/no-unescaped-entities` aus (deutsche Anfuehrungszeichen sind gewollt),
      `react/prop-types` aus (TypeScript). Die neuen Compiler-Regeln
      `react-hooks/set-state-in-effect` (13x) und `react-hooks/refs` (5x) stehen bewusst auf
      `warn` -- sie treffen Muster, die unter Preact korrekt waren.
- [x] **A1.9 Bundle:** `manualChunks` als Funktion (Rolldown), `react`-Vendor-Chunk =
      **189,6 KB / 59,6 KB gz**; `build.cssMinify: 'esbuild'` gesetzt.

## Verifikationskriterien (A1)

- `bun run typecheck` exit 0 (Fortschrittsmetrik waehrend der Umstellung: Fehlerzahl).
- `bun run lint` exit 0 (mit den neuen react/react-hooks-Regeln).
- `bun run build` exit 0; `react`-Vendor-Chunk vorhanden; Zuwachs ~+55 KB gz erwartet.
- `verify`-Skill: kompletter Klickpfad -- alle Tabs, je ein Add/Edit/Show-Modal pro Feature,
  Admin-Panel, Login/Register/Reset-Modals, Signatur-Dialog; Dark/Light; Mobile-Viewport;
  Deep-Link `#EWT`.
- Grep-Gate: `from 'preact` = 0 in `src/`.
- **Bewusst NICHT gruen in A1:** `bun run test` (Testsuite folgt in A2).

## Review (A1)

**Ergebnis 2026-09-06:** `bun run typecheck` 0 Fehler (src **und** test), `bun run lint`
0 Fehler / 26 Warnungen (die bewusst weichgestellten Compiler-Regeln + `exhaustive-deps`),
`bun run build` gruen mit `react`-Chunk, `bun run test` **2070/0**. A2 ist mitgelaufen
(eigener Abschnitt unten), `release:check` ist also komplett gruen -- der geplante rote
Zwischenzustand hat sich auf diese eine Sitzung beschraenkt.

**Browser-Verifikation** (Vite-Dev + Chrome headless, `verify`-Skill, ohne Backend):
Ohne erreichbares Backend laeuft der Auth-Lifecycle nicht an, die Feature-Tabs mounten also
nicht von selbst; die Smokes importieren die Module deshalb direkt im Seitenkontext.

- `mount`/`unmount`/Remount je Feature-Tab (Bereitschaft 70 Knoten, EWT 52, Neben 40, EA 39),
  nach `unmount` jeweils 0 Knoten, zweites `mount` auf demselben Container funktioniert
  (Root-Cache).
- `showModal`: Titel, Body und Submit-Button stehen **direkt nach dem Aufruf** im DOM und
  `myRef.current` ist gesetzt (Beleg fuer `flushSync`); Submit feuert; Schliessen raeumt den
  Container leer (`innerHTML.length === 0`), keine offenen Modals.
- Hilfe-Modal, Konflikt-Banner, Einstellungen-Panels (`createElement`-Pfad), Theme-Wechsel
  dunkel/hell, Mobile-Viewport: alle gruen.
- Vorbelegte Felder bleiben editierbar: `value="vorbelegt"` + Tippen -> `vorbelegtX`,
  Checkbox-Klick schaltet um, `<select>` wechselt die Auswahl. Keine React-Warnung im Log.
- Grep-Gate `class=`/`for=` im gerenderten DOM: nur die 54 `label[for]` aus dem statischen
  `index.html`, 0 leere `class`-Attribute.
- Konsolenfehler ausschliesslich Netzwerk (CORS/`ERR_CONNECTION_REFUSED` gegen die Dev-API),
  0 React-Fehler oder -Warnungen.

**Offen / bewusst verschoben:** die 26 Lint-Warnungen (`set-state-in-effect`, `refs`,
`exhaustive-deps`) sind echte React-19-Hinweise auf Preact-Muster und gehoeren in eine eigene
Aufraeum-Phase. Der Klickpfad mit echtem Backend (Login, Speichern, PDF) ist nicht abgedeckt.

---

# Aktueller Plan: DB-UX-Migration -- Phase A2 (Testsuite auf React) - 2026-09-06

## Plan -- FERTIG

- [x] **A2.1 Render-Helfer** `test/reactRender.ts`: `render(node, container)` in
      Preact-Signatur auf Basis der echten `mount`/`unmount`, dazu `setzeWert`,
      `klickeCheckbox`, `inputMock`, `huelleMock`.
- [x] **A2.2 Import-Codemod** ueber 32 Testdateien: `preact`-Importe auf `react` bzw. den
      Render-Helfer, `h` -> `createElement as h`, `ComponentChild(ren)` -> `ReactNode`.
- [x] **A2.3 Event-Simulation an React angepasst.** Drei Klassen von Faellen:
      - Checkbox: `el.checked = x` + `change`-Event erreicht React nicht (React haengt an
        `click`) -> `klickeCheckbox`.
      - Textfeld: `el.value = x` aktualisiert Reacts Value-Tracker mit, das folgende
        `input`-Event gilt dann als "keine Aenderung" -> `setzeWert` schreibt ueber den
        nativen Prototyp-Setter.
      - `pointerenter` bubbelt nicht; React leitet `onPointerEnter` aus `pointerover` ab.
- [x] **A2.4 Test-Doubles React-tauglich:** `h('input', props)` reichte `children` an ein
      Void-Element durch (React wirft), Props wie `myRef`/`submitText` landeten als
      DOM-Attribute, Array-Kinder ohne `key`. Ersetzt durch `inputMock`/`huelleMock`,
      `class:` -> `className:`.
- [x] **A2.5 `Admin.lifecycle`-Test** mockt statt `preact.render` jetzt
      `@/infrastructure/ui/reactRoot`.

## Verifikationskriterien (A2)

- `bun run test` gruen: **2070 pass / 0 fail** (vorher 2069 -- ein zusaetzlicher Test fuer
  den gesteuerten `MyInput`-Fall).
- **0 React-Warnungen** im Testlauf (Start: 115 -- 102x `value` ohne `onChange`, dazu
  fehlende `key`s, `Invalid DOM property class`, unbekannte DOM-Props).
- `bun run typecheck` und `bun run lint` gruen, `bun run release:check` damit komplett gruen.

## Review (A2)

Der Testlauf war der eigentliche Fund der Phase: die 102 `value`-ohne-`onChange`-Warnungen
haben gezeigt, dass die Modals ihre Felder als **Vorbelegung** nutzen und den Endwert per Ref
aus dem DOM lesen. In React waere das ein schreibgeschuetztes Feld gewesen -- die Umstellung
auf `defaultValue`/`defaultChecked` in `MyInput`/`MyCheckbox`/`MySelect` ist deshalb kein
Kosmetik-Fix, sondern verhindert eine echte Regression (nicht mehr editierbare Modalfelder).
Der Browser-Test oben belegt das Verhalten.

`test/components/MyInput.test.tsx` erwartete Preact-Semantik (`value`-Prop schreibt beim
Re-Render ins DOM). Der Test prueft jetzt beide Faelle getrennt: ohne Handler bleibt der
getippte Wert stehen, mit `onChange` folgt das Feld dem Prop.

---

# Aktueller Plan: DB-UX-Migration -- Phase 0 (Toolchain-Gate) - 2026-09-05

## Kontext

Gesamtplan: `tasks/plan-db-ux-migration.md` (Preact 10 -> React 19, Bootstrap 5.3 -> DB UX
Design System v5.3.0, mehrmonatig). Diese Sektion ist das Phasen-Log dazu.

Prueflauf des Gesamtplans (2026-09-05): Ansatz solide, externe DB-UX-Annahmen verifiziert
(Pakete 5.3.0 / db-theme 6.2.0, React-19.2-Ziel, keine peerDeps, `DBDrawer` statt Modal,
keine DataTable). Der alte `Status (2026-09-03)`-Block war falsch -- markierte Phase-0-Arbeit
als erledigt, die auf `dev` nicht existierte. Mehrere Scope-Zahlen zu niedrig. Alles in der
Plan-Doku korrigiert.

Phase 0 selbst: reines Toolchain-Gate, keine Verhaltensaenderung, kein React-/DB-UX-Code.

## Plan

- [x] Branch `feat/db-ux` von `origin/dev` (Frontend-Submodul).
- [x] `typecheck`-Script (`bunx --bun tsc --noEmit`) in `package.json`, `release:check`
      vorangestellt (`typecheck && lint && test && build`).
- [x] Plan-Doku `tasks/plan-db-ux-migration.md` korrigiert (Status, Scope-Zahlen A/F/H,
      Phantom-Angaben, DB-UX-Doku-URLs v5.3.0).
- [x] Vorgefundenen Testreihenfolge-Flake behoben: `test/core/bootstrap.test.ts` pinnt
      `document.readyState='complete'` (wie die Schwester-Dateien). Vorher 2068/1 auf
      `origin/dev`, jetzt 2069/0 reihenfolge-unabhaengig.
- [x] `CHANGELOG.md` Eintrag (52).
- [x] `feat/db-ux` gepusht; Parent-`main`-Divergenz per Rebase aufgeloest und gepusht
      (`6470ce8`), `feat/db-ux-migration` auf `main` rebased + force-gepusht (`f69eefe`).
- [x] **Wegwerf-Spike** durchgefuehrt (ausserhalb des Repos, nicht gemergt): React 19.2.8 +
      `@db-ux/*` 5.3.0 + `db-theme` 6.2.0 mit echten Credentials, Bundle gemessen.
      Ergebnisse in `tasks/plan-db-ux-migration.md`, Abschnitt "Spike-Ergebnisse".
- [ ] `.env.example` -- im Sandbox durch Deny-Rule blockiert, in Phase B mit `scripts/install.sh`.
- [ ] Parent-Submodul-Gitlink-Bumps (backend/shared/frontend) -- haengen am naechsten
      dev->main-Release je Submodul, bewusst separat.

## Spike-Kernbefunde (2026-09-05)

1. `trustedDependencies` braucht **alle vier** db-theme-Pakete + `@swc/core` -- `@db-ux/db-theme`
   allein reicht nicht (Fonts/Icons sind transitive Pakete mit eigenem `postinstall`).
2. Entschluesselung funktioniert: 18 woff2, 3345 Icon-SVG, 247 illustrative SVG, 49 Theme-Bilder.
   `.enc`-Dateien bleiben daneben liegen (kein Fehler).
3. **Vite 8 = Rolldown: `manualChunks` nur als Funktion** -- Objektform bricht den Build.
4. `cssMinify: 'esbuild'` braucht `esbuild` als explizite devDependency (Vite 8 liefert es nicht mit).
5. **`light-dark()`-Falle bestaetigt:** Default-Minifier reduziert 867 -> 3 Vorkommen und
   definiert die Ersatzvariablen nur unter `[data-mode=...]`; mit `cssMinify:'esbuild'` bleiben 870.
6. Bundle: React-Runtime **59,6 KB gz** (Plan schaetzte +40), DB-UX-CSS **84 KB gz** (heute 35),
   Fonts 32 woff2 / 1,8 MB, dazu 12 Marken-Logo-SVG (~91 KB) ungewollt.
7. `DBDrawer` = natives `<dialog>`: `header`/`footer` als Props-Slots, `position:'fixed'` liefert
   `showModal()` mit echtem Fokus-Trap -- Phase-E-Verifikationspunkte grossteils nativ abgedeckt.
8. `npm ls react` im Minimalfall sauber dedupet trotz fehlender peerDeps; TS 6.0.3 typecheckt
   React 19 + DB-Komponenten fehlerfrei (kein TS-7-Zwang).

## Verifikationskriterien (Phase 0)

- `bun run typecheck` exit 0 (Script existiert).
- `bun run release:check` als Ganzes gruen: `lint` 0, `bun test` **2069 pass / 0 fail** (183
  Dateien), `bun run build` gruen.
- Voller `bun test`-Lauf reihenfolge-unabhaengig gruen (mehrfach + einzeln `test/core/`).
- `git diff` beruehrt nur: `package.json`, `tasks/plan-db-ux-migration.md`, `tasks/todo.md`,
  `CHANGELOG.md`, `test/core/bootstrap.test.ts`. Kein `src/**`, kein `vite.config.ts`.

## Review (Phase 0)

- Erledigt: Branch, `typecheck`-Gate, Plan-Korrekturen, Flake-Fix, Changelog, Push,
  Parent-Repo-Reconcile, Wegwerf-Spike. `release:check` gruen verifiziert
  (typecheck 0 / lint 0 / test 2069-0 / build ok).
- Offen (nicht blockierend): `.env.example`, Parent-Gitlink-Bumps (haengen am dev->main-Release).
- Der Spike hat vier Plan-Annahmen korrigiert (Punkte 1, 3, 4, 6 oben) und eine bestaetigt
  (Punkt 5, `light-dark()`). Phase A1, B und E in der Plan-Doku entsprechend nachgezogen.
- Phase 0 ist damit abgeschlossen; naechster Schritt ist Phase A1.

---

# Aktueller Plan: AutoSave-Commit-Race - Snapshot-basiertes Commit statt Live-Filter - 2026-08-05

## Kontext
Vertiefende Race-Condition-Pruefung nach dem AutoSave-Race-Fix vom 2026-08-03 (`queuedDuringSave`).
Der damalige Fix loeste zuverlaessig einen Folge-Save aus, aber `_commitCreateAndUpdate`
(`CustomTable.ts`) selbst filterte beim Commit weiterhin den *aktuellen* Live-Tabellenzustand
(`getEffectiveRowState`) statt eines Snapshots vom Request-Zeitpunkt. Zeilen, die waehrend eines
laufenden Save-Requests neu angelegt oder geaendert wurden, wurden dadurch von der Antwort des
VORHERIGEN Requests faelschlich mitcommittet — bei neuen Zeilen ohne `_id` (endgueltiger
Datenverlust), bei geaenderten Zeilen mit Verlust der zuletzt eingetippten Aenderung. Zusaetzlich
verschob eine liegen gebliebene Fehler-Zeile (`_state==='error'`, `_errorState==='new'`) die
Index-Zuordnung zwischen `changeTracking.ts` (Live-Re-Filter) und `_commitCreateAndUpdate`
(`getEffectiveRowState`-Filter) — beide filterten unabhaengig voneinander denselben Zustand.

## Plan
- [x] Bug-Mechanismus end-to-end nachvollzogen (`autoSave.ts` -> `changeTracking.ts` ->
      `CustomTable.ts`), Test-Luecke bestaetigt (`autoSave.test.ts` stubbt `commitAutoSave` als
      `vi.fn()`, deckt die echte Commit-Logik nicht ab)
- [x] `Rows.getChangeRows()` als gemeinsame Row-Referenz-Quelle ergaenzt, `getChanges()` darauf
      umgebaut (eine Filterlogik statt zwei unabhaengiger)
- [x] `commitChanges`/`commitAutoSave`/`_commitCreateAndUpdate` auf optionalen `includedRows`-Snapshot
      umgestellt — nur Zeilen aus dem Snapshot werden committet/entfernt
- [x] `mapCreatedIdsByClientRequestId`/`mapCreatedIdsByContent` (`changeTracking.ts`) und
      `collectRowErrorMatches` (`savePipeline.ts`) auf denselben Snapshot statt Live-Re-Filter
      umgestellt (Index-Verschiebung durch zwischenzeitliche Aenderungen behoben)
- [x] `markFetchErrorRows` (`errorHandling.ts`, Fehlerpfad) ebenfalls auf Snapshot umgestellt
- [x] `saveResourceNow` (`autoSave.ts`) verdrahtet: Snapshot einmalig vor dem Request, an alle
      Stellen durchgereicht
- [x] Betroffene Unit-Tests (changeTracking/errorHandling/savePipeline/autoSave) an neue Signaturen
      angepasst
- [x] Echte Regressionstests in `CustomTable.test.ts` ergaenzt (an der realen `Rows`-Klasse, nicht
      gemockt) — vorab gegen den alten Code verifiziert, dass sie ohne den Fix rot sind

## Verifikationskriterien (AutoSave-Commit-Race)
- Waehrend eines laufenden Saves neu angelegte Zeile bleibt nach `commitAutoSave` `new` ohne `_id`
  (statt faelschlich `unchanged`)
- Waehrend eines laufenden manuellen Saves geloeschte Zeile bleibt nach `commitChanges` erhalten
- `bunx tsc --noEmit`, `bun run lint`, `bunx prettier --check`, `bun run test` laufen gruen

## Review (AutoSave-Commit-Race)
- Ergebnis: Commit nach einem Bulk-Save basiert jetzt auf einem Row-Referenz-Snapshot vom
  Request-Zeitpunkt statt auf einem erneuten Live-Filter des aktuellen Tabellenzustands. Betrifft
  alle 4 Ressourcen (BZ/BE/EWT/N) gleichermassen, da `_commitCreateAndUpdate` fuer alle gemeinsam
  genutzt wird.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json`,
  `bun run lint`, `bunx prettier --check src/ test/`, `bun run test` -> `1388 pass, 0 fail`.

# Aktueller Plan: Weitere Ueberschneidungs-/Duplikat-Checks mit selbem Bug wie 2026-07-30-Fix - 2026-07-31

## Kontext
Nach dem Fix vom 2026-07-30 (BZ/EWT-Editor-Modal blockierte Ersatz-Anlage faelschlich wegen lokal
geloeschter, ungesynchter Zeilen) gezielt geprueft, ob dieselbe Bug-Klasse noch anderswo existiert.
Root Cause: alle 4 Resource-Getter (BZ/BE/EWT/N) sind strukturell identisch, keiner filtert
`__localState === 'deleted'` — der 2026-07-30-Fix patchte nur 2 Call-Sites inline statt die Getter.

## Plan
- [x] Alle Konsumenten der 4 Getter systematisch durchsucht und klassifiziert: Tabellen-Init/Reload
      (muss geloeschte Zeilen zeigen) vs. Validierung/Berechnung (muss sie ausschliessen)
- [x] `IDataQueryOptions.excludeDeleted?: boolean` (Default false, rueckwaertskompatibel)
- [x] Filter in allen 4 Gettern (`getBereitschaftsZeitraumDaten`, `getBereitschaftsEinsatzDaten`,
      `getEwtDaten`, `getNebengeldDaten`) eingebaut
- [x] Echte Bug-Stellen gefixt: BE-Konflikt-Checks (`hasOverlap`/`hasLre12TooClose`/`hasConflictingLre1`),
      BZ-Delete-Guard (`countLinkedEinsaetze`/`beImZeitraum`), BZ-Coverage (`classifyBzCoverage`,
      3 Stellen), N-Tag-Disable (`createAddModalNeben`), EWT-Verknuepfung (`createEditorModalNeben`),
      naechster-freier-Tag (`setNaechsterEwtTag`), Zulagen-Jahressumme (`calculateZulagenBreakdown`)
- [x] BZ-/EWT-Editor-Modal: Inline-Checks vom 2026-07-30-Fix auf neue Getter-Option umgestellt
- [x] Bewusst unveraendert: Tabellen-Init (`rows:`), `recalculateEwtMonat`-Reload, `overwriteUserDaten`
      (Server-Daten ohne `__localState`)
- [x] Tests: `EWT.getEwtDaten.test.ts` +1 Fall, `Bereitschaft.submitBereitschaftsEinsatz.test.ts`
      Assertion ergaenzt; `tsc`/Lint sauber, Suite 1306 gruen

## Review (2026-07-31)
- Ergebnis: 7 weitere, bislang ungetestete Stellen mit derselben Bug-Klasse gefixt (BE-Overlap/LRE-Checks,
  BZ-Delete-Guard, BZ-Coverage, N-Tag-Disable, EWT-Verknuepfung, naechster-freier-Tag, Zulagen-Summe).
  Fix jetzt an der Wurzel (Getter-Option) statt pro Call-Site — verhindert Wiederholung des Musters.
- Verifikation: `bunx tsc --noEmit` sauber, `bun run lint` sauber, `bun run test` → 1306 pass / 0 fail.
- Details siehe `CHANGELOG.md` Eintrag 2026-07-31.

---

# Aktueller Plan: Speichern nach Löschen – Ersatz-Zeitraum faelschlich als Ueberschneidung blockiert - 2026-07-30

### Problem

User-Report: Wird ein BZ-/EWT-Datensatz gelöscht und direkt danach ein überschneidender Ersatz
angelegt, schlägt das Speichern fehl, weil die Löschung noch nicht synchronisiert ist.

### Root Cause (zwei Stellen)

1. **Lokaler Ueberschneidungs-Check blockiert sofort:** `createEditorModalBereitschaftsZeit.tsx`
   / `createEditorModalEWT.tsx` vergleichen gegen `getBereitschaftsZeitraumDaten()`/`getEwtDaten()`
   (Storage-Snapshot) — der liest auch lokal bereits geloeschte, aber noch nicht gesendete Zeilen
   (`__localState: 'deleted'`) mit ein. Die eigene, gerade erst lokal geloeschte Zeile blockierte
   damit den Ersatz-Eintrag direkt im Modal.
2. **AutoSave kann denselben Konflikt serverseitig auslösen:** AutoSave sendet Löschungen bewusst
   nie automatisch mit (nur manuelles Speichern, Kommentar in `autoSave.ts`). Ohne Guard hätte
   AutoSave eine ueberschneidende Neuanlage trotzdem senden können, waehrend der Server die
   (lokal bereits geloeschte) alte Zeile noch kennt → vermeidbarer 422 im Hintergrund.

### Plan

- [x] Teil A: `__localState === 'deleted'` in beiden lokalen Ueberschneidungs-Checks ausschließen
- [x] Teil A (Ergänzung, User-Hinweis): EWT-Editor reaktiviert beim Neuanlegen eine zum Löschen
      vorgemerkte, zeitlich überschneidende Zeile (`undoDelete()` + `val()`) statt eine zweite
      anzulegen — analog `addEwtTag.ts`; erhält `_id` (Nebengeld-`ewtRef` verwaist nicht). BZ hat
      denselben Verlinkungsfall potenziell (`Bereitschaftseinsatz.Bereitschaftszeitraum`), wurde
      hier aber nicht mit umgesetzt (nicht angefragt) — als bekannte Anschlussmöglichkeit vermerkt.
- [x] Teil B: `infrastructure/autoSave/overlapGuard.ts` (neu) — erkennt Zeitfenster-Ueberschneidung
      zwischen ausstehenden Neuanlagen/Aenderungen und ausstehenden, ungesyncten Loeschungen
      (BZ/EWT; BE/N bewusst ausgenommen, LRE-Adjazenzregeln zu riskant zum Duplizieren)
- [x] `errorHandling.ts`: `markOverlapBlockedRows` (rote Zeile/Tooltip/Modal-Banner wie echte
      Server-Fehler, aber ohne Server-Request)
- [x] `autoSave.ts`: Guard vor `saveResourceNow` bei `includeDeletes=false`; neuer `'blocked'`-Status;
      manuelles Speichern (`includeDeletes=true`) bleibt unberührt vom Guard
- [x] `TSaveStatus` + `autoSaveIndicator.ts`: `'blocked'`-Badge (gelb, `warning`-Icon)
- [x] Tests: `overlapGuard.test.ts` (neu, 8 Fälle), `autoSave.test.ts` (+2), `autoSaveIndicator.test.ts` (+2)
- [x] `frontend/CHANGELOG.md` aktualisiert

### Verifikationskriterien

- `bun run test` (1304 grün), `bunx tsc --noEmit -p tsconfig.json`, `bun run lint`,
  `bun run format:check` (bis auf 2 vorbestehende, nicht angefasste Dateien) alle grün
- Gezielte Tests: AutoSave sendet bei Ueberschneidung mit ungesyncter Löschung nichts und markiert
  die Zeile; manuelles Speichern sendet Delete+Create trotzdem zusammen (Server verarbeitet
  Loeschungen zuerst, siehe Backend-Plan „Bulk-Reihenfolge" vom 2026-07-17)

### Review

- Bewusst KEINE partielle Exklusion einzelner Zeilen aus dem AutoSave-Batch: `Rows.getChanges()`/
  `_commitCreateAndUpdate()` zählen `createIdx` über die EFFEKTIVE Zeilen-Reihenfolge (inkl.
  Fehler-Zeilen via `_errorState`) — ein Ausschluss nur einzelner Zeilen haette die Index-Zuordnung
  zwischen `createdIds`-Map und Commit-Loop fuer alle NACHFOLGENDEN Zeilen verschoben (stille
  Fehlzuordnung von IDs, im schlimmsten Fall Datenverlust durch faelschliches `_state='unchanged'`
  ohne `_id`). Stattdessen haelt der Guard bei einer Ueberschneidung die GESAMTE Ressource fuer
  diesen AutoSave-Zyklus zurueck (kein `sendBulk`-Aufruf, keine Commit-Logik beruehrt) — grobere
  Granularitaet, aber ohne Aenderung an der bestehenden, gut getesteten Commit-Pipeline.
- `getEwtWindow`-Logik (Tagesuebertrag bei Nachtschichten) bewusst lokal in `overlapGuard.ts`
  dupliziert statt aus `features/EWT/utils/` importiert: `infrastructure/` darf laut
  Architekturregel nicht von `features/` abhaengen. Klein und stabil genug (~10 Zeilen reine
  dayjs-Arithmetik), um das Duplikationsrisiko gegenüber einem Layer-Verstoß hinzunehmen.
- BE (Bereitschaftseinsatz) bewusst nicht abgesichert: Overlap-Regeln dort sind LRE-typ- und
  Adjazenz-abhängig (`bereitschaftseinsatz.service.ts`), eine Frontend-Replikation wäre riskant
  und fehleranfällig. Bekannte Restlücke, kein blockierendes Risiko für den gemeldeten Fall.

# Aktueller Plan: Einstellungen → Fahrzeiten als editierbare Liste (Add/Delete/Reorder) - 2026-07-16

### Plan

- [x] State-Bridge `fahrzeitPanelState.ts` analog `arbeitszeitPanelState.ts` anlegen
- [x] Preact-Island `FahrzeitenPanel.tsx` mit „Zeile hinzufügen", Löschen pro Zeile, ↑/↓-Verschieben, Live-Validierung und Empty-State erstellen (Vorlage: Admin-Fahrzeit-Editor)
- [x] `index.html`: statische Fahrzeiten-Tabelle durch `<div id="fahrzeiten-panel">` ersetzen
- [x] `generateEingabeMaskeEinstellungen.ts`: `populateTable` (3 fixe Leerzeilen) durch `renderFahrzeitenPanel` mit Remount-Key ersetzen
- [x] `saveEinstellungen.ts`: DOM-Scraping (`table_to_array_einstellungen`) durch Bridge-Read ersetzen
- [x] SCSS: Aktions-Buttons im Mobile-Karten-Layout stylen
- [x] Tests anpassen (saveEinstellungen, generateEingabeMaske, mockData) + neuer FahrzeitenPanel-Test
- [x] Scope-Erweiterung (User-Entscheid): Beschreibung (`text`) optional — FE (collectFahrzeiten, Panel-Validierung, Admin-Filter) + BE (Zod, Mongoose UserProfile/ProfileTemplate) + Tests
- [x] CHANGELOG.md (FE + BE) aktualisieren

### Verifikationskriterien

- `bun run lint`, `bun run test`, `bun run build` laufen sauber
- Einstellungen → Fahrzeiten: keine fixen Leerzeilen mehr; Hinzufügen/Löschen/Verschieben funktioniert; Teilzeile → `is-invalid` + Speichern bricht mit Snackbar ab; Leerzeilen werden beim Speichern gestrippt; Reihenfolge landet im PUT-Payload

### Review

- Ergebnis: Fahrzeiten-Editor als Preact-Island mit Add/Delete/↑↓-Reorder, Live-Validierung, „optional"-Beschreibung und Empty-State. Verhaltensverbesserung: Zeilen ohne Tätigkeitsstätte, aber mit Daten, werden nicht mehr still verworfen, sondern blockieren das Speichern mit feldgenauer Snackbar.
- Verifikation: FE `bunx tsc --noEmit` + `bun run lint` + `bun run test` (1276 grün) + `bun run build`; BE `bunx tsc --noEmit` + `bun run lint` + `bun run test` (610 grün). End-to-end: Vite-Dev-Server + Chrome headless (puppeteer-core), 12 Checks grün — Rendern ohne Leerzeilen, Add+Fokus, Live-Validierung (Beschreibung nie rot), Move/Randpositionen, Delete, Save-Block bei Teilzeile inkl. Snackbar, Persistenz (Reihenfolge + leere Beschreibung) in localStorage, Empty-State, Mobile-Karten-Layout. Rezept in `.claude/skills/verify/SKILL.md` festgehalten.
- Hinweis: PUT `user-profiles/me` wurde offline nicht abgesetzt (kein Backend im Test); die Persistenzsemantik ist über `Storage.set` (identischer Datenpfad vor dem PUT) abgedeckt. Backend-Zod/Mongoose akzeptieren leere Beschreibung nachweislich per Schema-Tests.

# Aktueller Plan: Bereitschafts-Modal um aktive Overrides und Sonder-Block erweitert - 2026-06-21

### Plan

- [x] Nur aktive Wochenschicht-Overrides anzeigen und Sonderschicht als eigenen Arbeitszeit-Block einbinden
- [x] Bereitschaftsberechnung und Vorbelegung auf den Sonder-Zeitraum umstellen
- [x] Betroffene Bereitschafts-Tests, Typecheck, Lint und Format der geänderten Dateien gegenprüfen

### Verifikationskriterien

- Das Bereitschafts-Modal bietet nur Overrides fuer aktive Wochenschichten und einen separaten Sonder-Arbeitszeit-Block
- `calculateBereitschaftsZeiten`, `applyBereitschaftsVorgabe`, `updateBereitschaftsDatum` und `submitBereitschaftsZeiten` behandeln Sonder nur innerhalb des gewaehlten Bereichs
- Die betroffenen Bereitschafts-Tests und der Frontend-Typecheck laufen sauber; formatierte Bereitschaftsdateien bestehen den Prettier-Check

### Review

- Ergebnis: Die Sonderschicht ist jetzt als zeitlich begrenzter Sonderfall umgesetzt. Das Modal zeigt nur aktive Wochenschicht-Overrides und bietet fuer Sonder einen eigenen Arbeitszeit-Block; die Berechnung nutzt den Sonderpfad nur innerhalb dieses Bereichs.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/Bereitschaft.calculateBereitschaftsZeiten.overrides.test.ts test/Bereitschaft.resolveBereitschaftsGrenze.test.ts test/Bereitschaft.utils.extra.test.ts`; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json`; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint`; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx prettier --check src/ts/features/Bereitschaft/components/BereitschaftOverridePanel.tsx src/ts/features/Bereitschaft/components/createAddModalBereitschaftsZeit.tsx src/ts/features/Bereitschaft/utils/applyBereitschaftsVorgabe.ts src/ts/features/Bereitschaft/utils/calculateBereitschaftsZeiten.ts src/ts/features/Bereitschaft/utils/resolveBereitschaftsGrenze.ts src/ts/features/Bereitschaft/utils/submitBereitschaftsZeiten.ts src/ts/features/Bereitschaft/utils/updateBereitschaftsDatum.ts test/Bereitschaft.calculateBereitschaftsZeiten.overrides.test.ts test/Bereitschaft.resolveBereitschaftsGrenze.test.ts test/Bereitschaft.utils.extra.test.ts`.
- Hinweis: Der komplette `bun run format:check` meldet weiterhin vorbestehende Abweichungen in anderen, unberuhrten Frontend-Dateien; die von dieser Aufgabe beruhrten Bereitschafts-Dateien sind sauber formatiert.

# Todo

## Aktueller Plan: Arbeitszeit-Status wird im localStorage nicht auf inaktiv gespeichert - 2026-06-21

### Plan

- [x] Fehlerpfad zwischen Arbeitszeit-Panel, Panel-State und localStorage-Persistenz eingrenzen
- [x] Toggle-Update im Arbeitszeit-Panel auf den tatsaechlich gewaehlten Status korrigieren
- [x] Frontend-Checks fuer die betroffene Aenderung ausfuehren und Ergebnis dokumentieren

### Verifikationskriterien

- Das Umschalten von aktiv auf inaktiv bleibt im Panel-State erhalten und wird via `Storage.set('VorgabenU', ...)` unveraendert in den localStorage geschrieben
- `bunx tsc --noEmit -p tsconfig.json`, `bun run lint`, `bun run format:check` laufen fuer das Frontend ohne neue Fehler

### Review

- Ergebnis: Die Parent-Update-Handler im `ArbeitszeiteingabePanel` uebernehmen fuer `frueh`, `spaet`, `nacht` und `sonder` jetzt den vom Child gelieferten Zustand unveraendert. Damit wird `aktiv: false` beim Umschalten nicht mehr direkt wieder invertiert und anschliessend falsch nach `VorgabenU.aZ` in den localStorage geschrieben.
- Ergebnis: Der vom User gelieferte Payload/Response bestaetigt, dass `spaet.aktiv = false` korrekt zum Server gesendet und korrekt vom Server zurueckgegeben wird. Die verbleibende Ursache lag damit im Frontend-State-Zugriff: `saveEinstellungen()` las einen globalen Panel-State, der bislang nur asynchron im `useEffect` nachgezogen wurde.
- Fix: Der Arbeitszeit-Panel-State wurde in die neue Datei `components/arbeitszeitPanelState.ts` entkoppelt. `ArbeitszeiteingabePanel` synchronisiert diesen Store jetzt sofort beim lokalen Update, und `saveEinstellungen()` liest ihn direkt von dort statt ueber das Komponenten-Barrel. Damit wird ein frischer Toggle auch bei schnellem Speichern konsistent in `VorgabenU` und spaeter via Serverresponse im localStorage gehalten.
- Begleitend: Ein Regressionstest in `test/Einstellungen/saveEinstellungen.test.ts` deckt den Fall „gerade auf inaktiv umgeschaltet und sofort gespeichert“ ab.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json`; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint`; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/Einstellungen/saveEinstellungen.test.ts`; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test` → **974 pass / 0 fail**; zusaetzlich `bunx prettier --check` fuer die geaenderten Dateien inkl. `arbeitszeitPanelState.ts`.

## Aktueller Plan: Unterbrechungspunkt Admin-Tab Profile-Template Arbeitszeit - 2026-06-08

### Bereits umgesetzt (Zwischenstand)

- [x] `ArbeitszeiteingabePanel` um optionales `onChange` erweitert, damit es auch im Admin-Editor als Eingabekomponente nutzbar ist
- [x] Typmodell im Admin-Template-Editor vorbereitet: `TemplateContentDraft.Arbeitszeit` von legacy Record auf `IVorgabenUaZ | null` umgestellt
- [x] `AdminProfileTemplateContentEditor` von legacy Arbeitszeit-Feldliste auf `ArbeitszeiteingabePanel` umgestellt (inkl. Aktivieren-Button)

### Offene TODOs (beim Fortsetzen)

- [x] `AdminProfileTemplatesManager` auf neues Arbeitszeitmodell fertig migrieren:
  - `normalizeTemplateContent` fuer `Arbeitszeit` mit `isLegacyArbeitszeit`/`migrateArbeitszeit` auf `IVorgabenUaZ | null`
  - `serializeDraft` fuer neues Arbeitszeitobjekt stabilisieren
  - `buildTemplatePayload` so anpassen, dass `Arbeitszeit` als neues Objekt gespeichert wird und `null` den Block entfernt
  - Handler `updateArbeitszeitField` durch `updateArbeitszeit`/`enableArbeitszeit` ersetzen
  - Prop-Wiring in `AdminProfileTemplateContentEditor` an neue Handler anpassen
- [x] `AdminProfileTemplateContentEditor` auf verbleibende Legacy-Referenzen pruefen (insb. alte Arbeitszeit-Propnamen) und bereinigen
- [x] Frontend-Typecheck ausfuehren: `bunx tsc --noEmit -p tsconfig.json`
- [x] Relevanten Testlauf ausfuehren: `bun run test -- test/Admin.profileTemplates.shared.test.ts` (und ggf. weitere betroffene Admin-Tests)
- [x] `frontend/CHANGELOG.md` um den Admin-Tab/Profile-Template-Arbeitszeitumbau ergaenzen

### Verifikationskriterien (Fortsetzung)

- Admin-Tab -> Profile-Template -> Arbeitszeit zeigt denselben Schichteditor wie Einstellungen (Frueh/Spaet/Nacht/Sonder inkl. Tages-Overrides)
- Profile-Template speichert/lädt Arbeitszeit im neuen `IVorgabenUaZ`-Format (Legacy-Input wird weiterhin migriert)
- Frontend-TypeScript und relevante Tests laufen ohne neue Fehler

### Arbeitsnotizen

- Zuletzt bearbeitete Dateien:
  - `frontend/src/ts/features/Einstellungen/components/ArbeitszeiteingabePanel.tsx`
  - `frontend/src/ts/features/Admin/components/profileTemplates.shared.ts`
  - `frontend/src/ts/features/Admin/components/AdminProfileTemplateContentEditor.tsx`

## Review (Unterbrechungspunkt Admin-Tab Profile-Template Arbeitszeit)

- Ergebnis: `AdminProfileTemplatesManager` nutzt jetzt das neue Arbeitszeitmodell (`IVorgabenUaZ | null`) durchgaengig. Legacy-Arbeitszeit wird beim Laden migriert (`isLegacyArbeitszeit`/`migrateArbeitszeit`), die Change-Detection serialisiert Arbeitszeitobjekte stabil, und der Save-Payload schreibt `template.Arbeitszeit` als neues Objekt bzw. entfernt es bei `null`.
- Ergebnis: Das Prop-Wiring ist auf `onUpdateArbeitszeit` und `onEnableArbeitszeit` umgestellt; alte `onUpdateArbeitszeitField`-Pfade sind entfernt.
- Ergebnis: Der veraltete Shared-Test wurde auf den aktuellen Export-Stand angepasst (kein `ARBEITSZEIT_FIELDS`-Import mehr).
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json`; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/Admin.profileTemplates.shared.test.ts test/Admin/profileTemplates.shared.test.ts`.

## Aktueller Plan: Zyklus 10 Restpunkte (EWT/Bereitschaft/Admin)

- [x] Bereitschafts-Berechnung fuer ueberlappende Frueh-/Spaetschicht robust machen (Merge statt negativer Gap)
- [x] EWT-Schichtlogik vervollstaendigen: explizite Spaetschicht-Option und konsistente Legacy-Normalisierung (SP/BN)
- [x] EWT-Download normalisieren: Schicht `SP` vor Export auf `T` abbilden
- [x] Modal "Neue Bereitschaft eingeben" um aZ-basierte Schichtinfos mit Tages-Overrides erweitern
- [x] Admin/ProfileTemplate (AdminJS) auf neues Arbeitszeit-/VorgabenB-Modell aktualisieren
- [x] Relevante Frontend-/Backend-Tests ausfuehren und Ergebnisse dokumentieren

## Verifikationskriterien (Zyklus 10 Restpunkte)

- Bei Frueh+Spaet-Ueberlappungen entstehen keine negativen Intervalle und keine falschen Bereitschafts-Luecken.
- EWT erlaubt explizit Spaet und berechnet dafuer korrekte Zeiten; Legacy-Keys bleiben kompatibel.
- Download-Payload fuer EWT enthaelt keine `SP`-Schichtwerte mehr.
- Bereitschafts-Modal zeigt fuer das gewaehte Datum die effektiven Schichtzeiten inkl. Overrides an.
- AdminJS zeigt/editiert Arbeitszeit ohne Legacy-Felder (`bT/eT/...`) und VorgabenB inkl. Schichtauswahl.

## Review (Zyklus 10 Restpunkte)

- Ergebnis: Ueberlappende Frueh-/Spaetschichten werden in `calculateBereitschaftsZeiten` pro Tag vorab zusammengefuehrt; dadurch entstehen keine negativen Gaps mehr.
- Ergebnis: EWT hat jetzt eine explizite `SP`-Option im Add-/Edit-Modal. Die Berechnung nutzt fuer `SP` bevorzugt `aZ.spaet` mit Fallback auf Frueh.
- Ergebnis: EWT-Download normalisiert Schichtcodes konsistent (`SP -> T`, `BN -> N`).
- Ergebnis: Das Bereitschafts-Add-Modal zeigt fuer das aktuell gewaehlte Datum die effektiven Schichtzeiten aus `VorgabenU.aZ` inkl. Overrides an.
- Ergebnis: Admin/ProfileTemplate wurden auf das neue Arbeitszeit-/VorgabenB-Modell angehoben (ohne Legacy-Arbeitszeitfelder in den Admin-Properties).
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json`; `cd /home/jan/Dokumente/DB-Nebengeld/backend && bunx tsc --noEmit -p tsconfig.json`; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/EWT.test.ts test/Bereitschaft.submitBereitschaftsZeiten.test.ts`; `cd /home/jan/Dokumente/DB-Nebengeld/backend && PASSKEY_ORIGIN='http://localhost:8080' PASSKEY_RP_ID='localhost' JWT_SECRET='test-secret-1234567890123456789012345678901234567890' REFRESH_SECRET='test-refresh-secret-123456789012345678901234567890' MONGO_URI='mongodb://localhost:27017/test' bun test tests/admin/adminjs.compatibility.test.ts`.

## Aktueller Plan: AutoSave-Race bei nachlaufenden neuen Datensaetzen

- [x] AutoSave-Pfad fuer `saving`-Status auf Race-Condition pruefen
- [x] Queue-Mechanismus fuer waehrend `saving` eintreffende Aenderungen implementieren
- [x] Regressionstest fuer nachlaufende `create`-Aenderungen waehrend laufendem Save ergaenzen
- [x] Betroffene Frontend-Tests ausfuehren und Ergebnis dokumentieren

## Verifikationskriterien (AutoSave-Race)

- Neue oder geaenderte Zeilen, die waehrend eines laufenden Auto-Save entstehen, werden nicht verworfen
- Nach Abschluss des laufenden Saves wird automatisch ein weiterer Save-Lauf eingeplant
- `test/Utilities/autoSave.test.ts` enthaelt einen Regressionstest fuer diesen Ablauf

## Review (AutoSave-Race)

- Ergebnis: `scheduleAutoSave` markiert Aenderungen im Status `saving` jetzt als queued und startet nach Abschluss des Saves automatisch einen Folge-Save. Dadurch gehen direkt nachlaufende neue Datensaetze nicht mehr verloren.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/Utilities/autoSave.test.ts` -> `40 pass, 0 fail`.

## Aktueller Plan: Frontend TypeScript-Fehler beheben

- [x] Aktuelle TypeScript-Fehler erfassen und auf Root-Causes gruppieren
- [x] Veraltete Test-Importpfade auf die aktuellen `core/types`-Barrels migrieren
- [x] Verbleibende typspezifische Testfehler beheben und Typecheck erneut verifizieren

## Verifikationskriterien (Frontend TS-Fehler)

- `bunx tsc --noEmit -p tsconfig.json` läuft im Frontend ohne Fehler
- Test-Importe referenzieren keine veralteten `src/ts/interfaces`-Pfadsegmente mehr

## Review (Frontend TS-Fehler)

- Ergebnis: Die gemeldeten TypeScript-Fehler wurden vollständig behoben. Ursache waren veraltete Typ-Importe in Tests (`src/ts/interfaces`), die auf die aktuelle Typ-Struktur (`src/ts/core/types`) migriert wurden.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json` sowie `cd /home/jan/Dokumente/DB-Nebengeld/frontend && rg -n "src/ts/interfaces" test || true`.

## Aktueller Plan: MyInput Ref-Handling optimieren

- [x] Ref- und Popover-Pfad in `MyInput` lokal pruefen
- [x] Feldinitializer mit Props-Snapshot durch stabilen Fallback-Ref plus Getter ersetzen
- [x] Popover-Sync fuer Mount/Update/Unmount absichern und TypeScript/Lint/Prettier verifizieren

## Verifikationskriterien (MyInput)

- `MyInput` nutzt keinen Props-basierten Ref-Snapshot mehr im Feldinitializer
- Popover bleibt bei geaenderten `popover`- oder `myRef`-Props konsistent
- `bunx tsc --noEmit -p tsconfig.json`, ESLint und Prettier laufen fuer die Aenderung sauber

## Review (MyInput)

- Ergebnis: `MyInput` verwendet jetzt einen internen Fallback-Ref und leitet ueber einen Getter immer den aktuellen effektiven Ref ab. Dadurch entfaellt die implizite Bindung an den initialen `myRef`, und Bootstrap-Popover werden bei Prop-Wechseln sauber neu synchronisiert.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx --bun eslint src/ts/components/MyInput.tsx`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx prettier --check src/ts/components/MyInput.tsx`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json`.

## Aktueller Plan: TS-, Lint- und Prettier-Fehler beheben

- [x] Frontend-Qualitaetsstatus fuer TypeScript, ESLint und Prettier ermitteln
- [x] Gemeldete TypeScript-Fehler in den betroffenen Testdateien beheben
- [x] Prettier-Abweichungen in den gemeldeten Testdateien bereinigen
- [x] `bunx tsc --noEmit`, `bun run lint` und `bun run format:check` erneut erfolgreich verifizieren

## Verifikationskriterien (TS/Lint/Prettier)

- Frontend-TypeScript-Check endet ohne Fehler
- Frontend-Lintlauf endet ohne Findings
- Frontend-Prettier-Check bestaetigt konsistenten Stil

## Review (TS/Lint/Prettier)

- Ergebnis: Alle gemeldeten Frontend-Qualitaetsfehler sind behoben. TypeScript war in drei Testdateien fehlerhaft; zusaetzlich wurden die sieben von Prettier gemeldeten Testdateien formatiert.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run format:check`.

## Aktueller Plan: Letzten no-deprecated-Fehler beheben

- [x] Verbleibenden `@typescript-eslint/no-deprecated` Treffer in `test/Login.LadeUserDaten.test.ts` lokalisieren
- [x] Deprecated `preact.render()`-Aufruf im Test entfernen
- [x] Datei und kompletten Frontend-Lintlauf verifizieren

## Verifikationskriterien (letzter no-deprecated)

- `test/Login.LadeUserDaten.test.ts` enthält keinen deprecated `render`-Aufruf mehr
- `bun run lint` läuft ohne `@typescript-eslint/no-deprecated`-Fehler durch

## Review (letzter no-deprecated)

- Ergebnis: Im Test wurde die Vorbelegung des Banner-Mounts von `preact.render(...)` auf eine reine DOM-Vorbelegung (`innerHTML`) umgestellt. Der zugehörige Deprecation-Treffer ist entfernt.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx --bun eslint test/Login.LadeUserDaten.test.ts` sowie `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint` ohne Findings.

## Aktueller Plan: ESLint no-deprecated typed linting

- [x] Ursache des Absturzes in der Flat-Config validieren (`no-deprecated` ohne Type-Information)
- [x] Typed-Linting fuer TypeScript-Dateien in `eslint.config.js` aktivieren
- [x] `no-deprecated` gezielt auf TypeScript-Dateien anwenden und Lint verifizieren

## Verifikationskriterien (ESLint no-deprecated)

- ESLint wirft keinen ParserOptions-TypeInfo-Fehler mehr beim Laden von `@typescript-eslint/no-deprecated`
- `bun run lint` meldet Regelverstoeße als normale Lint-Funde statt Konfigurationsabbruch

## Review (ESLint no-deprecated)

- Ergebnis: Die Flat-Config aktiviert jetzt `parserOptions.projectService` fuer `**/*.ts`/`**/*.tsx` und scoped `@typescript-eslint/no-deprecated` auf diese Dateien. Der vorherige Laufzeitfehler beim Regel-Load ist behoben.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint` laeuft durch die Analyse und liefert normale Findings (aktuell 4x `@typescript-eslint/no-deprecated`) statt ParserServices-Abbruch.

## Aktueller Plan: Test-Coverage-Erweiterung

Ausgangszustand (2026-04-21): 643 Tests, 76 Dateien, Coverage-Baseline aus `bun run coverage`.

### Nicht abdeckenswert (explizit ausgeschlossen)

- **Preact-Komponenten** (`Admin/components/`, `Bereitschaft/components/`, `Einstellungen/components/`, `core/auth/components/createModalNewUser.tsx`) – Render-Tests erfordern ein vollständiges Preact-Test-Setup; Aufwand > Nutzen.
- **`passkeys.ts` / `registerPasskey.ts`** – WebAuthn-Browser-API nicht sinnvoll mockbar.
- **Feature-`index.ts`-Dateien** (`Bereitschaft/index.ts`, `Berechnung/index.ts`, `Admin/index.tsx`) – reiner Boot-/Glue-Code, der `window.load` bindet.
- **`bootstrap.ts`** – App-Init, zu eng mit DOM und Login-Orchestrierung verwoben.
- **`changeMonatJahr.ts`** – reine DOM-Seiteneffekte ohne isolierbare Rückgabewerte.

### Phase T.1 – Reine Logik (kein oder minimaler DOM) ✅ abgeschlossen

Ziel: die offensichtlichsten 0%-Lücken in isolierbaren Modulen schließen.

- [ ] `syncEwtToNeben.ts` (0% / 6 % branch) → `test/Neben.syncEwtToNeben.test.ts`
  - Storage-Mock + CustomTable-Stub; Fälle: leeres Array, kein `ewtRef`, beginN/endeN unverändert (no-op), Update schlägt durch zu Storage + Table, `drawRows` + Event-Emit bei tableChanged.
- [ ] `storageStateStore.ts` (0% / 54 % branch) → `test/core/storageStateStore.test.ts`
  - `get` (vorhanden / fehlt), `set`, `remove`, `has` – alles via existierendem Storage-Singleton; keine Mocks nötig.
- [ ] `actAsStatus.ts` – fehlende Branches (31 % branch) → in bestehendem `test/Utilities/actAsStatus.test.ts` ergänzen
  - `notifyActAsStateChanged` – dispatcht `CustomEvent` mit korrektem Detail.
  - `updateActAsBanner` – alle DOM-Pfade: kein Element, `!state.active`, `state.active` mit/ohne `currentUserName`, Button-Text-Setzung.
- [ ] `normalizeResourceRows.ts` (75 % branch) → in bestehendem Test ergänzen
  - Lücke Zeilen 7–8: Edge Case leeres Array / nicht-Array-Eingabe.
- [ ] `savePipeline.ts` – `unlinkNebengeldRefsForDeletedEwtIds` (Zeilen 87–120, Branch 81 %) → in bestehendem `test/Utilities/savePipeline.test.ts` ergänzen
  - Fälle: leeres `deletedIds`-Array (early return), Referenz in Storage entfernt, Table-Rows bereinigt, `drawRows` aufgerufen.

### Phase T.2 – Leicht gemockter DOM ✅ abgeschlossen

### Phase T.3 – apiService-Lücken ✅ abgeschlossen

- apiService: alle Passkey-Auth-Methoden + forgotPassword/resetPassword/resendVerificationEmail (10 Tests)
- Admin-API (neu): fetchAdminUsers, updateUserScopes, fetchCurrentAdminCapabilities (4 Rollen-Branches), updateUserRole/Oe/Password, deleteUser, setActAsUser, Vorgaben-API, Profile-Templates-API (23 Tests)

### Phase T.4 – Auth/Load-Flows ✅ abgeschlossen

- loadUserDaten: "Serverdaten übernehmen"-Action (overwriteUserDaten), "Lokale Daten behalten"-Action (publishEvent + dataServer-Remove)
- submitBereitschaftsZeiten: Offline-Jahreswechsel-Snackbar, Online-Jahreswechsel API-Call (Erfolg + Bulk-Fehler)
- submitBereitschaftsEinsatz: LRE-1-Duplikat-Warnung (addiert trotzdem), berZeit mit bereits vorhandenem BZ

## Verifikationskriterien (Test-Coverage-Erweiterung)

- `bun run coverage` zeigt nach jeder Phase Coverage-Fortschritt für die Zieldateien.
- Kein neuer Test darf bestehende Suites destabilisieren (`bun run test` bleibt grün).
- Kein Produktionscode wird für die Tests verändert (Tests passen sich an, nicht der Code).

---

## Aktueller Plan: Pages-Workflow Actions-Major-Update

- [x] Deploy-Workflow auf aktuelle Actions-Majors umstellen
- [x] Frontend-Qualitätschecks (`test`, `tsc`, `lint`, `format:check`) ausführen
- [x] Frontend-Scope mit Changelog/Todo dokumentieren

## Verifikationskriterien (Actions-Major-Update)

- `deploy.yml` verwendet die aktuellen Major-Tags (`checkout@v6`, `configure-pages@v6`, `upload-pages-artifact@v5`, `deploy-pages@v5`)
- Frontend-Checks laufen vollständig grün

## Review (Actions-Major-Update)

- Ergebnis: Der Pages-Workflow nutzt jetzt die aktuellen Actions-Majors und benötigt kein separates Node24-Opt-in mehr als Übergang für diese Schritte.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test` (Dateien: 62, 62 bestanden), `bunx tsc --noEmit -p tsconfig.json`, `bun run lint`, `bun run format:check` (`All matched files use Prettier code style!`).

## Aktueller Plan: Fertigstellen (`frontend`) – Deploy-Workflow Node 24

- [x] Frontend-Diff und Scope-Dateien prüfen
- [x] Frontend-Qualitätschecks (`test`, `tsc`, `lint`, `format:check`) ausführen
- [x] Frontend-Änderung gestaffelt committen

## Verifikationskriterien (Fertigstellen `frontend`)

- Der Deploy-Workflow setzt `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`
- Frontend-Checks laufen vollständig grün
- Commit enthält nur Frontend-Dateien dieses Scopes

## Review (Fertigstellen `frontend`)

- Ergebnis: In `.github/workflows/deploy.yml` wurde die Workflow-Umgebung auf Node-24-Opt-in für JavaScript-Actions gesetzt, um die Node-20-Deprecation-Warnungen zu entschärfen.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test` (Dateien: 62, 62 bestanden), `bunx tsc --noEmit -p tsconfig.json`, `bun run lint`, `bun run format:check` (`All matched files use Prettier code style!`).

## Aktueller Plan: Warnmeldung bei Array-Laengen-Mismatch

## Verifikationskriterien (Warnmeldung Array-Mismatch)

## Aktueller Plan: Sichtbarer Error-State fuer AutoSave-Zeilen

- [x] CustomTable-RowState und Change-Tracking fuer fehlerhafte Zeilen erweitern
- [x] Error-Markierung in der Tabellen-UI sichtbar machen (Row-Styling + Fehlermeldung)
- [x] Frontend-Regressionstests sowie `test`, `tsc`, `lint`, `format:check` ausfuehren und Ergebnis dokumentieren

## Verifikationskriterien (Error-State Tabelle)

- Zeilen mit `_state = 'error'` sind in der Tabelle sichtbar hervorgehoben
- Die Fehlermeldung der Zeile ist im DOM verfuegbar, ohne auf den Fehlerdialog angewiesen zu sein
- Fehlerhafte Create-/Update-Zeilen bleiben fuer den naechsten Save im Change-Tracking erhalten
- Relevante Frontend-Tests und statische Checks laufen erfolgreich

## Review (Error-State Tabelle)

- Ergebnis: `CustomTable` unterscheidet jetzt zwischen sichtbarem Fehlerzustand und eigentlicher Save-Operation. Fehlerzeilen werden mit `customtable-error` hervorgehoben, tragen ihre Fehlermeldung als Tooltip/Data-Attribut und behalten fuer Retry den urspruenglichen State (`new`, `modified`, `deleted`). Dadurch verschwinden fehlgeschlagene Create-/Delete-Vorgaenge nicht mehr aus dem Change-Tracking.
- Delta: Fehlerzeilen zeigen nun zusaetzlich ein rotes Error-Icon in der ersten Datenzelle (`.customtable-error-icon`) fuer bessere Scanbarkeit in langen Tabellen.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/class/CustomTable.test.ts test/Utilities/autoSave.test.ts`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run format:check`.

## Review (Warnmeldung Array-Mismatch)

- Ergebnis: Beim Daten-Reload wird bei jedem Array-Laengen-Mismatch pro Ressource eine Warninformation gesammelt und als Snackbar angezeigt. Die Meldung nennt Ressource sowie lokale und serverseitige Anzahl und macht die Uebernahme der Serverdaten transparent.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run format:check`.

## Aktueller Plan: Daten-Reload auf Array-Laenge absichern

- [x] Sync-Entscheidung in `loadUserDaten` um Array-Laengenvergleich fuer Ressourcen erweitern
- [x] Regressionstest fuer juengeren lokalen Timestamp mit kuerzerem lokalen Array ergaenzen
- [x] Frontend-Checks (Test, TypeScript, Lint, Format-Check) ausfuehren und Ergebnis dokumentieren

## Verifikationskriterien (Array-Laenge Reload)

- Bei `dataBZ`/`dataBE`/`dataE`/`dataN` werden Serverdaten uebernommen, wenn die normalisierte Array-Laenge von lokal und Server abweicht
- Bestehender `_id`-Repair-Pfad bleibt unveraendert aktiv
- Relevante Frontend-Checks laufen erfolgreich

## Review (Array-Laenge Reload)

- Ergebnis: Beim Laden wird fuer `dataBZ`, `dataBE`, `dataE` und `dataN` jetzt zusaetzlich die normalisierte Array-Laenge verglichen. Weicht die lokale Laenge vom Serverstand ab, werden die Serverdaten trotz juengerem lokalem Timestamp uebernommen.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run format:check`.

## Aktueller Plan: Anzeige-Optimierung VorgabenB (Modal + Tabelle)

- [x] Show-Modal in klare Bereiche fuer Bereitschaft und Nachtschicht aufteilen
- [x] Nachtschicht-Anzeige im Show-Modal bei deaktivierter Nacht mit Hinweis statt redundanter Detailwerte darstellen
- [x] Tabellen-Spaltentitel und Parser fuer bessere Lesbarkeit (Wochentag + W1/W2 + Zeit) optimieren
- [x] TypeScript und Lint erneut verifizieren

## Review (VorgabenB Anzeige-Optimierung)

- Ergebnis: Die VorgabenB-Anzeige ist konsistenter und besser scanbar. Im Show-Modal sind Bereitschaft und Nachtschicht klar getrennt, und bei deaktivierter Nacht wird ein eindeutiger Hinweis gezeigt. In der Tabelle wurden die Spaltentitel fachlich benannt und die Werte kompakter als Wochentag + Woche + Zeit formatiert.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json` ohne Output; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint` erfolgreich.

## Aktueller Plan: Zwei-Wochen-Auswahl fuer VorgabenB im Einstellungen-Modal

- [x] UI- und Interaktionsbasis fuer 2-Wochen-Grid (Mo-So / Mo-So) festlegen
- [x] Neue Auswahlkomponente in `createEditorModalVE` integrieren (Desktop Drag + Start/Ende-Tap)
- [x] Bestehendes Datenmodell und Submit-Mapping (`beginn*Tag`, `ende*Tag`, `*Nwoche`) kompatibel halten
- [x] TypeScript, Test und Lint verifizieren

## Review (VorgabenB 2-Wochen-Auswahl)

- Ergebnis: Die Tagesauswahl in der VorgabenB-Modalmaske nutzt jetzt ein festes 2-Wochen-Grid mit sichtbarer Start-/Ende-/Bereichsmarkierung; Desktop-Drag und Start/Ende-Tap sind aktiv, Mobile arbeitet per Start/Ende-Tap. Das bestehende Submit-Format bleibt unveraendert.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json` ohne Output; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/Einstellungen/saveTableDataVorgabenU.test.ts` -> `2 pass`; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint` erfolgreich.

## Aktueller Plan: EWT-Berechnen behält Jahresdaten im Tabellenzustand

- [x] Regressionsursache beim Klick auf `Berechnen` in `recalculateEwtMonat()` eingrenzen
- [x] Fokussierten Test für den Verlust anderer Monatsdaten ergänzen
- [x] Monatsdaten nach der Neuberechnung wieder in den bereits geladenen Jahresbestand mergen
- [x] Relevante EWT-Tests, TypeScript und Lint erneut ausführen

## Review (EWT Jahresdaten nach Berechnen)

- Ergebnis: `recalculateEwtMonat()` lädt nach dem Berechnen nicht mehr nur den sichtbaren Monatsausschnitt in `tableE`, sondern merged die neu berechneten Monatszeilen in den vollständigen geladenen Jahresbestand zurück. Dadurch funktionieren spätere Monatswechsel im selben Jahr weiterhin korrekt.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/EWT.recalculateEwtMonat.test.ts test/EWT.persistEwtTableData.test.ts test/EWT.getEwtDaten.test.ts` → `Dateien: 3 ✓ 3 bestanden`; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json && bun run lint` erfolgreich.

## Aktueller Plan: Act-As Anzeige und Eigene-Daten-Button im Admin

- [x] Relevante Frontend-Stellen für Act-As-Status und Admin-Menü prüfen
- [x] Sichtbare Anzeige ergänzen, wenn Daten eines anderen Benutzers geladen sind
- [x] Zentralen Button zum Laden der eigenen Daten im Admin ergänzen und responsive anordnen
- [x] Relevante Frontend-Tests, TypeScript-Check, Build und Lint ausführen

## Review (Act-As Anzeige / Eigene Daten)

- Ergebnis: Die Oberfläche zeigt jetzt deutlich an, wenn gerade fremde Benutzerdaten aktiv sind, inklusive zentralem Rücksprung auf die eigenen Daten; die Hinweise und Buttons brechen auf kleinen Displays sauber untereinander um und bleiben auf größeren Breakpoints kompakt nebeneinander.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/Utilities/actAsStatus.test.ts test/Login.userLoginSuccess.test.ts` → `Dateien: 2 ✓ 2 bestanden`; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json && bun run build && bun run lint` erfolgreich (nur bestehende Sass-Deprecation-Warnungen im Build).

## Aktueller Plan: Frontend-401-Startlogik und Session-Handling stabilisieren

- [x] 401-Fehlerkaskade beim App-Start reproduzieren und auf Stale-Session / uncaught Admin-Requests eingrenzen
- [x] Session-Erkennung auf echte Tokens begrenzen und geschützte 401-Antworten sauber über Refresh/Logout abfangen
- [x] Admin-Startup und Jahresdaten-Load gegen ungefangene Session-Fehler härten
- [x] Relevante Regressionstests, Lint und Build erneut ausführen

## Review (Frontend-401-Startlogik)

- Ergebnis: Veraltete lokale Benutzerdaten ohne gültige Tokens werden nicht mehr als aktive Session behandelt; geschützte 401-Antworten stoßen jetzt sauber den Refresh-/Logout-Pfad an, und Admin-/Jahresdaten-Loads erzeugen keine ungefangenen Promise-Fehler mehr.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/Utilities/decodeAccessToken.test.ts test/Utilities/FetchRetry.test.ts test/Login.LadeUserDaten.test.ts` → `Dateien: 3 ✓ 3 bestanden`; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint && bun run build` erfolgreich (nur bestehende Sass-Deprecation-Warnungen).

## Aktueller Plan: Frontend-Tests auf Bun test + happy-dom umstellen

- [x] Test-Konfiguration und Abhaengigkeiten auf Bun test + happy-dom umstellen
- [x] Setup-Dateien fuer DOM-, Fetch- und globale Mocks unter Bun neu aufsetzen
- [x] Testdateien von Vitest-APIs auf Bun-Test-APIs migrieren
- [x] Snapshot- und DOM-kritische Tests unter happy-dom validieren
- [x] Frontend-Testlauf, TypeScript und Lint nach der Migration verifizieren

## Verifikationskriterien (Bun Test Migration)

- `frontend/package.json` nutzt `bun test` fuer Testlauf und Watch-Mode
- `test/setupVitest.ts` und `vitest.config.ts` werden nicht mehr benoetigt
- Tests laufen mit happy-dom ohne jsdom-Storage-Workarounds
- Relevante Suites und Begleitchecks sind nachweisbar erfolgreich

## Review (Bun Test Migration)

- Ergebnis: Frontend verwendet jetzt Bun test mit happy-dom und einem sequentiellen Runner fuer stabile Modul-Mocks; direkte Vitest/jsdom-Abhaengigkeiten und die alte Vitest-Konfiguration sind entfernt.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test` sowie `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint` und `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test test/Utilities/saveDaten.test.ts test/Utilities/autoSave.test.ts test/Einstellungen/SelectYear.test.ts test/Login.LadeUserDaten.test.ts test/class/CustomSnackbar.test.ts`.

## Struktur- und Doku-Organisation

- [x] `.claude`-Navigation für Frontend optimieren
- [x] `CLAUDE.md`-Verweise auf neue Navigationspunkte abstimmen
- [x] Konsistenz mit Root-Regeln prüfen

## Review

- Ergebnis: Frontend hat jetzt eine dedizierte `.claude/README.md` und einen Skill-Index unter `.claude/skills/README.md`.
- Verifikation: Verlinkte Dateien in `frontend/CLAUDE.md` existieren und sind aufrufbar.

## Teststabilisierung

- [x] Snapshot-Differenzen in `test/Bereitschaft.test.ts` analysiert
- [x] Snapshots in Test-Script-Zeitzone aktualisiert
- [x] Veraltete Erwartung fuer vorhandenen Bereitschaftszeitraum angepasst
- [x] Frontend-Vollsuite erfolgreich erneut ausgefuehrt

## Review (Tests)

- Ergebnis: Alle Frontend-Tests laufen wieder stabil durch.
- Verifikation: `bun run test` in `frontend/` mit 428 bestanden, 0 fehlgeschlagen.

## TS und Lint

- [x] TS-Typfehler in `test/Neben.saveTableDataN.test.ts` behoben
- [x] TS-Typfehler in `test/EWT.saveTableDataEWT.test.ts` behoben
- [x] TS-Parametertypen in `test/Bereitschaft.test.ts` korrigiert
- [x] Lint-Warnings in Tests und `src/ts/utilities/FetchRetry.ts` behoben
- [x] Frontend-Lint erfolgreich ausgefuehrt

## Review (TS/Lint)

- Ergebnis: Keine TS- oder Lint-Fehler mehr im Frontend.
- Verifikation: `get_errors` ohne Befunde, `bun run lint` erfolgreich.

## Aktueller Plan: Frontend-TS/Prettier-Kompatibilität bereinigen

- [x] Aktuelle `tsc`-, ESLint- und Prettier-Befunde reproduzieren
- [x] Strikte Typfehler in `Einstellungen`, Utility-Tests und Bun-Mock-Kompatibilität korrigieren
- [x] Formatabweichungen per Prettier bereinigen
- [x] Relevante Utility-/API-Tests sowie `tsc`, Lint und `format:check` erneut ausführen

## Review (Frontend-TS/Prettier-Kompatibilität)

- Ergebnis: Frontend ist wieder ohne TS-, ESLint- und Prettier-Befunde; zusätzlich laufen die betroffenen Utility-/API-Tests wieder grün.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json` ohne Output; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint && bun run format && bun run format:check && bun run test -- test/Utilities/FetchRetry.test.ts test/Utilities/apiService.test.ts test/Utilities/Storage.test.ts test/Utilities/fieldMapper.test.ts test/Utilities/Utilities.test.ts` → `5 Dateien bestanden`.

## Aktueller Plan: EWT-Buchungstag fuer Nachtschichten korrigieren

- [x] Repro mit einem betroffenen N-Schicht-Datensatz aufbauen
- [x] Regressionstest fuer `calculateBuchungstagEwt()` ergänzen
- [x] Nachtlogik in der Buchungstag-Berechnung an den echten EWT-Zeitkorridor angleichen
- [x] Relevante EWT-Tests und Lint erneut ausführen

## Review (EWT-Buchungstag Nachtschicht)

- Ergebnis: N-/BN-Schichten liefern jetzt wieder den korrekten `buchungstagE` statt eines Tages zu spät; der temporäre Debug-`console.log` im Editor wurde entfernt.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/EWT.utils.extra.test.ts test/EWT.getEwtDaten.test.ts test/EWT.persistEwtTableData.test.ts test/EWT.validateZeitenReihenfolge.test.ts` → `4 bestanden`; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint` erfolgreich.

## Aktueller Plan: EWT-Buchungstag live in `CustomTable` synchronisieren

- [x] Repro für stale `buchungstagE` zwischen Storage und `CustomTable` absichern
- [x] `persistEwtTableData()` so anpassen, dass normalisierte Werte in die Live-Zeilen zurückgeschrieben werden
- [x] EWT-Neuberechnung (`calculateEwtEintraege`) direkt mit `buchungstagE` synchronisieren
- [x] Relevante EWT-Tests und Lint erneut ausführen

## Review (EWT-CustomTable Sync)

- Ergebnis: Der neu berechnete `buchungstagE` landet jetzt sofort im Live-`CustomTable` und nicht erst nach einem Reload; damit stimmen Tabelle, Monatsfilter und Storage wieder direkt überein.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/EWT.persistEwtTableData.test.ts test/EWT.utils.extra.test.ts test/EWT.getEwtDaten.test.ts test/EWT.validateZeitenReihenfolge.test.ts` → `4 Dateien bestanden`; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/EWT.ewtBerechnen.test.ts test/EWT.addEventlistenerToggleBerechnen.test.ts` → `2 Dateien bestanden`; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint` erfolgreich.

## Aktueller Plan: Save-Regression (Backend gespeichert, Frontend stale bis Re-Login)

- [x] Save-Datenfluss und AutoSave-Sync analysieren
- [x] Lokalen Zustand nach Save mit servernormalisierten Daten synchronisieren
- [x] Profil-Save auf serverseitige Antwortdaten umstellen
- [x] Regressionstests für AutoSave und saveDaten ergänzen
- [x] Relevante Tests erfolgreich ausführen

## Verifikationskriterien (Save-Regression)

- Nach Save sind serverseitig korrigierte Werte direkt in Tabelle und localStorage sichtbar
- Re-Login ist nicht mehr erforderlich, um die zuletzt gespeicherten Daten zu sehen
- Bestehende Utilities-Tests bleiben grün

## Review (Save-Regression)

- Ergebnis: AutoSave spiegelt Serverantworten (inkl. Korrekturen) zurück in den Tabellenzustand; `saveDaten` übernimmt servernormalisierte Profilwerte in Storage.
- Verifikation: `bun run test -- test/Utilities/autoSave.test.ts test/Utilities/saveDaten.test.ts` mit 47 bestanden, 0 fehlgeschlagen.

## Passkey-UX in Einstellungen & Login

- [x] Einstellungen um einen Passkey-Accordion-Eintrag mit Entfernen-Buttons erweitert
- [x] Username-losen Passkey-Login mit Browser-Autofill im Login-Modal aktiviert
- [x] Frontend-Tests für den neuen Passkey-Login ergänzt
- [x] Relevante Lint-/Build-Prüfungen erneut ausgeführt

## Review (Passkey-UX)

- Ergebnis: Sobald Passkeys vorhanden sind, erscheint in den Einstellungen ein eigener Accordion-Bereich zur Geräteverwaltung; im Login kann der Benutzername für den Passkey-Flow leer bleiben und der Browser bietet gespeicherte Passkeys direkt an.
- Verifikation: `bun test ./test/Login.loginWithPasskey.test.ts` mit `2 pass, 0 fail`; `bun run lint` und `bun run build` im Frontend erfolgreich.

## Aktueller Plan: Frontend-Testaltlasten bereinigen

- [x] Aktuell fehlschlagende Tests reproduzieren
- [x] Veraltete EWT-Erwartungen auf `buchungstagE` anheben
- [x] Brittle Download-Assertions und unnötige Monats-Setups in Persistenztests bereinigen
- [x] Frontend-Vollsuite und Lint erneut ausführen

## Review (Frontend-Testaltlasten)

- Ergebnis: Die veralteten EWT-/Download-Tests sind jetzt auf den aktuellen Flat-Array- bzw. `buchungstagE`-Vertrag ausgerichtet; unnötige Monats-Altlasten in Persistenztests wurden entfernt.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/EWT.test.ts test/EWT.persistEwtTableData.test.ts test/EWT.saveTableDataEWT.test.ts test/Neben.saveTableDataN.test.ts test/Utilities/download.test.ts` → alle Dateien bestanden; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test && bun run lint` → `Dateien: 58 ✓ 58 bestanden`, ESLint ohne Befunde.

## Aktueller Plan: Passkey-Signup und Login-Modal-UX

- [x] Gemeinsamen Passkey-Registrierungshelper für Einstellungen und Signup zentralisieren
- [x] Login-Modal mit klarer Gruppierung für primären Login, Passkey-Alternative und Hilfsaktionen überarbeiten
- [x] Signup-Flow um optionalen Passkey-Schritt mit sauberem Skip-/Retry-Verhalten ergänzen
- [x] Relevante Frontend-Tests für Signup- und Modal-Pfade ergänzen
- [x] Lint, Build und gezielte Auth-/Passkey-Tests erneut ausführen

## Review (Passkey-Signup und Login-Modal-UX)

- Ergebnis: Nach erfolgreicher Registrierung kann jetzt direkt optional ein Passkey eingerichtet werden; technische Fehler bieten einen Retry an, während Skip oder Abbruch den Loginabschluss nicht blockieren. Das Login-Modal trennt die primäre Anmeldung, die Passkey-Alternative und Hilfsaktionen jetzt klarer.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/Login.loginWithPasskey.test.ts test/Login.checkNeuerBenutzer.test.ts test/Login.createModalLogin.test.ts` → `Dateien: 3 ✓ 3 bestanden`; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint && bun run build` erfolgreich.

## Aktueller Plan: Logout-Events verdrahten

- [x] `logoutUser` um typisierten Logout-Grund erweitern und `user:logout` publizieren
- [x] Logout-Aufrufstellen fuer `manual`, `token-expired` und `version-mismatch` auf den neuen Grund migrieren
- [x] Logout-Tests um Event-Assertions erweitern und relevante Frontend-Checks ausfuehren

## Verifikationskriterien (Logout-Events)

- `logoutUser` publiziert bei jedem Logout `publishEvent('user:logout', { reason })`
- `auth:failure` triggert `logoutUser` mit `reason: 'token-expired'`
- Versionsmismatch in `main.ts` triggert `logoutUser` mit `reason: 'version-mismatch'`
- Relevanter Logout-Test, TypeScript-Check und Lint laufen fehlerfrei

## Review (Logout-Events)

- Ergebnis: Die Event-Deklaration `user:logout` ist jetzt zur Laufzeit verdrahtet. `logoutUser` publiziert den Logout-Grund zentral, und die drei Kernpfade (manuell, token-expired, version-mismatch) setzen den Grund explizit.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/Einstellungen.logoutUser.test.ts`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint`.

## Aktueller Plan: Cookie-Check als Gate-Sequenz modellieren

- [x] `cookie-check` aus `SESSION_RESTORE_SEQUENCE` herausloesen und als eigenen Decision-Step modellieren
- [x] Abhaengigkeiten so setzen, dass `cookie-check` nach `boot:auth` entweder zu Session-Restore oder Login fuehrt
- [x] Session-Restore-/InitSequence-Tests sowie TypeScript-Check auf die neue Gate-Logik anpassen

## Verifikationskriterien (Cookie-Gate)

- `SESSION_RESTORE_SEQUENCE` startet nach `cookie-check` statt den Check selbst zu enthalten
- `LOGIN_INIT_SEQUENCE` haengt ebenfalls am `cookie-check`
- Runtime markiert den Check im Auth-Startpfad als eigenen Step (`auth-gate`)
- Relevante Tests und `bunx tsc --noEmit -p tsconfig.json` laufen erfolgreich

## Review (Cookie-Gate)

- Ergebnis: Der Cookie-/Storage-Check ist jetzt ein expliziter Gate-Schritt (`cookie:check`), der fachlich vor der Verzweigung liegt. Dadurch ist das Modell korrekt: `cookie-check -> SESSION_RESTORE_SEQUENCE` (bei vorhandener Session) oder `cookie-check -> LOGIN_INIT_SEQUENCE` (Idle/Login-Pfad).
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/Login.sessionRestore.test.ts test/orchestration/initSequence.test.ts`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json`.

## Aktueller Plan: Hinweis auf noch nicht gespeicherten Bereitschaftszeitraum (BE/BZ)

- [x] Recherche: BE↔BZ-Verknüpfung (`submitBereitschaftsEinsatz.ts`), Sync-Status-Muster von EA/Neben↔EWT (`isUnsynced`/`disabled`-Option) via Explore-Subagent
- [x] Erster Ansatz (auto-flush + hartes Blockieren bei Submit) verworfen, nachdem User klarstellte: Speichern darf nicht fehlschlagen/blockieren, nur ein Hinweis im Modal
- [x] `isBzUnsynced()` in `submitBereitschaftsEinsatz.ts` exportiert (Prädikat, analog EA/Neben-Muster), Kern-Submit-Logik unverändert gelassen (BE mit bereits vollständig gespeichertem BZ nicht beeinflusst)
- [x] Reaktiver Warnhinweis in `createAddModalBereitschaftsEinsatz.tsx` und `createEditorModalBereitschaftsEinsatz.tsx`: sichtbar wenn ein BZ im Monat unsynced ist, blendet sich via `data:changed`-Subscription automatisch wieder aus
- [x] Tests: Mocks in beiden Component-Tests um `getBereitschaftsZeitraumDaten`/`isBzUnsynced`/`onEvent` ergänzt, neuer Sichtbarkeits-Test für AddModal

## Verifikationskriterien (BZ-Sync-Hinweis)

- Submit-Verhalten von `submitBereitschaftsEinsatz.ts`/Editor-Modal bleibt exakt unverändert (keine neue Fehl-/Blockier-Logik)
- Hinweis erscheint nur wenn ein Bereitschaftszeitraum im aktuellen Monat kein `_id` hat oder `__localState === 'modified'` ist
- Hinweis verschwindet automatisch nach `data:changed`-Event für Ressource `BZ`, sobald kein unsynced BZ mehr existiert
- `tsc --noEmit`, `lint`, komplette Testsuite laufen fehlerfrei

## Review (BZ-Sync-Hinweis)

- Ergebnis: EA/Neben↔EWT hatten die Absicherung bereits (disabled Option + "(wird noch gespeichert)"). Für BE↔BZ gab es keine, weil die Verknüpfung dort implizit über Zeitfenster läuft statt über ein Auswahlfeld. Jetzt zeigen beide BE-Modals einen zusätzlichen, rein informativen Hinweis, wenn ein Bereitschaftszeitraum im Monat noch nicht synchronisiert ist -- ohne Submit-Verhalten zu verändern.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx --bun tsc --noEmit`, `bunx --bun eslint src/ test/`, `TZ=Europe/Berlin bun test --isolate` → 2020/2020 bestanden.

## Nachtrag: Speicherreihenfolge BZ-vor-BE doch aktiv erzwingen

- [x] `ensureCompleteBzSynced()` wieder eingeführt (ohne try/catch/Blockier-Guard aus dem verworfenen ersten Versuch): bei 'complete' Coverage mit unsynced Grenz-BZ wird `flushResource('BZ')` angestossen und danach neu klassifiziert
- [x] Bestätigt dass `flushResource`/`saveResourceNow` intern nie wirft (eigener try/catch in `autoSave.ts`) -- Aufruf ohne try/catch ist sicher, kein neuer Fehlerpfad
- [x] In `submitBereitschaftsEinsatz.ts` und Editor-Modal eingehängt; Editor-Modal-`onSubmit` dafür (wieder) async
- [x] Editor-Modal-Testdatei mockte `@/features/Bereitschaft/utils` komplett -- `ensureCompleteBzSynced` dort als Pass-Through-Mock ergänzt (sonst `undefined(...)`-Crash bzw. echter AutoSave-Aufruf in Unit-Tests); alle `getSubmit()`-Aufrufe in dieser Datei auf `await` umgestellt (12 Stellen)
- [x] Neue Tests in `Bereitschaft.submitBereitschaftsEinsatz.test.ts`: Sync-vor-Speichern bei unsynced BZ, "speichert trotzdem ohne Referenz falls Sync nicht klappt" (Beleg dass nichts fehlschlägt), kein Flush wenn bereits synced

### Verifikationskriterien

- `flushResource('BZ')` wird nur aufgerufen wenn `coverage.kind === 'complete'` UND mindestens eine Grenz-BZ unsynced ist; bereits vollständig synchronisierte Coverage bleibt unangetastet (kein Flush-Aufruf)
- Schlägt der Sync fehl/bleibt aus: BE wird trotzdem gespeichert (ohne BZ-Referenz), kein `failWith`/Block
- `tsc --noEmit`, `lint`, komplette Testsuite laufen fehlerfrei

### Review

- Ergebnis: Anders als beim ersten (verworfenen) Versuch gibt es jetzt eine echte Order-Garantie im Erfolgsfall, ohne die "nichts darf fehlschlagen"-Vorgabe zu verletzen -- möglich, weil `flushResource` selbst nie wirft (Fehlerbehandlung passiert vollständig innerhalb von AutoSave). Der Hinweis aus dem vorherigen Schritt bleibt als zusätzliches, unabhängiges Signal bestehen für den (seltenen) Fall, dass der Sync nicht rechtzeitig durchläuft.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx --bun tsc --noEmit`, `bunx --bun eslint src/ test/`, `TZ=Europe/Berlin bun test --isolate` → 2023/2023 bestanden.

## Phase H (1): Bootstrap-`.modal-*`-Huellen raus

Die Dialoge liegen seit Phase E im `DBDrawer`, tragen innen aber noch Bootstraps Modal-Geruest.
Das ist doppelt: `.modal-dialog`/`.modal-content` sind reine Huellen, deren Optik in
`styles.scss` bereits wieder abgeraeumt wird (Rahmen weg, Hintergrund weg, Breite ueberschrieben).
Die Groessen-Prop ist dadurch heute wirkungslos -- jeder Dialog rendert 36 rem.

- [x] `.modal-dialog` (Huelle) ersatzlos entfernen, `.modal-content` -> `.dialog-rumpf`
- [x] `.modal-body` -> `.dialog-koerper`, `.modal-footer` -> `.dialog-fuss`
- [x] `.modal-header`/`.modal-title` entfallen (Kopf traegt bereits `.db-drawer-header`)
- [x] `TMyModal.size` auf `'lg' | 'xl'` eindampfen, `dialogClass` streichen; Breite kommt ueber
      `--db-drawer-max-width` am `<dialog>` (per `:has()` aus dem Rumpf gehoben)
- [x] `size="sm"` (9 Stellen) und `size="fullscreen-sm-down"` entfernen -- beide heute wirkungslos
- [x] `dialogClass="modal-xl ..."` (Massenbearbeitung) -> `size="xl"`
- [x] `styles.scss`: Block `.db-drawer-content { .modal-* }` durch echte Regeln fuer die neuen
      Klassen ersetzen; Unterschriften-Dialog (`signatur-modal-kompakt`) mitziehen
- [x] Tests nachziehen (10 Dateien greifen per `.modal-*`-Selektor zu)

### Verifikationskriterien

- `grep -r "modal-dialog\|modal-content\|modal-header\|modal-title\|modal-body\|modal-footer" src/`
  liefert keine Treffer mehr
- Lint 0 Fehler, komplette Testsuite gruen
- Sichtpruefung im Dev-Server: Anmelde-Dialog, ein Editor-Dialog, Impressum, Hilfe,
  Bestaetigungsdialog, Unterschriftenfeld (Hoch- und Querformat) -- hell und dunkel
- Breite: `sm`-Dialoge unveraendert 36 rem; nur die vier Admin-/Editor-Dialoge mit `lg`/`xl`
  werden breiter (48 rem / 64 rem)

### Review (Phase H, Schritt 1)

- Ergebnis: `grep -r "modal-dialog|modal-content|modal-header|modal-title|modal-body|modal-footer|modal-backdrop" src/`
  ist leer. Zwei Altlasten fielen dabei auf und sind mitbehoben: der tote Selektor in
  `setNaechsterEwtTag` (seit Phase E ohne Treffer) und die leere Variable
  `--db-divider-bg-color`, wegen der Kopf- und Fusszeile ihre Trennlinie verloren haetten.
- Verifikation: `bunx --bun tsc --noEmit`, `bun run lint` (0 Fehler, 26 alte Warnungen),
  `bun run test` 2085/2085. Sichtpruefung gegen den Dev-Server: Impressum, Bestaetigungs-,
  Hilfe- und Passwort-Dialog, Platzhalter-Hilfe (`lg` = 768 px), Unterschriftenfeld in
  Hoch- und Querformat.

## Phase H (2): Raster und Akkordeon

- [x] `scss/raster.scss` mit `.raster`, `.raster-auto`, `.sp-*`, `.abstand-*`, `.mitte`, `.breit`
- [x] 383 Rasterklassen in 45 Dateien per Codemod umgestellt
- [x] `.w200` -> `.knopfreihe` mit eigenen Spaltenregeln (gleich breit, Gruppe zentriert)
- [x] Jahresauswahl ohne Rasterverschachtelung (`.jahr-auswahl`)
- [x] Einstellungen-Akkordeon und Berechnungs-Monatskarten auf `db-accordion` (`<details>`)
- [x] Bootstraps `Collapse`-Plugin entfernt (`main.ts`, `onboardingValidation.ts`)
- [x] Floating-Label-Platzhalter wieder ausgeblendet (Layer-Reihenfolge hatte ihn eingefaerbt)

### Review

- Ergebnis: `.row`/`.col-*`/`.container`/`.accordion-*` kommen in `src/` nicht mehr vor. Von den
  Bootstrap-Plugins ist nur noch `Popover` geladen. Zwei Altlasten fielen dabei auf und sind
  behoben: die Knopfreihen waren mit gestreckten Rasterspalten nicht mehr zentriert, und die
  Floating-Labels ueberlagerten ihren Platzhalter (Layer-Reihenfolge, war schon vorher so,
  aber nur bei offenem Akkordeon sichtbar).
- Verifikation: `bunx --bun tsc --noEmit`, `bun run lint` (0 Fehler), `bun run test` 2085/2085,
  `bun run build` erfolgreich. Sichtpruefung im Dev-Server: Startseite (1300/768/412 px),
  Einstellungen mit offenem und geschlossenem Akkordeon (1300/412 px), Passwort-Dialog
  (1300/412 px). Kein horizontaler Ueberlauf in keiner Breite.

## Phase H (3): Buttons auf DB UX

- [x] 257 Button-Stellen in 59 Dateien auf `db-button` + `data-variant`/`data-color`/`data-size`
- [x] `btn-close` -> DB-Ghost-Icon-Button mit Text (vorher ohne Namen fuer Screenreader)
- [x] `btn-group` -> `.knopfgruppe`
- [x] `MyButton` nimmt DB-Attribute direkt statt Bootstrap-Klassenliste
- [x] `confirmDialog`: `confirmClass` -> `confirmVariant` + `confirmColor`
- [x] Dark-Theme-Korrekturen fuer `.btn-outline-*` entfernt (lasen `--bs-btn-*`)
- [x] Tests auf die neuen Selektoren umgestellt (7 Dateien)

### Review

- Ergebnis: `btn`-Klassen kommen in `src/` nicht mehr vor. Im Browser gemessen: 0 Elemente mit
  Bootstrap-Button-Klasse, 27 `db-button`, alle mit `data-variant`. Ein Nebenbefund: der
  Hinzufuegen-Knopf in `OeTagInput` hatte gar keinen zugaenglichen Namen -- jetzt
  `aria-label="Wert hinzufügen"`.
- Verifikation: `bunx --bun tsc --noEmit`, `bun run lint` (0 Fehler), `bun run test` 2086/2086,
  `bun run build` erfolgreich.

## Naechster Schritt (Phase H, offen)

Der Utility-Sweep ist zur Haelfte erledigt (Raster, Akkordeon, Buttons). Was bleibt, nach
Groesse sortiert -- Zahlen sind Klassenvorkommen in `class`/`className`-Attributen:

- Abstaende `m*`/`p*`/`gap-*` (~960) -- braucht eigene App-Utilities oder Ersatz durch `gap`
- Formulare `form-control`, `form-label`, `form-check`, `input-group`, `form-floating` (~578)
  -> DB-Komponenten `db-input`, `db-select`, `db-checkbox`, `db-switch`
- Text `text-*`, `fs-*`, `fw-*`, `lh-*` (~467)
- Flex/Ausrichtung `d-flex`, `justify-content-*`, `align-items-*` (~347)
- Display `d-*` (~288)
- Komponenten `card`, `alert`, `badge`, `nav`, `table`, `list-group` (~250)
  -> `db-card`, `db-infotext`/`db-notification`, `db-tag`, `db-tabs`, `db-table`
- Farben/Rahmen `bg-*`, `border-*`, `rounded-*`, `shadow-*` (~223)
- Danach: `Popover`-Plugin, `@layer bootstrap`-Import raus, `bootstrap`/`@types/bootstrap`/
  `@popperjs/core` deinstallieren, `bridge.css` abbauen.

Offener Punkt fuer die Sichtpruefung: der Seed-Login schlaegt gegen das echte Backend fehl
(Token-Refresh), deshalb mounten die React-Tabs Bereitschaft/EWT/EA/Neben im Smoke-Test nicht.
Entweder einen Testbenutzer bereitstellen oder die Token-Antwort per Request-Interception
faelschen.

## Phase H (4): Formulare auf DB UX

Bootstraps Formular-CSS ist der letzte grosse Klassenblock vor dem Rauswurf (~578 Vorkommen in
rund 60 Dateien). DB liefert dafuer fertige Bausteine, die ohne JS auskommen: `db-input`,
`db-select`, `db-checkbox`, `db-switch` -- jeweils Huelle mit `<label>` + Feld darin.
Zuordnung (aus `@db-ux/core-components/build/styles/bundle.css` verifiziert):

| Bootstrap | DB |
| --- | --- |
| `form-floating` + `form-control` | `.db-input[data-variant="floating"]` (Label vor dem Feld) |
| `form-control` + eigenes `form-label` | `.db-input` mit `<label>` in der Huelle |
| `form-select` | `.db-select` |
| `form-control-sm`/`form-select-sm`/`input-group-sm` | `data-density="functional"` an der Huelle |
| `input-group` + `input-group-text`-Icon | `data-icon="…"` an der Huelle (reines CSS, `content: attr(data-icon)`) |
| `input-group` mit Text-Praefix/Knopf | App-Klasse `.feldgruppe` (DB hat keine Entsprechung) |
| `form-check` (+ `form-check-input`/`-label`) | `.db-checkbox` mit Feld **im** Label |
| `form-check form-switch` | `.db-switch` (`role="switch"` am Input) |
| `form-text` / `invalid-feedback` | `.db-infotext` (`data-size="small"`, `data-semantic="critical"`) |
| `form-label` | entfaellt (Label steht in der Huelle) |

- [ ] `src/index.html` (98 Stellen): Persoenliche Daten, Jahr-Auswahl, Monatswechsel
- [ ] `main.ts`: `Popover`-Plugin raus -- der einzige verbliebene Aufrufer ist das Jahr-Feld,
      es bekommt einen `db-tooltip` wie die Tabellenzellen seit Phase F
- [ ] `.tsx`-Sweep (~55 Dateien), Schwerpunkt Admin/FormularEditor und die Feature-Modals
- [ ] `addressValidation.ts`: `closest('.input-group, .form-floating, …')` auf `.db-input`,
      Fehlertext als `db-infotext` statt `invalid-feedback`; `is-invalid` faellt weg
      (`data-custom-validity="invalid"` wird bereits gesetzt)
- [ ] `styles.scss`: Bootstrap-Formular-Korrekturen (Floating-Platzhalter, `.form-check`-Regeln
      in Signatur-Fusszeile und Zulagen-Liste, `.form-floating.required`-Sternchen) durch
      DB-taugliche Regeln ersetzen; `.feldgruppe` anlegen
- [ ] `was-validated` (4 Dialoge): Bootstrap-Klasse ohne Wirkung im DB-Markup -- durch
      `data-custom-validity` am jeweiligen Feld ersetzen
- [ ] Tests nachziehen

### Verifikationskriterien (H4)

- `grep -rE "form-control|form-select|form-check|form-switch|form-floating|form-label|form-text|input-group|invalid-feedback|is-invalid|was-validated" src/` ist leer
- `bootstrap/js` kommt in `src/` nicht mehr vor (Popover war das letzte Plugin)
- `typecheck`, `lint` 0 Fehler, Testsuite ohne neue Fehlschlaege, `build` erfolgreich
- Sichtpruefung: Einstellungen (Persoenliche Daten, Jahr-Auswahl), ein Add- und ein
  Editor-Dialog je Feature, Admin-Vorlageneditor, Anmelde-/Registrier-Dialog -- hell und dunkel,
  1300 px und 412 px

**Umgebungshinweis:** In diesem Container fehlen `ASSET_PASSWORD`/`ASSET_INIT_VECTOR`, die
DB-Markenassets sind deshalb unentschluesselt (`*.svg.enc`). `test/icons.dbSet.test.ts` faellt
dadurch mit 3 Tests aus -- unabhaengig von dieser Aenderung.

## Aktueller Plan: Icon-Satz austauschbar machen (Vorbereitung, KEIN Austausch)

**Ziel:** Der DB-UX-Icon-Satz (`@db-ux/db-theme-icons`, DB-Font-Lizenz) soll spaeter ohne
Anfassen der ~160 Aufrufstellen gegen einen freien Satz (z. B. Material Symbols) getauscht
werden koennen. Jetzt nur die Umschalt-Mechanik bauen; Laufzeitverhalten bleibt exakt gleich
(DB-Icons weiter aktiv).

**Ansatz (mit User abgestimmt):** CSS-Remap-Layer. Render-Weg bleibt `data-icon` +
Icon-Font-Ligatur. DB-UX rendert `[data-icon]::before { content: var(--db-icon, attr(data-icon)) }`
-- der `--db-icon`-Override ist der vom Design-System vorgesehene Angelpunkt. Ein Generator
erzeugt aus der Registry eine `iconset.<satz>.css` mit `[data-icon="<db>"]{--db-icon:"<ziel>"}`.
Umschalten = eine `@import`-Zeile + `--db-icon-font-family` + `@font-face`.

**core-components-interne Icon-Namen (~15, z. B. `.db-select`-Chevron, Notification-Icons):**
laut Abstimmung nur dokumentiert, kein Code jetzt -- Aufgabenliste im Runbook-Kommentar.

- [x] `src/ts/components/iconRegistry.ts` -- Single Source of Truth: jeder im `src/` genutzte
      DB-Icon-Name -> `{ material: string; hinweis?: string }`. Typ `DbIconName`. Kopf-Kommentar
      = Swap-Runbook. `theme-auto`/`filter-off` (Eigenbau-SVG, `.app-icon`-Maske) und `none`
      (Logo-Abschaltung) bleiben aussen vor (`NICHT_REMAPPT`).
- [x] `scripts/gen-iconset.mts` -- liest die Registry, schreibt `src/scss/iconset.material.css`
      (deterministisch sortiert, "GENERIERT -- nicht editieren"-Kopf, eigene `@layer app`).
      `--check`-Flag fuer den Drift-Test.
- [x] `src/scss/iconset.material.css` -- generierte Ausgabe, eingecheckt, **nicht importiert**.
- [x] `src/scss/db-ux.css` -- auskommentierter `@import './iconset.material.css';` plus
      Runbook-Kommentar (Umschaltschritte).
- [x] `src/scss/styles.scss` -- auskommentierter `ICON-SATZ`-Block (`@font-face` Material
      Symbols lokal gebuendelt, `--db-icon-font-family`, `font-variation-settings`).
- [x] `package.json` -- Script `"icons:gen": "bun scripts/gen-iconset.mts"`.
- [x] `test/iconRegistry.test.ts` -- (a) jeder `data-icon="…"`-/Ternary-Literal in `src/` ist
      Registry-Key (oder `NICHT_REMAPPT`); (b) JS-Tabellen-Icons sind Registry-Keys; (c) jedes
      `material`-Ziel nicht leer/ohne Leerzeichen; (d) `iconset.material.css` deckungsgleich mit
      `renderIconsetCss()` (Drift-Schutz).
- [x] `frontend/CHANGELOG.md` (77) + Review unten.

### Verifikationskriterien (Icon-Swap-Prep)

- [x] `bun run typecheck` / `bun run lint` / `bun run lint:css` 0 Fehler (lint:css 90 Warnungen,
      unter Ratsche 93, keine aus den neuen Dateien).
- [x] `bun run icons:gen` erzeugt die Datei ohne weiteren Git-Diff (Registry und CSS synchron).
- [x] `bun test --isolate` 2100 pass / 0 fail (davon `test/iconRegistry.test.ts` 4/4).
- [x] `bun run build` erfolgreich; `dist/assets/index-*.css` enthaelt **keine** Remap-Regeln
      (`grep` auf `--db-icon:"expand_more"` / `data-icon="arrow_down"` = 0) -- die neue CSS wird
      nicht importiert.
- [ ] Sichtpruefung Startseite + je ein Feature-Dialog: Icons unveraendert (DB-Satz aktiv) --
      offen (Container ohne `ASSET_*`, DB-Icon-Schrift hier ohnehin nicht dekodierbar).

### Review (Icon-Swap-Prep)

Reine Vorbereitung, kein Verhaltens- oder Bundle-Unterschied. Der Render-Weg bleibt
`data-icon` + Icon-Font-Ligatur; neu ist nur der vom Design-System bereits vorgesehene
`--db-icon`-Override als generierte, noch nicht importierte Remap-Schicht. Aufrufstellen
(~160 in ~44 Dateien) unangetastet -- der Swap ist dadurch ein Diff in 3 Dateien + ein
Font-Bundle statt einer Sweep-Migration.

Bewusste Grenzen: (1) core-components-interne Icon-Namen nur im Runbook, nicht im Generator
(so abgestimmt). (2) Einige Material-Zuordnungen sind Naeherungen -- als `hinweis` in der
Registry und als `/* … */` in der generierten CSS markiert, beim echten Swap zu sichten.
(3) `iconRegistry.ts` haelt DB->Material, `dbIcons.ts` weiter Material->DB (alte
Vergleichsseite) -- doppelte Pflege, aber `dbIcons.ts` ist nur noch Referenz.

Der Container hat keine `ASSET_*`-Secrets, die DB-Icon-Schrift ist unentschluesselt; die
visuelle Gegenprobe (Icons unveraendert) muss in einer Umgebung mit Assets erfolgen.

---

## PDF-Summenzeilen: leere Zelle statt 0 bei fehlender Zulagenart (2026-09-09)

User-Vorgabe: Wenn eine Spalte keine Zulagen hat (kein Code / Zulagenart), sollen die
Summenzeilen keine Zahl zeigen -> `undefined` / leere Zelle.

- [x] `summeGeldwertGruppe()` / `summeBereinigtGruppe()` -> `number | undefined`; gemeinsame
      Hilfsfunktion `zulagenEintraegeGruppe()`; leere Eintragsliste -> `undefined`.
- [x] `wert.ts` `berechneAggregation()` + `sonderZeileZelleWert()`: `code === undefined`
      (unbelegter dynamischer Platz) -> leere Zelle; `!gruppe` bleibt bei `0`.
- [x] Tests angepasst/erweitert (leere-Zelle- vs. 0-Fälle getrennt).

### Verifikation

- `bunx tsc --noEmit` sauber, `bun run lint` 0 Fehler (21 vorbestehende Warnungen).
- `bun test test/infrastructure/pdf/ --isolate` 395/395.
- `bun run build` grün.
- Vorbestehende ~9 Testfehler (Bereitschaft*/AdminLogBrowser) sind fremde WIP im Submodul,
  ohne meine Änderung ebenfalls rot (per gezieltem `git stash` der 4 Dateien geprüft).
