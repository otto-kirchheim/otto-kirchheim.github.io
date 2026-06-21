# Plan: Admin-Tab Profile-Template Arbeitszeit-Migration (Unterbrechungsstand 2026-06-08)

## Ziel und Hintergrund

Der Admin-Tab fuer Profile-Templates nutzt fuer den Bereich Arbeitszeit noch Legacy-Logik mit flachen Feldern.
Die Einstellungen-Seite arbeitet bereits mit dem neuen Schichtmodell (`IVorgabenUaZ`) inklusive:

- Frueh-/Spaet-/Nacht-/Sonder-Schicht
- Regelarbeitstagen
- Tages-Overrides (`overrides` pro ISO-Wochentag)
- einheitlicher Bedienlogik im `ArbeitszeiteingabePanel`

Ziel ist, die Profile-Template-Bearbeitung auf dasselbe Modell und dieselbe UX zu bringen.

## Gewuenschter Ablauf (fachlich verbindlich)

1. Eingabe/Aendern von Arbeitszeit im Admin-Tab -> Profile-Template.
2. Eingabe/Aendern von Bereitschaftszeiten im Admin-Tab -> Profile-Template.
3. Benutzer laedt Standard-Bereitschaftszeit bzw. bearbeitet seine Arbeitszeit (dies ist die Basis des Benutzers).
4. Benutzer bearbeitet bei Bedarf Arbeitszeit oder Bereitschaftszeit mit eigenen Overrides/Zeiten.
5. Benutzer moechte Bereitschaftszeit eingeben:
  - `VorgabenB` definiert, wann Bereitschaften grundsaetzlich stattfinden.
  - Diese Werte werden mit Daten aus `VorgabenU.aZ` aufgefuellt.
  - Danach greifen gesetzte Arbeitszeit-Overrides.
  - Danach greifen zusaetzliche lokale Overrides im Modal.
  - Sonderfall: Wenn z. B. das Bereitschaftsende auf Freitag liegt, wird die benoetigte Zeit aus Arbeitszeit geladen und angepasst.
  - Ausnahme: Bei aktivem "Zeiten manuell anpassen" hat die manuelle Eingabe Vorrang (inkl. bereits gesetzter lokaler Overrides).

## Zielbild (Definition of Done)

- Admin-Tab -> Profile-Template -> Arbeitszeit zeigt denselben Editor wie Einstellungen.
- Arbeitszeit wird im Template intern als `IVorgabenUaZ` gehalten.
- Legacy-Input aus dem Backend wird beim Laden weiterhin migriert (`isLegacyArbeitszeit` + `migrateArbeitszeit`).
- Beim Speichern wird das neue Arbeitszeitobjekt sauber in `template.Arbeitszeit` geschrieben.
- Kein Regressionsfehler in TypeScript oder betroffenen Tests.
- Das Eingabefenster "Neue Bereitschaft eingeben" nutzt dieselbe Override-Logik (taggenaue Overrides) wie das Arbeitszeitmodell.
- Im Eingabefenster "Neue Bereitschaft eingeben" gilt fuer Schichtzeiten die Prioritaet:
  1. Standard aus `VorgabenU.aZ`
  2. Danach gesetzte Overrides aus Einstellungen `VorgabenB.schichtenOverrides`
  3. Danach lokale Overrides aus dem aktuell offenen Modal
  4. Bei aktivem "Zeiten manuell anpassen" haben manuelle Feldwerte Vorrang vor automatischer Nachladung

## Scope

In Scope:

- `frontend/src/ts/features/Admin/components/AdminProfileTemplatesManager.tsx`
- `frontend/src/ts/features/Admin/components/AdminProfileTemplateContentEditor.tsx`
- `frontend/src/ts/features/Admin/components/profileTemplates.shared.ts`
- `frontend/src/ts/features/Einstellungen/components/ArbeitszeiteingabePanel.tsx`
- `frontend/CHANGELOG.md`

Out of Scope:

- Backend-API-Contract-Aenderungen
- AdminJS (separater Pfad)
- Allgemeine Refactors ausserhalb Arbeitszeit/Profile-Template

## Bereits umgesetzt

- `ArbeitszeiteingabePanel` hat jetzt optionales `onChange`, damit der Panel-Status kontrolliert weitergereicht werden kann.
- `TemplateContentDraft.Arbeitszeit` wurde von `Record<string, string>` auf `IVorgabenUaZ | null` umgestellt.
- `AdminProfileTemplateContentEditor` zeigt statt Legacy-Inputliste den `ArbeitszeiteingabePanel` und hat einen Aktivieren-Pfad, falls Arbeitszeit leer ist.

## Offene Arbeitspakete

### AP1: Manager-Datenpfad auf neues Modell fertigziehen

Datei: `frontend/src/ts/features/Admin/components/AdminProfileTemplatesManager.tsx`

Offen:

- `normalizeTemplateContent`:
  - `Arbeitszeit` auf `IVorgabenUaZ | null` normalisieren
  - Legacy-Objekte mit `isLegacyArbeitszeit`/`migrateArbeitszeit` abfangen
- `serializeDraft`:
  - Arbeitszeitobjekt deterministisch mit serialisieren, damit Change-Detection stabil bleibt
- `buildTemplatePayload`:
  - neues Arbeitszeitobjekt schreiben
  - bei `null` den Block entfernen
