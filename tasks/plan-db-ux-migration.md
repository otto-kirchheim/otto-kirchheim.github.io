# UI/UX-Migration Frontend → DB UX Design System v3

> Genehmigter Gesamtplan. Fortschritt und Phasen-Logs: `tasks/todo.md`.
> Branch: `feat/db-ux` (Frontend, von `origin/dev`) · `feat/db-ux-migration` (Parent-Repo).

## Status (2026-09-05)

- **Phase 0 (Frontend)** – erledigt auf Branch `feat/db-ux` (von `origin/dev`), noch nicht
  gepusht. Phasen-Log: `tasks/todo.md`.
  - `.gitignore` `.env`-Block (Commit `f668d5e`; Muster `.env` / `.env.*` / `.env.local` /
    `.env.local.*`).
  - `typecheck`-Script + `release:check`-Voranstellung (`typecheck && lint && test && build`).
  - Vorgefundener Testreihenfolge-Flake behoben (`test/core/bootstrap.test.ts`).
  - **Baseline verifiziert:** `bun run release:check` grün – `typecheck` exit 0, `lint` exit 0,
    `bun test` **2069 pass / 0 fail** (183 Dateien), `build` grün.
  - **Wegwerf-Spike durchgeführt** (außerhalb des Repos, nicht gemergt) – Ergebnisse im
    Abschnitt „Spike-Ergebnisse" unter Phase 0; korrigieren Phase A1, B und E.
- **Phase 0 (Parent)** – Branch `feat/db-ux-migration` = `origin/main` (`16e7406`) + Commit
  `a70ca1f`: `.mcp.json` + `.mcp.json.example` mit db-ux-MCP-Eintrag (claude-flow + graphify
  + db-ux, dort bewusst versioniert – **nicht** auf `origin/main` selbst). Lokaler Parent-`main`
  divergiert von `origin/main` – Sync + Arbeitsbranch-Wechsel offen (User-Rückfrage).
- **Noch offen in Phase 0:** `.env.example` (Sandbox-Deny → Phase B), Frontend-Gitlink-Bump
  im Parent (bewusst erst später).
- **Phase A, B, C, F, G, D** – erledigt (Branch `feat/db-ux`); **E, H, I** – offen.

Für Phase B werden die DB-Markentheme-Secrets gebraucht: `frontend/.env` (gitignored)
mit `ASSET_PASSWORD` / `ASSET_INIT_VECTOR` aus dem DB-Marketingportal; `bun install`
lädt `.env` nicht automatisch → `scripts/install.sh` (Phase B) oder `set -a; source .env`.

## Context

Das Frontend läuft heute auf **Preact 10 + Bootstrap 5.3** (eine `styles.scss`,
Material-Icons-Webfont, Tab-SPA komplett in `src/index.html`, `CustomTable` als Vanilla-DOM,
Modals als Preact via `showModal()`). Kein Design-Token-System außer den Bootstrap-`--bs-*`-
Custom-Properties, kein DB-Branding.

Ziel: Angleichung an das **DB UX Design System** (System-Generation „v3"; die npm-Pakete
`@db-ux/core-*` sind unabhängig davon bei **5.3.0**, `@db-ux/db-theme` bei 6.2.0 – „v3" und
„5.3.0"/„v5-Markup" im weiteren Text meinen dieselbe aktuelle Generation).
Monorepo: <https://github.com/db-ux-design-system/core-web>. Getroffene Entscheidungen:

1. **Schrittweise Migration** – DB UX parallel via CSS Cascade Layers einziehen, Screen für
   Screen umstellen, Bootstrap zuletzt entfernen. Jede Phase einzeln deploybar.
2. **Framework-Wechsel Preact → React 19** – Voraussetzung, um `@db-ux/react-core-components`
   nativ zu nutzen (das Paket zielt auf React 19.2, mit Preact/compat nicht tragfähig).
3. **DB-Markentheme** (`@db-ux/db-theme` 6.2.0) – `ASSET_PASSWORD` / `ASSET_INIT_VECTOR`
   liegen als CI-Secrets. **Kein Whitelabel-Pfad** – `db-theme` fest als normale dependency,
   `bun install`/CI setzen die Secrets voraus.

Erwartetes Ergebnis: React-19-App mit DB-UX-Komponenten und DB-Markenoptik, Bootstrap
(CSS + JS + Paket) vollständig entfernt, Material-Icons durch DB-Icons ersetzt.

**Größenordnung:** mehrmonatig bei einem Entwickler. Kritischer Pfad
`0 → A1 → A2 → B → C → E → H → I`; F/G laufen parallel zu C, D nach C/G.

### Basis-Hinweis

Der Frontend-Branch **muss von `origin/dev`** ausgehen, nicht von der Parent-Gitlink
(die war zu Migrationsbeginn 14 Commits hinter `dev` und baute nicht – sie nutzte noch
`@otto-kirchheim/nebengeld-shared@^0.7.0` ohne die 0.8.0-Exporte). `dev` bindet shared als
`github:otto-kirchheim/nebengeld-shared#dev`.

## Nicht anfassen

