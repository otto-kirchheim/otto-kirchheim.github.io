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
import dayjs from "../utilities/configDayjs";
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

1. Externe Pakete (`preact`, `dayjs`, `bootstrap`)
2. Utilities (`../utilities`)
3. Komponenten (`../components`)
4. Lokale Dateien (`./utils`)

---

## Preact-Komponenten

### Props-Typen

```tsx
interface Props {
  label: string;
  onClick: () => void;
}

const MyButton: FunctionalComponent<Props> = ({ label, onClick }) => { ... };
```

### Modal-Rendering

Preact-Komponenten werden in Bootstrap-Modals gerendert:

```ts
import { render } from "preact";
render(<MyComponent {...props} />, document.getElementById("modal-body"));
```

### JSX

- `jsxImportSource: "preact"` (automatisch via TSConfig)
- Preact `FunctionalComponent<T>` statt React `FC<T>`

---

## Bootstrap

### Module einzeln importieren

```ts
import { Collapse } from "bootstrap";
import { Modal } from "bootstrap";
```

### CSS via SCSS

```scss
@import "~bootstrap/scss/bootstrap";
@import "~material-icons/iconfont/material-icons.css";
```

---

## API-Aufrufe

Alle Server-Anfragen über `FetchRetry`:

```ts
import { FetchRetry } from "../utilities";

const response = await FetchRetry("/api/resource", {
	method: "POST",
	body: JSON.stringify(data),
});
```

- Token wird automatisch im Header gesetzt
- Auto-Retry bei 401 mit Token-Refresh
- Kein manuelles Error-Handling für Auth nötig

---

## localStorage

Typsicherer Zugriff über `Storage`-Singleton:

```ts
import { Storage } from "../utilities";

// Lesen mit Typ
const monat = Storage.get<number>("Monat");

// Schreiben
Storage.set("Monat", 3);

// Mit Default-Wert
const daten = Storage.get("Daten", defaultDaten);
```

---

## Linting & Formatting

- **ESLint:** Flat Config (`eslint.config.js`)
- **Prettier:** via `prettier.config.mjs`
- **Pre-Commit:** Husky + lint-staged (automatisch bei `git commit`, nutzt `bun run`)
- Regeln: `no-unused-expressions` erlaubt Short-Circuit & Ternary
