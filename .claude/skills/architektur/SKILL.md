---
name: frontend-architektur
description: 'Use when: frontend topic architektur'
---

# Architektur & Komponenten-Patterns

## 3-Schichten-Architektur

```
src/ts/
├── components/      # Generische React-Bausteine (MyButton, MyInput, MyFormModal, showModal, ...)
├── core/            # Contracts, Events, Hooks, Lifecycle-Registry, Auth-Orchestrierung
│   ├── types/       # Alle geteilten TS-Interfaces
│   ├── hooks/       # registerHook/invokeHook, featureLifecycleRegistry
│   ├── events/      # publishEvent/onEvent, EventChannels
│   └── orchestration/
│       ├── auth/           # Login/Register/Reset-Modals + Auth-Lifecycle (kein Feature-Modul!)
│       ├── onboarding/
│       └── syncFeatureTabs.ts  # Tab-übergreifende Synchronisation
├── infrastructure/  # api/, autoSave/, data/, date/, pdf/, storage/, table/, tokenManagement/, ui/, validation/
└── features/        # Admin, Berechnung, Bereitschaft, EA, Einstellungen, EWT, Neben
```

`features/` darf `core/` + `infrastructure/` nutzen, `infrastructure/` darf `core/` nutzen, nie
umgekehrt. Details siehe `frontend/CLAUDE.md`.

## App-Einstiegspunkte

### `src/index.html`

- Einzige HTML-Datei (SPA), >1000 Zeilen
- Bootstrap-basierte Tabs als Navigation (Pills)

### `src/ts/main.ts`

- Import der Feature-Module (statisch: Berechnung, Bereitschaft, EWT, Einstellungen, Neben, EA,
  `core/orchestration/auth`; Admin läuft separat über einen Lazy-Import)
- `initializeAppBootstrap()`/`registerAppStartTask()` (`core/`) für die Init-Reihenfolge
- PWA Service Worker Registrierung
- Version-Check (API vs. lokal)
- Bootstrap JS-Module einzeln importieren (Collapse, Dropdown, Offcanvas, Popover, Tab, Modal)

---

## Feature-Modul-Pattern

Jedes Feature-Modul unter `features/` folgt dieser Struktur:

```
features/Feature/
├── index.ts          # window.addEventListener("load", ...) → Init
├── components/       # React TSX-Komponenten (Modals)
│   └── index.ts      # Re-Exports
└── utils/            # Business-Logik & Daten-Handling
    └── index.ts      # Re-Exports
```

Login/Register/Reset ist **kein** Feature-Modul, sondern Teil der Auth-Orchestrierung unter
`core/orchestration/auth/`.

### Vorhandene Feature-Module

| Modul            | Beschreibung                                         |
| ---------------- | ---------------------------------------------------- |
| `Admin/`         | Admin-Panel (React), separat lazy-geladen            |
| `Bereitschaft/`  | Bereitschaftsdienst-Verwaltung (Zeiträume, Einsätze) |
| `EWT/`           | Einsatzwechseltätigkeit                              |
| `Neben/`         | Nebenbezüge (Zulagen, Zuschüsse)                     |
| `EA/`            | Entgeltausgleich                                     |
| `Berechnung/`    | Gesamtberechnung & Zusammenfassung                   |
| `Einstellungen/` | Benutzerprofil, Vorgaben, Templates                  |

---

## Komponenten-Patterns

### 1. React Functional Components

Einfache UI-Bausteine wie Buttons, Selects, Modals:

```tsx
import { type FC } from "react";

const MyButton: FunctionalComponent<Props> = ({ label, onClick }) => {
	return <button onClick={onClick}>{label}</button>;
};
```

### 2. React Class Components

Komplexere Widgets mit Lifecycle (z.B. Popover-Integration):

```tsx
import { Component } from "react";

class MyInput extends Component<Props, State> {
	componentDidMount() {
		/* Popover init */
	}
	componentWillUnmount() {
		/* Cleanup */
	}
}
```

### 3. `showModal()` – React in Bootstrap-Modals

React wird primär als Template-Engine für Bootstrap-Modals und die Feature-Tabs verwendet:

```ts
import { mount } from "@/infrastructure/ui";
// Rendern einer React-Komponente in ein Bootstrap-Modal DOM-Element
render(<MyFormModal {...props} />, modalElement);
```

### 4. CustomTable (Vanilla-DOM)

Eigene Tabellen-Klasse, **nicht** React-basiert:

- Sorting, Editing, Responsive Breakpoints
- Event-Handling über DOM-Events
- Definiert in `src/ts/infrastructure/table/CustomTable.ts`

### 5. CustomSnackbar (Vanilla-DOM)

Toast/Snackbar-System, ebenfalls Vanilla-DOM:

- Definiert in `src/ts/infrastructure/ui/CustomSnackbar.ts`

---

## State Management

### localStorage via `Storage`-Singleton

Es gibt **kein reaktives State Management** (keine Signals, kein Context, keinen Store).

```ts
import Storage from "@/infrastructure/storage/Storage";

// Typsicherer Zugriff
const daten = Storage.get("dataN");
Storage.set("dataN", neuerWert);
```

- Keys definiert via `TStorageData` (`keyof typeof StorageData`, `infrastructure/storage/Storage.ts`)
- Überladene `get<T>()` mit Default-Werten
- Daten werden bei Monatswechsel vom Server geladen und in localStorage gepersistet

---

## Navigation

**Kein Client-Side-Router.** Navigation über Bootstrap-Pills/Tabs:

```html
<a data-bs-toggle="pill" href="#bereitschaft-tab">Bereitschaft</a>
```

Tab-Wechsel werden von Bootstrap selbst gehandelt. Feature-Module registrieren sich
über `window.addEventListener("load", ...)` und initialisieren ihre Tabellen/Listener.

---

## API-Kommunikation

### `FetchRetry` (Custom Fetch-Wrapper)

```ts
import { FetchRetry } from "@/infrastructure/api/FetchRetry";

const response = await FetchRetry<RequestBody, ResponseData>(urlPath, data, "POST");
```

Features:

- Automatische Server-Erkennung (mehrere URLs mit Timeout-Fallback)
- JWT `Bearer` Token automatisch gesetzt
- Auto-Token-Refresh bei 401 über einen geteilten Single-Flight-Refresh
  (`refreshAccessTokenSingleFlight`) statt pro Request separat — verhindert eine
  401-/Logout-Kaskade, wenn viele Requests gleichzeitig mit abgelaufenem Token laufen
- Server-URL gecacht in `sessionStorage`
- `AbortController` für Request-Cancellation
