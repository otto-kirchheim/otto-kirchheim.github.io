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

## Aktueller Plan: Frontend-TS/Prettier-Kompatibilität bereinigen

- [x] Aktuelle `tsc`-, ESLint- und Prettier-Befunde reproduzieren
- [x] Strikte Typfehler in `Einstellungen`, Utility-Tests und Bun-Mock-Kompatibilität korrigieren
- [x] Formatabweichungen per Prettier bereinigen
- [x] Relevante Utility-/API-Tests sowie `tsc`, Lint und `format:check` erneut ausführen

## Review (Frontend-TS/Prettier-Kompatibilität)

- Ergebnis: Frontend ist wieder ohne TS-, ESLint- und Prettier-Befunde; zusätzlich laufen die betroffenen Utility-/API-Tests wieder grün.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json` ohne Output; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint && bun run format && bun run format:check && bun run test -- test/Utilities/FetchRetry.test.ts test/Utilities/apiService.test.ts test/Utilities/Storage.test.ts test/Utilities/fieldMapper.test.ts test/Utilities/Utilities.test.ts` → `5 Dateien bestanden`.

## Aktueller Plan: EWT-Buchungstag fuer Nachtschichten korrigieren

- [x] Repro mit einem betroffenen N-Schicht-Datensatz aufbauen
- [x] Regressionstest fuer `calculateBuchungstagEwt()` ergänzen
- [x] Nachtlogik in der Buchungstag-Berechnung an den echten EWT-Zeitkorridor angleichen
- [x] Relevante EWT-Tests und Lint erneut ausführen

## Review (EWT-Buchungstag Nachtschicht)

- Ergebnis: N-/BN-Schichten liefern jetzt wieder den korrekten `buchungstagE` statt eines Tages zu spät; der temporäre Debug-`console.log` im Editor wurde entfernt.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/EWT.utils.extra.test.ts test/EWT.getEwtDaten.test.ts test/EWT.persistEwtTableData.test.ts test/EWT.validateZeitenReihenfolge.test.ts` → `4 bestanden`; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint` erfolgreich.

## Aktueller Plan: EWT-Buchungstag live in `CustomTable` synchronisieren

- [x] Repro für stale `buchungstagE` zwischen Storage und `CustomTable` absichern
- [x] `persistEwtTableData()` so anpassen, dass normalisierte Werte in die Live-Zeilen zurückgeschrieben werden
- [x] EWT-Neuberechnung (`calculateEwtEintraege`) direkt mit `buchungstagE` synchronisieren
- [x] Relevante EWT-Tests und Lint erneut ausführen

## Review (EWT-CustomTable Sync)

- Ergebnis: Der neu berechnete `buchungstagE` landet jetzt sofort im Live-`CustomTable` und nicht erst nach einem Reload; damit stimmen Tabelle, Monatsfilter und Storage wieder direkt überein.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/EWT.persistEwtTableData.test.ts test/EWT.utils.extra.test.ts test/EWT.getEwtDaten.test.ts test/EWT.validateZeitenReihenfolge.test.ts` → `4 Dateien bestanden`; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/EWT.ewtBerechnen.test.ts test/EWT.addEventlistenerToggleBerechnen.test.ts` → `2 Dateien bestanden`; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint` erfolgreich.

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

## Passkey-UX in Einstellungen & Login

- [x] Einstellungen um einen Passkey-Accordion-Eintrag mit Entfernen-Buttons erweitert
- [x] Username-losen Passkey-Login mit Browser-Autofill im Login-Modal aktiviert
- [x] Frontend-Tests für den neuen Passkey-Login ergänzt
- [x] Relevante Lint-/Build-Prüfungen erneut ausgeführt

## Review (Passkey-UX)

- Ergebnis: Sobald Passkeys vorhanden sind, erscheint in den Einstellungen ein eigener Accordion-Bereich zur Geräteverwaltung; im Login kann der Benutzername für den Passkey-Flow leer bleiben und der Browser bietet gespeicherte Passkeys direkt an.
- Verifikation: `bun test ./test/Login.loginWithPasskey.test.ts` mit `2 pass, 0 fail`; `bun run lint` und `bun run build` im Frontend erfolgreich.

## Aktueller Plan: Frontend-Testaltlasten bereinigen

- [x] Aktuell fehlschlagende Tests reproduzieren
- [x] Veraltete EWT-Erwartungen auf `buchungstagE` anheben
- [x] Brittle Download-Assertions und unnötige Monats-Setups in Persistenztests bereinigen
- [x] Frontend-Vollsuite und Lint erneut ausführen

## Review (Frontend-Testaltlasten)

- Ergebnis: Die veralteten EWT-/Download-Tests sind jetzt auf den aktuellen Flat-Array- bzw. `buchungstagE`-Vertrag ausgerichtet; unnötige Monats-Altlasten in Persistenztests wurden entfernt.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/EWT.test.ts test/EWT.persistEwtTableData.test.ts test/EWT.saveTableDataEWT.test.ts test/Neben.saveTableDataN.test.ts test/Utilities/download.test.ts` → alle Dateien bestanden; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test && bun run lint` → `Dateien: 58 ✓ 58 bestanden`, ESLint ohne Befunde.
