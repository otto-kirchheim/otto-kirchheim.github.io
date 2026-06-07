# Changelog (Frontend)

Dieses Changelog dokumentiert Aenderungen im Frontend.

## 2026-06-07

### feat

- **BZ-Referenz als Array (`bereitschaftszeitraumBE: string[]`):** `IDatenBE.bereitschaftszeitraumBE` ist jetzt ein Array aller beteiligten BZ-IDs (1 oder 2 Elemente wenn ein Einsatz die 08:00- oder Monatsgrenze kreuzt). `fieldMapper.ts` liest/schreibt das Array korrekt; `changeTracking.ts` nimmt das Feld in die Signatur auf.
- **`resolveGap` in `submitBereitschaftsEinsatz.ts`:** Neue Logik zur Lückenauflösung: Enthält die Lücke keine 08:00- oder Monatsgrenze → Merge (eine BZ bleibt). Enthält sie eine Grenze → Boundary-Split (beide BZs werden auf die Grenze angepasst).
- **Monatsgrenze als Split-Punkt in `calculateBereitschaftsZeiten.ts`:** `vorhandenCheck` splittet neue Zeiträume jetzt auch an Monatsgrenzen (00:00 am 1.). `MAX_DEPTH` von 3 auf 5 erhöht.
- **Async Submit + Force-Save:** `submitBereitschaftsEinsatz` ist jetzt `async`. Nach BZ-Anlage/-Anpassung wird `flushResource('BZ')` abgewartet, damit echte MongoDB-IDs vor dem BE-Speichern verfügbar sind. `flushResource` aus `autoSave.ts` exportiert.
- **UUID/Reconciliation entfernt:** `reconcilePendingBzRefsInBE` aus `autoSave.ts` entfernt. UUID-Filterblock in `savePipeline.ts` entfernt. `omitKeys`-Zeile für `bereitschaftszeitraumBE` in `changeTracking.ts` entfernt. `isSameBereitschaftsEinsatz` ohne BZ-Ref-Vergleich.
- **`createEditorModalBereitschaftsEinsatz.tsx`:** BZ-Ref-Zuweisung auf Array umgestellt; prüft ob beide BZs eine gespeicherte `_id` haben.
- **Nebengeld-Zulagen in Berechnung:** Monatsaggregation zaehlt jetzt Zulagen nach Payment-Hints (`F`, `A`, `B`, `C`, `C+A`, `C+B`, `C*9`, `SIPO`) und `generateTableBerechnung.ts` berechnet den Auszahlungsanteil ueber alle Kategorien statt nur `040`.
- **Einstellungen-Zulagen-UI aktiviert:** Das Zulagen-Accordion in `index.html` ist nicht mehr auskommentiert und wird wieder angezeigt.
- **Modal-Basis um Fehlerbanner erweitert:** `MyFormModal`/`MyDivModal` unterstuetzen `errorMessage` (via `TMyModal`) fuer konsistente, sichtbare Formularfehler innerhalb des Modals.

### test

- `Bereitschaft.submitBereitschaftsEinsatz.test.ts`: Alle Calls auf `await` umgestellt; `bereitschaftszeitraumBE`-Assertions auf `string[]`. Neue Tests: zwei-BZ-Coverage (Array mit 2 IDs), Gap-Merge, Gap-Boundary at 08:00, LRE1-Fenster. Storage-Kontaminierung durch eigenes in-memory `storageStore`-Map-Mock behoben. Timezone-korrekte BZ-Ranges für TZ=Europe/Berlin-Testumgebung.
- `changeTracking.test.ts`: Test für `bereitschaftszeitraumBE` von „omits" auf „includes" geändert (Feld nicht mehr ausgeblendet).
- `Berechnung.aktualisiereBerechnung.test.ts` erweitert, damit die neue Zulagen-Kategorienaggregation in der Monatsberechnung abgesichert ist.

### refactor

- `confirmDialog.ts` nutzt jetzt einen direkten Bootstrap-`Modal`-Import statt Laufzeit-Fallback ueber `window.bootstrap`.
- `MyInput.tsx` erweitert um `step` sowie `data-zulage-input-code` fuer die dynamischen Zulagen-Inputs.

### fix

- Download-POSTs (`bereitschaftszeitraum/download`, `einsatzwechseltaetigkeit/download`, `nebengeld/download`) senden jetzt ebenfalls den Header `x-client-version`. Damit greifen Version-Gate-Checks konsistent wie bei regulären API-Calls und vermeiden falsche `426 Upgrade Required`-Antworten trotz aktueller App-Version.
- `auth/logout` sendet jetzt ebenfalls `x-client-version`, damit die neue Backend-Versionprüfung konsistent für alle geschützten API-Requests gilt.
- `CustomSnackbar.css`: Layout auf kleinen Viewports verbessert (flex-wrap, saubere Action/Close-Anordnung), damit lange Meldungen und Actions nicht ueberlappen.

## 2026-06-06

### feat

- **BZ-BE-Race-Condition-Schutz (berZeit-Button):** Neue BZs, die über den berZeit-Button angelegt werden, erhalten sofort eine lokale UUID als `_id`. Die BE-Verknüpfung (`bereitschaftszeitraumBE`) wird auf diese UUID gesetzt. Nach dem BZ-AutoSave reconciliert `reconcilePendingBzRefsInBE` in `autoSave.ts` die UUID zur echten MongoDB-`_id` und löst einen nachgelagerten BE-AutoSave aus. BE-Creates mit noch nicht aufgelöster UUID-Referenz werden in `savePipeline.ts` zurückgehalten, bis die Reconciliation abgeschlossen ist. Verhindert die Race Condition, bei der ein BE ohne gültige BZ-Referenz gespeichert wurde.
- `submitBereitschaftsEinsatz.ts`: `berZeit`-Block weist neuen BZ-Rows vor dem AutoSave `_clientRequestId = lokalUUID` vor, damit AutoSave dieselbe UUID als `clientRequestId` ans Backend sendet und die Reconciliation eindeutig matchen kann.
- `createAddModalBereitschaftsEinsatz.tsx` / `createEditorModalBereitschaftsEinsatz.tsx`: Checkbox-Label auf „Bereitschaftszeitraum für diesen Einsatz anlegen?" aktualisiert (Hinweis auf LRE3-Außerhalb/Einsatz über BZ-Grenzen).

