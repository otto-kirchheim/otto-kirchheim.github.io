# UI/UX-Migration Frontend → DB UX Design System v3

> Genehmigter Gesamtplan. Fortschritt und Phasen-Logs: `tasks/todo.md`.
> Branch: `feat/db-ux` (Frontend, von `origin/dev`) · `feat/db-ux-migration` (Parent-Repo).

## Status (2026-09-03)

- **Phase 0** – teilweise erledigt. `typecheck`-Script + `release:check`-Gate, `.gitignore`
  `.env`-Block, `.mcp.json` DB-UX-Server (Parent). Baseline auf `origin/dev` grün
  (`typecheck` exit 0, `build` ok, `test` 2067 pass / 0 fail).
- **Phase A–I** – offen.

### Lokal fortsetzen

```bash
# Parent
git clone <parent> && cd DB-Nebengeld
git checkout feat/db-ux-migration
git submodule update --init --recursive
# Frontend-Submodul steht dann auf feat/db-ux
cd frontend
bun install            # zieht shared via github:otto-kirchheim/nebengeld-shared#dev
bun run typecheck && bun run test && bun run build   # Baseline muss grün sein
```

Für Phase B werden die DB-Markentheme-Secrets gebraucht: `frontend/.env` (gitignored)
mit `ASSET_PASSWORD` / `ASSET_INIT_VECTOR` aus dem DB-Marketingportal; `bun install`
lädt `.env` nicht automatisch → `scripts/install.sh` (Phase B) oder `set -a; source .env`.

## Context

Das Frontend läuft heute auf **Preact 10 + Bootstrap 5.3** (eine `styles.scss`,
Material-Icons-Webfont, Tab-SPA komplett in `src/index.html`, `CustomTable` als Vanilla-DOM,
Modals als Preact via `showModal()`). Kein Design-Token-System außer den Bootstrap-`--bs-*`-
Custom-Properties, kein DB-Branding.