PDF-Pipeline (`infrastructure/pdf/*` außer Modal-Shell-Geometrie in `signaturDialog.ts` in
Phase E; `signaturePad.ts`, `file-saver`), Shared-Paket `@otto-kirchheim/nebengeld-shared`,
Auth-Flows (`core/orchestration/auth/utils/*`, `infrastructure/tokenManagement/*`,
`@simplewebauthn/browser` – nur die Auth-Modal-Markups ändern sich),
`infrastructure/storage/Storage.ts` + localStorage-Schema/Keys, `infrastructure/api/*`
(`FetchRetry`, `apiService`), `infrastructure/autoSave/*` (nur die `CustomTable.onChange`-
Verdrahtung bleibt intakt), `infrastructure/data/resourceConfig.ts` & Datenkonfiguration,
`infrastructure/date/configDayjs.ts`, Feature-Business-Logik (`features/*/utils/**` – nur
`*Tab.tsx` und `components/*.tsx` werden migriert), PWA `runtimeCaching` in `vite.config.ts`,
Backend komplett.

---

## DB-UX-AI-Tooling (Querschnitt, in Phase 0 einrichten)

- **`@db-ux/mcp-server`** – MCP-Server mit offizieller Doku, Design-Tokens, Migrations-Engine.
  In `.mcp.json` (Parent-Repo):
  ```json
  { "mcpServers": { "db-ux": { "command": "npx", "args": ["-y", "@db-ux/mcp-server", "db-ux-mcp"] } } }
  ```
  Nutzen: verbindliche Token-Namen, Komponenten-Props, v5-Markup direkt abfragen in Phase B–G.
  Die Auto-Refactor-Engine zielt auf DB-UI-v2 → v3; Ausgangspunkt hier ist Bootstrap, sie
  greift also **nicht** automatisch – relevant sind die Doku-/Token-/Komponenten-Tools.
- **`@db-ux/agent-cli`** (`npx @db-ux/agent-cli`) – erzeugt `.github/copilot-instructions.md`
  aus den installierten `@db-ux`-Paketen. Einmal nach Phase B/C ausführen und committen;
  danach bei Paket-Updates neu generieren.
- **Doku-Websites** (version-gepinnt auf `v5.3.0`; SPA – im Browser öffnen, für Auszüge den
  MCP-Server nutzen):
  - IDE-/AI-Tooling-Setup: <https://design-system.deutschebahn.com/core-web/version/v5.3.0/foundations/ide>
  - Foundations (Tokens, Farben, Dichte, Fonts, Icons): <https://design-system.deutschebahn.com/core-web/version/v5.3.0/foundations/readme>
  - Komponenten (Props/Slots/CSS-Klassen + Migrations-Hinweis je Komponente): <https://design-system.deutschebahn.com/core-web/version/v5.3.0/components/readme>
  - Monorepo (Quellcode, Releases, `MIGRATION*.md`, Status-Board): <https://github.com/db-ux-design-system/core-web>
  - Paket-Versionen/Tarball gegenprüfen: `npm view @db-ux/<pkg>` bzw. `npm pack` + `tar tzf`
    (npm-Website liefert im Sandbox 403).

## Phase 0 — Toolchain-Gate (S)

Keine Verhaltensänderung, nur Infrastruktur.

- [x] Branch `feat/db-ux` von `origin/dev`; Baseline grün verifiziert (`release:check`:
      `typecheck` 0 / `lint` 0 / `bun test` 2069-0 / `build` ok).
- [x] `typecheck`-Script in `package.json` (`bunx --bun tsc --noEmit`), in `release:check`
      vorangestellt. (CI hat heute **keinen** typecheck/lint/test-Step – `deploy.yml` macht
      nur `bun install` + `bun run build`; der CI-Step wird in Phase B **neu** ergänzt,
      zusammen mit der ASSET-env.) Husky `pre-push` + `scripts/deploy.sh` ziehen `typecheck`
      automatisch mit.
- [x] Vorgefundener Testreihenfolge-Flake behoben (`test/core/bootstrap.test.ts` pinnt
      `document.readyState='complete'` wie die Schwester-Dateien) – vorher 2068/1 auf `origin/dev`.
- [x] `.gitignore`: expliziter `.env`-Block (Commit `f668d5e`; real: `.env` / `.env.*` /
      `.env.local` / `.env.local.*` – die Branch-`.gitignore` hatte keinen).
- [x] `db-ux`-MCP-Server in `.mcp.json` + `.mcp.json.example` **auf Parent-Branch
      `feat/db-ux-migration`** (= `origin/main` + `a70ca1f`), nicht auf `origin/main` selbst.
- [ ] `.env.example` – im Sandbox durch Deny-Rule blockiert; Anlage in Phase B zusammen mit
      `scripts/install.sh` (beide existieren noch nicht).
- [x] Wegwerf-Spike durchgeführt (2026-09-05, außerhalb des Repos, nicht gemergt):
      `@db-ux/react-core-components` + React 19 + `db-theme`-postinstall mit echten
      Credentials, Bundle gemessen. Ergebnisse siehe „Spike-Ergebnisse" unten.

**Verifikation:** `bun run release:check` grün (`typecheck` / `lint` / `test` / `build`);
CI (`bun run build`) unverändert grün. ✓ 2026-09-05: 2069 pass / 0 fail.

### Spike-Ergebnisse (2026-09-05) — verbindlich für Phase A/B

Minimales Vite-8-Projekt außerhalb des Repos: React 19.2.8, `@db-ux/*` 5.3.0,
`db-theme` 6.2.0, Querschnitt der später gebrauchten Komponenten. `tsc --noEmit` mit dem
projekt-gepinnten **TS 6.0.3 sauber** — kein TS-7-Zwang durch DB UX.