### fix

- `submitBereitschaftsEinsatz.ts`: Auto-Extension der BZ beim BE-Submit entfernt. BEs, die über BZ-Grenzen hinausgehen, werden nun mit einer klaren Warn-Snackbar abgelehnt statt die BZ still zu erweitern. Erweiterung erfolgt ausschließlich über den berZeit-Button.

- `errorHandling.ts`: Bestehendes Error-Modal wird erweitert statt ein zweites gestapeltes Modal zu erzeugen. `showErrorDialog` prüft via `[data-error-dialog].show`, ob bereits ein sichtbarer Dialog offen ist, und hängt neue Einträge mit aktualisiertem Zähler daran – kein zweites Bootstrap-Modal.

### fix

- `savePipeline.ts`: `collectRowErrorMatches` schloss Zeilen mit `_state='error'` fälschlicherweise aus der Index-basierten Zuordnung aus. Error-Rows mit `_errorState='new'` bzw. `_errorState='modified'` werden jetzt korrekt in `newRows`/`modifiedRows` mitgezählt. Dadurch bleibt die Fehlermarkierung bei einem wiederholten AutoSave (z.B. nach Löschen einer anderen Fehlerzeile) erhalten.
- `errorHandling.ts`: `aria-hidden`-Warnung beim Schließen des Error-Modals behoben. Fokus wird im `hide.bs.modal`-Event aus dem Modal herausbewegt, bevor Bootstrap `aria-hidden="true"` setzt.

### test

- `test/Utilities/savePipeline.test.ts`: Zwei neue Testfälle für `collectRowErrorMatches` – Index-Matching für `_state='new'`-Rows sowie für Error-Rows mit `_errorState='new'` (Re-Save-Szenario).

## 2026-05-31

### feat

- `FetchRetry.ts`: sendet `x-client-version`-Header mit der aktuellen App-Version. Liest beim Server-Probe `min_frontend_version` aus der `/api/v2/`-Antwort und setzt bei veralteter Version ein globales `versionOutdated`-Flag. Alle weiteren API-Requests werden sofort ohne Netzwerkzugriff blockiert. 426-Antworten setzen das Flag ebenfalls (Fallback). Der Hook `app:version-outdated` wird in beiden Fällen genau einmal ausgelöst.
- `hookRegistry.ts`: `HookMap` um `app:version-outdated` erweitert.
- `setVersionOutdated.ts` (neu): Persistente Warning-Snackbar mit „Jetzt aktualisieren"-Button (löst SW-Update + Reload aus), deaktiviert alle `[data-disabler]`-Buttons – analog zu `setOffline`.
- `main.ts`: Hook `app:version-outdated` ruft `setVersionOutdated(updateSW)` auf; `updateSW` wird aus `registerSW` gespeichert.

### refactor

- Download-Assembly (`infrastructure/data/download.ts`): Nebengeld-Modus sendet jetzt `Zulagen: [{ Typ, Wert }]` statt `Anzahl040`, passend zum neuen Backend-Format.
- `persistTableData.ts`: Jahr < 2024 Fallback-Block für Nebengeld entfernt; nur noch ab 2024 relevante Daten werden persistiert.
- Tests in `test/Utilities/download.test.ts` und `test/Neben.saveTableDataN.test.ts` auf neues Format angepasst.

### fix (Tests)

- `calculateBereitschaftsZeiten.ts`: DST-sichere Iteratoren (`.add(1,'day').startOf('day')`), LRE1-Blockierung, 08:00-Fensterfixe via `B_WECHSEL_STUNDE/MINUTE`.
- `test/Bereitschaft.test.ts`: Snapshot-Dateien mit `TZ=Europe/Berlin` neu generiert; `daten` für Duplikat-Check auf CEST-basierte UTC-Timestamps korrigiert.
- `test/Bereitschaft.utils.extra.test.ts`: Assertion für `#nachtschicht`-Sichtbarkeit auf `.not.toBe('none')` aktualisiert (Quelle: `''` statt `'flex'` nach Zyklus-10-Änderung).
- `test/Einstellungen/zulagenCatalog.test.ts`: `ZulageEntryUnit.Unklar`-Referenz auf `ZulageEntryUnit.Stueck` umgestellt (Enum-Umbenennung in Quelle).
- `test/Utilities/fieldMapper.test.ts`: `zulagenAnzeigeN`-Erwartung auf neues Format `'040 Fahrentsch. × 3'` aktualisiert (Quelle: `shortLabel` statt `label`, `×` statt `x`).

## 2026-05-12

### refactor

- `ZULAGEN_CATALOG` in `src/ts/features/Einstellungen/utils/zulagenCatalog.ts` um fachliche Kategorien erweitert: `Erschwerniszulage` (Codes 811-846), `LeistungspramieUndFahrentschaedigung` (aktuell nur Code 040) und `Ganzkoerperreinigung` (Code 218).
- Kategorie-Limits zentral als `ZULAGEN_CATEGORY_MAX_SELECTIONS` eingefuehrt: max 7, 3 bzw. 1 gleichzeitige Auswahl je Kategorie.
- Katalog um Code 218 (Ganzkoerperreinigung) erweitert; zuvor ergänzte Leistungsprämien-Codes 871-884 wieder entfernt.
- Tests in `test/Einstellungen/zulagenCatalog.test.ts` auf neue Struktur und Kategorie-Limits angepasst.
- Fachliche Eingaberegeln fuer Zulagen jetzt zentral im Katalog hinterlegt (Einheit, max. pro Tag, Mindestdauer, Exklusivregel fuer 839, offener Status fuer 218) und nur fuer Validierung/Berechnung vorgesehen, nicht fuer die Anzeige in der Einstellungen-UI.
- Nebenbezuege von 040-only auf generisches Zulagenmodell erweitert: `IDatenN` enthaelt jetzt zusaetzlich `zulagenN` (persistierte Werte pro Tag) und `zulagenAnzeigeN` (formatierte Tabellenanzeige), inklusive Legacy-Hydration aus `anzahl040N`.
- Neben-Add/Edit/Show nutzt jetzt dynamische Zulagenfelder auf Basis der konfigurierten Zulagen in den Einstellungen; Eingaben werden ueber zentrale Regeln validiert (u.a. Mindestdauer, Kategorie-Exklusivregel fuer 839).
- Neben-Tabelle zeigt statt fixer 040-Spalte nun eine generische Zulagen-Zusammenfassung.
- Field-Mapping fuer Nebengeld auf generische Backend-Zulagenlisten umgestellt (`Zulagen[]` <-> `zulagenN`), inklusive Rueckwaertskompatibilitaet fuer bestehende lokale 040-Daten.
- Tests erweitert/angepasst in `test/Utilities/fieldMapper.test.ts`, `test/Neben.addNebenTag.test.ts`, `test/Neben.test.ts` sowie neue Datei `test/Neben.zulagen.test.ts`.

