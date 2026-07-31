# Lessons Learned

- Bei lokalen Ueberschneidungs-/Duplikat-/Verknuepfungs-Checks NIE gegen den rohen
  Storage-Snapshot der vier Resource-Getter (`getBereitschaftsZeitraumDaten`,
  `getBereitschaftsEinsatzDaten`, `getEwtDaten`, `getNebengeldDaten`) pruefen, ohne
  `__localState === 'deleted'` auszuschließen — der Snapshot enthaelt auch lokal bereits
  geloeschte, aber noch nicht synchronisierte Zeilen. Sonst blockiert die eigene, gerade erst
  geloeschte Zeile z. B. das Anlegen eines ueberschneidenden Ersatzes. Der erste Fix (2026-07-30)
  patchte das nur inline an zwei Call-Sites (BZ-/EWT-Modal) und uebersah dadurch sieben weitere
  betroffene Stellen (BE-Overlap/LRE-Checks, BZ-Delete-Guard, BZ-Coverage, N-Tag-Disable,
  EWT-Verknuepfung, naechster-freier-Tag, Zulagen-Jahressumme) — Folge-Fix (2026-07-31) daher an
  der Wurzel: `IDataQueryOptions.excludeDeleted?: boolean` auf allen vier Gettern. Bei jeder
  Validierung/Berechnung, die einen dieser Getter aufruft, IMMER `excludeDeleted: true` pruefen
  (nur Tabellen-Init/-Reload braucht die geloeschten Zeilen, fuer Undo-Anzeige). AutoSave sendet
  Loeschungen bewusst nie automatisch mit (nur manuelles Speichern) — ein zusätzlicher Guard
  (`infrastructure/autoSave/overlapGuard.ts`) haelt daher auch AutoSave-Sends zurueck, die sich
  serverseitig noch mit einer ungesyncten Loeschung ueberschneiden wuerden, statt einen
  vermeidbaren 422 zu riskieren.
- Bei `Rows.getChanges()`/`_commitCreateAndUpdate()` (CustomTable.ts) NIE einzelne Zeilen aus
  einem AutoSave-Batch herausfiltern, ohne die Index-Zuordnung zu pruefen: `createIdx` zaehlt
  ueber die EFFEKTIVE Zeilen-Reihenfolge (inkl. Fehler-Zeilen via `_errorState`-Fallback), waehrend
  `createdIds`-Maps aus `changeTracking.ts` auf der tatsaechlich GESENDETEN Reihenfolge basieren.
  Eine Zeile aus dem Payload zu entfernen, ohne sie auch aus dieser Zaehlung auszuschließen,
  verschiebt die ID-Zuordnung fuer alle nachfolgenden Zeilen (stiller Datenverlust moeglich). Bei
  einem client-seitigen Vorab-Block lieber die GANZE Ressource fuer den Zyklus zurueckhalten
  (kein `sendBulk`-Aufruf) statt eine Zeile chirurgisch aus einem sonst unveraenderten Batch zu
  entfernen.
