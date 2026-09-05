---
name: verify
description: Frontend-Änderungen end-to-end im echten Browser verifizieren (Vite + Chrome headless, ohne Backend)
---

# Frontend end-to-end verifizieren (ohne Backend)

Die Einstellungen-/Hauptseite rendert komplett aus localStorage — ein laufendes Backend ist für UI-Verifikation nicht nötig.

## Rezept

1. Dev-Server: `bun run start` (Port **8080**, `bun run preview` wäre 8082).
2. Browser: `puppeteer-core` (ad hoc in Scratchpad installieren) mit `executablePath: '/usr/bin/google-chrome-stable'`, `headless: true`, `args: ['--no-sandbox']`.
3. Session seeden via `page.evaluateOnNewDocument` (läuft bei jeder Navigation erneut):
   - `localStorage`-Keys sind die **Enum-Keys** aus `Storage.ts` (`VorgabenU`, `Benutzer`, `BenutzerRolle`, `RefreshToken`, `Version`, `Monat`, `Jahr`) — nicht die deutschen Enum-Werte.
   - Werte JSON-stringifien; Ressourcen-Keys (`VorgabenU`, `dataBZ`, `dataBE`, `dataE`, `dataN`, `dataEA`) als `{ data, timestamp }` wrappen.
   - **`Version` mit seeden** (z.B. `"9.9.9"`), sonst loggt der Versions-Check (`main.ts`) sofort aus („App hat ein Update erhalten").
   - **`localStorage.clear`/`removeItem` zu No-Ops stubben**: ohne erreichbares Backend schlägt der Token-Refresh fehl → Auto-Logout leert sonst den Seed nach wenigen Sekunden.
4. Navigation: Desktop-Viewport → `page.click('#einstellungen-tab')` u.ä. Bei Mobile-Viewport (<768px) liegt die Tab-Navigation hinter der eingeklappten Navbar → `page.$eval(sel, el => el.click())` statt Hit-Test-Klick.
5. Snackbars: Selektor `.CustomSnackbar-container`.
6. Save-Flows: `Storage.set` passiert synchron im Click-Handler → localStorage **sofort** (≤50ms) nach dem Klick lesen; der anschließende PUT scheitert offline (erwartet). PUT-Body ggf. via `page.on('request')` abfangen.

## Gotchas

- `mount()` rendert per `flushSync` synchron; `useEffect` laeuft danach → nach Interaktionen ~150ms warten.
- Ohne Backend startet der Auth-Lifecycle nicht, die Feature-Tabs mounten also nicht von selbst. Fuer
  reine UI-Pruefungen die Module im Seitenkontext importieren (`await import('/ts/features/EWT/EwtTab.tsx')`)
  und `mountEwtTab()` aufrufen.
- `bun test` mit mehreren Dateien in einem Prozess produziert Cross-File-Fehler; immer `bun run test` (sequentiell pro Datei) für die Suite nutzen.