## 2026-05-01

### feat

- Biometrie-Accordion wird jetzt fuer eingeloggte Nutzer immer angezeigt, unabhaengig vom WebAuthn-Support des aktuellen Browsers. Sichtbarkeit und Nutzbarkeit sind damit getrennt: Der Einrichten-Button ist deaktiviert, wenn der Browser kein WebAuthn unterstuetzt; vorhandene Passkeys (von anderen Geraeten) werden trotzdem geladen und readonly angezeigt. Statustext erklaert die jeweilige Einschraenkung kontextsensitiv.
- WebAuthn-Capability-Pruefung in `Einstellungen/index.ts` auf `browserSupportsWebAuthn()` aus `@simplewebauthn/browser` vereinheitlicht (war zuvor `typeof PublicKeyCredential === 'undefined'`).

## 2026-05-01

### fix

- AutoSave-Race-Condition behoben: Wenn waehrend eines laufenden Saves neue oder geaenderte Zeilen entstehen, werden diese jetzt als nachlaufende Aenderungen vorgemerkt und nach Abschluss des aktuellen Saves automatisch in einem Folge-Save uebertragen.
- Regressionstest in `test/Utilities/autoSave.test.ts` ergaenzt, der den Save-while-saving-Ablauf absichert.

### refactor

- `storageAvailable` in `src/ts/infrastructure/storage/storageAvailable.ts` vereinfacht: Quota-Error-Erkennung zentralisiert und redundante Bedingungen in der Catch-Logik entfernt, ohne Verhaltensaenderung.

## 2026-04-25

### fix

- TypeScript-Fehler in den Testdateien behoben, indem veraltete Typ-Importpfade von `src/ts/interfaces` auf die aktuelle Barrel-Struktur `src/ts/core/types` migriert wurden. Dadurch laeuft der Frontend-Typecheck wieder ohne Fehler.

## 2026-04-24

### fix

- Bug behoben: Undo-Delete hat wiederhergestellte Zeilen nicht in localStorage persistiert. `scheduleAutoSave` schrieb localStorage nur bei tatsaechlichen Backend-Aenderungen (create/update). Jetzt wird localStorage auch im No-Change-Pfad synchronisiert, sodass Zeilen nach Undo-Delete beim naechsten F5 nicht mehr als geloescht erscheinen.

## 2026-04-24

### refactor

- Alle `any`-Typen aus dem TypeScript-Code entfernt: `CustomTableTypes` von `Record<string, any>` auf `Record<string, unknown>` umgestellt, Parser-Signaturen auf `T[keyof T]`/`unknown` typisiert, Parser-Implementierungen mit internen Type-Assertions aktualisiert. `createOnChangeHandler` generisch gemacht, `MyShowFooter` als generische Funktionskomponente umgeschrieben, `sendBulk`-Rückgabetyp auf `unknown[]` präzisiert.

## 2026-04-24

### refactor

- `MyInput` verwendet jetzt keinen props-basierten Ref-Snapshot mehr im Klassenfeld, sondern einen stabilen Fallback-Ref mit Getter auf den jeweils aktuellen effektiven Ref. Zusaetzlich werden Bootstrap-Popover bei `popover`- oder `myRef`-Aenderungen sauber neu synchronisiert.

## 2026-04-24

### fix

- TypeScript-Fehler in drei Testdateien behoben: doppelte `_id`-Zuweisung in `Neben.syncEwtToNeben.test.ts` entfernt, unsicherer Row-Cast in `savePipeline.test.ts` auf `unknown`-Zwischencast angepasst und generischer `get<T>`-Aufruf in `storageStateStore.test.ts` typisiert.

### chore

- Prettier-Abweichungen in betroffenen Testdateien bereinigt (`adminApi`, `CustomSnackbar`, `generateEingabeMaskeEinstellungen`, `actAsStatus`, `apiService`, `passkeys`, `savePipeline`), sodass `format:check` wieder ohne Findings laeuft.

## 2026-04-26

### fix

- Die bisher nur deklarierte Event-Channel-Nachricht `user:logout` ist jetzt aktiv verdrahtet: `logoutUser` publiziert zentral `publishEvent('user:logout', { reason })` und unterscheidet die Gruende `manual`, `token-expired` und `version-mismatch`.
- `auth:failure` in `main.ts` mapped nun explizit auf `logoutUser({ reason: 'token-expired' })`; der Versionskonfliktpfad beim App-Update mapped auf `reason: 'version-mismatch'`.
- Init-Orchestrierung korrigiert: Der Cookie-/Storage-Check ist jetzt als eigener Gate-Step (`cookie:check` in `auth-gate`) modelliert und verzweigt fachlich korrekt entweder in `SESSION_RESTORE_SEQUENCE` oder `LOGIN_INIT_SEQUENCE`.

### refactor

- Zyklus 11 abgeschlossen: Ordnerstruktur bereinigt (`class/` + `interfaces/` + `utilities/` gelöscht, CSS co-located), TypeScript Path Aliases (`@/types`, `@/core`, `@/components`, `@/infrastructure`) eingerichtet und 324 Importstellen migriert, `apiService.ts` in `apiFetchHelper.ts` + `authApi.ts` + `dataApi.ts` aufgeteilt (Barrel bleibt), `VorgabenBWeekRangeEditor` und `adminUserListHelpers` aus Admin-Komponenten extrahiert.

### test

