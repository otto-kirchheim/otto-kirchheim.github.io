# CLAUDE.md – Projektanweisungen für AI-Assistenten (Frontend)

> **Aufbau:** Diese Datei enthält Frontend-spezifische Grundlagen. Globale Workflow- und
> Qualitätsregeln siehe [`../CLAUDE.md`](../CLAUDE.md). Details zu spezifischen Themen
> stehen in den verlinkten Dateien unter `.claude/`.

## Navigation

- Globale Workflow- und Qualitätsregeln: [`../CLAUDE.md`](../CLAUDE.md)
- Workspace-Struktur und Repositories: [`../WORKSPACE.md`](../WORKSPACE.md)
- Root-AI-Dokumentation: [`../.claude/README.md`](../.claude/README.md)
- Backend-Regeln und Skills: [`../backend/CLAUDE.md`](../backend/CLAUDE.md)
- Frontend-AI-Dokumentation: [`.claude/README.md`](.claude/README.md)
- Frontend-Skills: [`.claude/skills/README.md`](.claude/skills/README.md)

---

## Projektübersicht

**DB-Nebengeld Frontend** – TypeScript SPA mit React 19, DB UX Design System, Vite und PWA-Support.

### Tech-Stack

- **Framework:** React 19 (seit 2026-09-06, vorher Preact 10 – siehe `tasks/plan-db-ux-migration.md`)
- **Build Tool:** Vite (v8) mit `@vitejs/plugin-react` (Oxc)
- **Sprache:** TypeScript (strict mode; kein any)
- **Styling:** DB UX Design System 5.3 (`@db-ux/*`, `db-theme` 6.2) + eigene Hilfsklassen (`src/scss/utilities.scss`) + SCSS; Cascade Layers `db-ux < app < unlayered` (`src/scss/layers.scss`, dort ausführlich begründet). Bootstrap ist seit Phase H komplett raus (Paket, CSS, JS, `data-bs-*`). DB "neues Design" (Phase I): `<html data-density="regular">` (seit 2026-09-13; vorher `functional` -- umgestellt wegen zu kleiner Zeilen-Aktionsknoepfe in Tabellen, siehe `CHANGELOG.md` Eintrag 128/129), DB-Schwelle (`.schwelle` + `--schwelle-motiv`) am oberen Rand des Startbereichs. `AppHeader.tsx`s `useHeaderForceMobile()` gleicht dabei aus, dass `DBHeader`s fixe `min-width:64em`-CSS-Weiche nicht auf `data-density` reagiert (siehe dort). Brand-Regeln in der Memory `db-brand-farben-neues-design`
- **Datum:** dayjs (IMMER dayjs verwenden, NIEMALS native Date-Methoden oder moment.js)
- **PWA:** vite-plugin-pwa (Service Worker, Auto-Update)
- **Testing:** Bun test + happy-dom
- **Linting:** ESLint + Prettier + Husky (Pre-Commit Hooks)
- **PDF-Export:** client-seitig über die Formular-Vorlagen-Pipeline (`shared/lib/pdf/`, `shared/src/formular/build.ts`); `file-saver` löst nur den Browser-Download des fertigen Blobs aus

### Starten

```bash
./scripts/install.sh   # bun install MIT den ASSET_*-Secrets aus .env (DB-UX-Markenassets)
bun install            # ohne Secrets -- Build laeuft, aber ohne DB-Schriften/-Icons
bun run dev            # Entwicklung mit Vite Dev-Server (--host, Proxy-HMR ueber dev.otto.home64.de)
bun run dev:local      # dito ohne Proxy (VITE_LOCAL_HMR=1, direkt http://localhost:8080)
bun run build          # Produktion Build (nach ./dist)
bun run test           # Bun-Testlauf (sequentiell pro Datei)
bun run dev-test       # Bun Watch-Mode
bun run lint           # ESLint prüfen
bun run lint:fix       # ESLint auto-fix
bun run lint:css       # Stylelint prüfen (Ratsche: --max-warnings, siehe stylelint.config.mjs)
bun run lint:css:fix   # Stylelint auto-fix -- danach IMMER den Diff ansehen
bun run coverage       # Tests mit Coverage
bun run preview        # Build-Preview (schreibt nach ../public/public)
```

---

## 1. Architektur & Verzeichnisstruktur

