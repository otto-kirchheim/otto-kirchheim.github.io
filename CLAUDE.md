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
- **Styling:** DB UX Design System 5.3 (`@db-ux/*`, `db-theme` 6.2) + eigene Hilfsklassen (`src/scss/utilities.scss`) + SCSS; Cascade Layers `db-ux < app < unlayered` (`src/scss/layers.scss`, dort ausführlich begründet). Bootstrap ist seit Phase H komplett raus (Paket, CSS, JS, `data-bs-*`). DB "neues Design" (Phase I): `<html data-density="functional">`, Formensprache eckig (`--db-border-radius-*` = 0 am `:root` in `styles.scss`, nur `-full` bleibt), DB-Schwelle (`.schwelle` + `--schwelle-motiv`) am oberen Rand des Startbereichs. Brand-Regeln in der Memory `db-brand-farben-neues-design`
- **Datum:** dayjs (IMMER dayjs verwenden, NIEMALS native Date-Methoden oder moment.js)
- **PWA:** vite-plugin-pwa (Service Worker, Auto-Update)
- **Testing:** Bun test + happy-dom
- **Linting:** ESLint + Prettier + Husky (Pre-Commit Hooks)
- **PDF-Export:** client-seitig über die Formular-Vorlagen-Pipeline (`infrastructure/pdf/`, `shared/src/formular/build.ts`); `file-saver` löst nur den Browser-Download des fertigen Blobs aus

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
├── index.html             # SPA-Einstiegspunkt (DB-Header + tabController als Navigation)
├── env.d.ts               # Vite Environment-Typen
├── scss/                  # DB-UX-Import, Hilfsklassen, App-Styles
├── ts/
│   ├── main.ts            # App-Init (PWA, Version-Check, UI-Controller)
│   ├── components/        # React UI-Bausteine (Modals, Buttons, Inputs)
│   ├── core/              # Zentrale Contracts und Events
│   │   ├── types/         # Alle TS-Interfaces + API-Envelope-Typen
│   │   ├── hooks/         # Hook-Registry (registerHook/invokeHook)
│   │   ├── events/        # App-Events (publishDataChanged, EventChannels)
│   │   └── orchestration/ # Init-Sequenz, Feature-Lifecycle-Registry, Auth-Lifecycle
│   │       └── auth/      # Auth-Orchestrierung (Login, Modals, User-Daten)
│   │           ├── components/ # Login/Register/Reset-Modals, ConflictReviewBanner
│   │           └── utils/     # loginUser, loadUserDaten, userLoginSuccess, etc.
│   ├── infrastructure/    # Gemeinsame technische Bausteine
│   │   ├── api/           # apiService, FetchRetry
│   │   ├── autoSave/      # AutoSave-Manager (autoSave, changeTracking, savePipeline, errorHandling)
│   │   ├── data/          # resourceConfig, persistTableData, mergeVisibleResourceRows, fieldMapper
│   │   ├── date/          # dayjs-Konfiguration
│   │   ├── storage/       # Storage-Singleton
│   │   ├── table/         # CustomTable (Datenmodell Row/Rows/Column, Rendering seit Phase M React via CustomTableView.tsx)
│   │   ├── tokenManagement/ # JWT, Passkeys, Token-Refresh
│   │   ├── ui/            # buttonDisable, confirmDialog, setOffline, setLoading, CustomSnackbar
│   │   └── validation/    # Passwort-Validierung
│   └── features/          # Feature-Module
│       ├── Bereitschaft/  # Bereitschaftsdienst (index, components/, utils/)
│       ├── EWT/           # Einsatzwechseltaetigkeit
│       ├── Neben/         # Nebenbezuege
│       ├── Berechnung/    # Gesamtberechnung
│       ├── Einstellungen/ # Benutzer-Einstellungen
│       └── Admin/         # Admin-Panel (React)
test/
├── setupBun.ts            # Setup: happy-dom + Bun-Kompatibilitaet
├── mockData.ts            # Gemeinsame Test-Daten
├── *.test.ts              # Feature-Tests
└── Utilities/             # Utility-Tests
```

### Architektur-Konzepte

**Tab-basierte SPA (kein Router):**
Die Navigation erfolgt über `AppHeader.tsx` (React, `DBHeader`/`DBNavigation`) und
`infrastructure/ui/tabController.ts` (`data-tab-target="<Panel-Id>"`, `tab:shown`-CustomEvent,
Hash-Sync), nicht über einen Client-Side-Router. Aktiver Tab der Hauptnavigation ist ein
`useSyncExternalStore`-Modul-Store (`activeTabStore.ts`/`useActiveTab.ts`), von `AppHeader`
reaktiv gelesen. Seit Phase L (abgeschlossen 2026-09-12) sind alle Tab-Panel-Inhalte React,
direkt in die jeweilige Tab-Pane gemountet (kein Wrapper-Div): `#start` (`StartTab.tsx` –
`styles.scss`s `#start.active > .schwelle`-Kindselektor verlangt das Fehlen eines Wrapper-Divs),
`#Berechnung` (`BerechnungTab.tsx` als Huelle + `BerechnungTableRows.tsx` als eigener React-Root
direkt auf `<tbody id="tbodyBerechnung">`, analog `BerechnungMobileCards`) und `#Einstellungen`
(`EinstellungenTab.tsx` + `PersoenlicheDatenPanel.tsx`). Die gesamte Feld-Verkabelung dieser Tabs
(`saveEinstellungen.ts`, `generateEingabeMaskeEinstellungen.ts`, `Einstellungen/index.ts`,
`berechnungMonatsFenster.ts` u. a.) bleibt bewusst `document.querySelector('#Id')`-basiert und
unveraendert – sie ist unabhaengig davon, ob React oder statisches HTML das Element erzeugt hat.