**1. `trustedDependencies` (Bun) — die Entschlüsselung hängt an den transitiven Paketen:**
```json
"trustedDependencies": [
  "@db-ux/db-theme",
  "@db-ux/db-theme-fonts",
  "@db-ux/db-theme-icons",
  "@db-ux/db-theme-illustrative-icons",
  "@swc/core"
]
```
`@db-ux/db-theme` allein reicht **nicht** — Fonts/Icons liegen in drei eigenen Paketen mit
je eigenem `postinstall`. `@swc/core` kommt über `@vitejs/plugin-react-swc` dazu. Ohne
Eintrag meldet Bun stumm „Blocked N postinstalls"; der Build läuft, aber ohne Markenassets.

**2. Entschlüsselung funktioniert** mit `ASSET_PASSWORD`/`ASSET_INIT_VECTOR` aus `frontend/.env`
(als echte Prozess-Env während `bun install`): 18 woff2 (DB Neo Screen Sans), 3345 Icon-SVG,
247 illustrative SVG, 49 Theme-Bilder. Die `.enc`-Dateien bleiben **neben** den entschlüsselten
liegen — kein Fehlerzeichen.

**3. Vite 8 = Rolldown: `manualChunks` nur als FUNKTION.** Die Rollup-Objektform
`{ react: ['react','react-dom'] }` bricht den Build hart ab
(`TypeError: manualChunks is not a function`). Korrigiert Phase A1.

**4. `cssMinify: 'esbuild'` braucht `esbuild` als explizite devDependency** — Vite 8 bringt
es nicht mehr mit (`Cannot find package 'esbuild'`).

**5. `light-dark()`-Falle bestätigt** (Quelle `core-components/bundle.css`: 867 Vorkommen):

| Build | `light-dark()` im Output | CSS |
|---|---|---|
| Vite-8-Default (LightningCSS) | **3** | 1.545 KB roh / 87,8 KB gz |
| `cssMinify: 'esbuild'` | **870** ✓ | 1.319 KB roh / 84,0 KB gz |

LightningCSS schreibt auf `var(--lightningcss-light, …) var(--lightningcss-dark, …)` um,
definiert diese Variablen aber **nur** unter `[data-mode=light]` / `[data-mode=dark]`
(2 Definitionen für 869 Verwendungen). Ohne explizites `data-mode` — also im
OS-Automatik-Fall — sind sie undefiniert. `cssMinify: 'esbuild'` ist damit **Pflicht**,
nicht optional.

**6. Bundle-Messung** (Spike-Minimal-App gegen heutigen `dist/`-Stand):

| | heute | Spike (DB UX + React 19) |
|---|---|---|
| Framework-Runtime | Preact (~5 KB gz im Bundle) | **59,6 KB gz** (189,6 KB roh) |
| CSS | 35,0 KB gz (242 KB roh) | **84,0 KB gz** (1.319 KB roh) |
| Fonts | material-icons woff2 | **32 woff2 / 1.779 KB** |
| sonstiges | — | 12 Marken-Logo-SVG (~91 KB), von `db-theme`-CSS automatisch gezogen |

→ Der Plan-Ansatz „Zuwachs ~ +40 KB gz" für React ist zu niedrig: real **~+55 KB gz**.
CSS wächst um ~+49 KB gz, ersetzt am Ende aber Bootstrap. **PWA-Relevanz:** 1,8 MB Fonts
treffen `globPatterns` (heute 42 Einträge / 3.191 KB Precache) — in Phase B/I bewusst
eingrenzen, nicht blind alles precachen. Die 12 Marken-Logos sind für eine Ein-Marken-App
Ballast → `data-color`/Brand-Eingrenzung in Phase I.

**7. `DBDrawer`-API (Phase E)** — baut auf nativem `<dialog>`:
`open`, `onClose`, `header`/`footer` als **Props-Slots** (nicht `drawerHeader`),
`direction` (`to-left|to-right|up|down`), `backdrop` (`none|strong|weak|invisible`;
`none` nutzt `dialog.show()` statt `showModal()`), `variant` (`modal|inside`),
`position` (`fixed` = `showModal()` **mit echtem Fokus-Trap**, `absolute` = `show()` **ohne**),
`containerSize`, `rounded`, `showSpacing`. Escape/Backdrop/Fokus-Trap kommen damit vom
Browser — die Phase-E-Verifikationspunkte sind großteils nativ abgedeckt.

**8. React-Single-Instance** trotz fehlender peerDeps im Minimalfall ok
(`npm ls react` → eine `react@19.2.8`, dedupet). Das CI-Gate bleibt trotzdem sinnvoll,
weil der echte Baum deutlich mehr Pakete hat.

**9. DB-UX-Theme-Attribute** in `bundle.css`: `data-density` (43), `data-color` (34),
`data-mode` (6). Für Phase B/I relevant.

---

## Phase A — Preact → React 19 (Bootstrap bleibt)

Größte Risikophase, zweigeteilt, als **eigener vollständig gemergter Meilenstein** ohne
DB-UX-Code.

### A1 — App kompiliert & läuft auf React 19 (L)

- **Deps rein:** `react@^19`, `react-dom@^19`, `@types/react@^19`, `@types/react-dom@^19`,
  `@vitejs/plugin-react-swc`. **Raus:** `preact`, `@preact/preset-vite`.
- **`vite.config.ts`:** `preact({...})` → `react()`. Übrige Plugins unverändert.
- **`tsconfig.json`:** `jsxImportSource: "preact"` → `"react"` (`jsx: "react-jsx"` bleibt);
  `types: ["bun-types"]` → `["bun-types", "react", "react-dom"]`.