Ziel: Angleichung an das **DB UX Design System v3** (`core-web` 5.3.0,
<https://github.com/db-ux-design-system/core-web>). Getroffene Entscheidungen:

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

## Phase 0 — Toolchain-Gate (S)

Keine Verhaltensänderung, nur Infrastruktur.

- [x] Branch `feat/db-ux` von `origin/dev`; Baseline grün verifiziert.
- [x] `typecheck`-Script in `package.json` (`bunx --bun tsc --noEmit`), in `release:check`
      vorangestellt. (CI-Step folgt in Phase B zusammen mit der ASSET-env.)
- [x] `.gitignore`: expliziter `.env` / `.env.local` / `.env.*.local`-Block (die Branch-
      `.gitignore` hatte keinen).
- [x] `db-ux`-MCP-Server in `.mcp.json` + `.mcp.json.example` (Parent).
- [ ] `.env.example` – im Sandbox durch Deny-Rule blockiert; Anleitung liegt in
      `scripts/install.sh` (Phase B).
- [ ] Wegwerf-Spike (nicht mergen): `@db-ux/react-core-components` + React 19 + `db-theme`-
      postinstall mit echten Credentials einmal durchspielen, Bundle messen.

**Verifikation:** `bun run typecheck` grün; CI unverändert grün.

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
  `mount(el, node)` / `unmount(el)`. Ersetzt alle **28 `render(...)`-Aufrufstellen**
  (`showModal.ts`, `mount*Tab`/`unmount*Tab` in `EwtTab.tsx`, `BereitschaftTab.tsx`,
  `NebenTab.tsx`, `EaTab.tsx`, `features/Admin/index.tsx`).
- **Import-Codemod (skriptgestützt + Review):** `preact` / `preact/hooks` / `preact/compat`
  (2 Admin-Dateien: `createPortal` → `react-dom`) → `react`; `FunctionalComponent`→`FC`,
  `ComponentChild(ren)`→`ReactNode`, `VNode`→`ReactElement`. `import 'preact/debug'` in
  `main.ts` entfernen.
- **JSX-Attribut-Codemod:** `class=`→`className=`, `for=`→`htmlFor=` (~1200 Vorkommen in
  `.tsx`, **nicht** in DOM-String-Templates der Tabellen-Parser wie `berechnenParser` /
  `schichtParser`). String-`style="a: b"` (~121) → Objekt-`style={{ a: 'b' }}`. Event-Review
  (~47 Handler-Dateien): `onChange`-Semantik bei Textinputs feuert in React früher;
  `onFocusIn/Out`→`onFocus/onBlur`.
- **`RefObject`-Typänderung React 19:** `createRef<T>()` liefert `RefObject<T | null>` –
  `MyInput.tsx` + alle `createRef`/`useRef`-Stellen mit `.current`-Guards prüfen.
- **Class-Components** (`MyInput.tsx` + 1 weitere): Preact-`Component`-Lifecycle ≈ React,
  `children` explizit typisieren. Bootstrap-`Popover` in `componentDidMount` bleibt bis Phase C.
- **ESLint:** `eslint-plugin-react`, `eslint-plugin-react-hooks` ergänzen (Rules-of-Hooks
  fehlt heute). `react/no-unknown-property` temporär als `error`.
- **Bundle/PWA:** `build.rollupOptions.output.manualChunks` → `react`-Vendor-Chunk.
  Zuwachs ~ +40 KB gz akzeptieren, im Bundle-Report dokumentieren.

**Verifikation:** `bun run typecheck` + `bun run build` grün; `verify`-Skill kompletter
Klickpfad (alle Tabs, je ein Add/Edit/Show-Modal pro Feature, Admin-Panel,
Login/Register/Reset-Modals, Signatur-Dialog), Dark/Light, Mobile-Viewport, Deep-Link `#EWT`.

### A2 — Test-Suite auf React (L)

- `test/setupBun.ts`: `globalThis.IS_REACT_ACT_ENVIRONMENT = true`; `afterAll`-Cleanup um
  Root-Unmount ergänzen.
- Render-Harness `test/helpers/renderComponent.tsx` mit `createRoot` + `act` (aus `react`;
  `react-dom/test-utils` ist in 19 entfernt). Alternativ `@testing-library/react` +
  `@testing-library/dom` (empfohlen, `cleanup()` in `afterEach`).
- ~33 Test-Dateien: Preact-Render → Harness; `preact/hooks`-Mocks → `react`. Direkt-nach-
  Render-Assertions mit `await act(...)`. `--isolate` behalten.

**Verifikation:** `bun run test` (~2067 Tests) grün, `bun run coverage` ohne Regression,
`bun run lint` grün.

**Doku (Ende Phase A):** `frontend/CLAUDE.md` (Tech-Stack Preact→React), `.claude/skills/architektur`,
`.claude/skills/verify` (Effekt-Timing/`act`), `frontend/CHANGELOG.md`; Root `../CLAUDE.md`.

---

## Phase B — DB-UX-CSS-Layer + db-theme + Token-Bridge (M)

- **Deps:** `@db-ux/core-foundations`, `@db-ux/core-components` (5.3.0), `@db-ux/db-theme@6.2.0`
  – alle als normale `dependencies` + `allowScripts` (db-theme-postinstall).
- **`scripts/install.sh`** anlegen – `bun install` mit `.env`-Secrets für db-theme-postinstall.
- **`deploy.yml`:** `ASSET_PASSWORD` / `ASSET_INIT_VECTOR` als `env:` am Install-Step; danach
  `typecheck`-Step wieder aktivierbar.
- **Neu `src/scss/layers.scss`** (als allererstes importiert):
  `@layer bootstrap, db-ux, bridge, app;`
- **`styles.scss` umbauen:** `@import '~bootstrap/scss/bootstrap'` in `@layer bootstrap { … }`
  kapseln. App-Overrides + Material-Icons-Import vorerst unlayered.
- **Neu `src/scss/db-ux.css`:** `@import '@db-ux/db-theme/.../<brand-theme>.css' layer(db-ux);`
  + `@import '@db-ux/core-components/.../bundle.css' layer(db-ux);` (Rollup-/Vite-Variante).
- **`main.ts`:** `layers.scss` ganz oben, `db-ux.css` vor `styles.scss`.
- **Token-Bridge `src/scss/bridge.css` (`@layer bridge`):** genutzte `--bs-*` (`--bs-primary`,
  `--bs-body-bg`, `--bs-border-color`, `--bs-secondary`, `--bs-success`, `--bs-danger`,
  `--bs-body-color` + Emphasis-Varianten) auf DB-Tokens mappen.
- **`BSColorToggler.ts` erweitern** (nicht ersetzen): schreibt weiter `data-bs-theme` UND
  zusätzlich `color-scheme` am `<html>`; Storage-Key `theme` bleibt. `<html>` bekommt
  `data-density="regular"`.
- **Vite-8-CSS-Falle:** `build.cssMinify: 'esbuild'` setzen (LightningCSS zerbricht
  `light-dark()`). Alternative: `css.transformer: 'postcss'` + `@db-ux/core-postcss-plugin`.
- **Fonts:** DB Screen Sans aus Foundations/db-theme in Build + Precache (`globPatterns`) +
  Preload (`unplugin-inject-preload`).

**Verifikation:** `bun run build` grün, generiertes CSS mit aufgelöstem `light-dark()`;
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
- `CustomTable.ts`: Default-Edit/Delete/Undo-Markup (`<span class="material-icons-round">…`
  + `btn btn-secondary`) → DB-Icon + DB-Button-Markup; `customButton.classes`-Konvention
  anpassen.
- `customtable.css` gegen DB-Tokens neu schreiben; Responsive-Breakpoints
  (`customtable-toggle-*`) bleiben JS-seitig unverändert.
- `.form-check.form-switch`-Parser (`berechnenParser` in `EwtTab` u.a.) → DB-Switch-Markup.

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
  + Controller; `role`/`aria-*` behalten.
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

DB UX v5 hat kein dediziertes Modal; `DBDrawer` ist das Pendant.

- `showModal.ts` neu: statt `Modal.getOrCreateInstance(...).show()` einen `DBDrawer`-Baum via
  `mount(#modal, <DrawerHost>{children}</DrawerHost>)`; `open`-State im Host, `onClose` →
  `unmount(#modal)`. Signatur `showModal(children) → Element` beibehalten; `.row`/`.role`-
  Properties am `#modal` bleiben Übergangs-Kontrakt (28 Aufrufstellen).
- `showModalHelpers.tsx` + alle Modal-Bausteine final auf Drawer-Slots (header/content/footer).
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
  `sticky-top`, `btn-close`, custom `w200`/`w20`/`w40` in `index.html` + ~90 `.tsx` +
  DOM-String-Templates. Strategie: `DBStack`/`DBSection`/`DBGrid` wo React; für den Rest kleine
  App-Utility-CSS (`@layer app`, ~20 Helfer). Zwischenschritt möglich: nur
  `bootstrap/scss/utilities` behalten, `-components` früher raus.
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
- `data-density`/`data-color` final mit Design abstimmen.
- Dark-Mode-QA end-to-end; `manifest.theme_color` / `<meta name="theme-color">` /
  `background_color` (`#212529`) auf DB-Brand-Werte.
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
inkl. `Version`, `localStorage.clear` stubben) für die berührten Screens · manuell Dark/Light
+ Mobile-Viewport (<768 px) + Deep-Link. CI-Gate `npm ls react` (Single-Instance).
Grep-Gates in H: `bootstrap` / `data-bs-` / `--bs-` / `material-icons` = 0.
