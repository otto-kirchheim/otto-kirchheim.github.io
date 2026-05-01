# Todo

## Aktueller Plan: AutoSave-Race bei nachlaufenden neuen Datensaetzen

- [x] AutoSave-Pfad fuer `saving`-Status auf Race-Condition pruefen
- [x] Queue-Mechanismus fuer waehrend `saving` eintreffende Aenderungen implementieren
- [x] Regressionstest fuer nachlaufende `create`-Aenderungen waehrend laufendem Save ergaenzen
- [x] Betroffene Frontend-Tests ausfuehren und Ergebnis dokumentieren

## Verifikationskriterien (AutoSave-Race)

- Neue oder geaenderte Zeilen, die waehrend eines laufenden Auto-Save entstehen, werden nicht verworfen
- Nach Abschluss des laufenden Saves wird automatisch ein weiterer Save-Lauf eingeplant
- `test/Utilities/autoSave.test.ts` enthaelt einen Regressionstest fuer diesen Ablauf

## Review (AutoSave-Race)

- Ergebnis: `scheduleAutoSave` markiert Aenderungen im Status `saving` jetzt als queued und startet nach Abschluss des Saves automatisch einen Folge-Save. Dadurch gehen direkt nachlaufende neue Datensaetze nicht mehr verloren.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/Utilities/autoSave.test.ts` -> `40 pass, 0 fail`.

## Aktueller Plan: Frontend TypeScript-Fehler beheben

- [x] Aktuelle TypeScript-Fehler erfassen und auf Root-Causes gruppieren
- [x] Veraltete Test-Importpfade auf die aktuellen `core/types`-Barrels migrieren
- [x] Verbleibende typspezifische Testfehler beheben und Typecheck erneut verifizieren

## Verifikationskriterien (Frontend TS-Fehler)

- `bunx tsc --noEmit -p tsconfig.json` läuft im Frontend ohne Fehler
- Test-Importe referenzieren keine veralteten `src/ts/interfaces`-Pfadsegmente mehr

## Review (Frontend TS-Fehler)

- Ergebnis: Die gemeldeten TypeScript-Fehler wurden vollständig behoben. Ursache waren veraltete Typ-Importe in Tests (`src/ts/interfaces`), die auf die aktuelle Typ-Struktur (`src/ts/core/types`) migriert wurden.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json` sowie `cd /home/jan/Dokumente/DB-Nebengeld/frontend && rg -n "src/ts/interfaces" test || true`.

## Aktueller Plan: MyInput Ref-Handling optimieren

- [x] Ref- und Popover-Pfad in `MyInput` lokal pruefen
- [x] Feldinitializer mit Props-Snapshot durch stabilen Fallback-Ref plus Getter ersetzen
- [x] Popover-Sync fuer Mount/Update/Unmount absichern und TypeScript/Lint/Prettier verifizieren

## Verifikationskriterien (MyInput)

- `MyInput` nutzt keinen Props-basierten Ref-Snapshot mehr im Feldinitializer
- Popover bleibt bei geaenderten `popover`- oder `myRef`-Props konsistent
- `bunx tsc --noEmit -p tsconfig.json`, ESLint und Prettier laufen fuer die Aenderung sauber

## Review (MyInput)

- Ergebnis: `MyInput` verwendet jetzt einen internen Fallback-Ref und leitet ueber einen Getter immer den aktuellen effektiven Ref ab. Dadurch entfaellt die implizite Bindung an den initialen `myRef`, und Bootstrap-Popover werden bei Prop-Wechseln sauber neu synchronisiert.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx --bun eslint src/ts/components/MyInput.tsx`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx prettier --check src/ts/components/MyInput.tsx`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json`.

## Aktueller Plan: TS-, Lint- und Prettier-Fehler beheben

- [x] Frontend-Qualitaetsstatus fuer TypeScript, ESLint und Prettier ermitteln
- [x] Gemeldete TypeScript-Fehler in den betroffenen Testdateien beheben
- [x] Prettier-Abweichungen in den gemeldeten Testdateien bereinigen
- [x] `bunx tsc --noEmit`, `bun run lint` und `bun run format:check` erneut erfolgreich verifizieren

## Verifikationskriterien (TS/Lint/Prettier)

- Frontend-TypeScript-Check endet ohne Fehler
- Frontend-Lintlauf endet ohne Findings
- Frontend-Prettier-Check bestaetigt konsistenten Stil

## Review (TS/Lint/Prettier)

- Ergebnis: Alle gemeldeten Frontend-Qualitaetsfehler sind behoben. TypeScript war in drei Testdateien fehlerhaft; zusaetzlich wurden die sieben von Prettier gemeldeten Testdateien formatiert.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run format:check`.

