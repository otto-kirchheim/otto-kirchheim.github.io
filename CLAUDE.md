# CLAUDE.md – Projektanweisungen für AI-Assistenten (Frontend)

> **Aufbau:** Diese Datei enthält die Grundlagen. Details zu spezifischen Themen
> stehen in den verlinkten Dateien unter `.claude/`.

## Projektübersicht

**DB-Nebengeld Frontend** – TypeScript SPA mit Preact, Bootstrap 5, Vite und PWA-Support.

### Tech-Stack

- **Framework:** Preact (v10) – leichtgewichtige React-Alternative
- **Build Tool:** Vite (v8) mit Preact-Plugin
- **Sprache:** TypeScript (strict mode)
- **Styling:** Bootstrap 5.3 + SCSS + Material Icons
- **Datum:** dayjs (IMMER dayjs verwenden, NIEMALS native Date-Methoden oder moment.js)
- **PWA:** vite-plugin-pwa (Service Worker, Auto-Update)
- **Testing:** Vitest + jsdom + vitest-fetch-mock
- **Linting:** ESLint + Prettier + Husky (Pre-Commit Hooks)
- **PDF-Export:** file-saver (Download von Server-generierten PDFs)

### Starten

```bash
bun install
bun run start          # Entwicklung mit Vite Dev-Server (--host)
bun run build          # Produktion Build (nach ./dist)
bun run test           # tsc + vitest run
bun run dev-test       # Vitest UI (Port 9527)
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
├── setupVitest.ts         # Setup: vitest-fetch-mock
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

## 2. Verlinkte Claude-Dateien

| Datei                                                                                        | Beschreibung                                           |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| [`.claude/README.md`](.claude/README.md)                                                     | Einstieg und Navigation für Frontend-AI-Dokumente      |
| [`.claude/commands/`](.claude/commands/)                                                     | Slash-Command-Vorlagen (`review`, `test`, `deploy`)    |
| [`.claude/settings.json`](.claude/settings.json)                                             | Teamweite Safety-/Permissions-Baseline                 |
| [`.claude/settings.local.json.example`](.claude/settings.local.json.example)                 | Lokale Override-Beispiele (ohne Secrets)               |
| [`.mcp.json.example`](.mcp.json.example)                                                     | MCP-Server-Beispielkonfiguration für das Frontend-Repo |
| [`.claude/skills/README.md`](.claude/skills/README.md)                                       | Skill-Index mit v2-Ordnerstruktur und Legacy-Hinweisen |
| [`.claude/skills/architektur/SKILL.md`](.claude/skills/architektur/SKILL.md)                 | v2-Skill-Einstieg: Architektur                         |
| [`.claude/skills/coding-konventionen/SKILL.md`](.claude/skills/coding-konventionen/SKILL.md) | v2-Skill-Einstieg: Coding-Konventionen                 |
| [`.claude/skills/tests/SKILL.md`](.claude/skills/tests/SKILL.md)                             | v2-Skill-Einstieg: Tests                               |

---

## 3. Wichtigste Regeln (Kurzfassung)

1. **Feature-Modul-Pattern** einhalten: `index.ts` → `components/` → `utils/`
2. **dayjs** für alle Datumsoperationen (aus `src/ts/utilities/configDayjs.ts`)
3. **Barrel-Exports** in jedem Ordner (`index.ts` mit Re-Exports)
4. **Preact** für Modals/Dialoge, **nicht** für die Hauptseiten-Struktur
5. **Bootstrap-Tabs** für Navigation, kein Router
6. **`FetchRetry`** für alle API-Aufrufe (Auto-Token-Refresh, Retry-Logik)
7. **`Storage`-Singleton** für typsicheren localStorage-Zugriff
8. **ESLint + Prettier** mit Husky Pre-Commit Hooks
9. **Vitest** für alle Tests, jsdom als Environment
10. **CustomTable** als zentrale Tabellen-UI (Vanilla-DOM, nicht Preact)

---

## Workflow-Orchestrierung (verbindlich)

### 1. Plan-First-Protokoll

- Für jede Aufgabe mit mehr als 3 Schritten oder mit Architekturentscheidung vor Codebeginn Plan in `tasks/todo.md` erstellen oder aktualisieren.
- Jeder Plan enthält explizite Verifikationskriterien (z. B. Logs prüfen, konkrete Tests ausführen).
- Bei zwei fehlgeschlagenen Implementierungsversuchen oder logischer Sackgasse: sofort stoppen, Anforderungen neu lesen, Plan aktualisieren und vor dem Weiterbau mit dem User synchronisieren.

### 2. Kontext-Management (agentisches Arbeiten)

- Subagenten aktiv nutzen, um den Hauptkontext schlank zu halten.
- Recherche, Exploration und parallele Analysen auslagern; pro Subagent genau einen Fokus vergeben.
- Denkprozess bei komplexen Aufgaben in Rollen aufteilen:
  - `[Architect]`: Schnittstellen und Datenfluss klären
  - `[Engineer]`: Umsetzung und Edge Cases
  - `[QA]`: Lösung aktiv auf Bruchstellen prüfen
- Nur notwendige Dateien laden, um Kontextverwässerung zu vermeiden.
- Keine Code-Trunkierung mit Platzhaltern wie `// ... rest of code`; immer vollständige relevante Blöcke liefern.

