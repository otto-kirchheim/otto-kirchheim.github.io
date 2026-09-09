---
name: verify
description: Frontend-Änderungen end-to-end im echten Browser verifizieren (Vite + Chrome headless, ohne Backend)
---

# Frontend end-to-end verifizieren (ohne Backend)

Die Einstellungen-/Hauptseite rendert komplett aus localStorage — ein laufendes Backend ist für UI-Verifikation nicht nötig.

## Rezept

1. Dev-Server: `bun run dev:local` (Port **8080**; belegt → 8081/8082, die Log-Ausgabe zeigt den Port). `bun run dev` nur mit Zoraxy-Proxy.
2. Browser: `puppeteer-core` (ad hoc in Scratchpad installieren). Chrome-Binary: im frischen Codespace fehlt `/usr/bin/google-chrome-stable` → einmal `bunx puppeteer browsers install chrome` (landet unter `~/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome`); dessen Systembibliotheken via `sudo apt-get install -y libglib2.0-0 libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2t64 libatspi2.0-0 libxext6 libxrender1 fonts-liberation`. `launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })`.
3. Session seeden via `page.evaluateOnNewDocument` (läuft bei jeder Navigation erneut):
   - `localStorage`-Keys sind die **Enum-Keys** aus `Storage.ts` (`VorgabenU`, `Benutzer`, `BenutzerRolle`, `RefreshToken`, `Version`, `Monat`, `Jahr`) — nicht die deutschen Enum-Werte.
   - Werte JSON-stringifien; Ressourcen-Keys (`VorgabenU`, `dataBZ`, `dataBE`, `dataE`, `dataN`, `dataEA`) als `{ data, timestamp }` wrappen.
   - **`Version` mit seeden** (z.B. `"9.9.9"`), sonst loggt der Versions-Check (`main.ts`) sofort aus („App hat ein Update erhalten").
   - **`localStorage.clear`/`removeItem` zu No-Ops stubben**: ohne erreichbares Backend schlägt der Token-Refresh fehl → Auto-Logout leert sonst den Seed nach wenigen Sekunden.
4. Navigation: am robustesten per Hash — `page.goto(BASE + '/#Einstellungen')` (die Panel-Ids sind `start`, `Bereitschaft`, `EWT`, `Neben`, `EA`, `Berechnung`, `Einstellungen`, `Admin`). "Start" hat keinen Nav-Eintrag mehr — die Wortmarke (`#brand-start-tab`) ist der Start-Schalter. Nav-Eintraege sind `<a href="#…">` (Design-Umschalter `#bd-theme` ist ein `<button>`). Bei Mobile-Viewport (<768px) liegt die Navigation in der Schublade → per Hash navigieren.
5. Snackbars: Selektor `.CustomSnackbar-container`.
6. Save-Flows: `Storage.set` passiert synchron im Click-Handler → localStorage **sofort** (≤50ms) nach dem Klick lesen; der anschließende PUT scheitert offline (erwartet). PUT-Body ggf. via `page.on('request')` abfangen.

## Gotchas

- `mount()` rendert per `flushSync` synchron; `useEffect` laeuft danach → nach Interaktionen ~150ms warten.
- Ohne Backend startet der Auth-Lifecycle nicht, die Feature-Tabs mounten also nicht von selbst. Fuer
  reine UI-Pruefungen die Module im Seitenkontext importieren (`await import('/ts/features/EWT/EwtTab.tsx')`)
  und `mountEwtTab()` aufrufen.
- `bun test` mit mehreren Dateien in einem Prozess produziert Cross-File-Fehler; immer `bun run test` (sequentiell pro Datei) für die Suite nutzen.
