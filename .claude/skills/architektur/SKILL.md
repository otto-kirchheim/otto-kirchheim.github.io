---
name: frontend-architektur
description: 'Use when: frontend topic architektur'
---

# Architektur & Komponenten-Patterns

## 3-Schichten-Architektur

```
src/ts/
├── components/      # Generische React-Bausteine (DBLoadingButton, MyInput, MyFormModal, showModal, ...)
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

- Einzige HTML-Datei (SPA), >1000 Zeilen für den statischen Rest (Tab-Panel-Inhalte:
  `#start`, `#Berechnung`, `#Einstellungen`, ...)
- Kopf-/Fußzeile sind seit Phase K (App-Shell) React: `<div id="appHeaderRoot">`/
  `<div id="appFooterRoot">` werden in `main.ts` gemountet, siehe `AppHeader.tsx`/`AppFooter.tsx`

### `src/ts/main.ts`

- Import der Feature-Module (statisch: Berechnung, Bereitschaft, EWT, Einstellungen, Neben, EA,
  `core/orchestration/auth`; Admin läuft separat über einen Lazy-Import)
- `initializeAppBootstrap()`/`registerAppStartTask()` (`core/`) für die Init-Reihenfolge
- PWA Service Worker Registrierung
- Version-Check (API vs. lokal)
- `AppHeader`/`AppFooter` mounten + `initTabController()` -- bewusst SYNCHRON beim Modul-Import,
  nicht in `registerAppStartTask()` (ES-Module-Import-Hoisting-Falle, siehe Kommentar in
  `main.ts`). `navDrawer.ts`/`DBColorToggler.ts` sind seit Phase K gelöscht (`DBHeader` bringt
  die mobile Schublade eingebaut mit, `useColorMode`-Hook ersetzt den Controller); `dbDialog.ts`
  bleibt für `confirmDialog`/`signaturDialog`/`errorHandling` bestehen.

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

Einfache UI-Bausteine wie Buttons, Selects, Modals -- DB-UX-Komponenten direkt verwenden
(`DBButton`, `DBCheckbox`, `DBTag`, ...) statt rohes `db-*`-Markup nachzubauen, siehe
`coding-konventionen`-Skill:

```tsx
import { DBButton } from "@db-ux/react-core-components";
import { type FC } from "react";

const MeinButton: FC<Props> = ({ label, onClick }) => (
	<DBButton type="button" onClick={onClick}>
		{label}
	</DBButton>
);
```

### 2. React Class Components

Selten, nur wenn Lifecycle-Methoden (statt Hooks) den Code klarer machen -- z.B.
`PasswordStrengthMeter.tsx` (Debounce-Timer in `componentDidMount`/`componentWillUnmount`):

```tsx
import { Component } from "react";

class PasswordStrengthMeter extends Component<Props, State> {
	componentDidMount() {
		/* Timer starten */
	}
	componentWillUnmount() {
		/* Timer aufraeumen */
	}
}
```

### 3. `showModal()` – React im DB-Drawer

React wird primär als Template-Engine für die Dialoge und die Feature-Tabs verwendet. Der Dialog
selbst ist ein `DBDrawer` über nativem `<dialog>`; geschlossen wird per Delegation über
`data-dialog-dismiss="modal"` oder `schliesseModal()`.

Aufräumen beim Schließen: `beiModalSchliessen(cleanup)` (aus `@/components`). Es beobachtet
`#modal` per `MutationObserver` und ruft `cleanup` genau einmal, sobald der Dialog-Inhalt
entfernt wird. **Nicht** `modal.addEventListener('hide.bs.modal', …)** verwenden – das ist ein
Bootstrap-Event und feuert seit Phase H nie mehr (Listener leaken sonst pro Öffnung).

```ts
import { mount } from "@/infrastructure/ui";
mount(modalElement, <MyFormModal {...props} />);
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

Kein Context, keine Signal-Bibliothek. Für App-weiten UI-Zustand, den mehrere React-Wurzeln
gemeinsam sehen müssen (z. B. weil `DBHeader` seine `children` doppelt rendert, Desktop- +
Drawer-Kopie), gibt es einen schlanken, handgeschriebenen `useSyncExternalStore`-Modul-Store
pro Zustand -- kein generisches Store-Framework, jeder Store ist eine eigene Datei mit
`get*()`/`subscribe*()`/`set*()` plus einem `use*()`-Hook, der Konsument-Komponenten daran
anschließt. Beispiele: `infrastructure/ui/navigationVisibleStore.ts` +
`useNavigationVisible.ts` (Nav-Sichtbarkeit bei Login/Logout), `infrastructure/ui/
activeTabStore.ts` + `useActiveTab.ts` (aktiver Tab der Hauptnavigation, Phase K6),
`infrastructure/ui/useColorMode.ts` (Theme, Storage-rückgekoppelt).

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

**Kein Client-Side-Router.** Navigation über `AppHeader.tsx` (`DBHeader`/`DBNavigation`/
`DBNavigationItem`) und `infrastructure/ui/tabController.ts`:

```tsx
<DBNavigationItem role="presentation" active={aktiverTab === 'Bereitschaft'} backButtonText="Zurück">
  <a role="tab" id="bereitschaft-tab" href="#Bereitschaft" data-tab-target="Bereitschaft" aria-selected={...}>
    Bereitschaft
  </a>
</DBNavigationItem>
```

`data-tab-target` nennt die Id des `.tab-pane` (weiterhin statisches HTML in `index.html`, Phase
L). Der Controller hängt per Delegation an `document`, schaltet Panel um, schreibt
`location.hash` (Deep-Links und Browser-Zurück inklusive) und meldet den Wechsel als
`tab:shown`-CustomEvent. **Wichtig:** `DBHeader` rendert seine `children` (die Navigation)
gleichzeitig ZWEIMAL im DOM -- einmal inline in der Kopfzeile, einmal als Kopie in seinem
eingebauten Drawer (kein "Umzugs"-Mechanismus wie zuvor bei `navDrawer.ts`, das seit Phase K5
gelöscht ist). Jeder `data-tab-target`/`id` existiert dadurch potenziell zweimal simultan im
DOM -- `querySelector('#id')` liefert nur die erste Kopie; Code, der beide Kopien treffen muss,
verwendet `querySelectorAll` (z. B. `updateTabVisibility.ts`). `aria-selected`/`tabIndex`/die
`active`-Markierung der Hauptnav-Einträge kommen seit Phase K6 reaktiv aus `useActiveTab()`
(`activeTabStore.ts`) statt aus DOM-Handschrieb in `tabController.ts` -- das betrifft nur die
Hauptgruppe (`#tabContent`); Admins Unternavigation (`features/Admin/index.tsx`, eigene,
unabhängige Tab-Gruppe) bleibt am alten, DOM-schreibenden Mechanismus.

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