- Handler umstellen:
  - `updateArbeitszeitField` entfernen
  - neue Handler `updateArbeitszeit` und `enableArbeitszeit` einbauen

Akzeptanz:

- Keine alten `Arbeitszeit[field]`-Zugriffe mehr im Manager
- Save-Payload enthaelt nur das neue Arbeitszeitformat

### AP2: Editor-Prop-Wiring finalisieren

Datei: `frontend/src/ts/features/Admin/components/AdminProfileTemplateContentEditor.tsx`

Offen:

- Sicherstellen, dass nur noch neue Props genutzt werden:
  - `onUpdateArbeitszeit`
  - `onEnableArbeitszeit`
- Restliche Legacy-Referenzen entfernen

Akzeptanz:

- Komponente kompiliert ohne Typ-Workarounds
- Keine verwaisten Legacy-Props im `Props`-Typ

### AP3: Qualitaetssicherung und Dokumentation

Offen:

- Typecheck: `bunx tsc --noEmit -p tsconfig.json`
- Relevante Tests:
  - `bun run test -- test/Admin.profileTemplates.shared.test.ts`
  - optional weitere betroffene Admin-Tests, falls Typen/Mapping angepasst wurden
- Changelog-Eintrag ergaenzen (`frontend/CHANGELOG.md`)
- Verhalten im Fenster "Neue Bereitschaft eingeben" explizit verifizieren:
  - Standardwerte kommen aus `VorgabenU.aZ`
  - Bei gesetzten `VorgabenB`-Overrides werden diese ueber den Standard gelegt
  - Lokale Modal-Overrides haben die hoechste Prioritaet und uebersteuern nur den gewaehlten Tag

Akzeptanz:

- Kein neuer TS-Fehler
- Tests im geaenderten Scope gruen
- Changelog dokumentiert den Umbau
- Prioritaetsreihenfolge der Zeitquellen ist im Laufzeitverhalten nachweisbar korrekt

## Risiken und Hinweise

- Change-Detection-Risiko:
  - Wenn `serializeDraft` Arbeitszeit nicht stabil sortiert/abbildet, kann `hasChanges` falsch triggern.
- Legacy-Risiko:
  - Manche Templates koennen noch flat gespeichert sein; Migration beim Laden muss robust bleiben.
- UX-Risiko:
  - `ArbeitszeiteingabePanel` darf im Admin nicht unbeabsichtigt globale Einstellungen beeinflussen.
  - Der Panel-State muss nur ueber Props/Callbacks im Admin-Editor laufen.
- Konsistenzrisiko Bereitschafts-Modal:
  - Wenn Quelle/Prioritaet fuer Schichtzeiten nicht eindeutig ist, koennen falsche Start-/Endzeiten entstehen.
  - Deshalb muss die Reihenfolge `VorgabenU.aZ -> VorgabenB-Overrides -> lokale Modal-Overrides` explizit getestet bleiben.

## Wiedereinstieg (konkret)

1. `AdminProfileTemplatesManager.tsx` fertig migrieren (AP1 komplett).
2. `AdminProfileTemplateContentEditor.tsx` Prop-Wiring pruefen und aufraeumen (AP2).
3. Typecheck + Tests laufen lassen (AP3).
4. Changelog aktualisieren.

## Verifikation (Befehle)

- `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bunx tsc --noEmit -p tsconfig.json`
- `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/Admin.profileTemplates.shared.test.ts`

Manuelle Verifikationsfaelle (Bereitschafts-Modal):

- Fall A: Keine Overrides gesetzt -> angezeigte Zeiten entsprechen `VorgabenU.aZ`.
- Fall B: `VorgabenB.schichtenOverrides` gesetzt -> Anzeige/Berechnung nutzt diese statt Standard.
- Fall C: Lokaler Modal-Override (z. B. Montag Nacht 21:00) gesetzt -> uebersteuert nur den gewaehlten Tag und hat Vorrang.
- Fall D: "Zeiten manuell anpassen" aktiv -> keine automatische Ruecksetzung durch Datum-/Vorgabenwechsel, solange manuell aktiv.
- Fall E: Bereitschaftsende auf Freitag -> korrekte Nachladung der benoetigten Arbeitszeitwerte fuer Freitag.

## Offene Kurzfragen vor Umsetzung (nur falls unklar)

- Soll bei aktivem "Zeiten manuell anpassen" ein Wechsel der `VorgabeB` die manuell gesetzten Werte komplett unangetastet lassen?
- Sollen lokale Modal-Overrides nur fuer den aktuellen Speichervorgang gelten (nicht persistent), waehrend `VorgabenB.schichtenOverrides` persistent bleiben?

Optional bei groesseren Delta-Aenderungen:

- `cd /home/jan/Dokumente/DB-Nebengeld/frontend && bun run test -- test/Admin*.test.ts`

## Zuletzt bearbeitete Dateien

- `frontend/src/ts/features/Einstellungen/components/ArbeitszeiteingabePanel.tsx`
- `frontend/src/ts/features/Admin/components/profileTemplates.shared.ts`
- `frontend/src/ts/features/Admin/components/AdminProfileTemplateContentEditor.tsx`

## Nächste Datei fuer die Fortsetzung

- `frontend/src/ts/features/Admin/components/AdminProfileTemplatesManager.tsx`
