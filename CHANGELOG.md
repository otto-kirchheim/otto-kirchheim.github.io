# Changelog (Frontend)

Dieses Changelog dokumentiert Aenderungen im Frontend.

## 2026-07-12

### fix (deps: TypeScript 7.0.2 → 6.0.3 — ESLint/Pre-Commit-Hook war komplett defekt)

- **`package.json`:** TypeScript von 7.0.2 auf 6.0.3 zurückgestuft (analog Backend). TS 7 hat noch keine stabile Programmier-API; `typescript-eslint` crashte beim Start und der Husky-Pre-Commit-Hook (lint-staged) blockierte damit jeden Commit. Re-Upgrade auf TS 7, sobald `typescript-eslint` die 7.1-API unterstützt.

### feat (E-Mail-unabhängige Verifikation & Passwort-Reset — Admin-Login-Hilfe + Passwort per Passkey)

Hintergrund: Der DB-Konzernfilter stuft die Verifikations-/Reset-Mails als Spam ein; beide Flows funktionieren jetzt auch ohne zugestellte Mail.

- **`createAdminUserLinksModal.tsx` (neu):** „Login-Hilfe"-Modal im Admin-Bereich — erzeugt pro Benutzer einen Verifikations- und/oder Passwort-Reset-Link (`issueVerificationLink`/`issuePasswordResetLink` in `Admin/utils/api.ts`). Neben „Link kopieren" gibt es „Text kopieren": ein fertiger deutscher Nachrichtentext (Anrede, Erklärung, Link, Gültigkeit 48h/2h) zum direkten Einfügen in DB-Outlook/Teams. Hinweise: Link wird nur einmal angezeigt; bei `mailSent === false` Warnung, dass der Mailversand fehlgeschlagen/deaktiviert ist. Bei bereits verifizierter E-Mail wird kein Verifikations-Link angeboten.
- **`AdminUserList.tsx`:** Neuer Link-Button (Icon `link`) neben dem Passwort-Button öffnet das Modal; in der Kompakt-Info zeigt ein Badge „E-Mail verifiziert / nicht verifiziert" (Tooltip: E-Mail-Adresse), damit Team-Admins sehen, wann ein Verifikations-Link nötig ist. `AdminUserRow` um `email`/`emailVerified` erweitert.
- **`createModalPasskeySetPassword.tsx` (neu) + `authApi.setPasswordWithPasskey()`:** „Passwort per Passkey neu setzen" in Einstellungen → Biometrie & Geräte — setzt ein neues Passwort ohne altes Passwort, bestätigt durch eine frische Passkey-Assertion (`POST auth/passkeys/set-password`). Andere Sitzungen werden abgemeldet, die aktuelle Session erhält frische Tokens. Der Button (`#btnPasswortPerPasskey` in `index.html`) ist nur sichtbar, wenn WebAuthn unterstützt wird und mindestens ein Passkey existiert.
- **Tests:** `adminApi.test.ts` um Link-Endpunkte und `email`/`emailVerified`-Mapping erweitert (27 Tests grün; Gesamtsuite 1263 Tests grün).

### refactor (Datumskonvention: dayjs statt nativer Date-API in den Admin-Komponenten)

- **`AdminDashboard.tsx`, `AdminLogBrowser.tsx`, `AdminResourceBrowser.tsx`:** Alle `new Date(...)`-Verwendungen (Chart-Zeitachsen via `getTime()`, Zeitstempel-Anzeige via `toLocaleString('de-DE', ...)`, UTC-Getter für Datum-only-Felder) durch `dayjs` aus `@/infrastructure/date/configDayjs` ersetzt (`valueOf()`, `format()`, `dayjs.utc()`); Anzeigeformate unverändert. Ungültige Werte werden jetzt per `isValid()`-Guard statt wirkungsloser `try/catch`-Blöcke abgefangen.
- **`configDayjs.ts`:** utc-Plugin ergänzt, damit Datum-only-Felder im Ressourcen-Browser weiterhin ohne Timezone-Versatz angezeigt/editiert werden (`dayjs.utc()` statt `getUTC*()`-Getter).

### fix (Admin-Dashboard: Ereignisliste zeigt alle Heap-Snapshots)

- **`AdminDashboard.tsx` (MemoryCard):** Die Ereignisliste zeigt jetzt alle History-Punkte inklusive periodischer Snapshots statt nur Startup/Shutdown/Snapshot-Ereignisse.

## 2026-07-11

### fix (Onboarding-Startschritt fokussiert persoenliche Daten wieder sofort)

- **`createOnboardingGuideModal.tsx`:** Der Startschritt (`intro`) oeffnet jetzt wieder direkt den Einstellungen-Tab und den Pers-Accordion-Bereich (`#collapseOne`). Damit bleibt das erwartete Verhalten stabil: Guide offen, gleichzeitig direkter Fokus auf die persoenlichen Daten.
- **`onboardingValidation.ts`:** `springeZu(...)` nutzt direkte Bootstrap-Imports (`Tab`, `Collapse`) statt asynchronem Dynamic-Import. Dadurch ist der Tab-/Accordion-Sprung im Onboarding-Effekt deterministischer und race-frei.
- **`onboarding.createOnboardingGuideModal.test.ts`:** Mock-Call-Pruefungen TS-sicher auf `.at(0)` umgestellt, damit der Frontend-Typecheck keine Tuple-Indexierungsfehler mehr meldet.

### feat (Ersteinrichtung als schwebendes Panel mit Validierung + Eingaberegeln in Tab-Hilfen)

- **`createOnboardingGuideModal.tsx` (Umbau):** Der Ersteinrichtungs-Guide ist kein Bootstrap-Modal mehr, sondern ein **schwebendes Panel** (`position: fixed`, Card-Optik, `z-index: 1040` unter Bootstrap-Modals, kein Backdrop/Scroll-Lock) — die App bleibt während der Ersteinrichtung voll bedienbar, Add/Edit-Modale öffnen über dem Panel, das geteilte `#modal`-Element bleibt frei. Ab 768px schwebt es unten rechts (26rem, neue SCSS-Klasse `.onboarding-panel`), auf xs/sm dockt es in voller Breite unten an; minimierbar über den Panel-Header.
- **Neue Schritt-Struktur:** Jeder Einstellungs-Schritt öffnet beim Aufrufen automatisch den zugehörigen Einstellungen-Bereich (Accordion) und hebt ihn visuell hervor (`.onboarding-focus`), sodass der Nutzer direkt dort vergleicht — keine separaten „Bereich öffnen"-Buttons. (1) _Persönliche Daten_ mit Hard-Gate — „Weiter" erst, wenn Vorname, Nachname, Personalnummer, Telefon und Wohnsitz 1 eingetragen sind; (2–4) _Arbeitszeit/Bereitschaft/Fahrzeiten_ werden direkt über den Weiter-Button bestätigt („Passt, weiter", kein separater „Ja, passt"-Klick); (5+) _Tab-Tour_ durch alle sichtbaren Tabs (Inhalte aus `getHelpContent`, keine Duplikate) ohne Gate; Abschluss mit Zusammenfassung. „Überspringen" beendet jederzeit. Keine E-Mail-Verifizierungs- oder Monatsdaten-Pflicht (DB-interne Mail-Restriktionen; Datenerfassung ist nicht Teil der Ersteinrichtung).
- **Textkorrekturen in der Tour:** Die Prüfschritte 2–4 sind jetzt kürzer formuliert, die Tab-Tour wechselt beim Schrittwechsel automatisch auf die jeweiligen Tabs und der überflüssige Button „Tab ansehen" entfällt. Im Berechnungsschritt wurde der falsche PDF-Hinweis entfernt; dort geht es jetzt nur noch um das Prüfen und Vergleichen der Monatswerte. Schritt 1 nutzt jetzt denselben Weiter-Mechanismus ohne separaten „Erneut prüfen"-Button, und die Pflichtfeldprüfung blockiert keine legitimen Werte mehr wie einen Vornamen „Max". Der letzte Tour-Schritt springt beim Weiterklick zurück auf den Start-Tab.
- **Onboarding-Prüfung live gegen Formularzustand:** Schritt 1 bewertet jetzt direkt die sichtbaren Eingabefelder der persönlichen Daten (statt eines gespeicherten Snapshot-/Template-Vergleichs). Damit spiegeln Panel-Status und Weiter-Button den tatsächlichen Formularzustand wider, inklusive Browser-Validierungsfehlern wie leeren Pflichtfeldern oder einer fehlenden Personalnummer.
- **`onboardingValidation.ts` (neu):** „Eigene Daten eingetragen" wird per **Snapshot-Vergleich** geprüft statt gegen hartkodierte Platzhalter — die Template-Werte sind je Zugangscode unterschiedlich. `capturePersSnapshot()` legt im Registrierungs-Flow einmalig einen Snapshot der 5 Felder an (neuer `Storage`-Key `OnboardingPersSnapshot`); „bearbeitet" = nicht leer und ungleich Snapshot; ohne Snapshot (Bestandsnutzer) nur Nicht-leer-Prüfung. `springeZu(tabButtonId, collapseId?)` wechselt den Tab und öffnet das passende Einstellungen-Accordion (`#collapseOne`–`#collapseFour`) mit Scroll.
- **Live-Aktualisierung:** Panel revalidiert bei `data:changed`-Events und per „Erneut prüfen".
- **Tab-Hilfen (`helpContent.ts`, `MyHelpModal.tsx`):** Neue Sektion **„Eingaberegeln"** je Tab — Bereitschaft (Zeitraumwechsel spätestens 08:00, keine Überlappung, Einsatz im Zeitraum, LRE-1-Regeln), EWT (chronologische Zeitfolge, keine Tages-Überschneidung, Buchungstag-Abweichung), Nebenbezüge (ein Eintrag/Tag, 9-stellige Auftragsnummer, EWT-Voraussetzung für Schnellauswahl), Einstellungen (Nacht-Zeitraum, Standard-Exklusivität). `haeufigeFehler` bei EWT/Neben um konkrete Punkte ergänzt.
- **Tests:** Neue `onboardingValidation.test.ts` (Snapshot-Anlage/-Schutz, Feld-genaue Offen-Liste, Bestandsnutzer-Fallback); Guide-Tests auf Panel umgestellt (eigenes Element, `#modal` unangetastet, Hard-Gate nur Schritt 1, Bestätigungs-Gates, Tab-Tour nur sichtbare Tabs, Accordion-Sprung, Cleanup, Doppelt-Öffnen-Schutz).
- **Test-Fix:** Die Accordion-Prüfung im Guide-Test hängt nicht mehr an einer strikten DOM-Objektidentität, sondern prüft stabil auf die erwarteten Button-/Collapse-IDs. Das verhindert falsche Negativtreffer im Bun/happy-dom-Umfeld, ohne das Verhalten zu ändern.

