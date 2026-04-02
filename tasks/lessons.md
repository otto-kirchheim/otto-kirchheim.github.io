# Lessons Learned

- Frontendspezifische Regeln immer mit konkreten Datei- und Pfadangaben hinterlegen.
- Snapshot-Tests mit Datumswerten immer in der gleichen TZ wie das Test-Script aktualisieren, um Drift zwischen Einzel- und Volllauf zu vermeiden.
- Bei Legacy-Monatsmappings in Tests explizite `Record<number, ...>`-Typen nutzen, wenn Produktivcode auf flache Arrays umgestellt wurde.
- Bei Save-Flows nie nur lokale Tabellen-/Formwerte weiterführen: serverseitig normalisierte Responses (z.B. stille Datums-Korrekturen) müssen zurück in UI-State und Storage gespiegelt werden, sonst entstehen Stale-Views bis zum Re-Login.
