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