## Aktueller Plan: Letzten no-deprecated-Fehler beheben

- [x] Verbleibenden `@typescript-eslint/no-deprecated` Treffer in `test/Login.LadeUserDaten.test.ts` lokalisieren
- [x] Deprecated `preact.render()`-Aufruf im Test entfernen
- [x] Datei und kompletten Frontend-Lintlauf verifizieren

## Verifikationskriterien (letzter no-deprecated)

- `test/Login.LadeUserDaten.test.ts` enthält keinen deprecated `render`-Aufruf mehr
- `bun run lint` läuft ohne `@typescript-eslint/no-deprecated`-Fehler durch

## Review (letzter no-deprecated)

- Ergebnis: Im Test wurde die Vorbelegung des Banner-Mounts von `preact.render(...)` auf eine reine DOM-Vorbelegung (`innerHTML`) umgestellt. Der zugehörige Deprecation-Treffer ist entfernt.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx --bun eslint test/Login.LadeUserDaten.test.ts` sowie `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint` ohne Findings.

## Aktueller Plan: ESLint no-deprecated typed linting

- [x] Ursache des Absturzes in der Flat-Config validieren (`no-deprecated` ohne Type-Information)
- [x] Typed-Linting fuer TypeScript-Dateien in `eslint.config.js` aktivieren
- [x] `no-deprecated` gezielt auf TypeScript-Dateien anwenden und Lint verifizieren

## Verifikationskriterien (ESLint no-deprecated)

- ESLint wirft keinen ParserOptions-TypeInfo-Fehler mehr beim Laden von `@typescript-eslint/no-deprecated`
- `bun run lint` meldet Regelverstoeße als normale Lint-Funde statt Konfigurationsabbruch

## Review (ESLint no-deprecated)

- Ergebnis: Die Flat-Config aktiviert jetzt `parserOptions.projectService` fuer `**/*.ts`/`**/*.tsx` und scoped `@typescript-eslint/no-deprecated` auf diese Dateien. Der vorherige Laufzeitfehler beim Regel-Load ist behoben.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint` laeuft durch die Analyse und liefert normale Findings (aktuell 4x `@typescript-eslint/no-deprecated`) statt ParserServices-Abbruch.

## Aktueller Plan: Test-Coverage-Erweiterung

Ausgangszustand (2026-04-21): 643 Tests, 76 Dateien, Coverage-Baseline aus `bun run coverage`.

### Nicht abdeckenswert (explizit ausgeschlossen)

- **Preact-Komponenten** (`Admin/components/`, `Bereitschaft/components/`, `Einstellungen/components/`, `core/auth/components/createModalNewUser.tsx`) – Render-Tests erfordern ein vollständiges Preact-Test-Setup; Aufwand > Nutzen.
- **`passkeys.ts` / `registerPasskey.ts`** – WebAuthn-Browser-API nicht sinnvoll mockbar.
- **Feature-`index.ts`-Dateien** (`Bereitschaft/index.ts`, `Berechnung/index.ts`, `Admin/index.tsx`) – reiner Boot-/Glue-Code, der `window.load` bindet.
- **`bootstrap.ts`** – App-Init, zu eng mit DOM und Login-Orchestrierung verwoben.
- **`changeMonatJahr.ts`** – reine DOM-Seiteneffekte ohne isolierbare Rückgabewerte.

### Phase T.1 – Reine Logik (kein oder minimaler DOM) ✅ abgeschlossen

Ziel: die offensichtlichsten 0%-Lücken in isolierbaren Modulen schließen.

- [ ] `syncEwtToNeben.ts` (0% / 6 % branch) → `test/Neben.syncEwtToNeben.test.ts`
  - Storage-Mock + CustomTable-Stub; Fälle: leeres Array, kein `ewtRef`, beginN/endeN unverändert (no-op), Update schlägt durch zu Storage + Table, `drawRows` + Event-Emit bei tableChanged.
- [ ] `storageStateStore.ts` (0% / 54 % branch) → `test/core/storageStateStore.test.ts`
  - `get` (vorhanden / fehlt), `set`, `remove`, `has` – alles via existierendem Storage-Singleton; keine Mocks nötig.
