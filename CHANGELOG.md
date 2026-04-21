# Changelog (Frontend)

Dieses Changelog dokumentiert Aenderungen im Frontend.

## 2026-04-21

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