- Datumskonvention gilt auch für Chart-Mathematik und Anzeige-Formatierung: NIEMALS `new Date(...)`, `.getTime()`, `.toLocaleString()` oder UTC-Getter verwenden — immer `dayjs` aus `@/infrastructure/date/configDayjs` (`valueOf()` statt `getTime()`, `format()` statt `toLocaleString()`, `dayjs.utc()` statt `getUTC*()`; utc-Plugin ist in configDayjs geladen). Vor Übergabe neuer Komponenten `grep -rn "new Date" src/ts` laufen lassen — die Regel wurde in den Admin-Komponenten (Dashboard, LogBrowser, ResourceBrowser) mehrfach übersehen.
- Bei Onboarding-Schritten, die direkt nach dem Rendern Tab-/Accordion-Navigation ausloesen, keine unnötigen Dynamic-Imports in der Sprungfunktion verwenden; fuer deterministisches Timing (und stabile Tests) Bootstrap-Module direkt importieren.
- Bei `CustomTable.rows.load(...)` in Monatsansichten nie nur den aktuell sichtbaren Monatsausschnitt laden, wenn spätere Monatswechsel weiter auf derselben Tabelleninstanz filtern. Der `rows.array`-State muss den vollständigen geladenen Jahresbestand behalten; sonst verschwinden andere Monate nach `Berechnen` scheinbar aus der UI.
- Bei Act-As-/"fremde Daten"-Flows immer eine persistente, gut sichtbare UI-Anzeige plus schnellen Rückweg zu den eigenen Daten anbieten; Statuswechsel am besten zentral per CustomEvent/Storage-Sync an Banner und Admin-UI broadcasten.
- Frontendspezifische Regeln immer mit konkreten Datei- und Pfadangaben hinterlegen.
- Snapshot-Tests mit Datumswerten immer in der gleichen TZ wie das Test-Script aktualisieren, um Drift zwischen Einzel- und Volllauf zu vermeiden.
- Bei Legacy-Monatsmappings in Tests explizite `Record<number, ...>`-Typen nutzen, wenn Produktivcode auf flache Arrays umgestellt wurde.
- Bei Save-Flows nie nur lokale Tabellen-/Formwerte weiterführen: serverseitig normalisierte Responses (z.B. stille Datums-Korrekturen) müssen zurück in UI-State und Storage gespiegelt werden, sonst entstehen Stale-Views bis zum Re-Login.
- Bei wiederholter Formularvalidierung vor jedem `checkValidity()` alte `setCustomValidity(...)`-Fehler mit `setCustomValidity('')` zurücksetzen, sonst bleibt ein Feld nach der Korrektur fälschlich `is-invalid`.
- Bei EWT-Nacht-/BN-Schichten `tagE` immer als Starttag der Schicht behandeln; der Buchungstag kippt erst über die Verteilung vor/nach Mitternacht auf den Folgetag. Keinen künstlichen Vortag als Startanker einführen, sonst wird `buchungstagE` falsch berechnet. Immer mit Regressionstest absichern.
- Bei EWT-Einträgen, die über den `buchungstagE` in einem anderen Monatsfilter sichtbar sind, im Editor niemals `Jahr/Monat` aus dem aktiven Filter mit `date()` neu zusammensetzen; für bestehende Zeilen immer das vollständige `row.cells.tagE` als Referenzdatum verwenden.
- Wenn `persist*`-Utilities Daten normalisieren (z.B. `buchungstagE`), die normalisierten Werte nicht nur in `Storage`, sondern auch zurück in die Live-`CustomTable`-Zeilen schreiben; sonst bleibt die UI bis zum Reload stale.
- Tests für `persist*TableData()` müssen bei monatserhaltendem Merge echte Tabellenzeilen (`getRows()` plus `rows.getFilteredRows()`) mocken; ein nacktes `{}` oder nur `tableToArray()` spiegelt den aktuellen Persistenzpfad nicht mehr korrekt wider.
- Bei Bun-Tests mit Vitest-kompatiblen Helfern (`vi.hoisted`, `setSystemTime`, Mock-`fetch`) früh mit expliziten Type-Casts/Compat-Aliases arbeiten; sonst sind die Laufzeit-Helfer zwar vorhanden, aber `tsc` meldet unnötige Typfehler.
- Download-/API-Tests sollen bei gewachsenen Config-Objekten (`VorgabenGeld`) nur fachlich relevante Teilmengen mit `expect.objectContaining(...)` prüfen statt die komplette Objektform hart zu verdrahten; sonst brechen sie bei legitimen Default-Feldern als Altlast weg.
- Dynamisch erzeugte Frontend-Buttons in Formularen (z.B. `CustomTable`) immer explizit mit `type="button"` anlegen; sonst kann `Enter` im Accordion/Formular den ersten Tabellen-Action-Button statt des gewünschten UI-Elements auslösen.
- Release-Deploy-Ketten mit Versionsbump muessen den neuen `package.json`-Stand erst auf dem Source-Branch committen/pushen, bevor ein Deploy-Script mit Clean-Working-Tree-Check startet; sonst blockiert der frische Versionsbump den Deploy direkt wieder.
- Der explizite Klick auf „Mit Passkey“ darf nicht den Conditional-UI-/Autofill-Flow (`useBrowserAutofill: true`) verwenden; für den Button-Flow muss immer die direkte WebAuthn-Abfrage gestartet werden, sonst passiert bei leerem Benutzernamen sichtbar nichts.
- Frontend-Session-Restore nie nur an `Benutzer`/`BenutzerRolle` koppeln: ohne `AccessToken` oder `RefreshToken` darf keine aktive Session angenommen werden, sonst produziert der App-Start 401-Kaskaden und ungefangene Admin-Requests.