```
src/
├── index.html             # Minimaler Einstiegspunkt (`<div id="app">` + `<noscript>`, Phase N), lädt `ts/app/main.tsx`
├── env.d.ts               # Vite Environment-Typen
├── scss/                  # DB-UX-Import, Hilfsklassen, App-Styles
└── ts/                    # Feature-Sliced Design: Import nur abwärts app → pages → widgets → features → shared
    ├── app/               # main.tsx (Hook-Registrierung, Root-Mount, Init), App.tsx (Shell), features.ts (Feature-Manifest),
    │                      # session/ (Login-Nachbereitung, loadUserDaten), shell/ (Pull-to-Refresh, Offline, Versionshinweis)
    ├── pages/             # start, berechnung, einstellungen, admin (je ui/ + model/; admin zusätzlich api/, features/<id>/, adminFeatures.ts)
    ├── widgets/           # app-header (inkl. ThemeSwitcher), app-footer, help-modal
    ├── features/          # Module ber/ewt/ez/ea (meta.ts, parts/, ui/, model/) + geteilte Nicht-Module auth, onboarding
    └── shared/            # api/ (FetchRetry, Token), lib/ (feature-Registry + Hooks, lifecycle, ressource, pdf, date, storage, …),
                           # model/ (navigation inkl. tabController, period, einstellungen, session), ui/ (form, modal, custom-table, …), types/
test/                      # spiegelt src/ts (test/app, test/pages, test/widgets, test/features, test/shared)
├── setupBun.ts            # Setup: happy-dom + Bun-Kompatibilitaet
└── mockData.ts            # Gemeinsame Test-Daten
```

### Architektur-Konzepte

**Tab-basierte SPA (kein Router):**
Die Navigation erfolgt über `AppHeader.tsx` (React, `DBHeader`/`DBNavigation`) und
`shared/model/navigation/tabController.ts` (`data-tab-target="<Panel-Id>"`, `tab:shown`-CustomEvent,
Hash-Sync), nicht über einen Client-Side-Router. Aktiver Tab der Hauptnavigation ist ein
`useSyncExternalStore`-Modul-Store (`activeTabStore.ts`/`useActiveTab.ts`), von `AppHeader`
reaktiv gelesen. Seit Phase N Slice 2 (abgeschlossen 2026-09-13) gilt das auch für die
`#tabContent`-Panes selbst: `zeigeTab()` schreibt für die Hauptgruppe keine `active`/`show`-DOM-
Klassen mehr, `App.tsx`s Panes berechnen sie React-eigen aus demselben Store. `setAktivenTab()`
läuft dafür durch `flushExtern()` (`reactRoot.ts`) – `berechnungMonatsFenster.ts`s
`tab:shown`-Handler misst synchron `clientWidth` und braucht das Pane davor sichtbar. Admins
Unternavigation (eigene Tab-Gruppe) nutzt denselben Mechanismus mit eigenem Store (`activeAdminTabStore.ts`/`useActiveAdminTab.ts`). Seit Phase N
(Slice 1, abgeschlossen 2026-09-13) ist die gesamte Shell
(`App.tsx`) ein einziger React-Baum, der ueber `main.tsx` per `mount()`
(`shared/lib/react-root/reactRoot.ts`, NICHT direkt `createRoot().render()` -- siehe unten) in
`<div id="app">` gemountet wird; `index.html` enthaelt nur noch `<noscript>` + diesen einen Div.
Alle Tab-Panel-Inhalte sind React, direkt in der jeweiligen Tab-Pane als JSX-Kind (kein
Wrapper-Div): `#start` (`StartTab.tsx` – `styles.scss`s `#start.active > .schwelle`-Kindselektor
verlangt das Fehlen eines Wrapper-Divs), `#Berechnung` (`BerechnungTab.tsx` als Huelle +
`BerechnungTableRows.tsx` als eigener React-Root direkt auf `<tbody id="tbodyBerechnung">`,
analog `BerechnungMobileCards`) und `#Einstellungen` (`EinstellungenTab.tsx` +
`PersoenlicheDatenPanel.tsx`). Die gesamte Feld-Verkabelung dieser Tabs
(`saveEinstellungen.ts`, `generateEingabeMaskeEinstellungen.ts`, `pages/einstellungen/index.ts`,
`berechnungMonatsFenster.ts` u. a.) bleibt bewusst `document.querySelector('#Id')`-basiert und
unveraendert – sie ist unabhaengig davon, ob React oder statisches HTML das Element erzeugt hat.
**Wichtig fuer `main.tsx`:** der Root-Mount muss ueber `mount()` laufen (per `flushSync`), nicht
ueber ein blankes `createRoot().render()` -- Letzteres committet zwar das DOM synchron, plant
`useEffect`-Hooks (z. B. `EinstellungenTab`s Tabellen-Erzeugung) aber nur asynchron ein, und der
erste `registerAppStartTask`-Callback laeuft dann potenziell VOR diesen Effekten (siehe
`tasks/lessons.md`).