## 2026-07-09

### feat (Kontextsensitive Hilfe für Tabs/Modals + Ersteinrichtungs-Guide nach Registrierung)

- **`core/help/helpContent.ts`, `core/help/openHelpModal.tsx`:** Neue zentrale Hilfe-Architektur. `getHelpContent(key)` liefert strukturierte Kurzmodus-Inhalte (Kurzbeschreibung, Was kann ich hier machen, Buttons, Schritte, häufige Fehler, Tipp) je `HelpContextKey`. `openHelpModal(key)` öffnet die Hilfe in einem eigenständigen, gestapelten Bootstrap-Modal (dynamisch erzeugtes Element, analog zu `confirmDialog.ts`) statt im geteilten `#modal`-Element — dadurch bleibt ein bereits geöffnetes Add/Edit-Modal (oder der Ersteinrichtungs-Guide) beim Öffnen/Schließen der Hilfe vollständig erhalten.
- **`MyModalHeader.tsx`, `MyFormModal.tsx`, `MyDivModal.tsx`, `TMyModal.ts`:** Neuer optionaler `helpContext`-Prop, der einen Hilfe-Button (Material Icon `help_outline`) neben dem Schließen-Button rendert.
- **Tab-Hilfe:** Hilfe-Trigger in Start, Bereitschaft, EWT, Nebenbezüge und Einstellungen (Desktop-Navbar und mobiles Offcanvas teilen sich dieselbe DOM, daher automatisch konsistent erreichbar).
- **Modal-Hilfe:** `helpContext` an allen 9 Add/Edit-Modalen ergänzt (Bereitschaftszeit, Bereitschaftseinsatz, EWT, Nebenbezug, Arbeitszeitvorgabe); Show-Modals bewusst ausgenommen.
- **`core/orchestration/onboarding/createOnboardingGuideModal.tsx`:** Neuer schrittbasierter Ersteinrichtungs-Guide (Konto/E-Mail → Einstellungen → Monat erfassen → PDF-Export). Öffnet automatisch genau einmal nach erfolgreicher Registrierung (`checkNeuerBenutzer.ts`, neuer `Storage`-Key `OnboardingAbgeschlossen`) und ist über die Aktion „Ersteinrichtung erneut öffnen" im Start-Tab-Hilfemodal (`reopenOnboardingAction`-Flag in `HelpContent`) jederzeit manuell erneut aufrufbar.
- **Content-Überarbeitung Modal-Hilfe (User-Feedback):** Die Modal-Kontexte erklären nicht mehr die selbsterklärenden Hinzufügen/Speichern/Abbrechen-Buttons, sondern konkrete Eingabehilfe je Feld (`felder`-Sektion in `HelpContent`, neue Überschrift „Eingabehilfe" in `MyHelpModal`) – z. B. Auftragsnummer muss 9-stellig sein, LRE-Kategorien, wann „Büro"/Nachtschicht/Zusatzschichten aktiviert werden sollten.
- **Überarbeitung `haeufigeFehler` (User-Feedback):** Alle „Häufige Fehler"-Einträge beschreiben jetzt echte, im Code geprüfte Stolperfallen statt vager Hinweise: Bereitschaftseinsatz-Kontexte nennen die tatsächlichen Validierungsregeln aus `submitBereitschaftsEinsatz.ts` (Einsatz-Überschneidung, nur ein LRE 1 pro Zeitraum, 10-Minuten-Abstand → „LRE 1/2 ohne x"); EWT-Editor-Kontexte den Zeitfenster-Konflikt mit anderen Tagen; `tab.start`/`tab.einstellungen` erhalten je einen Eintrag (übersprungene Ersteinrichtung, übersehene E-Mail-Verifizierung). Irreführende bzw. nicht auftretbare „Fehler" korrigiert oder entfernt (Nachtschicht-Punkt beim Wochen-Generator → falsche Vorlagen-Wahl, da die Checkbox aus der Vorlage vorbelegt wird; keine Pause-Bereichs-Warnung, da nativ per `min`/`max` validiert; VE-Eintrag von neutraler Feststellung zu versehentlicher Standard-Markierung umformuliert).
- **Korrektur Modal-Kontexte (User-Feedback):** Bereitschaft, Bereitschaftseinsatz, EWT und Neben haben je zwei fachlich unterschiedliche Modal-Typen — ein Schnelleingabe-/Wochen-Generator-Modal (`createAddModalXxx.tsx`, globaler Button) und einen generischen, spaltengetriebenen Einzeleintrags-Editor (`createEditorModalXxx.tsx`, aus der Tabelle heraus für Hinzufügen/Bearbeiten). Beide nutzten fälschlich denselben `helpContext`, obwohl Felder/Verhalten unterschiedlich sind (z. B. zeigte die Hilfe im einfachen Bereitschaftszeitraum-Editor fälschlich Vorlagen-Auswahl und Nachtschicht-Toggles, die dort gar nicht existieren). Neue, getrennte Keys `modal.bereitschaftEintrag.add/edit`, `modal.bereitschaftEinsatzEintrag.add/edit`, `modal.ewtEintrag.add/edit`, `modal.nebenEintrag.add/edit` für die Editor-Modale ergänzt; `modal.bereitschaft.add`, `modal.bereitschaftEinsatz.add`, `modal.ewt.add`, `modal.neben.add` bleiben den jeweiligen Schnelleingabe-/Generator-Modalen vorbehalten.
- **Tests:** Neue Tests für `getHelpContent` (alle 18 Keys liefern vollständige Pflichtsektionen, Modal-Kontexte nutzen `felder` statt `buttons`), `openHelpModal` (gestapeltes Modal, geteiltes `#modal` bleibt unangetastet, Cleanup nach `hidden.bs.modal`), `MyModalHeader`/`MyDivModal` (Hilfe-Trigger nur bei gesetztem `helpContext`), `MyHelpModal` (Reopen-Onboarding-Aktion nur im Start-Kontext) und den Onboarding-Guide (genau einmal automatisch, jederzeit manuell).