- **Neu `src/ts/infrastructure/ui/reactRoot.ts`:** `WeakMap<Element, Root>`-Cache,
  `mount(el, node)` / `unmount(el)`. Ersetzt alle **~24 Preact-`render()`-Aufrufe in
  12 Dateien**: `components/showModal.ts`, `features/EWT/EwtTab.tsx`,
  `features/Bereitschaft/BereitschaftTab.tsx`, `features/Neben/NebenTab.tsx`,
  `features/EA/EaTab.tsx`, `features/Admin/index.tsx`, `core/help/openHelpModal.tsx`,
  `core/orchestration/onboarding/createOnboardingGuideModal.tsx`,
  `core/orchestration/auth/components/ConflictReviewBanner.tsx`,
  `features/Berechnung/components/BerechnungMobileCards.tsx`,
  `features/Admin/components/FormularEditor/datenpfadUndFormeln.tsx`,
  `features/Einstellungen/utils/generateEingabeMaskeEinstellungen.ts` (`h()` + `render()` in `.ts`).
  (`showModal(` selbst: ~21 Calls / 26 Importer.)
- **Import-Codemod (skriptgestützt + Review):** `preact` / `preact/hooks` / `preact/compat`
  → `react`; `preact/compat`-`createPortal` → `react-dom` in **3 Dateien**
  (`features/Admin/components/AdminResourceEditModal.tsx`, `.../AdminUserProfileEditor.tsx`,
  `.../FormularEditor/SchriftartDialog.tsx`); `FunctionalComponent`→`FC`,
  `ComponentChild(ren)`→`ReactNode`, `VNode`→`ReactElement`. `import 'preact/debug'` in
  `main.ts` (`main.ts:4`) entfernen.
- **JSX-Attribut-Codemod:** `class=`→`className=`, `for=`→`htmlFor=` (**~1330 Vorkommen**:
  `class=` ~1304 + `for=` ~25). Codebase hat bereits ~369 `className=` / ~12 `htmlFor=` gemischt
  → Codemod **muss idempotent** sein, kein blindes Ersetzen. **Nicht** in DOM-String-Templates
  (`.tsx`: `berechnenParser` / `schichtParser` in `EWT/EwtTab.tsx`; `.ts`: `signaturDialog.ts`,
  `autoSave/errorHandling.ts`, `ui/confirmDialog.ts`, `table/CustomTable.ts`,
  `Berechnung/generateTableBerechnung.ts`, `auth/utils/loadUserDaten.conflict.ts`).
  String-`style="a: b"` (**~128**) → Objekt-`style={{ a: 'b' }}`. Event-Review
  (~72 `.tsx` mit JSX-Handlern + ~20 `.ts` mit `addEventListener`): `onChange`-Semantik bei
  Textinputs feuert in React früher (~160 `onChange`-Stellen; Code nutzt heute großteils
  `onInput`, ~79 – Rest prüfen). (`onFocusIn/Out` kommt im Code **nicht** vor.)
- **`RefObject`-Typänderung React 19:** `createRef<T>()` liefert `RefObject<T | null>` –
  `MyInput.tsx` + alle `createRef`/`useRef`-Stellen mit `.current`-Guards prüfen.
- **Class-Components** (`MyInput.tsx` + 1 weitere): Preact-`Component`-Lifecycle ≈ React,
  `children` explizit typisieren. Bootstrap-`Popover` in `componentDidMount` bleibt bis Phase C.
- **ESLint:** `eslint-plugin-react`, `eslint-plugin-react-hooks` ergänzen (Rules-of-Hooks
  fehlt heute). `react/no-unknown-property` temporär als `error`.
- **Bundle/PWA:** heute existiert **kein** `rollupOptions`/`manualChunks` (`build` =
  `{ outDir, emptyOutDir, sourcemap:'hidden' }` in `vite.base-config.ts`) – der `manualChunks`-
  Block muss **neu** angelegt werden (`react`-Vendor-Chunk). **Spike-verifiziert:** Vite 8
  nutzt Rolldown, `manualChunks` wird **nur als Funktion** akzeptiert – die Rollup-Objektform
  `{ react: ['react','react-dom'] }` bricht den Build (`TypeError: manualChunks is not a
  function`). Funktionierende Form:
  ```ts
  build: { rollupOptions: { output: { manualChunks(id: string) {
    if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'react';
  } } } }
  ```
  Zuwachs: **~+55 KB gz** (React-19-Runtime real 59,6 KB gz, nicht die ursprünglich
  geschätzten +40 KB), im Bundle-Report dokumentieren.

**Verifikation:** `bun run typecheck` + `bun run build` grün; `verify`-Skill kompletter
Klickpfad (alle Tabs, je ein Add/Edit/Show-Modal pro Feature, Admin-Panel,
Login/Register/Reset-Modals, Signatur-Dialog), Dark/Light, Mobile-Viewport, Deep-Link `#EWT`.

### A2 — Test-Suite auf React (L)

- `test/setupBun.ts`: `globalThis.IS_REACT_ACT_ENVIRONMENT = true`; `afterAll`-Cleanup um
  Root-Unmount ergänzen.
- Render-Harness `test/helpers/renderComponent.tsx` mit `createRoot` + `act` (aus `react`;
  `react-dom/test-utils` ist in 19 entfernt). Alternativ `@testing-library/react` +
  `@testing-library/dom` (empfohlen, `cleanup()` in `afterEach`).
