# Todo

## Aktueller Plan: Frontend-Tests auf Bun test + happy-dom umstellen

- [x] Test-Konfiguration und Abhaengigkeiten auf Bun test + happy-dom umstellen
- [x] Setup-Dateien fuer DOM-, Fetch- und globale Mocks unter Bun neu aufsetzen
- [x] Testdateien von Vitest-APIs auf Bun-Test-APIs migrieren
- [x] Snapshot- und DOM-kritische Tests unter happy-dom validieren
- [x] Frontend-Testlauf, TypeScript und Lint nach der Migration verifizieren

## Verifikationskriterien (Bun Test Migration)

- `frontend/package.json` nutzt `bun test` fuer Testlauf und Watch-Mode
- `test/setupVitest.ts` und `vitest.config.ts` werden nicht mehr benoetigt
- Tests laufen mit happy-dom ohne jsdom-Storage-Workarounds
- Relevante Suites und Begleitchecks sind nachweisbar erfolgreich

## Review (Bun Test Migration)

- Ergebnis: Frontend verwendet jetzt Bun test mit happy-dom und einem sequentiellen Runner fuer stabile Modul-Mocks; direkte Vitest/jsdom-Abhaengigkeiten und die alte Vitest-Konfiguration sind entfernt.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test` sowie `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint` und `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test test/Utilities/saveDaten.test.ts test/Utilities/autoSave.test.ts test/Einstellungen/SelectYear.test.ts test/Login.LadeUserDaten.test.ts test/class/CustomSnackbar.test.ts`.

## Struktur- und Doku-Organisation

- [x] `.claude`-Navigation für Frontend optimieren
- [x] `CLAUDE.md`-Verweise auf neue Navigationspunkte abstimmen
- [x] Konsistenz mit Root-Regeln prüfen

## Review

- Ergebnis: Frontend hat jetzt eine dedizierte `.claude/README.md` und einen Skill-Index unter `.claude/skills/README.md`.
- Verifikation: Verlinkte Dateien in `frontend/CLAUDE.md` existieren und sind aufrufbar.

## Teststabilisierung

- [x] Snapshot-Differenzen in `test/Bereitschaft.test.ts` analysiert
- [x] Snapshots in Test-Script-Zeitzone aktualisiert
- [x] Veraltete Erwartung fuer vorhandenen Bereitschaftszeitraum angepasst
- [x] Frontend-Vollsuite erfolgreich erneut ausgefuehrt

## Review (Tests)

- Ergebnis: Alle Frontend-Tests laufen wieder stabil durch.
- Verifikation: `bun run test` in `frontend/` mit 428 bestanden, 0 fehlgeschlagen.

## TS und Lint

- [x] TS-Typfehler in `test/Neben.saveTableDataN.test.ts` behoben
- [x] TS-Typfehler in `test/EWT.saveTableDataEWT.test.ts` behoben
- [x] TS-Parametertypen in `test/Bereitschaft.test.ts` korrigiert
- [x] Lint-Warnings in Tests und `src/ts/utilities/FetchRetry.ts` behoben
- [x] Frontend-Lint erfolgreich ausgefuehrt

## Review (TS/Lint)

- Ergebnis: Keine TS- oder Lint-Fehler mehr im Frontend.
- Verifikation: `get_errors` ohne Befunde, `bun run lint` erfolgreich.

## Aktueller Plan: Save-Regression (Backend gespeichert, Frontend stale bis Re-Login)

- [x] Save-Datenfluss und AutoSave-Sync analysieren
- [x] Lokalen Zustand nach Save mit servernormalisierten Daten synchronisieren
- [x] Profil-Save auf serverseitige Antwortdaten umstellen
- [x] Regressionstests für AutoSave und saveDaten ergänzen
- [x] Relevante Tests erfolgreich ausführen

## Verifikationskriterien (Save-Regression)

- Nach Save sind serverseitig korrigierte Werte direkt in Tabelle und localStorage sichtbar
- Re-Login ist nicht mehr erforderlich, um die zuletzt gespeicherten Daten zu sehen
- Bestehende Utilities-Tests bleiben grün

## Review (Save-Regression)

- Ergebnis: AutoSave spiegelt Serverantworten (inkl. Korrekturen) zurück in den Tabellenzustand; `saveDaten` übernimmt servernormalisierte Profilwerte in Storage.
- Verifikation: `bun run test -- test/Utilities/autoSave.test.ts test/Utilities/saveDaten.test.ts` mit 47 bestanden, 0 fehlgeschlagen.
