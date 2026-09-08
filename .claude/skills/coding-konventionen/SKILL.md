---
name: frontend-coding-konventionen
description: 'Use when: frontend topic coding-konventionen'
---

# Coding-Konventionen (Frontend)

## Namensgebung

### Dateien & Ordner

- **Feature-Module:** PascalCase (`Bereitschaft/`, `EWT/`, `Neben/`)
- **Komponenten:** PascalCase (`MyButton.tsx`, `MyFormModal.tsx`)
- **Utilities:** camelCase (`configDayjs.ts`, `saveDaten.ts`)
- **Klassen:** PascalCase (`CustomTable.ts`, `CustomSnackbar.ts`)
- **Interfaces:** PascalCase mit `I`-Prefix (`IDaten.ts`, `IVorgabenU.ts`)
- **Tests:** `*.test.ts` (spiegeln Feature-Struktur wider)

### Variablen & Funktionen

- **Funktionen:** camelCase (`saveDaten`, `getValidAccesstoken`)
- **Klassen:** PascalCase (`CustomTable`, `Storage`)
- **Interfaces:** PascalCase mit `I`-Prefix (`IDaten`, `IVorgabenU`)
- **Enums/Types:** PascalCase mit `T`-Prefix für Types (`TStorageData`, `TMyModal`)
- **Konstanten:** camelCase oder UPPER_SNAKE_CASE je nach Kontext

### Sprache

- **Domain-Begriffe:** Deutsch (`Bereitschaft`, `Einstellungen`, `Vorgaben`, `Nebengeld`)
- **Technische Begriffe:** Englisch (`Storage`, `FetchRetry`, `showModal`)

---

## Datum – dayjs

**IMMER** `dayjs` verwenden, **NIEMALS** native `Date`-Methoden oder moment.js.

```ts
import dayjs from "@/infrastructure/date/configDayjs";
```

Die zentrale Konfiguration (`configDayjs.ts`) lädt:

- Deutsche Locale (`de`)
- Plugins: duration, isoWeek, minMax, isBetween, isSameOrBefore, isSameOrAfter,
  customParseFormat, localeData, weekday, updateLocale, objectSupport

---

## Imports & Exports

### Barrel-Exports (PFLICHT)

Jeder Ordner hat eine `index.ts` mit Re-Exports:

```ts
// components/index.ts
export { default as MyButton } from "./MyButton";
export { default as MyFormModal } from "./MyFormModal";
```

### Import-Reihenfolge

1. Externe Pakete (`react`, `dayjs`, `@db-ux/react-core-components`)
2. `core`/`infrastructure` (per `@/`-Alias, z.B. `@/infrastructure/api/FetchRetry`)
3. Komponenten (`../components`)
4. Lokale Dateien (`./utils`)

---

## React-Komponenten

### Props-Typen

```tsx
interface Props {
  label: string;
  onClick: () => void;
}

const MyButton: FunctionalComponent<Props> = ({ label, onClick }) => { ... };
```

### Modal-Rendering

React-Komponenten werden in einen `DBDrawer` gerendert (`showModal()`, nativer `<dialog>`):

```ts
import { mount, unmount } from "@/infrastructure/ui";
mount(document.getElementById("modal-body"), <MyComponent {...props} />);
// Abhaengen (frueher `render(null, el)`):
unmount(document.getElementById("modal-body"));
```

### JSX

- `jsxImportSource: "react"` (automatisch via TSConfig)
- React `FC<T>`; `children` gehoert explizit in den Props-Typ (React vererbt sie nicht implizit)

---

## Styles

Gate: `bun run lint:css` (Stylelint, Teil von `release:check`). Regeln und Begruendungen stehen
im Kopf von `stylelint.config.mjs`.

Bootstrap ist raus (Phase H) -- kein Paket, kein CSS, kein JS, keine `data-bs-*`-Attribute.

### Ladereihenfolge (`main.ts`)

```ts
import '../scss/layers.scss'; // @layer db-ux, app;
import '../scss/db-ux.css'; // DB-UX-Bundle in layer(db-ux)
import '../scss/utilities.scss'; // eigene Hilfsklassen in @layer app
import '../scss/styles.scss'; // App-Regeln, bewusst ungelayert (schlagen alle Layer)
```

### Hilfsklassen

Die Klassennamen entsprechen Bootstraps Utility-API (`d-flex`, `mb-3`, `text-body-secondary`, ...),
die Werte kommen aber aus den DB-Tokens. Neue Hilfsklassen gehoeren nach `src/scss/utilities.scss`.

---

## API-Aufrufe

Alle Server-Anfragen über `FetchRetry`:

```ts
import { FetchRetry } from "@/infrastructure/api/FetchRetry";

const response = await FetchRetry<RequestBody, ResponseData>("resource", data, "POST");
```

- Token wird automatisch im Header gesetzt
- Auto-Refresh bei 401 über einen geteilten Single-Flight-Refresh (kein Retry pro Request einzeln)
- Kein manuelles Error-Handling für Auth nötig

---

## localStorage

Typsicherer Zugriff über `Storage`-Singleton:

```ts
import Storage from "@/infrastructure/storage/Storage";

// Lesen mit Typ
const monat = Storage.get<number>("Monat");

// Schreiben
Storage.set("Monat", 3);

// Mit Default-Wert (Options-Objekt, kein roher 2. Positionsparameter)
const daten = Storage.get("dataN", { default: defaultDaten });
```

---

## Linting & Formatting

- **ESLint:** Flat Config (`eslint.config.js`)
- **Prettier:** via `prettier.config.mjs`
- **Pre-Commit:** Husky + lint-staged (automatisch bei `git commit`, nutzt `bun run`)
- Regeln: `no-unused-expressions` erlaubt Short-Circuit & Ternary