- **Coverage > 80 %** — Gesamt-Funktions-Coverage von 79.68 % auf **80.97 %** (84.67 % Zeilen) gehoben; 909 Tests / 90 Dateien, 0 Fehler.
- `test/core/bootstrap.test.ts` (NEU, 2 Tests): `registerAppStartTask` + `initializeAppBootstrap` (Sofort-Ausführung bei `readyState=complete`) und Idempotenz-Guard.
- `Login.saveUserDatenUEberschreiben.test.ts` (+1 Test): setFilter-Callbacks in `overwriteUserDaten.ts` direkt aufgerufen → Datei jetzt 100 % Funcs / 100 % Lines.
- `changeMonatJahr.test.ts` (+2 Tests): setFilter-Callbacks für Monatwechsel- und Jahreswechsel-Pfad aufgerufen → Datei jetzt 100 % Funcs / 100 % Lines.
- `Login.LadeUserDaten.test.ts` (+1 Test): `conflictReviewBannerMount`-Reset-Zweig (Zeilen 44–46 in `loadUserDaten.ts`) abgedeckt; Preact-`render(null, mount)` in happy-dom verifiziert.

## 2026-04-23

### fix

- **Letzter `no-deprecated`-Treffer im Test entfernt**: In `test/Login.LadeUserDaten.test.ts` wurde der deprecated `preact.render(...)`-Aufruf durch eine reine DOM-Vorbelegung des Mount-Containers ersetzt. Dadurch meldet ESLint keinen `@typescript-eslint/no-deprecated`-Fehler mehr fuer diesen Test.
- **ESLint no-deprecated stabilisiert**: In `eslint.config.js` wurde typed linting fuer TypeScript-Dateien aktiviert (`parserOptions.projectService`, `tsconfigRootDir`), und `@typescript-eslint/no-deprecated` wird nur noch fuer `**/*.ts`/`**/*.tsx` angewendet. Dadurch tritt der bisherige Laufzeitfehler "requires type information" nicht mehr auf; verbleibende Treffer werden als regulaere Lint-Fehler ausgewiesen.

- **XSS-Härtung bei Fehlerausgaben**: In `createModalForgotPassword.tsx`, `createModalResetPassword.tsx`, `checkNeuerBenutzer.ts` und `checkPasswort.ts` wurde `errorMessage.innerHTML = msg` durch `errorMessage.textContent = msg` ersetzt, damit Fehlermeldungen nicht als HTML interpretiert werden. In `checkNeuerBenutzer.ts` wurde außerdem die Snackbar-Fehlernachricht auf einen statischen Text umgestellt, statt rohe Exception-Texte zu interpolieren.
- **showModal**: Reihenfolge in `showModal.ts` korrigiert — `render(null, modal)` wird jetzt vor `modal.innerHTML = ''` aufgerufen. Vorher: `innerHTML = ''` löschte DOM-Nodes, bevor Preact seinen VNode-Baum aufräumen konnte, was dazu führte, dass jedes Öffnen eines Modals eine zusätzliche Function Component in den Preact DevTools akkumulierte (Unmount schlug still fehl, da DOM-Nodes bereits entfernt waren).

### refactor

- Legacy `publishDataChanged()` und `onDataChanged()` vollständig entfernt. Alle 6 Produktionsdateien (`persistTableData`, `persistEwtTableData`, `submitBereitschaftsEinsatz`, `submitBereitschaftsZeiten`, `recalculateEwtMonat`, `overwriteUserDaten`) rufen jetzt direkt `publishEvent('data:changed', ...)` auf. `publishDataChanged`/`onDataChanged` aus `appEvents.ts` und dem Core-Barrel gelöscht.

### test

- **CustomSnackbar.test.ts**: Von 4 auf 51 Tests erweitert — alle Switch-Branches (9 Status-Farben via `it.each`, 8 Positionen, 8 benannte Icons + Sonderzeichen), Action-Handling (Funktion + dismiss, nur Funktion, mehrere Actions), dismissible, fixed, speed, innerHTML-Message, Timeout-Auto-Close, Container-Reuse.
- Neue Testdateien: `test/core/auth/requestVerificationMail.test.ts` (3 Tests: explizite E-Mail, Storage-Fallback, leere E-Mail → undefined), `test/core/auth/loadUserDaten.helpers.test.ts` (13 Tests: `rowMatchesMonth` für alle 4 Ressourcen, Monat 0, unbekannter Name, null-Zeile).
- `featureLifecycle.test.ts`: 5 neue Tests — `getFeature` (vorhanden/unbekannt), `initializeAll` wirft weiter, `teardownAll` schluckt Fehler, `invokeOnError` fängt Handler-Fehler ab, `invokeOnError` ohne Hook.
- `logoutUser.test.ts`: 2 neue Branches — `#start-tab` ist kein Button → kein Tab-Call; fehlendes `#Willkommen` → kein Wurf.
- `holidayRegion.test.ts`: 8 neue Tests für `setupBundeslandAutoFill` — Auto-Fill wird blockiert wenn Wert bereits gesetzt, reagiert korrekt auf Select-Change-Events.
- **Migration**: Mock-Keys in 9 Testdateien von `publishDataChanged` auf `publishEvent` umgestellt (`EWT.persistEwtTableData`, `EWT.saveTableDataEWT`, `Login.saveUserDatenUEberschreiben`, `Login.LadeUserDaten`, `Neben.saveTableDataN`, `Bereitschaft.submitBereitschaftsEinsatz`, `Bereitschaft.submitBereitschaftsZeiten`). Doppelter `publishEvent`-Key-Bug in `Login.LadeUserDaten.test.ts` behoben.
- Gesamt: 814 Tests / 83 Dateien (Ausgangspunkt: 734 Tests / 81 Dateien, +80 Tests, +2 Dateien).
- **Phase T.11** — 5 neue Testdateien für bisher ungetestete `.ts`-Dateien mit 0 % Function-Coverage: `profileTemplates.shared.test.ts` (17 Tests: `normalizeVorgabenBRows` Renummerierung/Standard-Logik/Bounds, Konstanten), `passkeys.test.ts` (13 Tests: `getPasskeyErrorMessage`, `guessPasskeyDeviceName`, `registerPasskeyWithResult` Full-Flow), `registerPasskey.test.ts` (4 Tests: Wrapper-ok/cancelled/unsupported/error), `generateEingabeMaskeEinstellungen.test.ts` (21 Tests: `formatDelayLabel`, `sliderPositionToMs`, `msToSliderPosition`, Roundtrip), `changeMonatJahr.test.ts` (20 Tests: DOM-Pflichtfelder, Jahr/Monat-Änderungslogik, Tabellen-Filter-Calls, Online/Offline-Branches). Gesamt: 889 Tests / 88 Dateien (+75 Tests, +5 Dateien).

