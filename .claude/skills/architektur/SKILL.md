---
name: frontend-architektur
description: 'Use when: frontend topic architektur'
---

# Architektur & Komponenten-Patterns

## FSD-Schichten (Feature-Sliced Design)

```
src/ts/
├── app/        # main.tsx (Hook-Registrierung, Root-Mount, Init), App.tsx (Shell), features.ts (Feature-Manifest),
│               # session/ (userLoginSuccess, loadUserDaten), shell/ (pullToRefresh, setOffline, setVersionOutdated)
├── pages/      # start, berechnung, einstellungen, admin (ui/, model/; admin: api/, features/<id>/, adminFeatures.ts)
├── widgets/    # app-header (inkl. ThemeSwitcher), app-footer, help-modal
├── features/   # Module ber, ewt, ez, ea (meta.ts, parts/, ui/, model/) + Nicht-Module auth, onboarding
└── shared/     # api/, lib/ (feature: Registry + registerHook/invokeHook, lifecycle, ressource, pdf, date, storage, …),
                # model/ (navigation inkl. tabController, period, …), ui/ (form, modal, custom-table, snackbar, …), types/
```

Import nur abwärts (app → pages → widgets → features → shared), keine Importe zwischen Slices derselben
Schicht. Pages und Widgets erreichen die Module nur über die Feature-Registry. Aufrufe gegen die
Richtung laufen über `invokeHook` (`shared/lib/feature/hookRegistry.ts`), `app/main.tsx` registriert die
Implementierungen. ESLint (`no-restricted-imports`, `error`) setzt das durch. Details: `frontend/CLAUDE.md`.

## App-Einstiegspunkte

### `src/index.html`

- Nur `<noscript>` + `<div id="app">`; lädt `ts/app/main.tsx`

### `src/ts/app/main.tsx`

- Registriert die Hooks (`auth:login-success`, `session:load-month`, `help:open`, `pre-save:settings`, …)
- `initializeAppBootstrap()`/`registerAppStartTask()` (`shared/lib/lifecycle/bootstrap.ts`) für die Init-Reihenfolge
- PWA Service Worker Registrierung, Version-Check (API vs. lokal)
- Root-Mount von `App.tsx` per `mount()` + `initTabController()` -- bewusst SYNCHRON beim Modul-Import,
  nicht in `registerAppStartTask()` (ES-Module-Import-Hoisting-Falle, siehe Kommentar in `main.tsx`)

---

## Feature-Modul-Pattern

Jedes steckbare Modul unter `features/<id>/` folgt dem Feature-Contract:

```
features/ber/
├── meta.ts           # FeatureMeta (eager, kein Chunk)
├── parts/            # lazy Teile je Slot (ui, data, berechnung, einstellungen, pdf, help, events)
├── ui/               # React TSX (Tab, Modals)
└── model/            # Business-Logik & Daten-Handling
```

Login/Register/Reset (`features/auth`) und die Ersteinrichtung (`features/onboarding`) sind keine
steckbaren Module. Neues Modul: `bun run new-feature <slug> --label "..." [--admin]`.

### Vorhandene Bereiche

| Ordner                | Beschreibung                                         |
| --------------------- | ---------------------------------------------------- |
| `features/ber/`       | Bereitschaftsdienst (Zeiträume, Einsätze)            |
| `features/ewt/`       | Einsatzwechseltätigkeit                              |
| `features/ez/`        | Nebenbezüge (Erschwerniszulagen)                     |
| `features/ea/`        | Entgeltausgleich                                     |
| `pages/berechnung/`   | Gesamtberechnung & Zusammenfassung                   |
| `pages/einstellungen/`| Benutzerprofil, Vorgaben, Templates                  |
| `pages/admin/`        | Admin-Panel, separat lazy geladen                    |

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
import { mount } from "@/shared/lib/react-root/reactRoot";
mount(modalElement, <MyFormModal {...props} />);
```

### 4. CustomTable (Datenmodell Vanilla, Rendering React seit Phase M)

Eigene Tabellen-Klasse: `Row`/`Rows`/`Column` sind reine, DOM-freie Datenklassen (unverändert
über den React-Umbau hinweg); Sorting, Editing, Responsive Breakpoints, Soft-Delete/Undo werden
seit Phase M über `CustomTableView.tsx` als React-Komponente gerendert, direkt in das
`<table>`-Element gemountet (`mount()`, kein Wrapper-Div). Der `el.instance`-Vertrag
(`savePipeline.ts`/`overlapGuard.ts`/`changeTracking.ts` finden die Tabelle über
`tableElement.instance`) bleibt dadurch unberührt.

- Definiert in `src/ts/shared/ui/custom-table/CustomTable.ts` (Klasse) + `CustomTableView.tsx`
  (Rendering)

### 5. CustomSnackbar (Vanilla-DOM)

Toast/Snackbar-System, ebenfalls Vanilla-DOM:

- Definiert in `src/ts/shared/ui/snackbar/CustomSnackbar.ts`

---

## State Management

### localStorage via `Storage`-Singleton

Kein Context, keine Signal-Bibliothek. Für App-weiten UI-Zustand, den mehrere React-Wurzeln
gemeinsam sehen müssen (z. B. weil `DBHeader` seine `children` doppelt rendert, Desktop- +
Drawer-Kopie), gibt es einen schlanken, handgeschriebenen `useSyncExternalStore`-Modul-Store
pro Zustand -- kein generisches Store-Framework, jeder Store ist eine eigene Datei mit
`get*()`/`subscribe*()`/`set*()` plus einem `use*()`-Hook, der Konsument-Komponenten daran
anschließt. Beispiele: `shared/model/navigation/navigationVisibleStore.ts` +
`useNavigationVisible.ts` (Nav-Sichtbarkeit bei Login/Logout), `shared/model/navigation/
activeTabStore.ts` + `useActiveTab.ts` (aktiver Tab der Hauptnavigation, Phase K6),
`widgets/app-header/useColorMode.ts` (Theme, Storage-rückgekoppelt).

```ts
import Storage from "@/shared/lib/storage/Storage";

// Typsicherer Zugriff
const daten = Storage.get("dataN");
Storage.set("dataN", neuerWert);
```

- Keys definiert via `TStorageData` (`keyof typeof StorageData`, `shared/lib/storage/Storage.ts`)
- Überladene `get<T>()` mit Default-Werten
- Daten werden bei Monatswechsel vom Server geladen und in localStorage gepersistet

---

## Navigation

**Kein Client-Side-Router.** Navigation über `AppHeader.tsx` (`DBHeader`/`DBNavigation`/
`DBNavigationItem`) und `shared/model/navigation/tabController.ts`:

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
Hauptgruppe (`#tabContent`); Admins Unternavigation (`pages/admin/index.tsx`, eigene,
unabhängige Tab-Gruppe) bleibt am alten, DOM-schreibenden Mechanismus.

---

## API-Kommunikation

### `FetchRetry` (Custom Fetch-Wrapper)

```ts
import { FetchRetry } from "@/shared/api/FetchRetry";

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