**3-Schichten-Architektur:**

- **`core/`** – Zentrale Contracts, Events, Hooks, Lifecycle-Registry, Auth-Orchestrierung. `core/types/` enthält alle geteilten Interfaces. Keine Feature-Abhängigkeiten (außer lazy-imports für Admin).
- **`infrastructure/`** – Technische Bausteine (API, Storage, AutoSave, UI-Utilities, CustomTable). Darf `core/` nutzen, nicht `features/`.
- **`features/`** – Daten-getriebene Feature-Module (Bereitschaft, EWT, Neben, etc.). Dürfen `core/` und `infrastructure/` nutzen.

**Feature-Modul-Pattern:**
Jedes Feature folgt der gleichen Struktur:

```
features/Feature/
├── index.ts          # window.load → CustomTable Init + Event Binding
├── components/       # React TSX: Add/Edit/Show Modals
└── utils/            # Business-Logik, Berechnungen, Daten-Handling
```

**Hybrid-Rendering:**

- **App-Shell (Header/Footer):** React (`AppHeader.tsx`/`AppFooter.tsx`), gemountet über `<div id="appHeaderRoot">`/`<div id="appFooterRoot">` in `index.html` (Phase K, seit 2026-09-12 abgeschlossen)
- **Tab-Panel-Inhalte:** React seit Phase K/L (abgeschlossen 2026-09-12) – `#start`: `StartTab.tsx`; `#Berechnung`: `BerechnungTab.tsx` + `BerechnungTableRows.tsx`; `#Einstellungen`: `EinstellungenTab.tsx` + `PersoenlicheDatenPanel.tsx`
- **Modale/Dialoge:** React-Komponenten, gerendert via `showModal()` in einen `DBDrawer` (nativer `<dialog>`; intern `mount`/`unmount` aus `infrastructure/ui/reactRoot.ts`); neue Dialoge (z. B. `ImpressumDialog.tsx`) nutzen die offiziellen `DBDrawerHeader`/`DBDrawerFooter`-Slot-Komponenten statt des projekteigenen `MyModalHeader`-Musters
- **Tabellen:** Eigene `CustomTable`-Klasse – `Row`/`Rows`/`Column` (Datenmodell, DOM-frei, unveraendert seit Phase M) + `CustomTableView.tsx` (Rendering, seit Phase M React statt Vanilla-DOM) – liegt in `infrastructure/table/`

---

## 2. Frontend-spezifische Regeln

1. **Feature-Modul-Pattern** einhalten: `index.ts` → `components/` → `utils/`
2. **dayjs** für alle Datumsoperationen (aus `infrastructure/date/configDayjs.ts`)
3. **Barrel-Exports** in jedem Ordner (`index.ts` mit Re-Exports)
4. **React** für App-Shell (Header/Footer), Modals/Dialoge, die Feature-Tabs und alle Tab-Panel-Inhalte (seit Phase L, 2026-09-12); `index.html` selbst bleibt Einstiegspunkt (`main.tsx`-Umbenennung + Rest-Body erst Phase N)
5. **`tabController`** für die Tab-Navigation, kein Router
6. **`FetchRetry`** für alle API-Aufrufe (Auto-Token-Refresh, Retry-Logik)
7. **`Storage`-Singleton** für typsicheren localStorage-Zugriff
8. **ESLint + Prettier** mit Husky Pre-Commit Hooks
9. **Bun test** für alle Tests, happy-dom als DOM-Environment
10. **CustomTable** als zentrale Tabellen-UI (`Row`/`Rows`/`Column`-Datenmodell DOM-frei, Rendering seit Phase M React via `CustomTableView.tsx`)
11. **`confirmDialog`** statt `window.confirm()` (aus `infrastructure/ui/confirmDialog.ts`)
12. **`resourceConfig.ts`** als zentrale Resource-Konfiguration (Storage-Keys, Table-IDs)
13. **Schichtentrennung:** `features/` → `infrastructure/` → `core/`, nie umgekehrt
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