**FSD-Schichten** (Import nur abwärts, keine Importe zwischen Slices derselben Schicht):

- **`app/`** – Einstieg und Verdrahtung: `main.tsx` registriert die Hooks, mountet `App.tsx` und startet die Init-Sequenz; `features.ts` ist das Feature-Manifest (neben `pages/admin/adminFeatures.ts` die einzige Stelle mit Modul-Wissen); `session/` (Login-Nachbereitung, Laden der Benutzerdaten), `shell/`.
- **`pages/`** – globale Bereiche `start`, `berechnung`, `einstellungen`, `admin`. Sie erreichen die Module nur über die Feature-Registry, nie per Import aus `features/<modul>`.
- **`widgets/`** – `app-header`, `app-footer`, `help-modal`.
- **`features/`** – vier **steckbare, lazy geladene Module** (`ber`=Bereitschaft, `ewt`=EWT, `ez`=Neben/Erschwerniszulagen, `ea`=Entgeltausgleich) und die geteilten Nicht-Module `auth`, `onboarding`.
- **`shared/`** – domänenneutrale oder von mindestens zwei Slices genutzte Bausteine; kennt keine höhere Schicht.
- **Gegen die Richtung** (z. B. `features/auth` → `app/session/userLoginSuccess`, `MyModalHeader` → Hilfe-Widget) wird über `invokeHook` aus `shared/lib/feature/hookRegistry.ts` aufgerufen; `app/main.tsx` registriert die Implementierungen (`registerHook`).
- Durchgesetzt per `no-restricted-imports` als `error` in `eslint.config.js` (`bun run lint`; Slices und Module werden aus den Ordnern gelesen). Hintergrund: `tasks/plan-fsd-feature-module.md`.

**Feature-Contract der vier Module (`ber`/`ewt`/`ez`/`ea`):**
Jedes Modul trennt einen kleinen eager Teil von lazy nachladbaren Teilen:

```
features/ber/          # meta.id = 'ber'
├── meta.ts            # FeatureMeta: id, label, icon, order, legacy-Mapping (Tab/Storage/Formular-Codes), helpKeys, resources[] -- eager, kein Chunk
├── parts/             # je Slot ein Lazy-Chunk, in app/features.ts per `() => import(...)` registriert
│   ├── ui.tsx         # Tab-Komponente
│   ├── data.ts        # getDaten/applyDaten/monatFilter je Ressource
│   ├── berechnung.tsx # aggregate/calc/tableRows/mobileCard fuer die Berechnung
│   ├── einstellungen.ts # sections[] (read/collect) fuer die Einstellungen
│   ├── pdf.ts         # baueDaten() fuer den PDF-Export
│   ├── help.ts        # Hilfetexte des Moduls (`meta.helpKeys`)
│   └── events.ts      # Wake-Event-Handler (optional)
├── ui/                # React TSX: Tab, Add/Edit/Show Modals
└── model/             # Business-Logik, Berechnungen, Daten-Handling
```

Ein globaler Bereich laedt ein Modul nie direkt, sondern ueber `featureRegistry.load(id, teil)`/`loadMany`/`loadAll` (`shared/lib/feature/featureRegistry.ts`); nicht benoetigte Teile bleiben ungeladen. **Admin-Anteile liegen nie im Modul selbst**, sondern in `pages/admin/features/<id>/` (`index.ts` = `AdminFeature`, `katalog.ts` = PDF-Feldkatalog fuers FormularEditor), angemeldet im separaten Admin-Manifest `pages/admin/adminFeatures.ts` (nur fuer Admins geladen). Neues Modul/Admin-Ordner anlegen: `bun run new-feature <slug> --label "..." [--admin]` (`scripts/new-feature.ts`).