## 2026-04-21

### test

- **Phase T.1** (51 Tests): storageStateStore, normalizeResourceRows, syncEwtToNeben, savePipeline.unlinkNebengeldRefsForDeletedEwtIds, actAsStatus-Branches (pure logic, kein DOM).
- **Phase T.2** (19 Tests): confirmDialog (Bootstrap-Fallback + Modal-Lifecycle), autoSaveIndicator (Badge-Lifecycle, Status-Übergänge, online/offline, destroy), saveEinstellungen (Tabs, Zulagen, AutoSave, fZ-TODO).
- **Phase T.3** (33 Tests): apiService – alle Passkey-Auth-Methoden + forgotPassword/resetPassword/resendVerificationEmail. Neues `test/Admin/adminApi.test.ts`: fetchAdminUsers, fetchCurrentAdminCapabilities (4 Rollen-Branches), Vorgaben-API, Profile-Templates-API.
- **Phase T.4** (7 Tests): loadUserDaten – "Serverdaten übernehmen"- und "Lokale Daten behalten"-Actions. submitBereitschaftsZeiten – Offline-Jahreswechsel-Snackbar + Online-Jahreswechsel (API + Bulk-Fehler). submitBereitschaftsEinsatz – LRE-1-Duplikat-Warnung + berZeit-bereits-vorhanden-Pfad.
- Gesamtstand: 734 Tests, 81 Dateien (Ausgangspunkt: 643 Tests, 76 Dateien).

### chore

- Test-Runner auf natives `bun test --isolate` umgestellt (Bun v1.3.13). `scripts/run-bun-tests.ts` (custom Hybrid-Runner) entfernt. `package.json`: `test`, `dev-test`, `coverage` nutzen jetzt `--isolate`; `test:serial-reset` und `test:concurrent` entfernt. `test/setupBun.ts`: redundante Top-Level-Resets entfernt (frisches Global pro Datei via `--isolate`).

## 2026-04-19

### fix

- Jahreswechsel-Bug: Bei Wechsel des Jahres (z. B. 2025 → 2026) zeigte `loadUserDaten` fälschlicherweise "Unterschiede erkannt", weil lokale Storage-Daten des alten Jahres mit Server-Daten des neuen Jahres verglichen wurden. Fix: `syncLoadedYearResources` überspringt bei Jahreswechsel die Vergleichslogik und übernimmt Server-Daten direkt.

### test

- Neue Testdateien: `Berechnung.aktualisiereBerechnung.test.ts` (11 Tests: BZ/BE/EWT/N-Aggregation, LRE-Zählung, Abwesenheits-Buckets, Storage-IO), `changeTracking.test.ts` (20 Tests: stableSerialize, rowSignature, mapCreatedIds), `errorHandling.test.ts` (11 Tests: escapeHtml, markErrorRows, showErrorDialog), `appEvents.test.ts` (6 Tests: publish/subscribe, unsubscribe, legacy bridge, channel isolation).
- Neue Testdatei: `savePipeline.test.ts` (11 Tests: collectRowErrorMatches clientRequestId/id-Match, Fallback, Multi-Error; applyServerRowsToTable Server-Sync, Skip deleted/no-id).
- `addressValidation.test.ts` um 17 Tests erweitert: PNummer, Telefon, Bundesland, TB, Distance-Range, leere Pflichtfelder, optionales Adress2, Umlaute, PLZ-Validierung.
- `changeTracking.test.ts` um 7 Tests erweitert: buildCreatePayloadWithClientRequestId (assign/reuse/generate), mapServerDocToFrontend (BZ/BE/EWT/N Backend→Frontend).
- Neue Testdatei: `getMonatFromItem.test.ts` (14 Tests: BZ/BE/EWT/N Monatsextraktion, isEwtInMonat 3 Modi, getMonatFromN Fallback-Pfade, filterByMonat).

### refactor

