# Tests (Frontend)

## Test-Stack

- **Runner:** Bun test
- **Environment:** happy-dom via `@happy-dom/global-registrator`
- **Mocking:** `bun:test` (`vi`, `mock`, `spyOn`)
- **Coverage:** Bun coverage (`text`, `lcov`)
- **Ausführung:** sequentiell pro Datei über `scripts/run-bun-tests.ts`

## Befehle

```bash
bun run test           # Bun-Testlauf über den sequentiellen Runner
bun run dev-test       # Bun Watch-Mode
bun run coverage       # Bun-Coverage-Lauf
```

---

## Verzeichnisstruktur

```
test/
├── setupBun.ts             # Setup: happy-dom + Bun-Kompatibilitaet
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

## Test-Setup (`setupBun.ts`)

```ts
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register({
  url: 'http://localhost/',
});
```

- happy-dom stellt globale Browser-APIs bereit
- Bun liefert `vi`, `mock`, `spyOn`, Fake-Timer und Snapshots
- Der Test-Runner startet jede Testdatei in einem frischen `bun test`-Prozess

---

## Bun-Konfiguration (in `bunfig.toml`)

```ts
[test];
preload = ['./test/setupBun.ts'];
coverageReporter = ['text', 'lcov'];
```

---

## Test schreiben

### Grundstruktur

```ts
import { describe, it, expect, vi, beforeEach } from 'bun:test';

describe('FeatureName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something', () => {
    expect(result).toBe(expected);
  });
});
```

### Fetch mocken

```ts
globalThis.fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: async () => ({ data: 'test' }),
});
```

### DOM testen (happy-dom)

```ts
it('should render element', () => {
  document.body.innerHTML = '<div id="test"></div>';
  const el = document.getElementById('test');
  expect(el).not.toBeNull();
});
```

### Snapshots

```ts
it('should match snapshot', () => {
  expect(result).toMatchSnapshot();
});
```

---

## Checkliste: Neuer Test

1. [ ] Testdatei unter `test/` oder `test/Utilities/` anlegen
2. [ ] `describe/it`-Struktur mit klaren Beschreibungen
3. [ ] Mocks im `beforeEach` per `vi.clearAllMocks()` resetten
4. [ ] Gemeinsame Mock-Daten in `mockData.ts` wiederverwenden
5. [ ] Tests lokal ausführen: `bun run test`

## Checkliste: Neues Feature testen

1. [ ] Feature-Test direkt unter `test/` (z.B. `test/NeuesFeature.test.ts`)
2. [ ] Utility-Tests unter `test/Utilities/`
3. [ ] Mock-Daten bei Bedarf in `mockData.ts` ergänzen
4. [ ] Fetch-Mocks für alle API-Aufrufe einrichten
5. [ ] DOM-Setup für UI-Tests (jsdom)
