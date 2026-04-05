# Lessons Learned

- Frontendspezifische Regeln immer mit konkreten Datei- und Pfadangaben hinterlegen.
- Snapshot-Tests mit Datumswerten immer in der gleichen TZ wie das Test-Script aktualisieren, um Drift zwischen Einzel- und Volllauf zu vermeiden.
- Bei Legacy-Monatsmappings in Tests explizite `Record<number, ...>`-Typen nutzen, wenn Produktivcode auf flache Arrays umgestellt wurde.
- Bei Save-Flows nie nur lokale Tabellen-/Formwerte weiterführen: serverseitig normalisierte Responses (z.B. stille Datums-Korrekturen) müssen zurück in UI-State und Storage gespiegelt werden, sonst entstehen Stale-Views bis zum Re-Login.
- Bei wiederholter Formularvalidierung vor jedem `checkValidity()` alte `setCustomValidity(...)`-Fehler mit `setCustomValidity('')` zurücksetzen, sonst bleibt ein Feld nach der Korrektur fälschlich `is-invalid`.
- Bei EWT-Nacht-/BN-Schichten `tagE` immer als Starttag der Schicht behandeln; der Buchungstag kippt erst über die Verteilung vor/nach Mitternacht auf den Folgetag. Keinen künstlichen Vortag als Startanker einführen, sonst wird `buchungstagE` falsch berechnet. Immer mit Regressionstest absichern.
- Wenn `persist*`-Utilities Daten normalisieren (z.B. `buchungstagE`), die normalisierten Werte nicht nur in `Storage`, sondern auch zurück in die Live-`CustomTable`-Zeilen schreiben; sonst bleibt die UI bis zum Reload stale.
- Bei Bun-Tests mit Vitest-kompatiblen Helfern (`vi.hoisted`, `setSystemTime`, Mock-`fetch`) früh mit expliziten Type-Casts/Compat-Aliases arbeiten; sonst sind die Laufzeit-Helfer zwar vorhanden, aber `tsc` meldet unnötige Typfehler.
- Download-/API-Tests sollen bei gewachsenen Config-Objekten (`VorgabenGeld`) nur fachlich relevante Teilmengen mit `expect.objectContaining(...)` prüfen statt die komplette Objektform hart zu verdrahten; sonst brechen sie bei legitimen Default-Feldern als Altlast weg.
- Dynamisch erzeugte Frontend-Buttons in Formularen (z.B. `CustomTable`) immer explizit mit `type="button"` anlegen; sonst kann `Enter` im Accordion/Formular den ersten Tabellen-Action-Button statt des gewünschten UI-Elements auslösen.
- Release-Deploy-Ketten mit Versionsbump muessen den neuen `package.json`-Stand erst auf dem Source-Branch committen/pushen, bevor ein Deploy-Script mit Clean-Working-Tree-Check startet; sonst blockiert der frische Versionsbump den Deploy direkt wieder.
- Der explizite Klick auf „Mit Passkey“ darf nicht den Conditional-UI-/Autofill-Flow (`useBrowserAutofill: true`) verwenden; für den Button-Flow muss immer die direkte WebAuthn-Abfrage gestartet werden, sonst passiert bei leerem Benutzernamen sichtbar nichts.