- [ ] `actAsStatus.ts` – fehlende Branches (31 % branch) → in bestehendem `test/Utilities/actAsStatus.test.ts` ergänzen
  - `notifyActAsStateChanged` – dispatcht `CustomEvent` mit korrektem Detail.
  - `updateActAsBanner` – alle DOM-Pfade: kein Element, `!state.active`, `state.active` mit/ohne `currentUserName`, Button-Text-Setzung.
- [ ] `normalizeResourceRows.ts` (75 % branch) → in bestehendem Test ergänzen
  - Lücke Zeilen 7–8: Edge Case leeres Array / nicht-Array-Eingabe.
- [ ] `savePipeline.ts` – `unlinkNebengeldRefsForDeletedEwtIds` (Zeilen 87–120, Branch 81 %) → in bestehendem `test/Utilities/savePipeline.test.ts` ergänzen
  - Fälle: leeres `deletedIds`-Array (early return), Referenz in Storage entfernt, Table-Rows bereinigt, `drawRows` aufgerufen.

### Phase T.2 – Leicht gemockter DOM ✅ abgeschlossen

### Phase T.3 – apiService-Lücken ✅ abgeschlossen

- apiService: alle Passkey-Auth-Methoden + forgotPassword/resetPassword/resendVerificationEmail (10 Tests)
- Admin-API (neu): fetchAdminUsers, updateUserScopes, fetchCurrentAdminCapabilities (4 Rollen-Branches), updateUserRole/Oe/Password, deleteUser, setActAsUser, Vorgaben-API, Profile-Templates-API (23 Tests)

### Phase T.4 – Auth/Load-Flows ✅ abgeschlossen

- loadUserDaten: "Serverdaten übernehmen"-Action (overwriteUserDaten), "Lokale Daten behalten"-Action (publishEvent + dataServer-Remove)
- submitBereitschaftsZeiten: Offline-Jahreswechsel-Snackbar, Online-Jahreswechsel API-Call (Erfolg + Bulk-Fehler)
- submitBereitschaftsEinsatz: LRE-1-Duplikat-Warnung (addiert trotzdem), berZeit mit bereits vorhandenem BZ

## Verifikationskriterien (Test-Coverage-Erweiterung)

- `bun run coverage` zeigt nach jeder Phase Coverage-Fortschritt für die Zieldateien.
- Kein neuer Test darf bestehende Suites destabilisieren (`bun run test` bleibt grün).
- Kein Produktionscode wird für die Tests verändert (Tests passen sich an, nicht der Code).

---

## Aktueller Plan: Pages-Workflow Actions-Major-Update

- [x] Deploy-Workflow auf aktuelle Actions-Majors umstellen
- [x] Frontend-Qualitätschecks (`test`, `tsc`, `lint`, `format:check`) ausführen
- [x] Frontend-Scope mit Changelog/Todo dokumentieren

## Verifikationskriterien (Actions-Major-Update)

- `deploy.yml` verwendet die aktuellen Major-Tags (`checkout@v6`, `configure-pages@v6`, `upload-pages-artifact@v5`, `deploy-pages@v5`)
- Frontend-Checks laufen vollständig grün

## Review (Actions-Major-Update)

- Ergebnis: Der Pages-Workflow nutzt jetzt die aktuellen Actions-Majors und benötigt kein separates Node24-Opt-in mehr als Übergang für diese Schritte.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test` (Dateien: 62, 62 bestanden), `bunx tsc --noEmit -p tsconfig.json`, `bun run lint`, `bun run format:check` (`All matched files use Prettier code style!`).

## Aktueller Plan: Fertigstellen (`frontend`) – Deploy-Workflow Node 24

- [x] Frontend-Diff und Scope-Dateien prüfen
- [x] Frontend-Qualitätschecks (`test`, `tsc`, `lint`, `format:check`) ausführen
- [x] Frontend-Änderung gestaffelt committen

## Verifikationskriterien (Fertigstellen `frontend`)

- Der Deploy-Workflow setzt `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`
- Frontend-Checks laufen vollständig grün
- Commit enthält nur Frontend-Dateien dieses Scopes

## Review (Fertigstellen `frontend`)

- Ergebnis: In `.github/workflows/deploy.yml` wurde die Workflow-Umgebung auf Node-24-Opt-in für JavaScript-Actions gesetzt, um die Node-20-Deprecation-Warnungen zu entschärfen.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test` (Dateien: 62, 62 bestanden), `bunx tsc --noEmit -p tsconfig.json`, `bun run lint`, `bun run format:check` (`All matched files use Prettier code style!`).

