---
name: frontend-tests
description: "Use when: frontend topic tests"
---

# Tests (Frontend)

## Test-Stack

- **Runner:** Bun test, mit `--isolate` (eigener Modul-Cache je Testdatei, siehe `package.json`)
- **Environment:** happy-dom via `@happy-dom/global-registrator`
- **Mocking:** `bun:test` (`vi`, `mock`, `spyOn`)
- **Coverage:** Bun coverage (`text`, `lcov`)

**Wichtig:** `bun run test` läuft mit `--isolate`. Ein manuelles Teilausführen per rohem
`bun test <dateien>` (ohne `--isolate`) teilt den Modul-Cache über Dateien hinweg und kann falsche
Fehlschläge erzeugen (gemockte Barrels/`Storage` leaken zwischen Dateien) — bei "isoliert grün,
gemeinsam rot" zuerst an dieses Isolations-Problem denken, nicht an einen echten Regressionsfehler.

## Befehle

```bash
bun run test           # TZ=Europe/Berlin bun test --isolate
bun run dev-test       # Bun Watch-Mode (--isolate --watch)
bun run coverage       # Bun-Coverage-Lauf (--isolate --coverage)
```

---

## Verzeichnisstruktur

`test/` spiegelt grob `src/ts/` (`core/`, `infrastructure/`, `features/`, `Admin/`), daneben ein
großer, flacher Bestand an `Feature.spezifischesThema.test.ts`-Dateien pro Domain-Feature
(`Bereitschaft.*`, `EWT.*`, `Neben.*`, `EA.*`, `Berechnung.*`, `Login.*`, `Einstellungen/*`).
Ein Blick in `test/` selbst ist zuverlässiger als eine hier gepflegte Liste (wächst laufend).

```
test/
├── setupBun.ts             # Setup: happy-dom + Bun-Kompatibilitaet
├── global.d.ts             # Test-Typen
├── mockData.ts             # Gemeinsame Mock-Daten
├── mockPDFString.ts        # Mock für PDF-Tests
├── __snapshots__/
├── core/, infrastructure/, features/, Admin/, Einstellungen/, orchestration/, fixtures/
├── class/                  # Legacy-Ordnername (testet u.a. infrastructure/table/CustomTable.ts,
│                           #  infrastructure/ui/CustomSnackbar.ts — nie umbenannt)
├── components/             # Preact-Komponenten-Tests
└── Utilities/              # Utility-Tests (abortController, FetchRetry, download, ...)
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

```toml
[test]
preload = ["./test/setupBun.ts"]
coverageReporter = ["text", "lcov"]
```

`preload` gilt nur für `bun run`/`bun test` — nicht für `bun build --compile`. Ein Runtime-Shim, der
auch im kompilierten Artefakt greifen muss, gehört zusätzlich in den echten Entrypoint.

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
