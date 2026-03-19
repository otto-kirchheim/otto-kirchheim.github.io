# Architektur & Komponenten-Patterns

## App-Einstiegspunkte

### `src/index.html`

- Einzige HTML-Datei (SPA), ~840 Zeilen
- Bootstrap-basierte Tabs als Navigation (Pills)
- Bereiche: Login, Bereitschaft, EWT, Nebenbezüge, Berechnung, Einstellungen

### `src/ts/main.ts`

- Import aller Feature-Module
- PWA Service Worker Registrierung
- Version-Check (API vs. lokal)
- Bootstrap JS-Module einzeln importieren (Collapse, Dropdown, Offcanvas, Popover, Tab, Modal)

---

## Feature-Modul-Pattern

Jedes Feature-Modul folgt dieser Struktur:

```
Feature/
├── index.ts          # window.addEventListener("load", ...) → Init
├── components/       # Preact TSX-Komponenten (Modals)
│   └── index.ts      # Re-Exports
└── utils/            # Business-Logik & Daten-Handling
    └── index.ts      # Re-Exports
```

### Vorhandene Feature-Module

| Modul            | Beschreibung                                         |
| ---------------- | ---------------------------------------------------- |
| `Bereitschaft/`  | Bereitschaftsdienst-Verwaltung (Zeiträume, Einsätze) |
| `EWT/`           | Einsatzwechseltätigkeit                              |
| `Neben/`         | Nebenbezüge (Zulagen, Zuschüsse)                     |
| `Berechnung/`    | Gesamtberechnung & Zusammenfassung                   |
| `Einstellungen/` | Benutzerprofil, Vorgaben, Templates                  |
| `Login/`         | Authentifizierung (Login, Registrierung)             |

---

## Komponenten-Patterns

### 1. Preact Functional Components

Einfache UI-Bausteine wie Buttons, Selects, Modals:

```tsx
import { type FunctionalComponent } from "preact";

const MyButton: FunctionalComponent<Props> = ({ label, onClick }) => {
	return <button onClick={onClick}>{label}</button>;
};
```

### 2. Preact Class Components

Komplexere Widgets mit Lifecycle (z.B. Popover-Integration):

```tsx
import { Component } from "preact";

class MyInput extends Component<Props, State> {
	componentDidMount() {
		/* Popover init */
	}
	componentWillUnmount() {
		/* Cleanup */
	}
}
```

### 3. `showModal()` – Preact in Bootstrap-Modals

Preact wird primär als Template-Engine für Bootstrap-Modals verwendet:

```ts
import { render } from "preact";
// Rendern einer Preact-Komponente in ein Bootstrap-Modal DOM-Element
render(<MyFormModal {...props} />, modalElement);
```

### 4. CustomTable (Vanilla-DOM)

Eigene Tabellen-Klasse, **nicht** Preact-basiert:

- Sorting, Editing, Responsive Breakpoints
- Event-Handling über DOM-Events
- Definiert in `src/ts/class/CustomTable.ts`

### 5. CustomSnackbar (Vanilla-DOM)

Toast/Snackbar-System, ebenfalls Vanilla-DOM:

- Definiert in `src/ts/class/CustomSnackbar.ts`

---

## State Management

### localStorage via `Storage`-Singleton

Es gibt **kein reaktives State Management** (keine Signals, kein Context, keinen Store).

```ts
import { Storage } from "../utilities";

// Typsicherer Zugriff
const daten = Storage.get("Daten");
Storage.set("Daten", neuerWert);
```

- Keys definiert via `TStorageData` Enum
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
import { FetchRetry } from "../utilities";

const response = await FetchRetry(url, options);
```

Features:

- Automatische Server-Erkennung (mehrere URLs mit Timeout-Fallback)
- JWT `Bearer` Token automatisch gesetzt
- Auto-Token-Refresh bei 401 (bis 3 Retries)
- Server-URL gecacht in `sessionStorage`
- `AbortController` für Request-Cancellation