## Aktueller Plan: Warnmeldung bei Array-Laengen-Mismatch

## Verifikationskriterien (Warnmeldung Array-Mismatch)

## Aktueller Plan: Sichtbarer Error-State fuer AutoSave-Zeilen

- [x] CustomTable-RowState und Change-Tracking fuer fehlerhafte Zeilen erweitern
- [x] Error-Markierung in der Tabellen-UI sichtbar machen (Row-Styling + Fehlermeldung)
- [x] Frontend-Regressionstests sowie `test`, `tsc`, `lint`, `format:check` ausfuehren und Ergebnis dokumentieren

## Verifikationskriterien (Error-State Tabelle)

- Zeilen mit `_state = 'error'` sind in der Tabelle sichtbar hervorgehoben
- Die Fehlermeldung der Zeile ist im DOM verfuegbar, ohne auf den Fehlerdialog angewiesen zu sein
- Fehlerhafte Create-/Update-Zeilen bleiben fuer den naechsten Save im Change-Tracking erhalten
- Relevante Frontend-Tests und statische Checks laufen erfolgreich

## Review (Error-State Tabelle)

- Ergebnis: `CustomTable` unterscheidet jetzt zwischen sichtbarem Fehlerzustand und eigentlicher Save-Operation. Fehlerzeilen werden mit `customtable-error` hervorgehoben, tragen ihre Fehlermeldung als Tooltip/Data-Attribut und behalten fuer Retry den urspruenglichen State (`new`, `modified`, `deleted`). Dadurch verschwinden fehlgeschlagene Create-/Delete-Vorgaenge nicht mehr aus dem Change-Tracking.
- Delta: Fehlerzeilen zeigen nun zusaetzlich ein rotes Error-Icon in der ersten Datenzelle (`.customtable-error-icon`) fuer bessere Scanbarkeit in langen Tabellen.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/class/CustomTable.test.ts test/Utilities/autoSave.test.ts`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run format:check`.

## Review (Warnmeldung Array-Mismatch)

- Ergebnis: Beim Daten-Reload wird bei jedem Array-Laengen-Mismatch pro Ressource eine Warninformation gesammelt und als Snackbar angezeigt. Die Meldung nennt Ressource sowie lokale und serverseitige Anzahl und macht die Uebernahme der Serverdaten transparent.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run format:check`.

## Aktueller Plan: Daten-Reload auf Array-Laenge absichern

- [x] Sync-Entscheidung in `loadUserDaten` um Array-Laengenvergleich fuer Ressourcen erweitern
- [x] Regressionstest fuer juengeren lokalen Timestamp mit kuerzerem lokalen Array ergaenzen
- [x] Frontend-Checks (Test, TypeScript, Lint, Format-Check) ausfuehren und Ergebnis dokumentieren

## Verifikationskriterien (Array-Laenge Reload)

- Bei `dataBZ`/`dataBE`/`dataE`/`dataN` werden Serverdaten uebernommen, wenn die normalisierte Array-Laenge von lokal und Server abweicht
- Bestehender `_id`-Repair-Pfad bleibt unveraendert aktiv
- Relevante Frontend-Checks laufen erfolgreich

## Review (Array-Laenge Reload)

- Ergebnis: Beim Laden wird fuer `dataBZ`, `dataBE`, `dataE` und `dataN` jetzt zusaetzlich die normalisierte Array-Laenge verglichen. Weicht die lokale Laenge vom Serverstand ab, werden die Serverdaten trotz juengerem lokalem Timestamp uebernommen.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run format:check`.

## Aktueller Plan: Anzeige-Optimierung VorgabenB (Modal + Tabelle)

- [x] Show-Modal in klare Bereiche fuer Bereitschaft und Nachtschicht aufteilen
- [x] Nachtschicht-Anzeige im Show-Modal bei deaktivierter Nacht mit Hinweis statt redundanter Detailwerte darstellen
- [x] Tabellen-Spaltentitel und Parser fuer bessere Lesbarkeit (Wochentag + W1/W2 + Zeit) optimieren
- [x] TypeScript und Lint erneut verifizieren

## Review (VorgabenB Anzeige-Optimierung)

- Ergebnis: Die VorgabenB-Anzeige ist konsistenter und besser scanbar. Im Show-Modal sind Bereitschaft und Nachtschicht klar getrennt, und bei deaktivierter Nacht wird ein eindeutiger Hinweis gezeigt. In der Tabelle wurden die Spaltentitel fachlich benannt und die Werte kompakter als Wochentag + Woche + Zeit formatiert.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json` ohne Output; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint` erfolgreich.