- Refaktor-Zyklus 9 Phase 9.5: Admin-Registration aus `main.ts` inline in `registerAdminFeature()` Factory-Funktion (`Admin/index.tsx`) verschoben. Dead Code `featureBootstrap.ts` entfernt (nie importiert, Lifecycle-Hooks von keinem Feature genutzt).
- Refaktor-Zyklus 10: EWT→Neben Cross-Feature-Entkopplung via Event-Bus. `persistEwtTableData` ruft nicht mehr direkt `syncNebengeldTimesFromEwtRows` auf, sondern publiziert `ewt:persisted` Event. Neben subscribt via `onEvent('ewt:persisted')`. `syncEwtToNeben.ts` von `orchestration/` nach `features/Neben/utils/` verschoben. `orchestration/`-Verzeichnis (Top-Level) aufgelöst. Dead Code `registerAdminFeature()` Factory aus `Admin/index.tsx` entfernt.
- Refaktor-Zyklus 9 Phase 9.2: AutoSave Event-Driven Decoupling. `createOnChangeHandler` publiziert nur noch `data:changed` Event (kein direkter `scheduleAutoSave`-Aufruf mehr). AutoSave subscribt über `initAutoSaveEventListener()` auf `data:changed` Events. Externe `scheduleAutoSave`-Aufrufe in `syncEwtToNeben`, `overwriteUserDaten` und `loadUserDaten` durch `publishEvent` ersetzt.
- Refaktor-Zyklus 9 Phase 9.3: Berechnung von Hook-basiertem Trigger (`post-save`) auf Event-Subscription (`data:changed`) umgestellt. `post-save` Hook komplett entfernt (HookMap, main.ts, autoSave.ts). autoSave publiziert nach Save jetzt `publishEvent('data:changed')`. Legacy `publishDataChanged()` bridged automatisch zum typed Event-System. Berechnung reagiert nur noch über `onEvent('data:changed')` — kein Doppel-Trigger mehr.
- Refaktor-Zyklus 8 Phase 8.1: `autoSave.ts::createOnChangeHandler()` publiziert `data:changed` Event via `publishEvent()` — ermöglicht anderen Modulen, auf Datenänderungen zu reagieren.
- Refaktor-Zyklus 8 Phase 8.2-8.5: Login von `features/Login/` nach `core/orchestration/auth/` verschoben (18 Dateien). Login war kein datengetriebenes Feature (kein CustomTable), sondern Auth-Orchestrierung. Jetzt korrekt in der core-Schicht. `features/Login/` komplett entfernt.
- Refaktor-Zyklus 6 Phase 6.1: `infrastructure/data/resourceConfig.ts` zentralisiert `RESOURCE_STORAGE_MAP` und `RESOURCE_TABLE_ID_MAP`. `persistTableData.ts` ersetzt 3 triviale Feature-Wrapper (BZ/BE/N). `persistEwtTableData.ts` von `features/EWT/utils/` nach `infrastructure/data/` verschoben. Feature-Barrel-Exporte mit Inline-Wrappern angepasst.
- Refaktor-Zyklus 6 Phase 6.2: `autoSave.ts` von 922 LOC auf ~300 LOC reduziert. Extrahiert: `changeTracking.ts` (Signaturen, clientRequestId, ID-Mapping), `savePipeline.ts` (findTable, sendBulk, applyServerRows, unlinkNebengeldRefs), `errorHandling.ts` (markErrorRows, showErrorDialog). Keine Breaking Changes.
- Refaktor-Zyklus 6 Phase 6.3: Legacy-`setDisableButton.ts` (hardcodierte Button-IDs) entfernt. `changeMonatJahr.ts` nutzt jetzt `buttonDisable` (data-disabler-Pattern). Barrel-Exporte bereinigt.
- Refaktor-Zyklus 6 Phase 6.4: Neues `infrastructure/ui/confirmDialog.ts` als async Bootstrap-Modal-Ersatz fuer `window.confirm()`. Alle 6 Stellen umgestellt: Admin (VorgabenEditor, UserList, ProfileTemplatesManager), Einstellungen (Passkey-Entfernung), Login (Passkey-Setup + Retry).

### test

- Refaktor-Zyklus 5 Phase 5.1: Admin-Feature via `featureLifecycleRegistry` isoliert. Direkte `mountAdminTab()`/`unmountAdminTab()`-Aufrufe aus `userLoginSuccess.ts` und `logoutUser.ts` entfernt; stattdessen `featureLifecycleRegistry.initializeAll()` und `teardownAll()`. Admin-Feature wird in `main.ts` mit Lazy-Import registriert.
- Refaktor-Zyklus 5 Phase 5.2: Hook-Registry-Pattern eingefuehrt (`src/ts/core/hooks/hookRegistry.ts`). Die 4 Module-Setter (`setAuthFailureHandler`, `setOnReconnectHandler`, `setPostSaveHandler`, `setCollectSettingsHandler`) wurden durch typsicheres `registerHook<K>()` / `invokeHook<K>()` ersetzt. `main.ts` registriert alle 4 Handler zentral per `registerHook`.
- Refaktor-Zyklus 5 Phase 5.3: Login-Init-Sequenz explizit dokumentiert (`src/ts/core/orchestration/initSequence.ts`, `DEPENDENCIES.md`). Dependency-Graph und Hook-Bindings sind jetzt nachvollziehbar festgehalten.
- Refaktor-Zyklus 5 Phase 5.4: `FeatureLifecycleRegistry` mit erweiterten Lifecycle-Stufen (`beforeLoad`/`afterLoad`/`beforeSave`/`afterSave`/`beforeDelete`/`onError`) ausgestattet. Neue `featureBootstrap.ts` expose `notifyBeforeLoad`/`notifyAfterLoad` etc. als App-weite Einstiegspunkte fuer Feature-Lifecycle-Hooks.

### test

- `test/core/hooks/hookRegistry.test.ts` (6 Tests): registerHook/getHook/invokeHook/clearAllHooks-Abdeckung.
- `test/core/hooks/featureLifecycle.test.ts` (7 Tests): register/teardown/duplicate/lifecycle-stages/onError-Abdeckung.
- `test/orchestration/initSequence.test.ts` (4 Tests): Sequenz-Validierung und Dependency-Check.
- `test/features/Admin.lifecycle.test.ts` (4 Tests): Admin-Feature mount/unmount via Lifecycle-Registry.
- `test/Utilities/tokenErneuern.test.ts`, `setOffline.test.ts`, `autoSave.test.ts`, `saveDaten.test.ts`: auf `registerHook`/`clearAllHooks` umgestellt.

## 2026-04-18

### refactor

- Refaktor-Zyklus 3 Phase 1: Alle `new Date()`- und `Date.parse()`-Aufrufe in `src/ts/` durch dayjs-Aequivalente ersetzt (CLAUDE.md-Regel). Betroffen: `Neben/index.ts`, `Einstellungen/utils/changeMonatJahr.ts`, `utilities/getMonatFromItem.ts`, `Login/utils/loadUserDaten.sync.ts`, `utilities/autoSave.ts`, `utilities/saveDaten.ts`, `Admin/components/AdminVorgabenEditor.tsx`. Ausnahme: `autoSave.ts` `state.lastSaved = new Date()` (Typ `Date | null` im Interface).
- Refaktor-Zyklus 3 Phase 2: Dupliziertes Delete-Confirmation-Muster (~80 LOC) aus `Bereitschaft/index.ts`, `EWT/index.ts`, `Neben/index.ts` in generische Utility `utilities/confirmDeleteAllRows.ts` extrahiert. Neue Testdatei `test/Utilities/confirmDeleteAllRows.test.ts` (4 Tests).
- Refaktor-Zyklus 3 Phase 3: Wiederkehrende `Storage.get('Monat'/'Jahr')`-Doppelaufrufe in neue Utility `utilities/dateStorage.ts` (`getStoredMonatJahr`) zentralisiert. 10+ Call-Sites vereinfacht: `Admin/utils/actAs.ts`, `Login/index.ts`, `Einstellungen/utils/changeMonatJahr.ts`, `utilities/mergeVisibleResourceRows.ts`, `Neben/utils/getNebengeldDaten.ts`, `Bereitschaft/utils/getBereitschaftsZeitraumDaten.ts`, `Bereitschaft/utils/getBereitschaftsEinsatzDaten.ts`, `EWT/utils/getEwtDaten.ts`, `utilities/confirmDeleteAllRows.ts`. Neue Testdatei `test/Utilities/dateStorage.test.ts` (2 Tests).

