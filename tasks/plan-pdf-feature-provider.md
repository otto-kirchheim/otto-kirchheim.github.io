# Plan: PDF-Abgeleitete-Werte als Feature-Provider statt zentraler Ableitung

> **Aufgegangen in `tasks/plan-fsd-feature-module.md` (Phase P1d).** Dort gilt: `modus`/`formular`/`dateiPraefix` in `meta`, `baueDaten` im lazy Feature-Modul-Teil `pdf`, Slice-Keys `ber|ewt|ez|ea`. Die Schritte unten bleiben inhaltlich gültig.

## Context

`frontend/src/ts/infrastructure/pdf/abgeleiteteWerte.ts` (311 Z.) berechnet beim Druck alle vorberechneten
Werte (EWT-Dauern/Zeitband-Häkchen, BZ/BE-Dauer, PrivatKmBetrag, EZ-Arbeitszeit, Bereitschaftszulage, Zulagen-Geldwerte).
`infrastructure/data/generatePDF.ts` (Z. 130-235) hat dafür einen `switch (modus)` über `B/E/N/EA`, der pro Ressource
Tabellenzeilen liest, Basisfelder formt und `…AbgeleiteteWerte()` draufmischt. Domänenwissen von 4 Features (Bereitschaft, EWT, Neben, EA)
steckt damit zentral in `infrastructure` — eine neue Ressource/ein neues Abgeleitetes Feld erfordert Änderung an generatePDF + abgeleiteteWerte + pdfDaten + datenKatalog.

Ziel (User): Die Ableitung liegt **im jeweiligen modularen Feature** und **taucht automatisch für die PDF-Funktionen auf**; `generatePDF`/PDF-Pipeline kennen
kein Feature mehr. Muss zum parallelen FSD-Plan (`~/.claude/plans/analysiere-die-frontend-folder-smooth-possum.md`) passen: Slices registrieren sich
per `featureLifecycleRegistry.registerFeature()` (P1 erweitert `FeatureRegistration` um deklarative Felder); Import nur abwärts, kein Page→Page.

Stored rows bleiben unverändert (nur Roh-Eingaben) — keine Persistenz, kein Backend/shared-Typ, keine Migration.

## Design

**Neues optionales Feld an `FeatureRegistration`** (`core/hooks/featureLifecycle.ts`, passt zur P1-Tabelle als weitere Zeile):

```ts
pdf?: {
  modus: 'B' | 'E' | 'N' | 'EA';           // Schlüssel wie bisher in generatePDF
  formular: string;                         // 'bereitschaft' | 'ewt' | 'ez' | 'ea' (ersetzt FORMULAR_JE_MODUS)
  dateiPraefix: string;                     // 'RB' | 'Verpf.' | 'EZ' | 'Entgeltausgleich' (ersetzt vorDateiName)
  /** Liefert den Nutzdaten-Teil (`Daten` + ggf. Top-Level wie `Bereitschaftszulage`), inkl. vorberechneter Felder. */
  baueDaten(ctx: PdfDatenKontext): Record<string, unknown>;
};
```

`PdfDatenKontext` = `{ monat, jahr, vorgabenU, vorgabenGeld /* Monat */ }`; `tableToArray`/`filterByMonat`-Lesen macht der Provider selbst
(er kennt seine Tabelle). Registry bekommt `getPdfProvider(modus)` (Lookup über `features`), Fehler bei unbekanntem Modus wie heute (`'Modus fehlt'`).

`generatePDF.ts` schrumpft auf: Basis (`VorgabenU/Pers/Name/OE-Split`, `VorgabenGeld`, `Monat`, `Jahr`) → `getPdfProvider(modus).baueDaten(ctx)` mergen →
Signatur/`ladeUndErzeugePdf`/`saveAs`/Dateiname (mit `dateiPraefix`, `formular`).

**Verteilung der Ableitungen** (pure Funktionen bleiben unverändert, nur Datei/Slice wechselt):

| Funktion (heute `pdf/abgeleiteteWerte.ts`) | Neu |
|---|---|
| `dauerMinuten`, `ewtAbgeleiteteWerte` + Zeilen-Mapping `case 'E'` (Einsatzort-Beschreibung, Schicht-Normalisierung, HH:mm-Format) | `features/EWT/utils/pdfDaten.ts`, Registrierung in `features/EWT/index.tsx` |
| `bzAbgeleiteteWerte`, `beAbgeleiteteWerte`, `bereitschaftszulageAbgeleiteteWerte` + `case 'B'` (inkl. Privat-km-Satz, live-Differenz BZ-BE) | `features/Bereitschaft/utils/pdfDaten.ts`, `Bereitschaft/index.tsx` |
| `ezAbgeleiteteWerte` + `case 'N'` | `features/Neben/utils/pdfDaten.ts`, `Neben/index.tsx` |
| `case 'EA'` (keine Ableitung, nur Feld-Mapping) | `features/EA/utils/pdfDaten.ts`, `EA/index.tsx` |
| `geldwertZulagenCode`, `bereinigteZulagenStunden` (Zulagen-Domänenregel je Code, gleiche Formel wie `N_ZULAGEN_CALC`) | eigenes Modul `zulagenWerte.ts` neben `features/Einstellungen/utils/zulagenCatalog.ts` (P4 zieht beide nach `shared/config`); Formel-Duplikat mit `calculateBerechnungRows.ts` als Folge-Refactoring vermerken, **nicht** jetzt anfassen |
| `summeGeldwertGruppe`, `summeBereinigtGruppe`, `zulagenEintraegeGruppe` | bleiben in `infrastructure/pdf` (→ `features/pdf-export`), z. B. `pdf/zulagenSummen.ts`: sie hängen an Renderer-Konzepten (`ListenGruppe`, `$seite/$bisher`-Kontext, Seitenaufteilung) und können nicht vorab pro Feature berechnet werden; sie rufen nur die Domänenregel aus `zulagenWerte.ts` |