**Hybrid-Rendering:**

- **App-Shell:** ein einziger React-Baum (`App.tsx`), gemountet via `main.tsx` in `<div id="app">` (Phase N, seit 2026-09-13 abgeschlossen). Enthaelt `AppHeader.tsx`/`AppFooter.tsx` als normale JSX-Kinder (keine separaten Sub-Roots mehr) sowie alle Tab-Panes.
- **Tab-Panel-Inhalte:** React seit Phase K/L/N – `#start`: `StartTab.tsx`; `#Berechnung`: `BerechnungTab.tsx` + `BerechnungTableRows.tsx`; `#Einstellungen`: `EinstellungenTab.tsx` + `PersoenlicheDatenPanel.tsx`
- **Modale/Dialoge:** React-Komponenten, gerendert via `showModal()` in einen `DBDrawer` (nativer `<dialog>`; intern `mount`/`unmount` aus `shared/lib/react-root/reactRoot.ts`); neue Dialoge (z. B. `ImpressumDialog.tsx`) nutzen die offiziellen `DBDrawerHeader`/`DBDrawerFooter`-Slot-Komponenten statt des projekteigenen `MyModalHeader`-Musters
- **Tabellen:** Eigene `CustomTable`-Klasse – `Row`/`Rows`/`Column` (Datenmodell, DOM-frei, unveraendert seit Phase M) + `CustomTableView.tsx` (Rendering, seit Phase M React statt Vanilla-DOM) – liegt in `shared/ui/custom-table/`

---

## 2. Frontend-spezifische Regeln

1. **Feature-Contract** einhalten: `meta.ts` (eager) → `parts/*` (lazy, je Slot ein Chunk) → `ui/` → `model/`; Module importieren sich nie gegenseitig, Admin-Anteile nie im Modul (siehe oben)
2. **dayjs** für alle Datumsoperationen (aus `shared/lib/date/configDayjs.ts`)
3. **Konkrete Importe** (`@/shared/ui/modal/showModal`); in `shared/` keine Sammel-Barrels, Slice-`index.ts` nur wo vorhanden
4. **React** für die gesamte App-Shell (`App.tsx`, ein Baum), Modals/Dialoge, die Feature-Tabs und alle Tab-Panel-Inhalte (seit Phase N, 2026-09-13); `index.html` ist nur noch `<noscript>` + `<div id="app">`
5. **`tabController`** für die Tab-Navigation, kein Router
6. **`FetchRetry`** für alle API-Aufrufe (Auto-Token-Refresh, Retry-Logik)
7. **`Storage`-Singleton** für typsicheren localStorage-Zugriff
8. **ESLint + Prettier** mit Husky Pre-Commit Hooks
9. **Bun test** für alle Tests, happy-dom als DOM-Environment
10. **CustomTable** als zentrale Tabellen-UI (`Row`/`Rows`/`Column`-Datenmodell DOM-frei, Rendering seit Phase M React via `CustomTableView.tsx`)
11. **`confirmDialog`** statt `window.confirm()` (aus `shared/ui/dialog/confirmDialog.ts`)
12. **`resourceConfig.ts`** als zentrale Resource-Konfiguration (Storage-Keys, Table-IDs)
13. **Schichtentrennung:** `app` → `pages` → `widgets` → `features` → `shared`, nie umgekehrt; Gegenrichtung nur über `invokeHook` (ESLint-`error`)
14. **Changelog pflegen:** Bei Frontend-Aenderungen `frontend/CHANGELOG.md` im selben Arbeitsgang aktualisieren.

---

## Globale Workflow- und Qualitätsregeln

Die folgenden Abschnitte sind **global** und gelten für alle Fachbereiche (Root, Frontend, Backend).
Siehe [`../CLAUDE.md`](../CLAUDE.md) für vollständige Details:

- **Workflow-Orchestrierung:** Plan-First-Protokoll, Kontext-Management, Selbstverbesserungs-Loop
- **Engineering Standards:** Verifikation vor "fertig", autonomes Debugging
- **Task-Management:** Initialisierung, Planning, Tracking, Dokumentation, Lessons-Capture
- **Core Principles:** Simplicity, No-Laziness, Minimal Impact, Proactive Elegance

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