- Refaktor-Zyklus 1 gestartet: neuer Core-Bereich fuer gemeinsame Frontend-Contracts eingefuehrt (`src/ts/core/types/api.ts`, `src/ts/core/state/*`, `src/ts/core/index.ts`) als Grundlage fuer entkoppelte Architektur und bessere Erweiterbarkeit.
- `apiService` verwendet den Backend-Envelope-Typ jetzt zentral aus dem Core statt einer lokalen Duplikat-Definition; funktionales Verhalten bleibt unveraendert.
- Envelope-Auswertung in der API-Schicht weiter vereinheitlicht: `unwrapEnvelope`/`ApiHttpResponse` im Core eingefuehrt und in `apiFetch` sowie `authApi.refreshToken` verwendet, um doppelte Response-Pruefungen zu entfernen.
- `authApi.refreshToken` laeuft jetzt ueber denselben `apiFetch`-Weg wie die restlichen API-Aufrufe; der bisherige Refresh-Sonderpfad in `apiService` entfiel.
- App-Startup zentralisiert: neue Core-Bootstrap-Registry (`registerAppStartTask`, `initializeAppBootstrap`) eingefuehrt und die bisherigen verteilten `window.load`-Listener in den Feature-Modulen auf die gemeinsame Start-Orchestrierung umgestellt.
- `loadUserDaten` modularisiert: wiederverwendbare Hilfsfunktionen fuer Session-Fehler, Datennormalisierung, `_id`-Repair sowie Monats-Matching in `Login/utils/loadUserDaten.helpers.ts` ausgelagert.
- `loadUserDaten` weiter aufgeteilt: Synchronisationsentscheidungen und Mismatch-Ermittlung in `Login/utils/loadUserDaten.sync.ts` zentralisiert (`syncLoadedYearResources`), um die Hauptfunktion auf Ablaufsteuerung zu fokussieren.
- Konfliktpfad von `loadUserDaten` weiter entkoppelt: Unterschiede gruppieren, Konfliktmeldung erzeugen sowie Row-Markierung/Reconcile liegen jetzt in `Login/utils/loadUserDaten.conflict.ts`.
- Refaktor-Zyklus 2 Phase 1: Alten `FetchRetry`-API-Pfad in `submitBereitschaftsZeiten.ts` durch typsicheres `bereitschaftszeitraumApi` ersetzt; `clientRequestId` via UUID ergaenzt.
- Refaktor-Zyklus 2 Phase 2: `document.querySelector` aus allen `utils/`-Funktionen entfernt (Parameter-Injection). Betroffen: `submitBereitschaftsZeiten`, `submitBereitschaftsEinsatz`, `addEwtTag`, `recalculateEwtMonat`, `persistEwtTableData`, `addNebengeldTag`. `syncNebengeldTimesFromEwtRows` als eigene Datei extrahiert.
- Refaktor-Zyklus 2 Phase 3: `aktualisiereBerechnung`-Direktimporte aus 8 `utils/`-Dateien entfernt; stattdessen `publishDataChanged`/`onDataChanged` aus neuem `core/events/appEvents.ts`. `Berechnung/index.ts` registriert sich als Empfaenger via `onDataChanged`. Ausnahme dokumentiert: `loadUserDaten.ts` (benoetigt Rueckgabewert).

### test

- Neue Testdatei `Bereitschaft.submitBereitschaftsEinsatz.test.ts` (7 Tests): fehlende Inputs, unbekannter LRE, kein BZ-Match, BZ-Luecke, BE-Ueberschneidung, erfolgreicher Add, berZeit-Checkbox-Pfad.
- Neue Testdatei `Bereitschaft.submitBereitschaftsZeiten.test.ts` (6 Tests): fehlende Inputs, Nacht-Anfang-Validierung, Nacht-Ende-Validierung, Duplikat-Warnung, Erfolg gleicher Monat, Monatsgrenze-Split (2 calculateBZ-Aufrufe).
- `EWT.addEWTtag.test.ts`: Duplikat-Check-Test ergaenzt (identischer Eintrag → Warn-Snackbar, kein Add/Persist).
- `Neben.addNebenTag.test.ts`: Duplikat-Tages-Check-Test ergaenzt (DD.MM.YYYY-Format; gleicher Tag → Warn-Snackbar, kein Add/Persist).

## 2026-04-17

### fix

- Login-Modal: Der Submit-Button (`Einloggen`) wird waehrend eines laufenden Login-Versuchs zusaetzlich deaktiviert und nach Abschluss (inklusive Offline-Fehlerfall) wieder aktiviert, damit doppelte Submits aus dem Modal verhindert werden.

## 2026-04-16

### fix

- `FetchRetry` liefert im Frontend jetzt wieder den kanonischen Backend-Envelope mit `success` statt eines abweichenden `status`-Flags; dadurch verarbeitet `authApi.refreshToken` erfolgreiche Refresh-Responses korrekt und loest keinen unnoetigen Logout mehr aus.
- `auth/logout` ist in `FetchRetry` nicht mehr als oeffentlicher Auth-Pfad klassifiziert, sodass die interne Pfadlogik wieder mit der durch `authenticate` geschuetzten Backend-Route uebereinstimmt.
- `FetchRetry` um einen Single-Flight-Safeguard fuer sensible Auth-Routen erweitert (`auth/login`, `auth/register`, `auth/forgot-password`, `auth/resend-verification-email`, `auth/verify-email`, Passkey-Login): parallele identische Requests werden zusammengefuehrt, um Doppelklick-/Race-Effekte zu vermeiden.
- Geschuetzte Requests pruefen Access-Tokens jetzt vor dem Request auf nahes Ablaufdatum und teilen sich einen gemeinsamen Refresh-Flight; dadurch werden parallele 401-/Logout-/Snackbar-Kaskaden bei abgelaufener Session deutlich reduziert.
- `authApi.refreshToken` nutzt jetzt ebenfalls `FetchRetry` statt eines separaten direkten `fetch`-Pfads und folgt damit denselben zentralen Netzwerk-Guards.
- Die temporaere `status`-Kompatibilitaet im `FetchRetry`-Envelope wurde wieder entfernt (Hard-Cut): der Frontend-Vertrag folgt jetzt konsequent dem Backend-Format mit `success`.
- `FetchRetry` setzt den Bearer-`Authorization`-Header jetzt nur noch auf geschuetzten Pfaden; oeffentliche Auth-Routen (inkl. `auth/reset-password/:token`) laufen ohne Access-Token-Header.
- `auth/resend-verification-email` wird in `FetchRetry` nicht mehr als oeffentlicher Auth-Pfad behandelt, sodass der Bearer-Header auf diesem geschuetzten Endpoint korrekt gesetzt wird.