### 3. Selbstverbesserungs-Loop

- Nach jeder User-Korrektur oder Bug-Entdeckung `tasks/lessons.md` aktualisieren.
- Nicht nur Symptom fixen: eine Regel formulieren, die denselben Fehler künftig verhindert.
- Zu Sitzungsbeginn relevante Learnings aus `tasks/lessons.md` prüfen.

---

## Engineering Standards

### 4. Verifikation vor "fertig"

- Aufgabe nie als abgeschlossen markieren, ohne nachweisbare Funktionsprüfung.
- Vor Übergabe prüfen: Ist das die wartbarste Lösung oder nur die schnellste?
- Konkreten Verifikationsweg benennen oder ausführen (Befehl, Testfall, Log-Check).
- Änderungen chirurgisch halten: nur notwendige Stellen anfassen, keine globalen Refactors ohne Auftrag.

### 5. Autonomes Debugging

- Bei Bugreports zuerst Logs, Stacktraces und fehlschlagende Tests auswerten.
- Fehler eigenständig beheben statt Rückfragen zur Vorgehensweise zu stellen, außer es ist eine wesentliche Produktentscheidung nötig.

---

## Task-Management (verbindlich)

1. **Initialize:** `tasks/todo.md` zu Beginn lesen und Status synchronisieren.
2. **Plan First:** Plan als abhakbare Punkte in `tasks/todo.md` festhalten.
3. **Track:** Punkte während der Umsetzung laufend als erledigt markieren.
4. **Explain:** Bei größeren Schritten den Grund der Änderung klar zusammenfassen (Warum, nicht nur Was).
5. **Document:** Nach Meilensteinen einen kurzen Review-Abschnitt mit Ergebnis und Verifikation in `tasks/todo.md` ergänzen.
6. **Capture Lessons:** Nach Korrekturen `tasks/lessons.md` aktualisieren.

---

## Core Principles

- **Simplicity Over Everything:** Änderungen so einfach wie möglich halten und nur minimal nötigen Code anfassen.
- **No Laziness:** Ursachen beheben, keine temporären oder kosmetischen Band-Aid-Fixes als Endzustand akzeptieren.
- **Minimal Impact:** Nur notwendige Bereiche ändern, Regressionen aktiv vermeiden.
- **Proactive Elegance:** Bei nicht-trivialer Logik bewusst prüfen, ob eine elegantere Lösung möglich ist; wirkt ein Fix hacky, sauber refactoren.