## 2026-07-08

### fix (Act-as – Arbeitszeit-Panel zeigt nach User-Wechsel wieder die geladenen Daten)

- **`generateEingabeMaskeEinstellungen.ts` (`renderArbeitszeiteingabePanel`):** Beim erneuten Laden der Einstellungen (insbesondere nach Admin-Act-as-Wechsel) wird das `ArbeitszeiteingabePanel` jetzt mit einem monotonen `key` neu gemountet. Hintergrund: Die Komponente hält `aZ` intern per `useState(initialValues)` und synchronisiert Prop-Änderungen bewusst nicht per `useEffect`; ohne wechselnden `key` hat Preact die bestehende Instanz wiederverwendet und den alten Zustand (vorheriger User) behalten.
- **Wirkung:** Nach Act-as-Wechsel springt das Arbeitszeit-Panel auf die tatsächlich neu geladenen User-Werte um (statt auf den vorherigen Stand zu bleiben). Der Fix wirkt ebenso bei normalem Reload und beim Server-Überschreiben nach Konfliktprüfung.

### fix (Bereitschaft – Von-/Bis-Zeiten wieder manuell setzbar, z. B. bei stundenweiser Übernahme)

- **`createAddModalBereitschaftsZeit.tsx`:** Die beim aZ-Umbau eingeführten rein abgeleiteten, read-only Zeitanzeigen sind jetzt `type="time"`-Inputs (standardmäßig disabled/berechnet). Der Schalter „Datum manuell anpassen" heißt jetzt **„Datum & Zeiten manuell anpassen"** und entsperrt zusätzlich die BZ-Grenzzeiten `bAT`/`bET`. Damit ist die stundenweise Übernahme einer Bereitschaft wieder eingebbar (z. B. Anfang 13:00 nach Feierabend, Ende 12:00 am Folgetag bei Übergabe an den Kollegen). Nacht-/Spät-Zeiten bleiben immer abgeleitet — die Berechnung zieht die Nacht-Blöcke ohnehin aus der Arbeitszeit Nacht, manuelle Werte würden ihr widersprechen; Abweichungen gehören ins Panel „Andere Arbeitszeiten hinterlegen" (Hinweis dazu jetzt direkt im Nachtschicht-Block).
- **`toggleBereitschaftsEigeneWerte.ts`:** Ent-/sperrt neben den Datumsfeldern (`bE`/`nA`/`nE`) jetzt auch `bAT`/`bET`; beim Zurückschalten werden alle Felder wieder aus der Vorgabe/aZ abgeleitet.
- **`updateBereitschaftsDatum.ts`:** Auch im Handbetrieb werden die Zeiten bei jeder Datumsänderung weiterhin zum jeweiligen Wochentag neu abgeleitet (z. B. Anfang Fr → `bAT` = frueh.Ende Fr 13:00, Ende Sa → `bET` = frueh.Beginn Sa 09:00) — sie dienen als Startwert und werden danach vom User feinjustiert. Nur die Datumsfelder bleiben im Handbetrieb unangetastet (wie bisher).
- **Tests:** Toggle-Tests um die Zeitfelder erweitert; neuer Test, dass `updateBereitschaftsDatum` im Handbetrieb die Zeiten je Wochentag neu ableitet (Fr 13:00 / Sa 09:00-Szenario) und die manuell gesetzten Datumsfelder stehen lässt.

## 2026-07-07

### fix (Neben – Entfernen der EWT-Verknüpfung wird jetzt serverseitig persistiert)

- **`fieldMapper.ts` (`nebengeldToBackend`):** Eine fehlende `ewtRef` wird jetzt als `EWT: null` gesendet statt als `undefined` (das bei `JSON.stringify` wegfällt). Wählte der User im Neben-Editor „— keine Zuordnung —", kam das Entfernen der Verknüpfung nie am Server an: das Dokument behielt die alte EWT-Referenz, die Zuordnung war nach dem nächsten Laden wieder da und die EWT blieb für andere Einträge blockiert (Unique-Index). Das Backend übersetzt `null` in ein `$unset` (siehe Backend-Changelog). `nebengeldFromBackend` normalisiert `EWT: null` zu `ewtRef: undefined`.
- **Tests:** Drei neue Mapper-Tests (gesetzte Ref, fehlende Ref → `null`, `null` vom Server → `undefined`).

### fix (EWT/Neben – gelöschte Zeiten/Auftragsnummer werden beim Update jetzt serverseitig geleert)

- **`fieldMapper.ts` (`ewtToBackend`):** Leere Zeitfelder (`abWE`, `ab1E`, `anEE`, `beginE`, `endeE`, `abEE`, `an1E`, `anWE`) und `Einsatzort` werden jetzt als Leerstring explizit mitgesendet statt auf `undefined` gesetzt. `undefined`-Felder fallen bei `JSON.stringify` aus dem Payload, wodurch ein Update gelöschte Zeiten nie am Server ankommen ließ — der alte Wert blieb im Dokument erhalten (Mongoose-`$set` überschreibt nur mitgesendete Felder). Backend-Zod (`z.string().optional()`) und Mongoose-Schema akzeptieren Leerstrings; alle Konsumenten (Überschneidungsprüfung, `computeBuchungstag`, PDF-Export, `ewtFromBackend`) behandeln `''` und fehlend identisch. Nebeneffekt korrigiert: Die serverseitige Überschneidungsprüfung beim Update nutzte über `patch.beginE ?? current.beginE` bisher die alte Zeit, wenn das Feld fehlte.
- **`fieldMapper.ts` (`nebengeldToBackend`):** Gleiches Muster für `Auftragsnummer` — eine geleerte Auftragsnummer wird jetzt beim Update serverseitig geleert.
- **Tests:** Zwei bestehende Mapper-Tests von „setzt auf undefined" auf „sendet Leerstring explizit" umgestellt.

### fix (EWT/Neben – Reaktivierung statt Duplikat-Fehler bei Add nach Delete am selben Tag)