## Aktueller Plan: Zwei-Wochen-Auswahl fuer VorgabenB im Einstellungen-Modal

- [x] UI- und Interaktionsbasis fuer 2-Wochen-Grid (Mo-So / Mo-So) festlegen
- [x] Neue Auswahlkomponente in `createEditorModalVE` integrieren (Desktop Drag + Start/Ende-Tap)
- [x] Bestehendes Datenmodell und Submit-Mapping (`beginn*Tag`, `ende*Tag`, `*Nwoche`) kompatibel halten
- [x] TypeScript, Test und Lint verifizieren

## Review (VorgabenB 2-Wochen-Auswahl)

- Ergebnis: Die Tagesauswahl in der VorgabenB-Modalmaske nutzt jetzt ein festes 2-Wochen-Grid mit sichtbarer Start-/Ende-/Bereichsmarkierung; Desktop-Drag und Start/Ende-Tap sind aktiv, Mobile arbeitet per Start/Ende-Tap. Das bestehende Submit-Format bleibt unveraendert.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json` ohne Output; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/Einstellungen/saveTableDataVorgabenU.test.ts` -> `2 pass`; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint` erfolgreich.

## Aktueller Plan: EWT-Berechnen behält Jahresdaten im Tabellenzustand

- [x] Regressionsursache beim Klick auf `Berechnen` in `recalculateEwtMonat()` eingrenzen
- [x] Fokussierten Test für den Verlust anderer Monatsdaten ergänzen
- [x] Monatsdaten nach der Neuberechnung wieder in den bereits geladenen Jahresbestand mergen
- [x] Relevante EWT-Tests, TypeScript und Lint erneut ausführen

## Review (EWT Jahresdaten nach Berechnen)

- Ergebnis: `recalculateEwtMonat()` lädt nach dem Berechnen nicht mehr nur den sichtbaren Monatsausschnitt in `tableE`, sondern merged die neu berechneten Monatszeilen in den vollständigen geladenen Jahresbestand zurück. Dadurch funktionieren spätere Monatswechsel im selben Jahr weiterhin korrekt.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/EWT.recalculateEwtMonat.test.ts test/EWT.persistEwtTableData.test.ts test/EWT.getEwtDaten.test.ts` → `Dateien: 3 ✓ 3 bestanden`; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json && bun run lint` erfolgreich.

## Aktueller Plan: Act-As Anzeige und Eigene-Daten-Button im Admin

- [x] Relevante Frontend-Stellen für Act-As-Status und Admin-Menü prüfen
- [x] Sichtbare Anzeige ergänzen, wenn Daten eines anderen Benutzers geladen sind
- [x] Zentralen Button zum Laden der eigenen Daten im Admin ergänzen und responsive anordnen
- [x] Relevante Frontend-Tests, TypeScript-Check, Build und Lint ausführen

## Review (Act-As Anzeige / Eigene Daten)

- Ergebnis: Die Oberfläche zeigt jetzt deutlich an, wenn gerade fremde Benutzerdaten aktiv sind, inklusive zentralem Rücksprung auf die eigenen Daten; die Hinweise und Buttons brechen auf kleinen Displays sauber untereinander um und bleiben auf größeren Breakpoints kompakt nebeneinander.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/Utilities/actAsStatus.test.ts test/Login.userLoginSuccess.test.ts` → `Dateien: 2 ✓ 2 bestanden`; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json && bun run build && bun run lint` erfolgreich (nur bestehende Sass-Deprecation-Warnungen im Build).

## Aktueller Plan: Frontend-401-Startlogik und Session-Handling stabilisieren

- [x] 401-Fehlerkaskade beim App-Start reproduzieren und auf Stale-Session / uncaught Admin-Requests eingrenzen
- [x] Session-Erkennung auf echte Tokens begrenzen und geschützte 401-Antworten sauber über Refresh/Logout abfangen
- [x] Admin-Startup und Jahresdaten-Load gegen ungefangene Session-Fehler härten
- [x] Relevante Regressionstests, Lint und Build erneut ausführen

## Review (Frontend-401-Startlogik)

- Ergebnis: Veraltete lokale Benutzerdaten ohne gültige Tokens werden nicht mehr als aktive Session behandelt; geschützte 401-Antworten stoßen jetzt sauber den Refresh-/Logout-Pfad an, und Admin-/Jahresdaten-Loads erzeugen keine ungefangenen Promise-Fehler mehr.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/Utilities/decodeAccessToken.test.ts test/Utilities/FetchRetry.test.ts test/Login.LadeUserDaten.test.ts` → `Dateien: 3 ✓ 3 bestanden`; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint && bun run build` erfolgreich (nur bestehende Sass-Deprecation-Warnungen).

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

## Aktueller Plan: Passkey-Signup und Login-Modal-UX

- [x] Gemeinsamen Passkey-Registrierungshelper für Einstellungen und Signup zentralisieren
- [x] Login-Modal mit klarer Gruppierung für primären Login, Passkey-Alternative und Hilfsaktionen überarbeiten
- [x] Signup-Flow um optionalen Passkey-Schritt mit sauberem Skip-/Retry-Verhalten ergänzen
- [x] Relevante Frontend-Tests für Signup- und Modal-Pfade ergänzen
- [x] Lint, Build und gezielte Auth-/Passkey-Tests erneut ausführen

## Review (Passkey-Signup und Login-Modal-UX)

- Ergebnis: Nach erfolgreicher Registrierung kann jetzt direkt optional ein Passkey eingerichtet werden; technische Fehler bieten einen Retry an, während Skip oder Abbruch den Loginabschluss nicht blockieren. Das Login-Modal trennt die primäre Anmeldung, die Passkey-Alternative und Hilfsaktionen jetzt klarer.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/Login.loginWithPasskey.test.ts test/Login.checkNeuerBenutzer.test.ts test/Login.createModalLogin.test.ts` → `Dateien: 3 ✓ 3 bestanden`; `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint && bun run build` erfolgreich.

