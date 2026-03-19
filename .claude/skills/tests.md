# Tests (Frontend)

## Test-Stack

- **Runner:** Vitest (v3)
- **Environment:** jsdom
- **Mocking:** vitest-fetch-mock (globaler fetch-Mock)
- **Coverage:** @vitest/coverage-v8
- **UI:** @vitest/ui (Port 9527)

## Befehle

```bash
bun run test           # tsc + vitest run (einmalig)
bun run dev-test       # Vitest UI im Browser (Port 9527)
bun run coverage       # Tests mit Coverage-Report
```

---

## Verzeichnisstruktur

```
test/
├── setupVitest.ts          # Setup: vitest-fetch-mock (globaler Fetch-Mock)
├── global.d.ts             # Test-Typen
├── mockData.ts             # Gemeinsame Mock-Daten
├── mockPDFString.ts        # Mock für PDF-Tests
├── Berechnung.test.ts      # Feature-Tests
├── Bereitschaft.test.ts
├── EWT.test.ts
├── Neben.test.ts
├── __snapshots__/          # Vitest Snapshots
└── Utilities/              # Utility-Tests
    ├── abortController.test.ts
    ├── compareVersion.test.ts
    ├── download.test.ts
    ├── FetchRetry.test.ts
    └── Utilities.test.ts
```

---

## Test-Setup (`setupVitest.ts`)

```ts
import createFetchMock from "vitest-fetch-mock";
import { vi } from "vitest";

const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();
```

- `fetch` ist global gemockt (vitest-fetch-mock)
- Globals aktiviert (`globals: true` in vite.config.ts)
- jsdom als DOM-Environment

---

## Vitest-Konfiguration (in `vite.config.ts`)

```ts
test: {
  root: path.resolve(__dirname),
  globals: true,
  environment: "jsdom",
  setupFiles: ["./test/setupVitest.ts"],
  exclude: [".github/*", ".husky/*", "dist", "dev-dist", ...],
}
```

---

## Test schreiben

### Grundstruktur

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("FeatureName", () => {
	beforeEach(() => {
		fetchMock.resetMocks();
	});

	it("should do something", () => {
		expect(result).toBe(expected);
	});
});
```

### Fetch mocken

```ts
// Einfacher Mock
fetchMock.mockResponseOnce(JSON.stringify({ data: "test" }));

// Mit Status
fetchMock.mockResponseOnce("", { status: 401 });

// Mehrere Responses
fetchMock.mockResponses([JSON.stringify({ data: 1 }), { status: 200 }], [JSON.stringify({ data: 2 }), { status: 200 }]);
```

### DOM testen (jsdom)

```ts
it("should render element", () => {
	document.body.innerHTML = '<div id="test"></div>';
	const el = document.getElementById("test");
	expect(el).not.toBeNull();
});
```

### Snapshots

```ts
it("should match snapshot", () => {
	expect(result).toMatchSnapshot();
});
```

---

## Checkliste: Neuer Test

1. [ ] Testdatei unter `test/` oder `test/Utilities/` anlegen
2. [ ] `describe/it`-Struktur mit klaren Beschreibungen
3. [ ] `fetchMock.resetMocks()` im `beforeEach`
4. [ ] Gemeinsame Mock-Daten in `mockData.ts` wiederverwenden
5. [ ] Tests lokal ausführen: `bun run test`

## Checkliste: Neues Feature testen

1. [ ] Feature-Test direkt unter `test/` (z.B. `test/NeuesFeature.test.ts`)
2. [ ] Utility-Tests unter `test/Utilities/`
3. [ ] Mock-Daten bei Bedarf in `mockData.ts` ergänzen
4. [ ] Fetch-Mocks für alle API-Aufrufe einrichten
5. [ ] DOM-Setup für UI-Tests (jsdom)