- **`addEwtTag.ts` / `addNebengeldTag.ts`:** Beim Anlegen eines neuen Eintrags wird jetzt zusätzlich geprüft, ob unter den zum Löschen vorgemerkten Zeilen (`_state === 'deleted'`) bereits eine Zeile für denselben Tag existiert. Falls ja, wird diese per `undoDelete()` + `val()` reaktiviert und mit den neuen Werten überschrieben, statt eine zusätzliche neue Zeile anzulegen. Behebt einen False-Positive: löschte man einen EWT-Eintrag und legte im selben Speichervorgang einen neuen für denselben Tag an, wurde der Create serverseitig als Überschneidung abgelehnt („EWT-Einträge dürfen sich nicht überschneiden"), weil der Bulk-Endpunkt Creates vor Deletes verarbeitet. Durch die Reaktivierung bleibt die ursprüngliche `_id` (und damit z. B. eine verknüpfte Nebengeld-Referenz) erhalten, es wird als Update statt Delete+Create gesendet.
- **Tests:** Je ein neuer Testfall in `EWT.addEWTtag.test.ts` und `Neben.addNebenTag.test.ts` für die Reaktivierung eines zum Löschen vorgemerkten Eintrags.

### feat (AutoSave – expliziter `__localState`-Marker für alle Row-States)

- **`mergeVisibleResourceRows.ts` + `CustomTable.ts` (`Rows.load`):** `__localState` wird jetzt für **jede** Zeile explizit persistiert (`'unchanged' | 'new' | 'modified' | 'deleted'`) statt `new` nur über die fehlende `_id` zu erschließen. Schließt die Lücke bei **geänderten** Zeilen: wurde das Fenster vor Ablauf des AutoSave-Timers geschlossen, wird die Änderung nach dem nächsten Laden dank des Markers zuverlässig nachgesendet statt still verloren zu gehen. Rückwärtskompatibel: Zeilen ohne Marker (Alt-Daten) fallen weiterhin auf die bisherige `_id`-Inferenz zurück.
- **`metaFields.ts` (`hasPendingLocalChanges`) + `loadUserDaten.helpers.ts` (`countByMonth`):** Um `'new'`/`'modified'` erweitert, damit `syncLoadedYearResources` pending-lokale Neuanlagen/Änderungen nicht mit einem neueren/gleich-alten Server-Stand überschreibt, und Pending-New-Zeilen weiterhin keinen falschen Konflikt-Dialog auslösen.
- **Tests:** Neue Datei `mergeVisibleResourceRows.test.ts` (Marker-Persistierung je State); `CustomTable.test.ts`, `metaFields.test.ts`, `loadUserDaten.sync.test.ts`, `loadUserDaten.helpers.test.ts` um die neuen Marker-Werte ergänzt.
- **Verworfen:** Ein Page-Hide-Flush (`pagehide`/`visibilitychange:hidden` per `fetch(..., { keepalive: true })`) wurde prototypisch umgesetzt, dann aber wieder verworfen: `keepalive` garantiert nur, dass der Request den Server erreicht, nicht dass danach noch JavaScript zur Antwort-Verarbeitung läuft. Bei echtem Tab-Schließen wurde `commitAutoSave`/`updateLocalStorage` nie ausgeführt, sodass neu angelegte Zeilen beim nächsten Laden erneut als „neu" gesendet und vom Server als Duplikat abgelehnt wurden (das Backend verwirft `clientRequestId` vor dem Speichern, es gibt keine serverseitige Idempotenzprüfung). Der `__localState`-Marker bleibt als alleiniges Sicherheitsnetz bestehen.

### fix (Sync – kein „Unterschiede erkannt"-Dialog für ungesendete AutoSave-Zeilen)

- **`loadUserDaten.helpers.ts` (`countByMonth`):** Lokale Pending-New-Rows (ohne `_id`) werden beim Lokal/Server-Vergleich nicht mehr mitgezählt — symmetrisch zur bestehenden Pending-Delete-Exklusion. Wurde das Fenster geschlossen, bevor der AutoSave-Timer (10s) feuerte, erschien beim erneuten Öffnen fälschlich der Konflikt-Dialog, obwohl die Zeile nach dem Tabellen-Load ohnehin automatisch nachgespeichert wird (`Rows.load` restauriert Zeilen ohne `_id` als `'new'` → AutoSave).
- **`loadUserDaten.sync.ts`:** `dataServer.X` wird nur noch gesetzt, wenn die Monatszählung echte Unterschiede ergab — ein reiner Längenunterschied durch Pending-New-Rows ist kein Konflikt (konsistent mit dem Bug-2-Regression-Guard).
- **Tests:** Neuer Helper-Test (Pending-New-Exklusion), neuer Sync-Test (Pending-New-Zeile erzeugt keinen `vorhanden`-Eintrag und kein `dataServer`), Fixtures in `Login.LadeUserDaten.test.ts` auf realistische Server-Rows mit `_id` umgestellt (Mongo-Dokumente haben immer eine `_id`).

### fix (EWT – getPascalEnde Namensreihenfolge)

- **`calculateEwtEintraege.ts`:** Vertauschte Zuordnung korrigiert – zuvor prüfte `getPascalEnde()` `Vorname === 'Ackermann' && Nachname === 'Pascal'`, jetzt korrekt `Vorname === 'Pascal' && Nachname === 'Ackermann'`. Ohne diesen Fix griff der Sonderfall (5 Minuten Aufschlag auf `anWE`) nie.

### feat (EWT – Spätschicht-Label)

- **`features/EWT/index.ts`:** Schicht-Kürzel `SP` wird in der Anzeige jetzt als „Spät" aufgelöst (zuvor kein eigener Fall, fiel durch den `switch`).

### test (EWT – Sonderfall Pascal Ackermann)

- **`EWT.ewtBerechnen.test.ts`:** Neuer Test für `getPascalEnde()` – bei `pers.Vorname === 'Pascal'` und `pers.Nachname === 'Ackermann'` wird `anWE` um 5 Minuten später berechnet (15:30 → 15:35) als im Standardfall. Der Sonderfall war bisher ungetestet, da alle bestehenden Mocks `pers: {}` verwenden.

## 2026-07-04

### feat (Berechnung – Mobil-Akkordeon, Gruppen-Sichtbarkeit, Zulagen-Aufschlüsselung)

- **Mobil-Ansicht (<768px):** Die horizontal gescrollte Berechnungstabelle wird auf kleinen Breakpoints durch eine Preact-Akkordeon-Ansicht ersetzt (`BerechnungMobileCards.tsx`, umgeschaltet per `d-none d-md-block` / `d-md-none`). Ein Accordion-Item pro Monat mit „Summe Gesamt" im Header; aufgeklappt Details gruppiert nach Bereitschaft / EWT / Nebenbezüge. Alle 12 Monatssummen sind damit ohne Scrollen vergleichbar.
- **Rechenlogik extrahiert:** Der DOM-gekoppelte `switch`-Block aus `generateTableBerechnung.ts` ist in die reine Funktion `calculateBerechnungRows.ts` überführt (strukturierte Monatsergebnisse); Tabelle und Mobil-Karten konsumieren dieselbe Quelle. Zellwerte unverändert (bestehende Tests grün).
- **Gruppen-Sichtbarkeit nach `aktivierteTabs`:** Global deaktivierte Bereiche (bereitschaft/ewt/neben) werden ausgeblendet – außer es existieren Daten (Desktop-Scope: ganzes Jahr, Zeilen entfallen komplett; Mobil-Scope: einzelner Monat). Gemeinsamer Helper `berechnungGroupVisibility.ts`.
- **Zulagen-Aufschlüsselung:** Alle im Jahr vorkommenden Zulagen-Codes (z. B. 040, 839) erscheinen in Tabelle (Sub-Tabelle vor „Summe Nebenbezüge") und Mobil-Karten je Code mit der Monats-Rohsumme in Minuten/Stück. Aggregation direkt aus `dataN`/`zulagenN` (`calculateZulagenBreakdown.ts`), unabhängig von der Euro-Berechnung.
- **Feinschliff nach Praxistest:** Desktop-Breakdown-Zellen bleiben in Monaten ohne Zulagen leer (wie EWT-Zeilen); Mobil erscheinen nur Codes mit Monatswert > 0 (keine Zeilen, wenn alle 0). EWT-Schwellen mobil als kompakte Einzelzeilen (`Abwesenheiten >8 Std.`) ohne Nullwerte. Mobil-Gruppenüberschriften tragen die Gruppensumme rechts (Bereitschaft/EWT/Nebenbezüge/Gesamt), Detailzeilen eingerückt, kräftige Trennlinien zwischen den Gruppen.
- **EWT-Zählfehler behoben:** Abwesenheiten unter 8 Stunden landeten über eine `else`-Falle in der `>24`-Spalte; sie zählen jetzt in keinem Schwellen-Bucket.
- **Dreistufige Breakpoints mit Monats-Fenster:** Mobil-Akkordeon bis <576px (`d-sm-none`), volle Tabelle ab 1200px; dazwischen Tabelle mit dynamischem Monats-Fenster (`berechnungMonatsFenster.ts`): sichtbare Monatsanzahl wird aus verfügbarer Breite berechnet (feste Label-Spalte 11.5rem, ~95px pro Monatsspalte), Prev/Next-Buttons verschieben das Fenster, Start um den aktuellen Monat zentriert; Neuberechnung bei Resize/Tab-Öffnung.
- **Weitere UI-Verbesserungen:** EWT-Zeilenlabels ohne Tarifvertrags-/Paragraph-Zusätze („Anzahl der Abwesenheiten", „steuerfreie Abwesenheiten"); Mobil-Akkordeon öffnet den aktuellen Monat automatisch; Gruppensummen in den Mobil-Zwischenüberschriften mit kräftigen Trennlinien (auch in der Desktop-Tabelle).
- **Monats-Navigation bei vollem Jahres-Fit zuverlässig versteckt:** Wenn alle 12 Monate in die verfügbare Breite passen (u. a. ab ~1183px), wird die Prev/Next-Leiste jetzt per `display: none !important` ausgeblendet. Dadurch kann sie nicht mehr von Breakpoint-Utility-Klassen (`d-sm-flex`) sichtbar gehalten werden.
- **Aufräumen:** Nie eingebundener `createBerechnungTableBody.tsx` (`TableComponent`) entfernt.
- **Tests:** Neue Suites `Berechnung.calculateBerechnungRows`, `Berechnung.groupVisibility`, `Berechnung.BerechnungMobileCards`, `Berechnung.calculateZulagenBreakdown` (1156 → 1176 Tests, 0 Fehlschläge).

## 2026-07-03

### test (Testcoverage erhöht)

- **Coverage:** 78.26 % → 83.55 % Funcs, 81.77 % → 86.37 % Lines. Testanzahl 989 → 1156 (0 Fehlschläge).
- **Schwerpunkte:** Bereitschaft (`submitBereitschaftsEinsatz`, `submitBereitschaftsZeiten`, `BereitschaftOverridePanel` neu auf 100 %), Auth-Orchestrierung (`core/orchestration/auth/*`), AutoSave-Infrastruktur (`autoSaveIndicator`, `changeTracking`, `errorHandling`, `autoSave.ts`), diverse Utility-Lücken (`MyInput`, `bootstrap`, `core/types/api`, `FetchRetry`, `download.ts`).
- **Verbleibend offen:** Große Admin-/Modal-Komponenten (`AdminUserList.tsx`, `AdminResourceBrowser.tsx`, `AdminProfileTemplatesManager.tsx`, `ArbeitszeiteingabePanel.tsx`, `createEditorModalVE.tsx` u. a.) sind weiterhin bei ~0 % Coverage; bewusst zurückgestellt, da jede Datei eigene Test-Infrastruktur benötigt (separates Vorhaben).

## 2026-06-28

### feat (AdminDashboard – Ereignisse-Pagination)

- **`MemoryCard` / Ereignisse-Liste:** Pagination mit 10 Einträgen pro Seite (Prev/Next-Buttons, Seitenanzeige). Neueste Ereignisse werden zuerst angezeigt (absteigende Sortierung nach Timestamp). Gesamtanzahl im Header sichtbar. Pagination-Controls nur sichtbar wenn mehr als eine Seite vorhanden.

### feat (AdminDashboard – Memory-Verlauf, Auth-Aktivität, Datenwachstum)

- **MemoryCard:** SVG-Sparkline (Heap used blau, RSS orange) mit vertikalen Dashed-Markern für Non-Periodic-Events. Höhe responsiv (`clamp(80px, 15vw, 160px)`). Kompakte Stat-Zeile: Heap/RSS/Extern/EventLoop/Uptime in einer Zeile.
- **Manueller Heap-Snapshot-Button:** POST-Button (grün, mit Spinner) löst `POST /api/v2/admin/heap` aus und aktualisiert die Karte.
- **Ereignis-Liste:** 2-Zeilen-Layout pro Eintrag (Zeile 1: Icon + Label, Zeile 2 eingerückt: Datum + RSS + Heap). Funktioniert auf allen Breakpoints ohne Umbruchprobleme.
- **Legende:** Kompakt, Array-gemappt, Font-Size `.72rem`.
- **Stat-Cards (Top-Reihe):** Benutzer (gesamt + aktiv 30d) · Profile-Templates (aktiv/gesamt) · Admin-Aktivität (Logs 7d) · Serverlaufzeit (Uptime aus letztem Snapshot, formatiert in Min./Std./Tage).
- **Rollenverteilung:** Zeigt User-Counts nach Rolle.
- **Ressourcenbestand + Wachstums-Badges:** `+N` (letzte 7d) inline hinter dem Label; Count-Badge mit `flex-shrink-0` – kein Layout-Bruch bei langen Labels wie „Einsatzwechseltätigkeiten".
- **Auth-Aktivität:** Neue User 7d · E-Mail-verifiziert · Passkey-Nutzer.
- **API (`utils/api.ts`):** Neue Typen `MetricPoint`, `HeapData`; Funktionen `fetchAdminHeap()`, `triggerAdminHeapSnapshot()`; `AdminStats` um `auth`- und `growth`-Sektionen erweitert.

### chore (Phase 3 – AdminJS-Link entfernt)

- **AdminJS-Link aus Admin-Tab entfernt:** Nav-Tab „AdminJS (extern)" und der zugehörige `adminJsUrl`-State sind gelöscht. Das Backend bietet keine AdminJS-Route mehr an.
- **`getServerUrl`-Import entfernt:** War nur für die AdminJS-URL-Konstruktion nötig.

### feat (Custom Admin – Datums-/Dropdown-Fixes, EWT-Felder, Jahresfilter, Benutzer-Suche)

- **Datum-Korrektheit (Zeitzone):** Datumsfelder ohne Zeitanteil (`Tag`, `Buchungstag`) werden jetzt mit UTC-Komponenten (`getUTCDate()` etc.) formatiert, um Verschiebungen durch Lokale Zeitzone zu vermeiden. Datetime-Felder (`Beginn`, `Ende` bei BZ) nutzen weiterhin die lokale Zeitzone.
- **date-only vs. datetime-Eingabe:** `Tag`/`Buchungstag` im Edit-Modal werden als `type="date"`-Input gespeichert (`YYYY-MM-DDT00:00:00.000Z`). Datetime-Felder nutzen `type="datetime-local"` und konvertieren korrekt nach ISO.
- **Schicht-Dropdown:** `Schicht`-Feld in EWT-Einträgen rendert jetzt ein Dropdown mit den Werten `T`, `SP`, `N`, `S`, `BN` (war bisher Freitext).
- **EWT-Optionale-Felder:** Alle optionalen EWT-Felder (`abWE`, `ab1E`, `anEE`, `beginE`, `endeE`, `abEE`, `an1E`, `anWE`, `Einsatzort`, `berechnen`) werden im Edit-Modal auch dann angezeigt, wenn sie im Dokument nicht vorhanden sind (Augmentierung über `SCHEMA_FIELDS` mit `null` als Platzhalter + „leer"-Badge).
- **Jahresfilter: nur vorhandene Jahre (Backend-Query):** Jahr-Dropdown im Ressourcen-Browser lädt jetzt die tatsächlich in der DB vorhandenen Jahre per `GET /admin/{endpoint}?distinctJahr=1`. Kein hardcodierter Jahres-Range mehr.
- **Benutzer-Filter als Suche:** Benutzer-Filter ist jetzt ein Text-Input mit Browser-`<datalist>` (alle Benutzernamen). Tipp-Suche filtert die Vorschlagsliste; bei Auswahl wird intern die `userId` gesetzt. X-Button löscht die Auswahl.
- **Schema-Felder-Reihenfolge:** Edit-Modal zeigt Felder jetzt in der Schema-definierten Reihenfolge (Business-Felder zuerst, dann System-Felder wie `_id`, `__v`, `createdAt`, `updatedAt`).
- **Zeitfelder als `type="time"`-Input:** `Beginn`/`Ende` in Bereitschaftseinsatz und Nebengeld sowie alle EWT-Zeitfelder (`abWE`, `ab1E`, `anEE`, `beginE`, `endeE`, `abEE`, `an1E`, `anWE`) sind als `String "HH:mm"` gespeichert und werden jetzt korrekt als Zeitfeld dargestellt – kein Freitext-Input mehr.
- **JSON-Editor-Komponente (`JsonEditor.tsx`):** Neue wiederverwendbare Komponente für alle JSON/Array-Felder im Admin-Panel. Eingeklappt mit Summary-Badge (z. B. `Array [5]`, `Objekt {12}`) und Vorschau-Snippet; aufgeklappt als monospaced Textarea mit Auto-Höhe und „Format"-Button zum Prettify. Fehleranzeige in Kopfzeile und unter der Textarea. Genutzt in `AdminResourceBrowser` und `AdminUserProfileEditor`.

### feat (Custom Admin – Cross-Links, Portal-Fix, UX-Optimierungen)

- **Ressourcen-Browser: Cross-Resource-Navigation:** Alle `_id`-Referenzfelder verlinken jetzt zum jeweiligen Eintrag im Browser. `Nebengeld.EWT` → EWT-Tab, `Bereitschaftseinsatz.Bereitschaftszeitraum` (Array) → BZ-Tab (jeweils mit direktem Edit-Modal). Navigation öffnet Ziel-Ressource via `GET /admin/{endpoint}/:id` und zeigt Edit-Modal ohne Seiten-Reload.
- **Portal-Fix für Edit-Modals:** Modals in `AdminResourceBrowser` und `AdminUserProfileEditor` rendern jetzt via `createPortal` auf `document.body`-Ebene. Damit sind sie auch sichtbar, wenn der übergeordnete Bootstrap-Tab-Pane `display:none` hat (war der Grund, warum "Zum Profil"-Navigation keine Wirkung hatte).
- **Navigations-Fix Profile-Tab:** `navigateToProfile(userId)` inkrementiert jetzt einen `searchKey`-Counter, sodass der `useEffect` in `AdminUserProfileEditor` auch bei wiederholter Navigation zur selben User-ID erneut feuert. `requestAnimationFrame`-Workaround entfernt.
- **Jahresfilter: nur vorhandene Jahre:** Dropdown zeigt jetzt 2020 bis aktuelles Jahr (kein 2027/2028/2029 mehr). Werte basieren auf dem Schema-Minimum.
- **LRE-Dropdown:** `LRE`-Feld in Bereitschaftseinsatz-Edit-Modal nutzt jetzt ein Dropdown mit allen gültigen Werten (`LRE 1`, `LRE 2`, `LRE 1/2 ohne x`, `LRE 3`, `LRE 3 ohne x`).
- **Datums-Inputs:** ISO-Datumsfelder (`Tag`, `Buchungstag`, `Beginn`, `Ende`) werden im Edit-Modal als `datetime-local`-Input dargestellt (lokale Zeitzone). Tabellen-Anzeige zeigt jetzt Datum + Uhrzeit mit Locale `de-DE`.
- **Null-Felder:** Felder mit Wert `null` sind im Edit-Modal jetzt sichtbar und editierbar. Label zeigt „leer"-Badge, Input hat orangefarbenen Rand als visuellen Hinweis.
- **Dashboard: Benutzer + Profile zusammengeführt:** Stat-Karte zeigt Benutzeranzahl und bestätigt im Sub-Text ob alle Profile vollständig sind (`Profile vollständig ✓`) oder wie viele fehlen.
- **API: `fetchAdminResourceById`:** Neue Hilfsfunktion für `GET /admin/{endpoint}/:id` – wird von der Cross-Resource-Navigation genutzt.

### feat (Custom Admin – Filter & UX-Verbesserungen)

- **Ressourcen-Browser: Filter-Panel** (Benutzer/Jahr/Monat): Alle vier Ressourcen unterstützen jetzt server-seitige Filterung. Aktive Filter werden als Badges angezeigt; "Zurücksetzen" löscht alle Filter. Benutzer-Select befüllt sich aus `userNameMap`.
- **Ressourcen-Browser: Klickbare `_id`-Spalte:** ID-Zelle öffnet beim Klick direkt das Edit-Modal (zusätzlich zum Edit-Button). Cursor und Farbe signalisieren Klickbarkeit.
- **Dashboard: "Profil-Sync"-Karte** ersetzt redundante "UserProfile-Dokumente"-Karte. Zeigt die Differenz zwischen User- und UserProfile-Dokumenten (0 = grünes Häkchen, >0 = rote Warnung).

### feat (Custom Admin – Phase 2 Optimierungen)

- **Ressourcen-Browser: Benutzername statt ID:** User-Spalte zeigt jetzt Vor-/Nachname aus dem UserProfile (via `fetchAdminUserNameMap`). Klick auf Person-Icon navigiert direkt zum Profil im Profile-Tab.
- **Ressourcen-Browser: ObjectId-Erkennung im Edit-Modal:** User-Felder zeigen Name + „Zum Profil"-Button (nicht editierbar – Referenz-Integrität). Andere ObjectId-Felder zeigen volle ID + Kopieren-Button.
- **Ressourcen-Browser: Mehr Breakpoints:** Zwei Extra-Spalten (Erstellt, Geändert) ab `lg`-Breakpoint sichtbar (`d-none d-lg-table-cell`). Datumswerte werden deutschsprachig formatiert.
- **Admin-Dashboard: Benutzer vs. Profile erklärt:** Profile-Karte zeigt Sub-Text „Alle Benutzer vollständig" oder „X Benutzer ohne Profil" wenn User- und Profil-Anzahl abweichen.
- **Neuer AdminLog-Tab:** `AdminLogBrowser.tsx` zeigt alle Admin-Aktionen paginiert (Zeitstempel, Aktion, Admin-Name, Ziel-User, Ressource-ID). Filter nach Aktion-String. Admin- und Ziel-User-IDs werden per `userNameMap` in Namen aufgelöst. Spalten ab md/lg progressiv sichtbar.
- **Navigation Ressourcen → Profile:** Klick auf User-Icon im Ressourcen-Browser aktiviert Profile-Tab und öffnet direkt das Edit-Modal des Benutzers (server-seitiger `userId`-Filter, kein Client-seitiges Paginierproblem).
- **Admin-API-Erweiterungen:** `fetchAdminUserNameMap`, `fetchAdminUserProfiles` (mit optionalem `userId`-Filter), `fetchAdminLogs`, `AdminLogEntry`-Typ.

### feat (Custom Admin – Phase 2)

- **Admin-Dashboard-Tab:** Neuer `AdminDashboard.tsx`-Tab für Super-Admins. Zeigt vier Stat-Karten (Benutzer gesamt/aktiv-30d, Profile, Templates aktiv/inaktiv, Admin-Logs letzte 7 Tage) sowie Rollenverteilung und Ressourcenbestand als übersichtliche Cards. API: `GET /api/v2/admin/stats`.
- **Ressourcen-Browser-Tab:** Neuer `AdminResourceBrowser.tsx`-Tab. Interner Tab-Switch zwischen vier Ressourcen (Bereitschaftseinsatz, Bereitschaftszeitraum, Einsatzwechseltätigkeit, Nebengeld). Paginierte Tabelle mit Bearbeiten- und Löschen-Aktionen. Edit-Modal zeigt alle Felder generisch: Systemfelder readonly, Boolean als Checkbox, Objekte/Arrays als JSON-Textarea mit Inline-Fehleranzeige, Zahlen als `number`-Input. Löschung mit `confirmDialog`. Mobile-tauglich (`modal-fullscreen-sm-down`, `table-responsive`).
- **UserProfile-Editor-Tab:** Neuer `AdminUserProfileEditor.tsx`-Tab. Paginierbarer Liste aller UserProfile-Dokumente mit Namens-/OE-Filterung. Edit-Modal: `Pers`-Felder als strukturierte Formularfelder, komplexe Felder (`Fahrzeit`, `Arbeitszeit`, `VorgabenB`, `Einstellungen`) als JSON-Textareas. Zusätzlich `emailVerified`-Toggle und Passkey-Verwaltung (Liste + Löschen) für den zugehörigen User.
- **Admin-API-Erweiterungen (`utils/api.ts`):** `AdminStats`, `AdminPage`, `AdminPasskey`-Typen. Neue Funktionen für alle Admin-Endpunkte (`fetchAdminStats`, `fetchAdminResource`, `updateAdminDoc`, `deleteAdminDoc`, `fetchAdminUserProfiles`, `updateAdminUserProfileDoc`, `setAdminEmailVerified`, `fetchAdminPasskeys`, `deleteAdminPasskey`).
- **Drei neue Tabs in `features/Admin/index.tsx`:** Dashboard, Ressourcen, Profile – alle nur für `role === 'super-admin'` sichtbar. AdminJS-Link bleibt bis Phase 3 erhalten.

## 2026-06-21

### feat

- **Bereitschafts-Modal um aktive Overrides und Sonder-Block erweitert:** Der Bereitschafts-Dialog zeigt nur Overrides fuer aktive Wochenschichten und fuehrt Sonderschicht als eigenen Arbeitszeit-Block. Die Vorbelegung (`applyBereitschaftsVorgabe` / `updateBereitschaftsDatum`) und die Berechnung (`submitBereitschaftsZeiten` / `calculateBereitschaftsZeiten`) behandeln Sonder nur innerhalb des gewaehlten Bereichs; `BereitschaftOverridePanel` bietet Sonderschicht jetzt separat an.

### test

- **Bereitschafts-Testmatrix erweitert:** Neue Testdatei `test/Bereitschaft.schichtzusammensetzungen.overrides.test.ts` mit allen 8 Schicht-Zusammensetzungen (Frueh, Spaet, Nacht, Sonder in allen Kombinationen) sowie mehreren Override-Varianten (Frueh, Spaet, Nacht, Sonder-Runtime und kombinierte Overrides). Fuer die Matrix wurden stabile Snapshots ergänzt.

## 2026-06-19

### feat

- **Bereitschaft-Modal „Neue Bereitschaft eingeben" auf aZ-Arbeitszeitmodell umgestellt:** Die Zeiten „Von"/„Bis" des Bereitschaftszeitraums werden nicht mehr aus statischen Vorgabe-Werten gesetzt, sondern aus `vorgabenU.aZ` je Wochentag abgeleitet: **Von** = Frühschicht-Ende des Anfangstags (bei aktiver Spätschicht: Spätschicht-Ende), **Bis** = Frühschicht-Beginn des End-Wochentags. Arbeitsfreie Tage ohne hinterlegte Schicht ergeben `08:00`. Der Spätschicht-Schalter berechnet die Von-Zeit sofort neu. Neuer Helper `resolveBereitschaftsGrenze.ts` (`resolveBzVon`/`resolveBzBis`); `mergePerWeekdaySchicht` nach `core/types` zentralisiert.
- **VorgabenB-Editor (Einstellungen) auf das neue Modell umgebaut:** Die abgeleiteten Zeit-Eingabefelder (Bereitschaft/Nacht) entfallen — es bleibt die Tag-/Wochenauswahl. Neue stateful Komponente `SchichtenConfigSection` mit optionaler **per-Wochentag-Überschreibung** je aktiver Schicht (Früh/Spät/Nacht) über `schichtenOverrides`; die `SchichtSection` aus dem Arbeitszeit-Panel wird dafür wiederverwendet. Übersteuerte Zeiten sind ein bewusster Snapshot (folgen späteren globalen aZ-Änderungen nicht).
- **Arbeitszeit-Overrides im Modal „Neue Bereitschaft eingeben":** Über den Schalter „Andere Arbeitszeiten hinterlegen" lässt sich derselbe per-Wochentag-Override-Editor (`SchichtOverrideEditor`, aus dem VorgabenB-Editor extrahiert und geteilt) für genau diesen Eintrag nutzen. Änderungen aktualisieren die abgeleiteten Von/Bis-Zeiten live und fließen via gemergte `schichtenOverrides` in die Berechnung ein (Variante < Modal-Override). Bridge über `get/setBereitschaftRuntimeOverrides`; gemeinsames Merge-Util `mergeSchichtenOverrides` (ersetzt die lokale Kopie in `submitBereitschaftsZeiten`).
- **Abgeleitete Zeiten im Modal sind read-only Text:** Die Zeitfelder (Von/Bis, Spät, Nacht) werden nicht mehr als bearbeitbare Inputs gezeigt, sondern als reiner Text – der Wert kommt aus `aZ`/Override. Zeitänderungen laufen ausschließlich über „Andere Arbeitszeiten hinterlegen". Der bisherige Schalter „Zeiten manuell anpassen" heißt jetzt **„Datum manuell anpassen"** und entsperrt nur noch die berechneten **Datumsfelder** (`bE`/`nA`/`nE`); `bA` bleibt frei editierbar.
- **Modal-Layout aufgeräumt (kompakt/tabellarisch):** Jeder Zeitpunkt (Anfang/Ende) ist eine einzeilige Zeile (`punktZeile`): schmales Label · kompaktes Datumsfeld (`form-control-sm`, füllt) · prominente Zeit · optional „berechnet"-Badge — alles auf einer Höhe ausgerichtet (statt schwerer form-floating-Box neben schwebendem Text). Einheitliches Padding (`p-3`); Spätschicht auf Von/Bis reduziert.

### fix

- **Nacht-Override wird in der Berechnung genutzt:** `getNachtSchichten` löst Beginn/Ende **und** Pause jetzt je Wochentag aus `aZ.nacht` + `schichtenOverrides.nacht` auf (statt einheitlicher Fensterzeiten/Pause). Ohne Override bleibt das Verhalten unverändert (Fallback auf die Fensterzeiten).
- **Keine Schein-Overrides mehr aus Zeitfeldern:** Die frühere Logik, aus den (vorbelegten) Spät-/Nacht-Zeitfeldern im Submit Einzeltag-Overrides zu erzeugen, ist entfernt – sie verankerte Nacht-Overrides am falschen Tag (BZ-Anfangstag statt Nacht-Tag) und konnte über Mitternacht gehende Beginn/Ende nicht korrekt halten. `submitBereitschaftsZeiten` reicht jetzt nur noch Variante- + Editor-Overrides durch; Zeitänderungen erfolgen über den Arbeitszeiten-Editor.

### change

- **Typ `IVorgabenUvorgabenB`:** `zeit` in `beginnB`/`endeB`/`beginnN`/`endeN` ist optional (`zeit?`), da die Zeiten aus `aZ` abgeleitet werden (abwärtskompatibel; Backend-Mongoose-Schema entsprechend angepasst).

### test

- Neue Unit-Tests `Bereitschaft.resolveBereitschaftsGrenze.test.ts` (Früh/Spät/Override/arbeitsfrei→08:00). `Bereitschaft.utils.extra.test.ts` auf aZ-Ableitung umgestellt (injiziertes `aZ`).

## 2026-06-21

### fix

- **Arbeitszeit-Schalter speichert `inaktiv` wieder korrekt:** Im `ArbeitszeiteingabePanel` wird der von den Schalter-Komponenten gelieferte Status jetzt unveraendert in den Panel-State uebernommen. Zuvor wurde `aktiv` beim Parent-Update nochmals invertiert, wodurch Spaet-, Nacht- und Sonderschicht beim Speichern in `VorgabenU.aZ` und damit im localStorage auf `aktiv` zuruecksprangen.
- **Schneller Toggle→Speichern-Race im Arbeitszeit-Panel behoben:** Der globale Panel-State fuer `saveEinstellungen()` wird jetzt sofort beim lokalen State-Update synchronisiert und nicht erst im nachgelagerten `useEffect`. Dadurch wird ein frisch auf `inaktiv` umgeschalteter Status auch dann korrekt in `VorgabenU` und spaeter aus der Serverresponse in den localStorage uebernommen, wenn direkt danach gespeichert wird.

## 2026-06-18

### feat

- **Admin-Tab Profilvorlagen-VorgabenB auf Schichtmodell umgestellt:** Der VorgabenB-Editor im Admin-Tab bot bisher nur die Legacy-Checkbox `nacht`. Er zeigt jetzt die Mehrfachauswahl `Aktive Schichten` (`frueh` fix aktiv, `spaet`/`nacht`/`sonder` waehlbar) analog zum Benutzer-Editor; `nacht` wird daraus synchron gehalten, `schichtenOverrides` bleiben ueber `rawValue` erhalten. Parsing/Serialisierung mappen Legacy-Eintraege (`nacht: true` → `['frueh','nacht']`).

### fix

- **`rows.load` vereinheitlicht (Bug 1b):** Rows ohne `_id` werden jetzt als `_state: 'new'` geladen statt als `'unchanged'`. Nach dem Laden mit neuen Rows wird `_notifyChange()` aufgerufen → AutoSave-Timer startet. `loadSmart` ist damit funktional identisch zu `load` und bleibt als Deprecated-Alias erhalten.
- **AutoSave-Fehler persistiert (Bug 1a):** `saveResourceNow` ruft `updateLocalStorage()` jetzt auch im catch-Block auf. Error-Rows werden mit `__errorMessage`-Meta-Feld im localStorage gespeichert und überleben einen Jahreswechsel korrekt als `'error'`-State.
- **Stale `dataServer` bei Jahreswechsel beseitigt (Bug 2):** `syncLoadedYearResources` startet `dataServer` nicht mehr mit `initialDataServer` — das Objekt wird immer frisch als `{}` initialisiert. Konfliktdaten aus einem vorigen Jahres-Load können nicht mehr fälschlich in einen anderen Jahres-Load eingetragen werden.
- **AutoSave-Status nach Jahreswechsel sofort korrekt (Bug 3):** `loadUserDaten` ruft vor `rows.load` jetzt `cancelAllPending()` auf. Der Status-Indicator zeigt nach einem Reload nicht mehr fälschlich `'pending'`.

### test

- Unit-Tests für `rows.load`: `_state: 'new'` für Rows ohne `_id`, Regression für `'error'`- und `'deleted'`-Restauration, `_notifyChange`-Aufruf bei neuen Rows.
- Unit-Test für `syncLoadedYearResources`: kein stale `dataServer.X` nach Jahreswechsel ohne Konflikt für die jeweilige Ressource.
- `Login.LadeUserDaten.test.ts`: Assertion ergänzt, dass `cancelAllPending` vor dem Laden aufgerufen wird.

## 2026-06-13

### fix

- **Konfliktauflösung "Lokale Daten behalten":** Beim Wählen von "Lokale Daten behalten & speichern" werden nun zuerst Server-only-Rows der betroffenen Monate als `deleted` markiert (`reconcileRowsAsDeleted`), bevor die lokalen Rows für den AutoSave vorgemerkt werden. `flushAll()` (mit `includeDeletes=true`) ersetzt `publishEvent('data:changed')`, damit die Löschungen den Server auch tatsächlich erreichen.
- **`hasLre12TooClose` 08:00-Fenstergrenzen:** Die 10-Minuten-Sperre zwischen LRE 1/2-Einsätzen gilt jetzt nur noch innerhalb desselben 08:00–08:00-Bereitschaftsfensters. Ein LRE 1 vor 08:00 blockiert nicht mehr einen LRE 1 im nächsten Fenster (z. B. 08:16), wenn das vorherige LRE 1 um 07:45 startete.

### feat

- Admin-Tab Profile-Templates: Arbeitszeit im Manager-Ende-zu-Ende auf das neue Modell (`IVorgabenUaZ`) angehoben. Beim Laden wird Legacy-Format weiterhin migriert (`isLegacyArbeitszeit`/`migrateArbeitszeit`), beim Speichern wird das neue Objekt direkt in `template.Arbeitszeit` persistiert und bei deaktivierter Arbeitszeit der Block entfernt.
- Admin-Template-Editor/Manager-Wiring auf neue Arbeitszeit-Callbacks vereinheitlicht (`onUpdateArbeitszeit`, `onEnableArbeitszeit`), inklusive Aktivieren-Pfad fuer leere Arbeitszeit.
- Change-Detection fuer Profile-Template-Drafts stabilisiert: Arbeitszeitobjekte werden fuer den Vergleich deterministisch serialisiert.

### test

- `Login.LadeUserDaten.test.ts`: "Lokale Daten behalten"-Test auf async-Handler + `flushAllMock` umgestellt (statt `publishEventMock`).
- `test/Admin/profileTemplates.shared.test.ts` an den aktuellen Shared-Export angepasst (Legacy-`ARBEITSZEIT_FIELDS`-Annahme entfernt).
- Verifiziert mit: `bunx tsc --noEmit -p tsconfig.json` sowie `bun run test -- test/Admin.profileTemplates.shared.test.ts test/Admin/profileTemplates.shared.test.ts`.

## 2026-06-08

### feat

- **Per-Wochentag-Schichtmodell (`IVorgabenUaZ`):** 9 flache Zeitstrings (`bT`, `eT`, `eTF`, `bN`, `bBN`, `eN`, `bS`, `eS`, `rZ`) durch strukturiertes Modell ersetzt. `IPerWeekdaySchicht` fasst `default`, optionale `regelarbeitstage` und `overrides` pro ISO-Wochentag zusammen. `ISchichtZeiten` für Sonderschicht (flat). `BN`-Schicht nutzt jetzt `nacht`-Zeiten (`bBN` entfällt).
- **`resolveSchichtDay` + `groupBySchedule`:** Neue Resolver-Utilities in `core/types`. `resolveSchichtDay(schicht, isoWeekday)` liefert `SchichtBase | null` (null = arbeitsfrei). `groupBySchedule` fasst Tage mit identischem resolved config zusammen (Google-Maps-Stil).
- **`ArbeitszeiteingabePanel.tsx`:** Neue Preact-Komponente in `features/Einstellungen/components`. Ersetzt 9 statische DOM-Inputs in `#collapseTwo`. Sections für Früh-, Spät-, Nacht-, Sonderschicht mit Wochentag-Chips und per-Gruppe-Editierung. `+1 Tag`-Badge für overnight Schichten. Panel-State wird via `getArbeitszeitPanelState()` von `saveEinstellungen` gelesen.
- **`fieldMapper.ts` Migration:** `isLegacyArbeitszeit()` erkennt altes Flat-Format; `migrateArbeitszeit()` konvertiert inkl. `??''`-Fallback für fehlende Felder; `arbeitszeitToFlat()` konvertiert zurück für Backend-Kompatibilität.
- **EWT Modal-Optionen dynamisch:** `buildSchichtOptionen(vorgabenU)` in `createAddModalEWT.tsx` und `createEditorModalEWT.tsx` baut Schichtoptionen aus neuem `aZ`-Format (Früh/Nacht/BN/Sonder) dynamisch auf.
- **`calculateEwtEintraege`:** `resolveSchichtDay` für Früh- und Nachtschicht; bei EWT-Einträgen auf Nicht-Regelarbeitstagen (z. B. Sa/So) Fallback auf `default`-Config.
- **`calculateBereitschaftsZeiten`:** Hardcodierte Pausen durch `resolveSchichtDay(aZ.frueh, isoWeekday)` für Tagschichten ersetzt; Nachtpause via `aZ.nacht?.default.pause`.
- **Bereitschaft Frueh+Spaet Merge:** `calculateBereitschaftsZeiten` merged nun ueberlappende Tagesschichten pro Tag vor der Gap-Berechnung. Dadurch entstehen keine negativen Intervalle mehr bei Kombinationen wie `07:00-15:45` und `14:00-22:00`.
- **EWT explizite Spaetschicht:** Add-/Edit-Modal bieten bei konfigurierter `aZ.spaet` jetzt eine eigene Schichtoption `SP` (Spät). `calculateEwtEintraege` berechnet `SP` ueber `aZ.spaet` (mit Fallback).
- **Bereitschafts-Modal mit Override-Hinweis:** "Neue Bereitschaft eingeben" zeigt fuer das gewaehlte Datum die effektiven Schichtzeiten aus `VorgabenU.aZ` (inkl. Tages-Overrides) an.
- **Bereitschaft `schichtenOverrides` aktiv:** `submitBereitschaftsZeiten` uebergibt jetzt `vorgabenB[...].schichtenOverrides` an `calculateBereitschaftsZeiten`; die Aufloesung fuer Frueh/Spaet/Nacht nutzt gemergte Schichtkonfigurationen pro Wochentag. Zusaetzlich werden Schichtzeitpunkte DST-robust per `.set(hour/minute)` statt `add(Duration)` aufgebaut.
- **Spät/Nacht: aZ-first mit Modal-Override:** In "Neue Bereitschaft eingeben" werden Spät-/Nachtschichtzeiten primaer aus `VorgabenU.aZ` (inkl. `VorgabenB.schichtenOverrides`) geladen. Fuer Spät gibt es zusaetzliche Override-Felder im Modal; Nacht-Zeiten im Modal werden als Laufzeit-Override in die Berechnung uebernommen.
- **Override-Tag im Bereitschafts-Modal:** Spät- und Nacht-Overrides lassen sich jetzt explizit pro Wochentag (Mo-So) setzen (`overrides[isoWeekday]`), z. B. "Montag Nacht ab 21:00".

### fix

- **EWT-Download Schichtnormalisierung:** `download.ts` mappt `SP -> T` und `BN -> N` in der Download-Payload, damit der Export konsistente Backend-kompatible Schichtcodes verwendet.

### test

- `mockData.ts`, `EWT.ewtBerechnen.test.ts`, `EWT.utils.extra.test.ts`: `aZ` auf neues Format migriert.
- `EWT.test.ts`: BN-Einträge auf neue Nacht-Zeiten aktualisiert (BN nutzt nun `nacht.default.beginn` statt separatem `bBN`).
- `saveEinstellungen.test.ts`: DOM-Input-Loop für `aZ` entfernt; Panel-State-Fallback-Test statt Pflichtfeld-Wurf.
- `fieldMapper.test.ts`: Assertions auf neues `IVorgabenUaZ`-Format; `migrateArbeitszeit`-Fallback für leere Felder abgedeckt.
- `apiService.test.ts`: `aZ` auf neues Format aktualisiert.

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