## Aktueller Plan: Logout-Events verdrahten

- [x] `logoutUser` um typisierten Logout-Grund erweitern und `user:logout` publizieren
- [x] Logout-Aufrufstellen fuer `manual`, `token-expired` und `version-mismatch` auf den neuen Grund migrieren
- [x] Logout-Tests um Event-Assertions erweitern und relevante Frontend-Checks ausfuehren

## Verifikationskriterien (Logout-Events)

- `logoutUser` publiziert bei jedem Logout `publishEvent('user:logout', { reason })`
- `auth:failure` triggert `logoutUser` mit `reason: 'token-expired'`
- Versionsmismatch in `main.ts` triggert `logoutUser` mit `reason: 'version-mismatch'`
- Relevanter Logout-Test, TypeScript-Check und Lint laufen fehlerfrei

## Review (Logout-Events)

- Ergebnis: Die Event-Deklaration `user:logout` ist jetzt zur Laufzeit verdrahtet. `logoutUser` publiziert den Logout-Grund zentral, und die drei Kernpfade (manuell, token-expired, version-mismatch) setzen den Grund explizit.
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/Einstellungen.logoutUser.test.ts`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run lint`.

## Aktueller Plan: Cookie-Check als Gate-Sequenz modellieren

- [x] `cookie-check` aus `SESSION_RESTORE_SEQUENCE` herausloesen und als eigenen Decision-Step modellieren
- [x] Abhaengigkeiten so setzen, dass `cookie-check` nach `boot:auth` entweder zu Session-Restore oder Login fuehrt
- [x] Session-Restore-/InitSequence-Tests sowie TypeScript-Check auf die neue Gate-Logik anpassen

## Verifikationskriterien (Cookie-Gate)

- `SESSION_RESTORE_SEQUENCE` startet nach `cookie-check` statt den Check selbst zu enthalten
- `LOGIN_INIT_SEQUENCE` haengt ebenfalls am `cookie-check`
- Runtime markiert den Check im Auth-Startpfad als eigenen Step (`auth-gate`)
- Relevante Tests und `bunx tsc --noEmit -p tsconfig.json` laufen erfolgreich

## Review (Cookie-Gate)

- Ergebnis: Der Cookie-/Storage-Check ist jetzt ein expliziter Gate-Schritt (`cookie:check`), der fachlich vor der Verzweigung liegt. Dadurch ist das Modell korrekt: `cookie-check -> SESSION_RESTORE_SEQUENCE` (bei vorhandener Session) oder `cookie-check -> LOGIN_INIT_SEQUENCE` (Idle/Login-Pfad).
- Verifikation: `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/Login.sessionRestore.test.ts test/orchestration/initSequence.test.ts`, `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json`.