- Gesamtsuite ~183 Test-Dateien; **nur ~33 rendern Preact** (32 `.test.tsx` +
  `test/features/Admin.lifecycle.test.ts`) und brauchen die Harness-Umstellung – die ~150
  reinen Logik-`.test.ts` bleiben unberührt. Render-Weg heute: manuelles
  `import { render } from 'preact'` in ein lokal gebautes `container`-`div`, Cleanup
  `render(null, container)`; **kein** `@testing-library/preact`, **kein** `preact-render-to-string`.
  `preact/hooks`-Mocks → `react`. Direkt-nach-Render-Assertions mit `await act(...)`. `--isolate` behalten.

**Verifikation:** `bun run test` grün (reale Testzahl aus Phase 0 als Referenz, nicht die
alte „2067"-Behauptung), `bun run coverage` ohne Regression, `bun run lint` grün.

**Doku (Ende Phase A):** `frontend/CLAUDE.md` (Tech-Stack Preact→React), `.claude/skills/architektur`,
`.claude/skills/verify` (Effekt-Timing/`act`), `frontend/CHANGELOG.md`; Root `../CLAUDE.md`.

---

## Phase B — DB-UX-CSS-Layer + db-theme + Token-Bridge (M)

- **Deps:** `@db-ux/core-foundations`, `@db-ux/core-components` (5.3.0), `@db-ux/db-theme@6.2.0`
  – alle als normale `dependencies`. db-theme-postinstall über Bun: `"trustedDependencies"` in
  `package.json` (Bun-Mechanismus, **nicht** npm-`allowScripts`); `bunfig.toml` hat heute nur
  `[install] linker = "hoisted"` + `[test]`. **Spike-verifiziert — genau diese Liste, `db-theme`
  allein reicht nicht** (Fonts/Icons sind eigene transitive Pakete mit je eigenem `postinstall`):
  ```json
  "trustedDependencies": ["@db-ux/db-theme", "@db-ux/db-theme-fonts",
    "@db-ux/db-theme-icons", "@db-ux/db-theme-illustrative-icons", "@swc/core"]
  ```
  Ohne Eintrag meldet Bun nur „Blocked N postinstalls" – der Build läuft, aber ohne Markenassets.
- **`scripts/install.sh`** anlegen – `bun install` mit `.env`-Secrets für db-theme-postinstall.
- **`deploy.yml`:** hat heute **keinen** typecheck/lint/test-Step (nur `bun install
  --frozen-lockfile` + `bun run build`, Trigger nur `push` → `main`). `ASSET_PASSWORD` /
  `ASSET_INIT_VECTOR` als `env:` am Install-Step ergänzen; `typecheck`-Step **neu** hinzufügen
  (nicht „reaktivieren"). Bestehendes Gate: `scripts/deploy.sh` → `release:check` + Husky `pre-push`.
- **Neu `src/scss/layers.scss`** (als allererstes importiert):
  `@layer bootstrap, db-ux, bridge, app;`
- **`styles.scss` umbauen:** `@import '~bootstrap/scss/bootstrap'` in `@layer bootstrap { … }`
  kapseln. App-Overrides + Material-Icons-Import vorerst unlayered.
- **Neu `src/scss/db-ux.css`** (Pfade Spike-verifiziert; die `rollup`-Variante nutzt Bare-Specifier
  in `url()`, die Vite auflöst – `relative`/`absolute`/`webpack` sind die falschen Varianten):
  ```css
  @import '@db-ux/db-theme/build/styles/rollup.css' layer(db-ux);
  @import '@db-ux/core-components/build/styles/bundle.css' layer(db-ux);
  ```
- **`main.ts`:** `layers.scss` ganz oben, `db-ux.css` vor `styles.scss`.
- **Token-Bridge `src/scss/bridge.css` (`@layer bridge`):** genutzte `--bs-*` (`--bs-primary`,
  `--bs-body-bg`, `--bs-border-color`, `--bs-secondary`, `--bs-success`, `--bs-danger`,
  `--bs-body-color` + Emphasis-/Subtle-Varianten – `customtable.css` nutzt real
  `--bs-danger-bg-subtle`, `--bs-secondary-color`, `--bs-warning-bg-subtle`, `--bs-danger`,
  `--bs-emphasis-color`) auf DB-Tokens mappen.
- **`BSColorToggler.ts` erweitern** (nicht ersetzen): schreibt weiter `data-bs-theme` UND
  zusätzlich `color-scheme` am `<html>`; Storage-Key `theme` bleibt. `<html>` bekommt
  `data-density="regular"`.
- **Vite-8-CSS-Falle — Spike-bestätigt, `build.cssMinify: 'esbuild'` ist Pflicht:** der Default
  (LightningCSS) reduziert `light-dark()` von 867 auf 3 Vorkommen und schreibt auf
  `var(--lightningcss-light, …) var(--lightningcss-dark, …)` um, definiert diese Variablen aber
  nur unter `[data-mode=light]`/`[data-mode=dark]` → OS-Automatik-Modus kaputt. Mit
  `cssMinify: 'esbuild'` bleiben 870 erhalten. **`esbuild` dabei als explizite devDependency
  aufnehmen** – Vite 8 bringt es nicht mehr mit (`Cannot find package 'esbuild'`).
  Alternative: `css.transformer: 'postcss'` + `@db-ux/core-postcss-plugin`.
- **Fonts:** DB Screen Sans aus Foundations/db-theme in Build + Precache (`globPatterns`) +
  Preload (`unplugin-inject-preload`). **Achtung (Spike):** 32 woff2 / ~1,8 MB – heutiger
  Precache ist 42 Einträge / 3,2 MB. `globPatterns` gezielt eingrenzen statt alles precachen.

**Verifikation:** `bun run build` grün, generiertes CSS enthält `light-dark()` unverändert
(Gegenprobe: `grep -o 'light-dark(' dist/assets/*.css | wc -l` ≫ 800, **nicht** `grep -c` –
minifiziertes CSS ist eine Zeile);
`verify`-Skill: Bootstrap-Screens optisch unverändert bis auf Markenfarbton; Dark/Light auf
beide Systeme; DevTools zeigt `--db-*` am `:root`.

**Secrets-Handling:** `ASSET_PASSWORD` / `ASSET_INIT_VECTOR` sind **Install-Zeit-Env** (nicht
`VITE_`), müssen echter Prozess-Env während `bun install` sein. Lokal: `frontend/.env`
(gitignored) + `scripts/install.sh` oder `direnv`. CI: Repo-Secrets als `env:` am Install-Step.
`deploy.sh`/`release.ts` Install-Step ebenfalls. Entschlüsselte Markenassets nie committen.

---

## Phase C — Basiskomponenten → DB React Components (L)

`src/ts/components/*` werden dünne Adapter über `@db-ux/react-core-components@5.3.0`;
Barrel `index.ts` und Props bleiben möglichst stabil → Aufrufstellen ändern sich minimal.

- **peerDeps-Check:** Paket deklariert keine peerDeps → CI-Gate `npm ls react` / dedupe,
  ggf. `overrides`.
- `MyButton` → `DBButton` (`text`→children, `clickHandler`→`onClick`; `dataBs*` vorerst als
  DOM-Attribute durchreichen – noch Bootstrap-Modal).
- `MyInput` → `DBInput`: Bootstrap-`Popover` + `@popperjs/core` raus → `DBTooltip`/`DBInfotext`.
  Nativer `<input class="validate">` muss erhalten bleiben (Zod-Kette in
  `infrastructure/validation` matcht darauf – Selektoren prüfen).
- `MySelect` → `DBSelect`/`DBCustomSelect`; `MyCheckbox` → `DBCheckbox`.
- Modal-Bausteine: **nur Inhalt** auf DB-Komponenten; Bootstrap-Modal-Shell bleibt bis Phase E.
- `PasswordStrengthMeter`: DB-Tokens/`DBInfotext`, Logik unverändert.
- ESLint `@db-ux/core-eslint-plugin` aktivieren.

**Verifikation:** `bun run test` (Komponenten-Tests); `verify`-Skill: jedes Formular-Modal je
Feature (Add/Edit), Validierungsfehler-Anzeige, Auth-Formulare, Tastatur-Fokus, Dark/Light.

---

## Phase F — CustomTable → DB-Table-CSS (M–L, parallel zu C)

Es gibt **keine** interaktive DB-DataTable/React-Table-Komponente. Nur die reinen
`<table>`-CSS-Klassen aus `@db-ux/core-components` werden übernommen; die eigene Sortier-/
Inline-Edit-/Soft-Delete-Logik der `CustomTable`-Klasse bleibt vollständig erhalten.

- `customTableRender.ts`: Bootstrap-Table-Klassen (`table table-bordered table-striped
  table-hover align-middle` in `*Tab.tsx` + `index.html`) → DB-Table-CSS-Klassen/`data-*`.
- `CustomTable.ts`: Default-Edit/Delete/Undo-Markup (`<span class="material-icons-round">…` +
  `btn btn-secondary`) → DB-Icon + DB-Button-Markup; `customButton.classes`-Konvention anpassen.
- **Bootstrap-`Tooltip`-JS:** `customTableRender.ts` importiert + instanziiert
  `bootstrap/js/dist/tooltip` (`new Tooltip(td, …)` für Fehler-Zeilen, `data-bs-toggle="tooltip"`
  / `data-bs-title`) → `DBTooltip`. Ebenso `features/Admin/components/AdminUserList.tsx`.
  (Damit ist `Tooltip` die 7. Bootstrap-JS-Komponente – Popover/Modal/Tab/Collapse/Dropdown/Offcanvas
  sind die anderen 6.)
- `customtable.css` gegen DB-Tokens neu schreiben (nutzt heute `--bs-danger-bg-subtle`,
  `--bs-secondary-color`, `--bs-warning-bg-subtle`, `--bs-danger`, `--bs-emphasis-color` +
  `[data-bs-theme='light']`-Selektoren); Responsive-Breakpoints (`customtable-toggle-*`)
  bleiben JS-seitig unverändert.
- `.form-check.form-switch`-Parser (`berechnenParser` + `schichtParser` in `EWT/EwtTab.tsx`,
  DOM-Strings mit `html: true`) → DB-Switch-Markup.

**Verifikation:** Sortierung, Inline-Editing, Add/Delete/Delete-All, `onChange`→AutoSave,
Responsive-Umbruch je Breakpoint; `verify`-Skill je Feature-Tabelle; `bun run test`.

---

## Phase G — Icons Material → DB-Icons (M, parallel zu C/F)

- Mapping-Tabelle Material-Name → DB-Icon-Name (~40 Icons: `edit, delete, undo, calculate,
  save, download, help_outline` …), fachliche Freigabe je Ersatz.
- `<span class="material-icons-round …">name</span>` (~41 Dateien + `index.html`) → `DBIcon`
  (in `.tsx`) bzw. `<span class="db-icon" data-icon="…">` (in DOM-Strings/`index.html`/
  `CustomTable`).
- `styles.scss`: `@import '~material-icons/…'` + `.small-icons`/`.big-icons`/
  `.einstellungen-icons` entfernen/ersetzen.
- `vite.config.ts`: `UnpluginInjectPreload`-Match für `material-icons-*.woff2` entfernen;
  `~material-icons`-Alias raus; `material-icons`-Dependency raus.

**Verifikation:** Grep `material-icons` = 0; visueller Icon-Sweep via `verify`; `bun run build`.

---

## Phase D — App-Shell / Navigation / index.html (L, nach C/G)

- **Ansatz:** statisches HTML-Grundgerüst behalten, kleine React-Shell im Header-Slot
  (`DBHeader` + Brand + Theme-Toggle + `DBNavigation`) mounten. Neuer leichter
  `infrastructure/ui/tabController.ts`: schaltet `.tab-pane`-Sichtbarkeit, pflegt
  `location.hash`, dispatcht `tab:shown`-CustomEvent.
- `src/index.html`: `<header class="navbar …">` + `.offcanvas#navmenu` + `.nav-pills` →
  DB-Header/Navigation-Markup; `data-bs-toggle="pill"` / `data-bs-target` → `data-tab-target`
  plus Controller; `role`/`aria-*` behalten.
- `main.ts`: `Dropdown`/`Offcanvas`/`Collapse`/`Tab`-Init entfernen; Hash-Handling →
  `tabController.showByHash()`. Feature-Lifecycle-Registry von Bootstrap-Pill-Events auf
  `tab:shown` umstellen. Admin-`d-none`-Toggling → Controller-API.
- Theme-Toggle-UI (`#bd-theme`-Dropdown, `[data-bs-theme-value]`) → DB-Switch/DB-Button;
  `BSColorToggler` an neue Selektoren anpassen (Logik/Storage-Key bleibt).

**Verifikation:** Navigation Desktop + Mobile, Deep-Link `/#EWT`, Browser-Back/Forward,
Tastatur (`aria-selected`), Feature-Init feuert bei Tab-Wechsel; `verify`-Skill Vollpfad +
Skill-Selektoren im selben PR mitziehen.

---

## Phase E — Modal-Infrastruktur → DB-Drawer (L, nach C)

DB UX v5 hat kein dediziertes Modal; `DBDrawer` ist das Pendant. **Spike-verifizierte API** —
`DBDrawer` baut auf nativem `<dialog>`:

| Prop | Werte / Bedeutung |
|---|---|
| `open` | boolean, gesteuerter Zustand |
| `onClose` | Klick auf Close-Button, Escape, Backdrop |
| `header` / `footer` | **Props-Slots** (JSX), nicht `drawerHeader` |
| `direction` | `to-left` \| `to-right` \| `up` \| `down` |
| `backdrop` | `none` \| `strong` \| `weak` \| `invisible` — `none` nutzt `dialog.show()` statt `showModal()` |
| `variant` | `modal` (Default) \| `inside` |
| `position` | `fixed` (Default) = `showModal()` **mit echtem Fokus-Trap**; `absolute` = `show()` **ohne** |
| `containerSize` | `small` \| `medium` \| `large` \| `full` |
| `rounded`, `showSpacing` | boolean |

→ Escape-/Backdrop-Close, Fokus-Trap und Scroll-Lock liefert der Browser über `<dialog>`;
die Phase-E-Verifikationspunkte sind damit großteils nativ abgedeckt. **`position`/`backdrop`
nicht versehentlich auf `absolute`/`none` setzen** — sonst geht der Fokus-Trap verloren.

- `showModal.ts` neu: statt `Modal.getOrCreateInstance(...).show()` einen `DBDrawer`-Baum via
  `mount(#modal, <DrawerHost>{children}</DrawerHost>)`; `open`-State im Host, `onClose` →
  `unmount(#modal)`. Signatur `showModal(children) → Element` beibehalten; `.row`/`.role`-
  Properties am `#modal` bleiben Übergangs-Kontrakt (21 Calls / 26 Importer).
- `showModalHelpers.tsx` + alle Modal-Bausteine final auf Drawer-Slots (`header`/children/`footer`).
- `confirmDialog.ts` → DB-Drawer/DB-Notification mit Actions; `CustomSnackbar` →
  DB-Notification-Styling (`.CustomSnackbar-container` im `verify`-Skill ggf. mitziehen).
- **Sonderfall `infrastructure/pdf/signaturDialog.ts`:** an DB-Drawer-Geometrie neu rechnen
  (Canvas-Ratio-Logik `berechneCanvasGroesse` bleibt). Puppeteer-Messungen als Regressions-
  gegenprüfung (Dialog historisch fehleranfällig).
- `main.ts` + `MyInput` + übrige `bootstrap/js/dist/*`-Importe entfernen.

**Verifikation:** jedes Add/Edit/Show-Modal aller Features + Admin + Auth + Hilfe + Signatur-
Dialog (inkl. Fullscreen/Querformat); Escape/Backdrop-Close, Fokus-Trap, Scroll-Lock;
`bun run test`; `verify`-Skill.

---

## Phase H — Bootstrap vollständig entfernen (XL, nach D/E/F/G)

- **Utility-Klassen-Sweep (Hauptaufwand):** `d-*`, `container(-fluid/-lg)`, `row`, `col-*`,
  `g-*`/`gap-*`, `m*`/`p*`/`me-1`, `text-*`, `align-*`, `justify-content-*`, `bg-*`, `border-*`,
  `sticky-top`, `btn-close`, custom `w200`/`w20`/`w40` in `index.html` + ~86 von 93 `.tsx`
  (+ ~4 `.ts` DOM-String-Dateien). Strategie: `DBStack`/`DBSection` wo React (`DBGrid`
  existiert **nicht** in `react-core-components` 5.3.0 – nur `stack` + `section`); für den Rest
  kleine App-Utility-CSS inkl. Grid-Helfer (`@layer app`, ~20 Helfer). Zwischenschritt möglich:
  nur `bootstrap/scss/utilities` behalten, `-components` früher raus.
- `styles.scss`: `@layer bootstrap`-Import entfernen; `var(--bs-*)`-Overrides auf DB-Tokens
  umschreiben oder löschen; `bridge.css` reduzieren/entfernen.
- `BSColorToggler` → `DBColorToggler` (nur `color-scheme`/DB-Attribut); `<html data-bs-theme>`
  raus; `@media (prefers-color-scheme: dark)`-Blöcke → `light-dark()`.
- `vite.base-config.ts`: `~bootstrap`-Alias raus; `silenceDeprecations` reduzieren.
- `bootstrap`, `@types/bootstrap`, `@popperjs/core` deinstallieren.

**Verifikation:** Grep-Gates = 0 (`bootstrap`, `data-bs-`, `--bs-`, `bootstrap/js`);
`bun run build`; volle `verify`-Matrix; `bun run test`; axe/Lighthouse-Check.
Screen-für-Screen mergen, nicht Big-Bang.

---

## Phase I — Cleanup, Token-Finalisierung, Doku (M)

- Layer-Modell konsolidieren: `@layer db-ux, app;`; `customtable.css` in `@layer app`.
- `data-density`/`data-color` final mit Design abstimmen (`bundle.css` nutzt `data-density` 43×,
  `data-color` 34×, `data-mode` 6×). **Spike-Befund:** das `db-theme`-CSS zieht **12 Marken-Logo-SVG
  (~91 KB)** in den Build – für eine Ein-Marken-App Ballast; Brand/`data-color` eingrenzen oder
  die nicht genutzten Logos aus dem Build halten.
- Bundle-Budget gegen die Spike-Zahlen prüfen (React-Runtime ~60 KB gz, DB-UX-CSS ~84 KB gz,
  Fonts ~1,8 MB) und `globPatterns` des Precache entsprechend eingrenzen.
- Dark-Mode-QA end-to-end; `manifest.theme_color` + `<meta name="theme-color">` (heute `#212529`)
  und `manifest.background_color` (heute `#000000`) auf DB-Brand-Werte.
- Bundle-/PWA-Review; `@db-ux/core-stylelint` optional; ESLint-Config aufräumen.
- `npx @db-ux/agent-cli` final neu ausführen, `.github/copilot-instructions.md` committen.
- **Doku (Done-Kriterium):** `frontend/CLAUDE.md`, `.claude/skills/architektur`,
  `.claude/skills/verify`, `.claude/skills/bootstrap` (entfernen/umschreiben), Root
  `../CLAUDE.md` + `../WORKSPACE.md` + `frontend/.claude/README.md`, `frontend/CHANGELOG.md`,
  `graphify update .`.

---

## Kritische Dateien

- `frontend/vite.config.ts` + `frontend/vite.base-config.ts` — Plugin-Wechsel, CSS-Minifier,
  Aliase, Preload
- `frontend/tsconfig.json` — `jsxImportSource`, `types`
- `frontend/src/ts/main.ts` — Bootstrap-JS-Init, Feature-Imports, SCSS-Imports, Tab-Hash
- `frontend/src/ts/components/showModal.ts` (+ `components/index.ts`, `components/My*.tsx`)
- `frontend/src/ts/infrastructure/ui/reactRoot.ts` (neu), `BSColorToggler.ts`,
  `tabController.ts` (neu)
- `frontend/src/scss/layers.scss` (neu), `db-ux.css` (neu), `bridge.css` (neu), `styles.scss`
- `frontend/src/index.html` — Navigation, Tab-Buttons, Table-Klassen, `<html>`-Attribute
- `frontend/src/ts/infrastructure/table/CustomTable.ts` + `customTableRender.ts` + `customtable.css`
- `frontend/src/ts/features/*/‹Feature›Tab.tsx` (mount/unmount, Table-Markup)
- `frontend/src/ts/infrastructure/pdf/signaturDialog.ts` — nur Modal-Shell-Geometrie (Phase E)
- `frontend/test/setupBun.ts` + `test/helpers/renderComponent.tsx` (neu)
- `frontend/eslint.config.js` — react/react-hooks/db-ux Plugins
- `frontend/package.json` / `scripts/install.sh` (neu) / `.github/workflows/deploy.yml`

## Verifikation (jede Phase)

`bun run typecheck` · `bun run lint` · `bun run test` (sequentiell) · `bun run build` ·
`verify`-Skill (Puppeteer + `/usr/bin/google-chrome-stable`, Port 8080, localStorage-Seed
inkl. `Version`, `localStorage.clear` stubben) für die berührten Screens · manuell Dark/Light ·
Mobile-Viewport (<768 px) + Deep-Link · CI-Gate `npm ls react` (Single-Instance).
Grep-Gates in H: `bootstrap` / `data-bs-` / `--bs-` / `material-icons` = 0.