### chore

- GitHub-Actions-Deploy-Workflow auf Node-24-Opt-in umgestellt (`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`), um Node-20-Deprecation-Warnungen bei `checkout/configure-pages/upload-pages-artifact/deploy-pages` zu vermeiden.
- Actions im Deploy-Workflow auf aktuelle Majors aktualisiert: `actions/checkout@v6`, `actions/configure-pages@v6`, `actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5`.

## 2026-04-15

### feat

- Bulk-Create nutzt jetzt eine stabile `clientRequestId` (`crid_<uuid>`), die bereits beim Anlegen neuer Tabellenzeilen vergeben und bei Save/Error-Zuordnung statt Indexen verwendet wird.
- Fehlerverarbeitung im AutoSave erweitert: Fehlerhafte Einträge vom Server werden nun in der Tabelle als `_state = 'error'` markiert und als modale Übersicht angezeigt (Ressource, Operation, Fehler-ID und Meldung). Nutzer können erneut speichern.
- Konfliktpfad zu "Lokale Daten behalten & pruefen" erweitert: Statt sofortigem AutoSave erscheint ein Review-Banner unterhalb der Navbar mit explizitem "Jetzt speichern".
- Waehrend der Review-Phase bleibt AutoSave deaktiviert; sowohl serverseitig zusaetzliche als auch lokal serverseitig fehlende Zeilen werden als geloescht markiert, und beim Speichern werden alle offenen Aenderungen inklusive Loeschungen synchronisiert; ein erneutes `loadUserDaten` setzt den Review-Status sauber zurueck.

### fix

- Nebenbezug-Editor: Bei ausgewaehlter EWT-Zuordnung ist das Tag-Feld (`tagN`) nun gesperrt; ohne Zuordnung bleibt es bearbeitbar.
- AutoSave/Bulk-Zuordnung ist nun sortierrobust: Fehler und erfolgreiche Creates werden über `clientRequestId` (create) bzw. `_id` (update/delete) gemappt, nicht mehr über flüchtige Request-Indizes.
- Bulk-Create-Vertrag geschärft: Frontend sendet bei neuen Zeilen verpflichtend `clientRequestId`; Requests ohne diese Kennung werden serverseitig abgelehnt.
- Error-Zeilen im AutoSave sind jetzt in `CustomTable` sichtbar hervorgehoben und behalten ihren eigentlichen Retry-State fuer create, update und delete, sodass fehlgeschlagene Eintraege beim naechsten Speichern nicht aus dem Change-Tracking fallen.
- Fehlerzeilen zeigen zusaetzlich ein rotes Error-Icon in der ersten Datenzelle, sodass problematische Eintraege auch beim schnellen Scrollen sofort erkennbar sind.
- Reload-/Konfliktlogik fuer Array-Laengen-Mismatches gehaertet: Sync erfolgt jetzt robust auch bei juengerem Lokalstand, Hinweise sind monatsgenau gruppiert, und lokale Daten werden erst nach expliziter Entscheidung ueberschrieben.
- Beide Konfliktoptionen markieren betroffene Ressourcen fuer den naechsten Sync; beim Pfad "Lokale Daten behalten" erfolgt das Markieren gezielt auf die betroffenen Monate.
- Die Deleted-Reconcile-Logik fuer lokale und serverseitige Zusatzzeilen wurde in eine gemeinsame Hilfsfunktion zusammengefuehrt, um den Review-Pfad konsistenter und wartbarer zu halten.
- Snackbar-Darstellung und Mobile-Lesbarkeit verbessert: responsive, stabile Action-Layouts, durchgaengige Statusleiste ueber volle Hoehe und konsistente Breiten-/Einrueckungslogik auch mit Icons.
- Runtime-Fehler in `CustomSnackbar` (Icon-Initialisierung) behoben.
- Wiederverwendbare Mindestbreiten-Utility fuer Actions konsolidiert (`u-min-w-120` in `styles.scss`).

## 2026-04-13

### docs

- Initiale Changelog-Datei fuer Frontend angelegt.

## 2026-04-13 (nachgetragen)

### feat

- VorgabenB-Modal auf 2-Wochen-Grid mit Desktop-Drag und Mobile-Start/Ende-Interaktion erweitert.
- Act-As-Status in der UI sichtbar gemacht und zentralen Ruecksprung auf eigene Daten im Admin ergaenzt.
- Passkey-UX ausgebaut: passwortloser Login, optionale Passkey-Einrichtung nach Signup und Passkey-Verwaltung in Einstellungen.

### fix

- BE-Editor blockiert beim Bearbeiten keine Selbst-Ueberschneidung mehr, auch wenn neben dem Datensatz mit `_id` noch eine alte lokale Kopie ohne `_id` vorhanden ist.
- EWT-Monatswechsel und Buchungstag-Logik stabilisiert (inklusive Nachtschicht-Faellen und Live-Sync in CustomTable).
- Regressionsfehler beim Speichern behoben, damit servernormalisierte Werte sofort im Frontend sichtbar sind.
- 401-Startlogik und Session-Handling gehaertet, um uncaught Promise-Fehler im App-Start zu vermeiden.
- Jahresdaten-Verlust bei EWT-Berechnung behoben, Monats-Updates werden in den geladenen Jahresbestand gemerged.

### chore

- Frontend-Testumgebung auf Bun test plus happy-dom migriert und Vitest/jsdom-Altlasten entfernt.
- TS-, Lint- und Prettier-Befunde bereinigt und relevante Regressionstests gruen verifiziert.