`infrastructure/pdf/abgeleiteteWerte.ts` entfällt danach. Typen in `pdfDaten.ts` (`IPdf…`) bleiben Vertrag der PDF-Pipeline; Provider importieren sie (Feature → Pipeline
ist heute erlaubt; im FSD-Ziel `pages → features/pdf-export` abwärts, ebenfalls korrekt). `aggregatoren.ts`-Helfer (`alsMinuten`, `FORMAT`, `ZEILEN_OPS`) bleiben dort, Provider importieren sie.

**Registrierung/Reihenfolge:** Provider hängt am bestehenden `registerFeature`-Aufruf jedes Features (Side-Effect-Import in `main.tsx`/Init bleibt; FSD-Plan-Risiko „Tree-Shaking von Registrierungen“ gilt unverändert). Keine neue Init-Reihenfolge nötig, weil `baueDaten` erst beim Klick auf Download läuft.

## Abgrenzung zum FSD-Plan

- Kein Datei-Move durch mich; Neuanlage `pdfDaten.ts` je Feature in **heutigen** Ordnern (`features/<X>/utils/`). Beim späteren IDE-Move (P7/P8) ziehen sie mit.
- P1-Tabelle im FSD-Plan um Zeile `pdf` ergänzen (ein Satz) — Plan-Datei des FSD-Plans nicht umbauen, nur Hinweis.
- Aufgabe ist unabhängig von P0; kann vor P1 laufen (zusätzliches Feld ist abwärtskompatibel). Wenn P1 zuerst landet: gleiche Änderung, nur Feld liegt dann neben `getDaten/applyDaten`.

## Schritte (mit Verifikation je Schritt)

1. `tasks/todo.md` lesen, Punkte eintragen. Baseline: `bun run typecheck && bun run lint && bun test` (Testanzahl notieren).
2. Registry: `pdf`-Feld + `getPdfProvider` in `core/hooks/featureLifecycle.ts`; Unit-Test in vorhandenem Registry-Test (Lookup, unbekannter Modus, Duplikat-Modus → Warnung/Fehler).
3. `zulagenWerte.ts` anlegen (Verschieben von `geldwertZulagenCode`/`bereinigteZulagenStunden`), `wert.ts`/Summen-Datei importieren von dort.
4. Je Feature `pdfDaten.ts` (Code 1:1 aus `generatePDF` + `abgeleiteteWerte`), Registrierung in `index.tsx`. Reihenfolge: EA (trivial) → Neben → EWT → Bereitschaft.
5. `generatePDF.ts` auf generischen Ablauf umbauen; `FORMULAR_JE_MODUS`/`vorDateiName` entfallen.
6. `abgeleiteteWerte.ts` löschen; Tests mitziehen: `test/infrastructure/pdf/abgeleiteteWerte.test.ts` (392 Z.) aufteilen in `test/EWT.pdfDaten.test.ts`, `test/Bereitschaft.pdfDaten.test.ts`, `test/Neben.pdfDaten.test.ts`, `test/infrastructure/pdf/zulagenWerte.test.ts` (Testinhalte unverändert, nur Import-Pfade); `test/Utilities/generatePDF.test.ts` (516 Z.) läuft unverändert weiter (Ausgabe-Vertrag).
7. Kommentare/Docs anpassen: Verweise auf `abgeleiteteWerte.ts` in `pdf/pdfDaten.ts` (Z. 54-120) und `FormularEditor/datenKatalog.ts` (Z. 149, 227, 242, 293, 378); `.claude/CLAUDE.md` (Root, PDF-Pipeline-Abschnitt) nennt nur `datenKatalog.ts` — Hinweis ergänzen, dass abgeleitete Felder im Feature-`pdfDaten.ts` leben und `datenKatalog` von Hand nachziehen muss.
8. `frontend/CHANGELOG.md` Eintrag; nach Meilenstein Review-Abschnitt in `tasks/todo.md`; `bun run format` vor Commit; `graphify update .`. Commit-Vorschlag nur mit Rückfrage, kein Co-Authored-By.

## Verifikation

- `bun run typecheck && bun run lint && bun test` — Testanzahl ≥ Baseline; `test/Utilities/generatePDF.test.ts` unverändert grün (beweist identische `data`-Struktur pro Modus).
- `grep -rn "abgeleiteteWerte" src test` → nur noch Kommentare/Changelog, kein Import.
- `grep -rn "features/" src/ts/infrastructure/data/generatePDF.ts` → leer (kein Feature-Import in generatePDF).
- Manuell (Skill `verify`, Dev-Server des Users auf :8080 wiederverwenden): je ein PDF für B, E, N, EA erzeugen; Dauer-Spalten, Zeitband-Häkchen, Bereitschaftszulage-Zwischenwerte, Zulagen-Summenzeilen gegen Stand vor der Änderung vergleichen.

## Offene Punkte (nicht Teil dieses Umbaus)

- `datenKatalog.ts` (Editor-Feldliste) bleibt handgepflegt; ein Feature könnte künftig seine abgeleiteten Felder deklarieren (`pdf.felder`), dann entfiele die Doppelpflege. Eigener Folgeschritt.
- Duplizierte Zulagen-Formel `N_ZULAGEN_CALC` ↔ `geldwertZulagenCode`: nach diesem Umbau in `zulagenWerte.ts` zusammenführen.
