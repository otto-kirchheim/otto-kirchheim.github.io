# Changelog (Frontend)

Dieses Changelog dokumentiert Aenderungen im Frontend.

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
