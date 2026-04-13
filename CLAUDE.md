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

**DB-Nebengeld Frontend** – TypeScript SPA mit Preact, Bootstrap 5, Vite und PWA-Support.

### Tech-Stack

- **Framework:** Preact (v10) – leichtgewichtige React-Alternative
- **Build Tool:** Vite (v8) mit Preact-Plugin
- **Sprache:** TypeScript (strict mode)
- **Styling:** Bootstrap 5.3 + SCSS + Material Icons
- **Datum:** dayjs (IMMER dayjs verwenden, NIEMALS native Date-Methoden oder moment.js)
- **PWA:** vite-plugin-pwa (Service Worker, Auto-Update)
- **Testing:** Bun test + happy-dom
- **Linting:** ESLint + Prettier + Husky (Pre-Commit Hooks)
- **PDF-Export:** file-saver (Download von Server-generierten PDFs)

### Starten

```bash
bun install
bun run start          # Entwicklung mit Vite Dev-Server (--host)
bun run build          # Produktion Build (nach ./dist)
bun run test           # Bun-Testlauf (sequentiell pro Datei)
bun run dev-test       # Bun Watch-Mode
bun run lint           # Linting prüfen
bun run lint:fix       # Linting auto-fix
bun run coverage       # Tests mit Coverage
bun run preview        # Build-Preview (Port 8082)
```

---

## 1. Architektur & Verzeichnisstruktur

```
src/
├── index.html             # SPA-Einstiegspunkt (Bootstrap-Tabs als Navigation)
├── env.d.ts               # Vite Environment-Typen
├── scss/                  # Bootstrap + Custom Styles
├── ts/
│   ├── main.ts            # App-Init (PWA, Version-Check, Bootstrap-Module)
│   ├── class/             # Vanilla-JS Klassen (CustomTable, CustomSnackbar)
│   ├── components/        # Preact UI-Bausteine (Modals, Buttons, Inputs)
│   ├── interfaces/        # TypeScript-Interfaces
│   ├── utilities/         # Hilfsfunktionen (FetchRetry, Storage, dayjs, etc.)
│   ├── Bereitschaft/      # Feature-Modul: Bereitschaftsdienst
│   ├── EWT/               # Feature-Modul: Einsatzwechseltätigkeit
│   ├── Neben/             # Feature-Modul: Nebenbezüge
│   ├── Berechnung/        # Feature-Modul: Gesamtberechnung
│   ├── Einstellungen/     # Feature-Modul: Benutzer-Einstellungen
│   └── Login/             # Feature-Modul: Auth (Login, Registrierung)
test/
├── setupBun.ts            # Setup: happy-dom + Bun-Kompatibilitaet
├── mockData.ts            # Gemeinsame Test-Daten
├── *.test.ts              # Feature-Tests
└── Utilities/             # Utility-Tests
```

### Architektur-Konzepte

**Tab-basierte SPA (kein Router):**
Die Navigation erfolgt über Bootstrap-Tabs (`data-bs-toggle="pill"`), nicht über einen Client-Side-Router.
Das gesamte HTML ist in einer einzigen `src/index.html` definiert.

**Feature-Modul-Pattern:**
Jedes Feature folgt der gleichen Struktur:

```
Feature/
├── index.ts          # window.load → CustomTable Init + Event Binding
├── components/       # Preact TSX: Add/Edit/Show Modals
└── utils/            # Business-Logik, Berechnungen, Daten-Handling
```

**Hybrid-Rendering:**

- **Hauptseite:** Statisches HTML + Bootstrap
- **Modale/Dialoge:** Preact-Komponenten, gerendert via `showModal()` in Bootstrap-Modals
- **Tabellen:** Eigene `CustomTable`-Klasse (Vanilla-DOM, kein Preact)

---

## 2. Frontend-spezifische Regeln

1. **Feature-Modul-Pattern** einhalten: `index.ts` → `components/` → `utils/`
2. **dayjs** für alle Datumsoperationen (aus `src/ts/utilities/configDayjs.ts`)
3. **Barrel-Exports** in jedem Ordner (`index.ts` mit Re-Exports)
4. **Preact** für Modals/Dialoge, **nicht** für die Hauptseiten-Struktur
5. **Bootstrap-Tabs** für Navigation, kein Router
6. **`FetchRetry`** für alle API-Aufrufe (Auto-Token-Refresh, Retry-Logik)
7. **`Storage`-Singleton** für typsicheren localStorage-Zugriff
8. **ESLint + Prettier** mit Husky Pre-Commit Hooks
9. **Bun test** für alle Tests, happy-dom als DOM-Environment
10. **CustomTable** als zentrale Tabellen-UI (Vanilla-DOM, nicht Preact)
11. **Changelog pflegen:** Bei Frontend-Aenderungen `frontend/CHANGELOG.md` im selben Arbeitsgang aktualisieren.

---

## Globale Workflow- und Qualitätsregeln

Die folgenden Abschnitte sind **global** und gelten für alle Fachbereiche (Root, Frontend, Backend).
Siehe [`../CLAUDE.md`](../CLAUDE.md) für vollständige Details:

- **Workflow-Orchestrierung:** Plan-First-Protokoll, Kontext-Management, Selbstverbesserungs-Loop
- **Engineering Standards:** Verifikation vor "fertig", autonomes Debugging
- **Task-Management:** Initialisierung, Planning, Tracking, Dokumentation, Lessons-Capture
- **Core Principles:** Simplicity, No-Laziness, Minimal Impact, Proactive Elegance
