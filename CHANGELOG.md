# Changelog (Frontend)

Dieses Changelog dokumentiert Aenderungen im Frontend.

## 2026-08-22 (20)

### feat (PDF-Vorlagen-Pipeline: Privat-km-Betrag für Bereitschaftseinsatz)

Bereitschaftseinsatz (BE) bekam bisher nur `PrivatKm` als reine Kilometerzahl im Formular --
fehlender €/Ct-Betrag daraus. Analog zu `PrivatKmBetrag = km * Satz` in
`Berechnung/calculateBerechnungRows.ts` (Tarifkraft/Beamter haben unterschiedliche Sollwerte).

- **`infrastructure/data/download.ts`:** `modus === 'B'` bestimmt `beamter` (`TB !== 'Tarifkraft'`,
  gleiche Konvention wie bei EWT) und liest den passenden Satz aus `VorgabenGeld[Monat]`
  (`PrivatPKWTarif`/`PrivatPKWBeamter`), reicht ihn an `beAbgeleiteteWerte()` weiter.
- **`FormularEditor/datenKatalog.ts`:** neuer Eintrag `PrivatKmBetrag` (Gruppe "Berechnet", Quelle
  `Daten.BE`, Format-Vorschlag `waehrung`).
- **`test/Utilities/download.test.ts`:** `modus 'B'`-Tests um `PrivatKmBetrag` ergänzt, inkl. eigenem
  Test für den Beamter-Satz (TB ≠ Tarifkraft).

Verifiziert: `tsc`/Lint sauber, 1597/1597 -- siehe Root-`CHANGELOG.md` für die `shared`-Änderung
(`beAbgeleiteteWerte()`).

## 2026-08-22 (19)

### refactor (download.ts: formular-Zuordnung als Mapped Type, toter Kommentar entfernt)

Reine Code-Qualitaet, kein Verhaltensaenderung.

- `infrastructure/data/download.ts`: die Ternary-Kette (`modus === 'EA' ? 'ea' : modus === 'E' ?
  'ewt' : 'bereitschaft'`) durch ein `{ [key in typeof modus]: string }`-Lookup ersetzt, analog dem
  bestehenden `vorDateiName`-Muster weiter unten in derselben Datei. `typeof modus` greift dort die
  durch die vorausgehende `if`-Bedingung genarrowte Union (`'EA'|'E'|'B'`) ab -- kommt kuenftig ein
  vierter Modus zur Bedingung dazu, ohne das Lookup-Objekt nachzuziehen, ist das ein Compile-Error
  statt eines stillen Fallbacks auf den letzten Ternary-Zweig.
- Eine versehentlich mitcommittete auskommentierte Alternativzeile (`.includes()`-Variante aus dem
  vorherigen Review-Vergleich) entfernt.

Verifiziert: `tsc`/Lint sauber, `download.test.ts` 18/18, volle Suite 1596/1596.

## 2026-08-22 (18)

### fix (PDF-Vorlagen-Pipeline: Bereitschaft-Dauer als Minuten, Labels disambiguiert)

Nachtrag zu Eintrag 17, User-Korrektur. `Dauer` (BZ/BE) ist jetzt `number` (Minuten) statt
`"HH:mm"`-Text -- siehe Root-`CHANGELOG.md` fuer den vollen Kontext (`shared`-Aenderung).

- **`FormularEditor/datenKatalog.ts`:** Labels der beiden `Dauer`-Eintraege in
  `ZEILEN_FELDER.bereitschaft` waren identisch ("Dauer (HH:mm)", nur ueber `quelle` getrennt) und
  in Kontexten ohne Tabellenbezug (z.B. Summenfeld-Dropdown fuer Kopf/Fuss) dadurch nicht
  unterscheidbar -- jetzt "Dauer Zeitraum (Minuten)" (`Daten.BZ`) / "Dauer Einsatz (Minuten)"
  (`Daten.BE`), Beispielwerte als Zahl (450/45).
- **`test/Utilities/download.test.ts`:** `modus 'B'`-Test auf numerische `Dauer`-Werte angepasst.

Verifiziert: `tsc`/Lint sauber, 1596/1596.

## 2026-08-22 (17)

### feat (PDF-Vorlagen-Pipeline: Bereitschaft-Download auf neuen Pfad umgestellt, Phase 11)

Gleiches Cutover-Muster wie EA (Phase 9) und EWT (Phase 10). Siehe Root-`CHANGELOG.md` fuer den
vollen Kontext (`shared/src/formular/abgeleiteteWerte.ts`, Cleanup-Entscheidung).

- **`infrastructure/data/download.ts`:** `modus === 'B'` laeuft jetzt ueber
  `ladeUndErzeugePdf('bereitschaft', stichtag, data, signaturPng)` statt `downloadPdf('B', data)`.
  BZ-Zeilenmapping merged pro Zeile `bzAbgeleiteteWerte(basis)`, BE-Zeilenmapping
  `beAbgeleiteteWerte(basis)` -- `build()` sieht das vorberechnete `Dauer` als normalen Datenpfad
  (`Daten.BZ[].Dauer`/`Daten.BE[].Dauer`).
- **`FormularEditor/datenKatalog.ts`:** je ein neuer Eintrag in `ZEILEN_FELDER.bereitschaft`
  (Gruppe "Berechnet") fuer `Dauer` auf `Daten.BZ` und auf `Daten.BE`, getrennt ueber `quelle` wie
  die bestehenden BZ-/BE-Felder.
- **`test/Utilities/download.test.ts`:** eigene `describe`-Gruppe fuer `modus 'B'` (Signatur-Dialog,
  `ladeUndErzeugePdf`-Aufruf inkl. vorberechneter `Dauer`, Fehlerfall) analog EA/EWT. Die bisherigen
  generischen `downloadPdf`-/VorgabenGeld-Tests, die `modus 'B'` nur als Vehikel nutzten, auf
  `modus 'N'` (letzter verbleibender Alt-Pfad) umgehaengt; ein Fallback-Filename-Test war dadurch
  ein exaktes Duplikat eines bestehenden `modus 'N'`-Tests und wurde entfernt statt umgehaengt.

Verifiziert: `tsc`/Lint sauber, 1596/1596.

## 2026-08-21 (16)

### fix (Unterschrift-Dialog: Box-Proportionen, Fullscreen im Querformat, Desktop-Größe)

Nachtrag zu Eintrag 15 -- User meldete nach dem resize-Fix weiterhin: "Bildschirm dann deutlich
breiter". Ursache war eine zweite, unabhängige Baustelle: Canvas-CSS war `width:100%;
height:200px` -- die Breite skaliert mit dem Viewport, die Höhe blieb aber fix, im Querformat
wurde die Box dadurch viel breiter bei gleicher Höhe.

Mehrere CSS-only-Anläufe (`aspect-ratio`, `modal-fullscreen-*-down`, `max-height`, `modal-lg`,
Flex-Zentrierung) scheiterten reihum an echten Bootstrap-Layout-Interaktionen -- u.a. füllte der
Canvas als Flex-Item (`.modal-body{display:flex}`) die verfügbare Breite trotz `width:auto;
max-width:100%` nicht zuverlässig (blieb bei ~304px unabhängig von der Dialogbreite hängen), und
`max-height` allein verzerrte das Ratio (bis zu 4.24 statt 5/2=2.50), weil nur die Höhe gedeckelt
wurde, nicht die Breite mit. Jede Runde live im Browser verifiziert, jeder Fehlschlag sofort am
tatsächlichen Messwert erkannt statt spekulativ weitergeraten.

**Lösung: deterministische Berechnung in JS statt weiterer CSS-Interaktionsraten, mit zwei
Darstellungsmodi.**

- **`infrastructure/pdf/signaturDialog.ts`:** neue `berechneCanvasGroesse()` -- ermittelt aus
  Viewport-Breite/-Höhe (abzüglich Kopf-/Fußzeile UND dem Rahmen von `.modal-content` selbst, alle
  unabhängig von der Canvas-Größe messbar, kein Henne-Ei-Problem) die größtmögliche Fläche im
  festen `5/2`-Verhältnis, die ohne Scrollen ins Modal passt. Zwei Modi je nachdem, welche
  Dimension bindet:
  - **Breiten-gebunden** (typisch Hochformat/große Screens): ruhige zentrierte Box, Rand
    `DIALOG_RAND` (8px, fest statt Bootstraps je Breakpoint unterschiedlichem Default -- die
    Rechnung setzt ihn selbst via `dialog.style.margin`), Breite gedeckelt auf max. 900px (auch
    auf sehr breiten Monitoren keine unnötig gestreckte Fläche).
  - **Höhen-gebunden** (typisch Querformat-Handy, wenig Vertikalraum -- User-Fund: "im Querformat
    wird definitiv Fullscreen benötigt"): randloses Fullscreen (`dialog.style.margin='0'`,
    `maxWidth:100vw`) MIT kompakter Kopf-/Fußzeile (neue `.signatur-modal-kompakt`-Klasse,
    kleineres Padding/Titel-Schrift) -- gewinnt zusätzlichen Vertikalraum zurück statt ihn an
    Bootstraps Standard-Chrome zu verlieren.
  Ergebnis wird direkt als `canvas.style.width/height` (px) sowie `dialog.style.maxWidth/margin`
  gesetzt, neu berechnet bei `shown.bs.modal` UND bei jedem `resize` (Handydrehung, Fenster
  verschieben) -- eine einzige Formel deckt beide Fälle ab, keine CSS-Breakpoint-Klasse mehr nötig.
- **`scss/styles.scss`:** `.signatur-canvas` auf `display:block; margin:0 auto; box-sizing:
  border-box` reduziert (Größe kommt vollständig aus JS; `border-box` verhindert, dass der 1px-
  Rahmen zur gesetzten Größe dazukommt statt darin enthalten zu sein); neue
  `.signatur-modal-kompakt`-Klasse für den Fullscreen-Fall.

Mehrere Korrekturrunden, jede live verifiziert: ein pauschaler 90%-Sicherheitsabschlag machte das
Feld auf kleinen Screens spürbar kleiner als vorher (User-Fund: "zu klein, da das Fullscreen
fehlt") -- ersetzt durch Rechnung mit dem tatsächlich verfügbaren Platz. Ein `modal-lg`-Versuch
brach die Breiten-Füllung komplett (Canvas blieb bei ~304px hängen, unabhängig von der
Dialogbreite) -- verworfen zugunsten der deterministischen Lösung. Ohne eigenes Fullscreen war
Querformat trotz mehr Fläche schmäler als Hochformat (User-Fund: "aktuell ist das
Unterschriftenfeld im Hochformat größer als im Querformat!!!!!") -- behoben durch den zweiten
Modus oben. Ein konstanter 2px-Überlauf im Fullscreen-Fall kam vom eigenen Rahmen von
`.modal-content` (Bootstrap-Default), der bislang nicht in die Höhen-Rechnung einging.

Verifiziert live im echten Chrome (Puppeteer, `google-chrome-stable`, echter Vite-Dev-Server,
echtes `signature_pad`/Bootstrap-Modal, kein Mock): Ratio in jedem getesteten Fall exakt 2.50,
Content passt (bis auf sub-pixel Rundungsrauschen von <0.4px, ohne sichtbare/funktionale Wirkung)
ohne Scrollen in den Viewport, Pixelpuffer nach echtem `resize`-Event synchron zur neuen
CSS-Größe, Dialog horizontal zentriert. Kernvergleich (gleiches Gerät gedreht, 390×844 vs.
844×390): Querformat-Fläche jetzt ~193.000px² gegenüber ~47.000px² im Hochformat (vorher war es
umgekehrt kleiner). Desktop-Canvas 868×347 statt ursprünglich ~466×186 (deutlich größere,
komfortablere Fläche, gedeckelt statt auf riesigen Monitoren unbegrenzt zu wachsen). `tsc
--noEmit`/ESLint sauber, `signaturDialog.test.ts` 8/8 grün, voller Testlauf 1595/1595.

## 2026-08-21 (15)

### fix (Unterschrift-Dialog: verzerrt nach Handydrehung)

**User-Fund:** Unterschriftenfeld verzerrt (Maße/Verhältnisse falsch), wenn das Handy während des
Signierens gedreht wird. Ursache: `signaturePad.ts::erstelleSignaturPad()` setzt die Canvas-
Pixelgröße (`canvas.width`/`canvas.height`) EINMALIG beim Öffnen aus `offsetWidth`/`offsetHeight`.
Das Canvas selbst ist per CSS `width:100%` responsiv -- dreht sich das Handy, ändert sich die
CSS-Breite, die interne Pixelgröße bleibt aber stehen. Der Browser streckt das alte, falsch
proportionierte Bitmap auf die neue Boxgröße, und `signature_pad`s Touch-Koordinaten-Mapping
(basiert auf der beim Erstellen fixierten Canvas-Größe) läuft gegenüber der neuen Anzeige aus dem
Ruder.

- **`infrastructure/pdf/signaturDialog.ts`:** neuer `window`-`resize`-Listener (aktiv solange das
  Modal offen ist) baut das Pad bei jeder Größenänderung neu auf (`pad.off()` erst, sonst sammeln
  sich bei mehrfachem Drehen doppelte Pointer-Listener auf `window` an, die `signature_pad` intern
  selbst dort registriert). Eine bereits begonnene Unterschrift geht beim Neuaufbau verloren --
  proportionale Punkt-Umrechnung wäre fehleranfällig, die paar Striche sind schnell nachgezogen.
  Listener wird beim Schließen (`hidden.bs.modal`) wieder entfernt.
- **`test/infrastructure/pdf/signaturDialog.test.ts`:** 3 neue Tests (Pad-Neuaufbau bei resize,
  No-op vor `shown.bs.modal`, Listener-Entfernung beim Schließen). Dabei einen bereits vorher
  bestehenden Test-Hygiene-Mangel gefunden und behoben: zwei ältere Tests klickten "Fertig" über
  das gemockte `bsModal.hide()`, ohne danach das reale `hidden.bs.modal`-Event zu simulieren --
  harmlos, bis der neue `window`-Listener das in späteren Tests als Leak sichtbar machte (3 statt 1
  Aufruf bei einem `resize`-Dispatch). Beide Tests lösen jetzt zusätzlich `hidden.bs.modal` aus,
  wie es Bootstrap nach der echten Ausblend-Animation auch täte.

Verifiziert: `bun run test` 1595/1595 grün, `tsc --noEmit`/ESLint sauber. Nicht im echten Browser
mit tatsächlicher Handydrehung nachgestellt (kein Gerät/Emulator in dieser Session verfügbar) --
Fix beruht auf Codelesung der `signature_pad`-Quelle (`.off()`-Verhalten, `window`-Listener) und
dem bekannten Resize-Verzerrungsmuster bei Canvas-Elementen mit responsivem CSS und fixer
Pixelgröße.

## 2026-08-21 (14)

### fix (OE-Format war falsch geraten) + feat (Monatsname-Formate)

Siehe Root-`CHANGELOG.md` für den vollen Kontext.

- **`infrastructure/pdf/configSchema.ts`:** `'oe'`, `'monatName'`, `'monatNameKurz'` im
  Format-Enum ergänzt.
- **`FormularEditor/datenKatalog.ts`:** OE-Katalogeintrag `format: 'liste'` → `format: 'oe'`.
- **`FormularEditor/FeldPanel.tsx`:** neue Format-Optionen im Dropdown; OE-Beispiele in Hilfetext
  und Platzhalter-Hilfe-Modal korrigiert (zeigten vorher `:liste` statt `:oe`).
- **`FormularEditor/dummyDaten.ts`:** Vorschau-Testwert für `monatName`/`monatNameKurz` ist jetzt
  eine Zahl 1-12 statt eines Datums.
- **`test/infrastructure/pdf/wert.test.ts`:** OE-Tests auf `format: 'oe'` umgestellt; die
  generischen Fallback-Tests, die vorher (irreführend) OE als Beispiel nutzten, laufen jetzt über
  ein neutrales Feld (`zulagen`).

Verifiziert: voller Testlauf 1592/1592 grün, `tsc --noEmit`/ESLint sauber.

## 2026-08-21 (13)

### fix (FormularEditor: Ankreuz-Spalte/-Feld bekommt keinen Titel-Vorschlag beim Feld-Wechsel)

**User-Fund:** Beim Wählen des geprüften Felds in einer Ankreuz-Bedingung -- besonders bei den
vorberechneten EWT-Booleans (`Wohnung8bis14` etc.) -- blieb der Anzeigename der Spalte/des Felds
leer. Ursache: `spalte.label`/`feld.label` sind unabhängig von `wenn.feld`, nichts hielt sie
synchron; der Feld-Auswahl-Dropdown in `AnkreuzBedingung`/`FeldAnkreuzBedingung` änderte bisher
nur `wenn.feld`, nie den Titel der Spalte/des Felds selbst.

- **`FormularEditor/FeldPanel.tsx`:** Feld-Auswahl in `AnkreuzBedingung` (Spalte) und
  `FeldAnkreuzBedingung` (Dokument-Feld) übernimmt jetzt das `label` des gewählten Katalog-
  Eintrags als Titel -- IMMER, nicht nur wenn noch keiner gesetzt ist (User-Korrektur: anders als
  der Format-Vorschlag aus Eintrag 8, der eine bewusste Wahl nie überschreibt, beschreibt der Titel
  hier direkt die Bedingung -- ein stehen gelassener alter Titel nach einem Feld-Wechsel zeigt sonst
  die falsche Bedingung an). Wer einen abweichenden Titel will, tippt ihn danach im
  Anzeigename-Feld ein.

Verifiziert: `tsc --noEmit` sauber, ESLint sauber, voller Testlauf 1590/1590 grün (keine
dedizierte Testdatei für `FeldPanel.tsx`, siehe frühere Notiz zu fehlender Component-Test-
Infrastruktur).

## 2026-08-21 (12)

### feat (FormularEditor: echte Boolean-Auswahl statt `bereich`-Umweg für Ankreuz-Bedingungen)

Siehe Root-`CHANGELOG.md` für den vollen Kontext.

- **`infrastructure/pdf/wert.ts`:** `trifftFeldBedingung()`-Cast auf `boolean` erweitert.
- **`FormularEditor/datenKatalog.ts`:** `istBooleanFeld()` -- markiert die sechs EWT-Ankreuz-
  Booleans.
- **`FormularEditor/FeldPanel.tsx`:** `VergleichWahl` zeigt für Boolean-Felder eine Ja/Nein-
  Auswahl; Feld-Auswahl in `AnkreuzBedingung`/`FeldAnkreuzBedingung` (inkl. der initialen
  „Ankreuzen"-Buttons) belegt `werte: [true]` automatisch vor.
- **`dummyDaten.ts`:** `platzhalter()`-Rückgabetyp auf `boolean` erweitert (Folge der `werte`-
  Erweiterung).
- **Tests:** `test/infrastructure/pdf/wert.test.ts` (Feld-Ebene), `shared/tests/formular/
  aggregatoren.test.ts` (`trifftBedingung`), `test/features/Admin/FormularEditor/dummyDaten.test.ts`
  (Vorschau-Zeilen mit `werte: [true]`).

Verifiziert: `tsc --noEmit`/ESLint sauber, voller Testlauf 1590/1590 grün.

## 2026-08-21 (11)

### fix (FormularEditor: Ankreuz-Spalte mit `bereich` (z.B. Boolean-Felder) in Vorschau immer leer/falsch)

**User-Fund** beim Konfigurieren einer Ankreuz-Spalte für einen der EWT-Booleans
(`Wohnung8bis14` etc., über `Bedingung.bereich: { von: 1, bis: 2 }` wie in `abgeleiteteWerte.ts`
dokumentiert): Feld blieb in der Editor-Vorschau für jede Zeile leer bzw. zeigte scheinbar
zufällige Treffer.

- Ursache: `dummyDaten.ts::macheZeile()` befüllte Testzeilen für eine Ankreuz-Spalte nur für den
  `werte`-Fall (`zeile[feld] ??= wenn.werte?.[0] ?? ''`). Im `bereich`-Fall ist `werte` immer
  `undefined`, also landete überall der Fallback `''` bzw. blieb das Feld ganz unbelegt.
  `alsVergleichswert('')`/`alsVergleichswert(undefined)` sind beide `0` -- das liegt bei jedem
  `bereich` mit `von >= 1` nie im Treffer-Fenster (daher „immer leer"), kann bei einem `bereich`
  mit `von <= 0` aber spurios treffen (daher „falsch berechnet" bei anderen Wertebereichen).
  Betraf nur die Editor-Vorschau, nicht die echte PDF-Erzeugung -- dort liefert `download.ts` für
  EWT bereits echte gemergte `ewtAbgeleiteteWerte()`-Booleans.
- Fix: neuer Zweig für `spalte.wenn.bereich` -- gerade Zeilen bekommen `alsVergleichswert(von)`
  (liegt IMMER im Bereich, einschließlich), ungerade `alsVergleichswert(bis)` (liegt NIE im
  Bereich, ausschließlich) als rohen Zeilenwert. Zeigt in der Vorschau wieder beide Fälle, wie es
  der bestehende Kommentar „jede zweite Zeile erfüllt die Bedingung" für den `werte`-Fall schon
  vorsah.
- **`test/features/Admin/FormularEditor/dummyDaten.test.ts`:** Regressionstest über
  `trifftBedingung()` (prüft echten Treffer/Nicht-Treffer, nicht nur den rohen Zellwert).

Verifiziert: `bun run test` 1588/1588 grün, `tsc --noEmit` sauber, ESLint sauber. Echte
PDF-Erzeugung (Browser mit Backend) nicht gegengeprüft -- Codelesung von `download.ts` zeigt
korrektes Merging, aber ohne Live-Test keine 100%ige Garantie für den realen Ankreuz-Fall.

## 2026-08-21 (10)

### feat (FormularEditor: Hilfe-Modal für Platzhalter & Formate)

Siehe Root-`CHANGELOG.md` für den vollen Kontext.

- **`FormularEditor/FeldPanel.tsx`:** Link "Alle Platzhalter & Formate…" unter dem Festtext-Feld
  öffnet ein dynamisch erzeugtes Modal (Muster wie `openHelpModal.tsx`) mit vollständiger Tabelle
  aller Platzhalter-Varianten und aller Formatnamen (aus `FORMATE` generiert, keine zweite Quelle).

Verifiziert: `tsc --noEmit` sauber, ESLint sauber, `bun run test` 1587/1587 grün.

## 2026-08-21 (9)

### feat (PDF-Rendering: Format erzwingbar in Text-Platzhaltern, `{Pfad:Format}`)

Siehe Root-`CHANGELOG.md` für den vollen Kontext.

- **`infrastructure/pdf/wert.ts`:** `zerlegePlatzhalter()` trennt `{Pfad:Format}` am ersten `:`,
  unbekannte Formatnamen werden ignoriert statt die Zelle zu brechen. `datenPlatzhalter()`
  schneidet den Format-Teil vor dem Pfad-Lookup ab (Testdaten-Vorschau).
- **`FormularEditor/FeldPanel.tsx`:** Hilfetext ergänzt.
- **`test/infrastructure/pdf/wert.test.ts`:** 7 neue Tests.

Verifiziert: `bun run test` 1587/1587 grün, `tsc --noEmit` sauber, ESLint sauber.

## 2026-08-21 (8)

### fix (PDF-Rendering: weitere Formatierungs-Lücken + Auto-Vorbelegung im Editor)

Siehe Root-`CHANGELOG.md` für den vollen Kontext.

- **`infrastructure/pdf/wert.ts`:** `ersetzePlatzhalter()` (Festtext-Platzhalter `{Datenpfad}`)
  hatte einen eigenen `String()`-Fallback statt den von `formatiere()` zu teilen -- auf den
  gemeinsamen `standardText()` aus `shared` umgestellt.
- **`infrastructure/pdf/spaltenWert.ts`:** ebenfalls auf `standardText()` umgestellt.
- **`FormularEditor/datenKatalog.ts`:** `KatalogEintrag.format` von `'waehrung' | 'datum'` auf den
  vollen `FormatName` erweitert; `VorgabenU.Pers.OE` und `Zulagen` mit `format: 'liste'` versehen.
- **`FormularEditor/FeldPanel.tsx`:** `umbenennen()` (Felder) und der Spalten-`DatenpfadWahl`-
  Handler übernehmen jetzt den Format-Vorschlag aus dem Katalog, wenn das Feld/die Spalte noch kein
  eigenes Format hat -- verhindert die OE-Bug-Klasse strukturell statt nur den Fallback abzufedern.
- **`test/`:** keine neuen Testdateien; Katalog-Lookup ad hoc per Skript gegen `katalogFelder()`/
  `katalogZeilenFelder()` geprüft.

Verifiziert: `bun run test` (alle betroffenen Suiten, 86/86 gruen über `shared`+`frontend`),
`tsc --noEmit` sauber, ESLint sauber. UI-Verhalten (Format-Dropdown springt beim Pfad-Wechsel um)
NICHT per Headless-Browser verifiziert -- Formulare-Tab ist serverseitig auf `super-admin`
gegated, im backendlosen Verify-Rezept nicht erreichbar; manuelle Nachprüfung mit echtem Backend
steht noch aus.

## 2026-08-21 (7)

### feat (PDF-Rendering: Format `jaNein` fuer Boolean-Felder)

Anschluss an Eintrag (6): unformatierte Boolean-Werte fielen ebenfalls auf `String()` zurueck
(`true`/`false` statt Deutsch). Siehe Root-`CHANGELOG.md` fuer den vollen Kontext.

- **`infrastructure/pdf/wert.ts`, `infrastructure/pdf/spaltenWert.ts`:** `formatiere()`-Fallback
  nutzt bei `typeof roh === 'boolean'` jetzt `FORMAT.jaNein` statt `String()`.
- **`FormularEditor/FeldPanel.tsx`:** `jaNein` als waehlbares Format im Editor-Dropdown.
- **`test/infrastructure/pdf/wert.test.ts`:** Regressionstest ergaenzt.

Verifiziert: `bun test test/infrastructure/pdf/wert.test.ts test/infrastructure/pdf/spaltenWert.test.ts test/features/Admin/FormularEditor/vorschau.test.ts test/infrastructure/pdf/configSchema.test.ts` (73/73 gruen), `tsc --noEmit` sauber.

## 2026-08-21 (6)

### fix (PDF-Rendering: unformatierte Array-Felder nicht mehr roh gejoint)

`VorgabenU.Pers.OE` (Organisationseinheit) erschien auf der EA-PDF als `I,IW,MI,N,MUS,IL,` --
Feld im Formular-Editor ohne `format` konfiguriert, `formatiere()` fiel auf `String(array)`
zurueck (JS-Array-Stringify: kommagetrennt ohne Leerzeichen, leere Endeintraege erzeugen ein
trailing Komma). `FORMAT.liste` (`shared/src/formular/aggregatoren.ts`) existiert genau fuer
diesen Fall, wurde aber nur bei explizit gesetztem `format: 'liste'` angewendet.

- **`infrastructure/pdf/wert.ts`, `infrastructure/pdf/spaltenWert.ts`:** `formatiere()` faellt
  bei fehlendem `format` jetzt fuer Arrays auf `FORMAT.liste` statt `String()` zurueck --
  unformatierte Array-Feld-Konfigurationen rendern damit nie wieder als rohes Array.
- **`test/infrastructure/pdf/wert.test.ts`:** Regressionstest fuer den OE-Fall ergaenzt.

Verifiziert: `bun test test/infrastructure/pdf/wert.test.ts test/infrastructure/pdf/spaltenWert.test.ts test/features/Admin/FormularEditor/vorschau.test.ts` (63/63 gruen), `tsc --noEmit` sauber.

## 2026-08-21 (5)

### feat (PDF-Vorlagen-Pipeline: EWT-Download auf neuen Pfad umgestellt, Phase 10)

Gleiches Cutover-Muster wie EA (Phase 9). Siehe Root-`CHANGELOG.md` fuer den vollen Kontext
(`shared/src/formular/abgeleiteteWerte.ts`, Cleanup-Entscheidung).

- **`infrastructure/data/download.ts`:** `modus === 'E'` laeuft jetzt ueber
  `ladeUndErzeugePdf('ewt', stichtag, data, signaturPng)` statt `downloadPdf('E', data)`. EWT-
  Zeilenmapping merged pro Zeile `ewtAbgeleiteteWerte(basis, beamter)` (`beamter` aus
  `VorgabenU.Pers.TB !== 'Tarifkraft'`) -- `build()` sieht die vorberechneten Felder als normale
  Datenpfade (`Daten.EWT[].DauerWohnung` etc.).
- **`FormularEditor/datenKatalog.ts`:** acht neue Eintraege in `ZEILEN_FELDER.ewt` (Gruppe
  "Berechnet"): `DauerWohnung`/`DauerErsteTkgSt` plus sechs Zeitband-Booleans. Boolean-Felder im
  Editor als Ankreuz-Quelle ueber `Bedingung.bereich: { von: 1, bis: 2 }` nutzen, nicht ueber
  `werte` (siehe Kommentar in `abgeleiteteWerte.ts` fuer die Begruendung).
- **`test/Utilities/download.test.ts`:** Bestandstests fuer `modus 'E'` auf den neuen Pfad
  umgeschrieben. Dabei einen Mock-Queue-Versatz gefunden: ein Test rief weiterhin `download(...,
  'E')` mit einem auf `mockDownloadPdf` gequeueten `mockResolvedValueOnce` auf, das nach dem Cutover
  nie mehr konsumiert wurde und dadurch mehrere NACHFOLGENDE Tests (`modus 'N'`/`'B'`) mit falschen
  Werten versorgte -- jeder Einzeltest lief isoliert grün, nur in der vollen Suite sichtbar. Fix:
  betroffenen Test auf `modus 'B'` umgestellt (ruft weiterhin `downloadPdf` auf). Lehre in
  `tasks/lessons.md` festgehalten.

Verifiziert: `tsc`/Lint sauber, 1578/1578.

## 2026-08-21 (4)

### fix (PDF-Vorlagen-Pipeline: Summe-Button-Reset, Signatur-Zentrierung)

**User-Funde beim echten EA-Browser-Test (Phase 9), Fortsetzung von (3).**

- `FeldPanel.tsx`: "Summe"-Modus-Button in `FeldZeile` setzte `berechnet` bei jedem Klick unbedingt
  auf `{ op: 'summe', ueber: '$seite' }` zurueck statt (wie alle anderen Modus-Buttons: Text/Mehrere/
  Ankreuzen/Ueberschrift) den bereits gesetzten Wert zu erhalten -- ein erneuter Klick auf den schon
  aktiven Button warf z.B. `$bisher` ("alle Vorseiten") zurueck auf `$seite`. Fix:
  `feld.berechnet ?? { op: 'summe', ueber: '$seite' }`, analog zu den anderen Modi.
- `build.ts`: Signatur-Bild sass an der unteren linken Ecke der `signaturBild`-Box statt darin
  zentriert -- `png.scaleToFit(w, h)` verkleinert bei abweichendem Seitenverhaeltnis nur, verschiebt
  aber nicht. Fix: Restdifferenz zur Box-Groesse haelftig auf `x`/`y` verteilt.
- Zugehoeriger Backend-Fix (verlorenes `$`-Praefix beim Speichern): siehe `backend/CHANGELOG.md`.

Verifiziert: `tsc`/Lint sauber, 1578/1578 (kein Test deckt die konkreten UI-Interaktionen bzw. die
Bild-Position ab -- manuelle Verifikation im Editor/PDF durch den User ausstehend).

**Nachtrag (`download.ts`):** EA setzt seit Phase 9 kein `filename` mehr (kein Backend-Roundtrip fuer
den PDF-Inhalt), lief deshalb immer in den generischen Fallback -- dessen Format
(`EA_MM_YY_Vorname Nachname_Gewerk ErsteTkgSt.pdf`) wich vom bisherigen server-seitigen EA-Namen ab.
Auf Vorschlag statt EA separat zu behandeln den gemeinsamen Fallback selbst auf das Server-Schema
umgestellt: Praefix je Modus (`RB`/`Verpf.`/`EZ`/`Entgeltausgleich`) + `Nachname V. Gewerk ErsteTkgSt
MM.JJJJ.pdf`, wie `buildBaseFileName` im Backend. Gilt jetzt einheitlich fuer alle vier Modi im
Fallback-Fall. `download.test.ts` auf das neue Format angepasst. Verifiziert: `tsc`/Lint sauber,
1578/1578.

## 2026-08-21 (3)

### feat (PDF-Vorlagen-Pipeline: EA-Download auf neuen Pfad umgestellt, Phase 9)

Erster echter Cutover der PDF-Vorlagen-Pipeline (Plandatei Phase 9, EA/Entgeltausgleich als Pilot --
mit EZ getauscht, siehe dortiger Phase-8.5/Tausch-Kontext). `build()` fetchte `layout.template`
bisher ungeprüft ohne Auth-Header (Kommentar in `build.ts`: "Anbindung folgt in Phase 9") -- diese
Anbindung jetzt nachgezogen.

- **`infrastructure/pdf/ladeFormular.ts`** (neu): `ladeUndErzeugePdf(formular, stichtag, daten,
  signaturPng?)` löst die gültige Version server-seitig auf (`GET /formulare/:f?stichtag=`), lädt
  die Vorlage authentifiziert nach (`holeVorlageAlsDatei`, verschoben aus
  `Admin/components/formularVersionenApi.ts` -- Layer-Regel verletzt, wenn `infrastructure/` aus
  `features/` importiert) und biegt `layout.template` auf eine lokale `blob:`-URL um, bevor `build()`
  sie fetcht (derselbe Trick wie die Testdaten-Vorschau im Admin-Editor). `formularVersionenApi.ts`
  re-exportiert `holeVorlageAlsDatei`/`ApiFehler`, damit `FormularUpload.tsx` unverändert bleibt.
- **`configSchema.ts`:** `versionSchema` exportiert, neue `parseVersion()` -- Gegenstück zu
  `parseRegistry()`, validiert aber eine einzelne vom Server aufgelöste `Version` statt einer ganzen
  Registry.
- **`infrastructure/pdf/signaturDialog.ts`** (neu): kapselt den Ja/Nein-Entscheidungsdialog plus
  Canvas-Signatur-Pad (bisher nur als Bruchstück in der Dev-Testseite `pdf-test.ts` vorhanden) in
  eine wiederverwendbare, promise-basierte Funktion -- vanilla DOM wie `confirmDialog`, kein
  Preact/`showModal` nötig. Pad wird erst nach `shown.bs.modal` erstellt, nicht beim Rendern
  (Phase-4-Lehre: vorher erstelltes Pad auf unsichtbarem Canvas ist unbenutzbar).
- **`infrastructure/data/download.ts`:** `modus === 'EA'` läuft jetzt über den neuen Pfad
  (`signaturDialog()` + `ladeUndErzeugePdf()`) statt über `downloadPdf()`/den alten Backend-Sheets-
  Export; `B`/`E`/`N` unverändert. Stichtag für `resolve()` = erster Tag des Exportmonats. Kein
  eigenes Datenmapping nötig -- die bestehende `Daten`-Konstruktion im `case 'EA':`-Zweig hat schon
  exakt die Form, die `build()` erwartet.
- Tests: `ladeFormular.test.ts`, `signaturDialog.test.ts` (neu), `download.test.ts` um den
  EA-Pfad ergänzt (Signatur-Weiterreichung, Fehlerfall "keine gültige Version").
- **Bewusst NICHT Teil dieser Änderung:** der alte Backend-Pfad
  (`entgeltausgleich.service.ts::download()`, Route, Test) bleibt stehen, bis eine echte EA-Vorlage
  über den Admin-Editor angelegt und der neue Pfad im Browser verifiziert ist -- ohne echte Vorlage
  in der DB liefert `GET /formulare/ea?stichtag=` sonst 404 und EA hätte gar keinen PDF-Export mehr.

## 2026-08-21 (2)

### feat (PDF-Vorlagen-Editor: Ankreuzen bei Feld, Overlay-Wertquellen entdoppelt)

Siehe Root-`CHANGELOG.md` fuer den vollen Kontext ueber alle drei Submodule (Plandatei-Phase 8.5).

- **`wert.ts`:** neue `Feld.wenn`-Auswertung (`trifftFeldBedingung()`), geteilte
  `berechneAggregation()`-Funktion fuer `Feld.berechnet` UND `Feld.wenn.berechnet` (bisher nur inline in
  `Feld.berechnet`). Bleibt in `wert.ts`, nicht `shared`, weil sie den frontend-eigenen `Kontext`-Typ
  braucht.
- **`FeldPanel.tsx`:** neue Wertquelle "Ankreuzen" bei Feldern (`FeldAnkreuzBedingung`, sechster Modus
  neben Datenfeld/Text/Mehrere/Summe/Ueberschrift). Text-Modus bekommt `PlatzhalterPicker` -- Datenpfad
  per Klick als `{pfad}` an der Cursorposition einfuegen statt Freihand-Tippen. Drei gemeinsame Bausteine
  aus bisher dupliziertem Code gezogen: `AggregationEditor` (Feld-Summe + Feld-Ankreuzen-Berechnung),
  `VergleichWahl` (Werte-Liste/Wertebereich-Vergleich, aus Spalten- UND Feld-Ankreuzen genutzt),
  `berechneteEintraege()` (`andereBerechnete`-Sammlung, bisher in `FeldZeile` und `TabellenBlock` fast
  identisch dupliziert).
- **`dummyDaten.ts`:** Testdaten-Vorschau befuellt jetzt auch `Feld.wenn`-Datenpfade, mit Bias auf
  `wenn.werte[0]`, damit die Bedingung in der Vorschau sichtbar zutrifft (analog zur bestehenden
  "jede zweite Zeile"-Bias bei `Spalte.wenn`).
- **"Mehrere" (`quellen`/`trenner`) bewusst NICHT entfernt** trotz anfaenglicher Planung -- deckt weiter
  den Leerteile-Filter bei optionalen Feldern ab (z.B. `Adress2`), den Text-Platzhalter nicht koennen.
  Siehe Review-Abschnitt der Plandatei.
- Tests: `wert.test.ts` um `wenn`-Faelle (Feld/Bereich/Berechnet) ergaenzt.

## 2026-08-21

### chore (Bun 1.4: Legacy-Matcher, Version gepinnt)

Siehe Root-`CHANGELOG.md` fuer den vollen Bun-1.4-Kontext ueber alle drei Submodule.

- `Utilities.test.ts`: `.toThrowError()` → `.toThrow()` (Bun 1.4 entfernt denselben Legacy-Alias
  wie Jest 30). Einziger Fund im Repo, alle 1560 Tests unter Bun 1.4.0 verifiziert gruen.
- `bunfig.toml`: `[install]` `linker = "hoisted"` ergaenzt (Verhalten unveraendert, jetzt explizit).
- CI (`deploy.yml`): `bun-version` von `latest` auf `1.4.0` fixiert.

## 2026-08-16 (13)

### fix (Bereitschaft-Datenkatalog: BZ/BE vermischt)

- **User-Fund:** „BZ Beginn+Ende ist timedate, BE Beginn+Ende ist nur time. Warum sind die Werte der
  2 Tabellen vermischt?" `datenKatalog.ts` bot `Beginn`/`Ende` als EINEN Eintrag fuer beide
  Zeilenquellen (BZ: voller Zeitstempel, BE: reine `"HH:mm"`), und `katalogZeilenFelder()` filterte
  nie nach Tabelle — der Editor zeigte beim Bearbeiten der BZ-Tabelle auch BE-Felder mit an und
  umgekehrt.
- **`datenKatalog.ts`:** neues `KatalogEintrag.quelle`, `katalogZeilenFelder()`/`beispielWert()`
  filtern jetzt danach; `FeldPanel.tsx`/`dummyDaten.ts` reichen `tabelle.quelle` durch. BE-
  Beispielwerte (`15:45`/`07:00`, die volle BZ-Zeitraumspanne) auf `01:15`/`02:00` korrigiert — ein
  kurzer Anruf waehrend des Zeitraums, siehe `createAddModalBereitschaftsEinsatz.tsx`.

### feat (Ankreuz-Bedingungen: Wertebereich, Berechnung, Wiederverwendung)

- **User-Fund:** „Berechnen Zeitraum von Abfahrt bis Ankunft Einsatzort — wenn Wert ab 8:00 und unter
  14:00, muss angekreuzt werden." `Spalte.wenn` konnte nur Mitgliedschaft in einer festen Werteliste
  gegen ein rohes Zeilenfeld pruefen.
  - `AnkreuzBedingung` (`FeldPanel.tsx`): Umschalter Feld/Berechnung (Rechnung wiederverwendet aus
    `Spalte.berechnet`) und Werte-Liste/Wertebereich (`von`/`bis`, `von` einschliesslich, `bis`
    ausschliesslich — Zahl, Uhrzeit oder Datum, je nachdem was das Feld liefert).
  - **User-Nachtrag:** Bereich war zunaechst fest auf Uhrzeit/Zahl gelesen; neue `alsVergleichswert()`
    (`shared`) erkennt den Werttyp selbst.
  - **User-Nachtrag:** bereits angelegte berechnete/Ankreuz-Spalten derselben Tabelle sind jetzt im
    Feld-Dropdown der Bedingung waehlbar (`andereBerechnete`), statt dieselbe Rechnung ein zweites Mal
    aufzubauen — moeglich, weil `mitBerechnetenSpalten()` (`shared`) ihren Wert schon unter `key` in
    die Zeile eintraegt.
  - **User-Nachtrag:** dieselbe Wiederverwendung jetzt auch bei Summenfeldern (`Feld.berechnet` in
    `FeldZeile`) — inklusive Ankreuz-Spalten, deren Ergebnis `mitBerechnetenSpalten()` bisher GAR NICHT
    in die Zeile eintrug (mit einem numerischen `dann`, z.B. `'1'` statt `'X'`, zaehlt eine Summe
    darueber jetzt die zutreffenden Zeilen — z.B. Anzahl LRE-1-Einsaetze ohne eigene gefilterte
    Tabelle).
- **Bugfix aus derselben Runde:** `Spalte.key` war nur im Modus „Datenfeld" editierbar, in „Berechnet"/
  „Ankreuzen" blieb er unsichtbar eingefroren; „+ Spalte" vergab fuer jede neue Spalte denselben
  Default-Schluessel — zwei neue Spalten ohne manuelle Umbenennung ueberschrieben sich gegenseitig in
  Bedingungen/Summen. `SpalteZeile` zeigt jetzt ein eigenes Schluessel-Feld in diesen Modi,
  `eindeutigerSpaltenSchluessel()` vergibt beim Anlegen einen von den bestehenden Spalten
  unterscheidbaren Default.
- **Verifikation:** `shared` 76/76, Frontend `tsc --noEmit`/Build gruen, gezielte Tests
  (Formular-Editor + PDF-Infrastruktur) 124/124, `eslint` auf den geaenderten Dateien sauber. Voller
  Frontend-Lauf (`bun test --isolate`) 1553/1560 — die 7 Fehlschlaege liegen in
  `Bereitschaft.test.ts`/`Bereitschaft.submitBereitschaftsEinsatz.test.ts` (Zeitzonen-/DST-Artefakt
  gegen fest codierte `2023-04-…`-Fixture-Daten), unberuehrt von dieser Aenderung.

## 2026-08-16 (12)

### feat (Formular-Versionen bearbeiten und loeschen, Phase 8.4)

- **User-Fund:** „Formular-Vorlage sollen nicht nur hochgeladen, sondern auch geloescht und bearbeitet werden koennen (falls ein Fehler entstanden ist)."
- **`FormularVersionenListe.tsx` (neu):** Bestandsliste der Versionen je Formular mit „Bearbeiten" und „Loeschen".
- **`formularVersionenApi.ts` (neu):** Upload, Liste, Anlegen, Aendern, Loeschen sowie `holeVorlageAlsDatei()` — der Editor arbeitet gegen eine lokale `File`, die gespeicherte PDF wird dafuer zurueckgeholt. `ApiFehler` traegt den Statuscode, damit der Intervall-Konflikt (409) erkennbar bleibt.
- **`FormularUpload.tsx`:** dieselbe Maske dient Anlegen und Bearbeiten. Ohne neue Datei bleibt die gespeicherte PDF stehen (kein zweiter Upload derselben Bytes); bei 409 fragt ein Dialog, ob der luckenhafte Zwischenstand trotzdem gespeichert bzw. geloescht werden soll — noetig, um die Vorgaengerversion vor dem Anlegen einer Nachfolgerin zu schliessen.

### feat (Seitenfolge statt erste/weitere Seite + seitenspezifische Spalten, Phase 8.4)

- **User-Fund:** „Bereitschaft sieht zwischen Seite 1, 2 und 3 unterschiedlich aus … Seite 3 und 4 sind aber gleich" und „die Spalten sind auf den Seiten nicht unbedingt gleich".
- **`Konfig`/`Layout`:** `seiten: SeitenDef[]` ersetzt `ersteSeite`/`weitereSeite?`; eine Seite mit `wiederholt` wird bei Ueberlauf so oft gedruckt, wie Zeilen uebrig sind.
- **`verteile.ts`:** laeuft die Seitenfolge der Reihe nach ab. Seite 1 kommt immer, jede weitere nur, wenn ihre Tabellen Zeilen haben oder sie gar keine Datentabelle traegt (reine Text-/Unterschriftsseite) — damit entfaellt die BE-Seite, wenn es keine Einsaetze gab. Wiederholungen entstehen direkt an ihrer Stelle in der Folge, nicht am Ende, damit eine nachgelagerte Abschlussseite dahinter landet.
- **`TabellenBereich.spalten?`:** eigenes Spaltenraster je Seite (`spaltenFuer()` aus `shared` als gemeinsame Regel fuer Renderer, Editor und Vorschau). Im Editor per „eigene je Seite" umschaltbar, die vorhandenen Spalten werden dabei als Ausgangspunkt kopiert.
- **`FormularEditor.tsx`:** Seiten-Tabs sind dynamisch (anlegen/entfernen), mit Wiederholungs-Schalter und „Einstellungen uebernehmen von <Seite>" — kopiert Felder, Tabellenbereiche und Signaturflaeche einer anderen Seite, behaelt aber die eigene Vorlagenseite.
- **`dummyDaten.ts`:** Zeilenbedarf ueber alle Seiten summiert (plus eine Zeile, sobald eine Seite wiederholt wird); Testdaten befuellen auch Spalten, die es nur im Raster einer einzelnen Seite gibt.

### feat (gedrehter Text und dynamische Spalten, Phase 8.4)

- **User-Fund:** „es gibt Zettel, wo der Text um 90° gedreht ist" und „die Zulagen bei EZ funktionieren etwas anderes … das Feld Zulagen ist eine Liste, hier muss auch noch eine Überschrift mit festgelegt werden".
- **`zeichne.ts`:** `drehung` (0/90/180/270) je Zelle. Gerechnet wird nicht mehr in x/y, sondern in Lauf- und Querachse — dieselben Formeln, nur ihre Zuordnung zu den Seitenkoordinaten dreht sich. Ausrichtung wirkt entlang der Laufrichtung, die Zentrierung quer dazu; ohne Querkante bleibt die gesetzte Koordinate wie bisher die Grundlinie.
- **Dynamische Spalten (`ListenGruppe`):** eine Zeile trägt unter `Zulagen` eine Liste, das Formular hat dafür feste Spaltenplätze. Welcher Schlüssel welchen Platz belegt, wird EINMAL je Dokument über alle Zeilen bestimmt (`listenBelegung`) — sonst stünde auf Seite 2 eine andere Zulage über derselben Spalte. `Spalte.listenPlatz` druckt den Wert der Zeile zu diesem Schlüssel, `Feld.listenKopf` die zugehörige Überschrift (Code oder hinterlegter Kurztext); unbelegte Plätze bleiben samt Überschrift leer.
- **`ListenGruppen.tsx` (neu):** Gruppenverwaltung im Editor. Die EZ-Vorlagen (Erschwerniszulage 7 Plätze, Leistungsprämie/Fahrentschädigung 3, Ganzkörperreinigung 1) kommen aus dem gemeinsamen `ZULAGEN_CATALOG`, damit hier keine zweite Codeliste gepflegt wird; ein Klick legt Gruppe UND Spaltenplätze an.
- **`dummyDaten.ts`:** erzeugt Listenwerte passend zur Zahl der konfigurierten Plätze — die erste Zeile belegt alle (sonst bliebe eine Spalte in der Vorschau unbeschriftet), spätere lassen einzelne aus, damit auch leere Zellen sichtbar werden. Nebenbefund dabei behoben: `alleSpalten()` zählte die Tabellenspalten doppelt, wenn eine Seite kein eigenes Raster hat.
- `Zeile` trägt jetzt `unknown`-Werte statt nur Text/Zahl — Zeilen aus dem Download-Body enthalten mit `Zulagen` echtes Verschachteltes.

### fix (Koordinateneingabe im Editor, Zahlenraster)

- **User-Fund:** „Beim Absenden werden Werte, die nicht im 0,5-Raster liegen, nicht angenommen. Und bei Zeilen lassen sich auch 0,5 Zeilen eingeben + negative Werte."
- **`FeldPanel.tsx`:** `ZahlFeld` nutzt `step="any"` statt `step="0.5"` — die HTML-Formularpruefung wies bisher jede gezogene Koordinate zwischen den Rasterpunkten beim Absenden ab. Zaehlwerte (`Zeilen`) sind jetzt ganzzahlig mit Untergrenze 1, `Hoehe` mindestens 0,1; die Anzeige rundet auf zwei statt eine Nachkommastelle.

### feat (Format „Tag zweistellig")

- Neues Format `tagZweistellig` (`05` statt `5`) fuer Formulare mit zweistelligem Tageskaestchen.

- **Verifikation:** `bun run lint`, `bunx tsc --noEmit`, `bun run test` **1546/1546 gruen**.

### docs (Hilfe zur Koordinaten-Config)

- Ergaenzt: die Vorlage ist EINE PDF mit allen Seiten (nicht je Seite eine Datei), wie die Seitenfolge dazu angelegt wird, wann welche Seite im Ergebnis landet, wozu „bei Ueberlauf wiederholen" dient und wie Seiteneinstellungen kopiert bzw. eigene Spalten je Seite gesetzt werden.

## 2026-08-16 (11)

### feat (Startseite: Schnellzugriff-Buttons für Mobilansicht, Issue #5)

- **User-Wunsch:** Auf dem Handy liegt die Tab-Navigation hinter dem Hamburger-Menü — zwei Taps, um z. B. EWT zu öffnen. Neuer Schnellzugriff-Block auf der Startseite (`#startSchnellzugriff`, nur `d-lg-none`) springt per einem Tap direkt in Bereitschaft, EWT, Nebenbezüge, Entgeltausgleich, Berechnung oder Einstellungen.
- **Sichtbarkeit gespiegelt statt neu erfunden:** Die vier Feature-Buttons folgen exakt der bestehenden `aktivierteTabs`-Logik aus `updateTabVisibility.ts` (gleiche Quelle, die auch die Nav-Einträge ein-/ausblendet) — ein Nutzer ohne aktivierten EA-Tab sieht auch keinen EA-Schnellzugriff. Berechnung/Einstellungen sind ungated und erscheinen wie der Rest der Navigation erst nach Login.
- **Layout-Falle beim ersten Wurf:** `d-none` zunächst auf den `<button>` statt auf den umgebenden `.col` gesetzt — Bootstraps `row-cols-2` zählt Grid-Slots nach DOM-Position, nicht nach Sichtbarkeit, ein versteckter Button hinterließ trotzdem eine leere Grid-Zelle mitten im Block. Korrigiert, indem `id`/`d-none` auf den `.col`-Wrapper wandern; versteckte Buttons reißen jetzt keine Lücke mehr.
- **Klick-Verdrahtung:** Schnellzugriff-Buttons klicken per JS den zugehörigen echten Tab-Button (`document.querySelector('#'+jumpTab)?.click()`), keine doppelte `data-bs-toggle`-Verdrahtung nötig — Bootstraps Tab-State bleibt auf den echten Nav-Buttons konsistent.
- **Verifikation:** `lint`, `build`, `test`. Zusätzlich end-to-end mit Puppeteer (Chrome headless, `frontend/.claude/skills/verify`) gegen den Dev-Server geprüft: Container erscheint nur mobil (`d-lg-none` greift ab `lg`) und nur eingeloggt; Feature-Gating korrekt (inaktive Tabs bleiben versteckt); Klick auf einen Schnellzugriff-Button aktiviert die zugehörige Tab-Pane und setzt `aria-selected`/`active` am echten Nav-Button.

### fix (Fahrzeiten-Panel: "Zeile hinzufügen" wirkte deaktiviert, Issue #5)

- **User-Fund:** Der Button nutzte `btn-outline-secondary` — bewusst zurückhaltender Stil, aber niedriger Kontrast genug, um mit einem deaktivierten Button verwechselt zu werden, obwohl er voll funktionsfähig war. Auf `btn-secondary` (gefüllt) umgestellt, damit die Aktion eindeutig als aktiv erkennbar bleibt.

## 2026-08-16 (10)

### feat (PDF-Vorlagen-Pipeline: laufende Summe, Beispieldaten ab dem Monatsersten, Phase 8.3)

- **Bugfix Beispieldaten (User-Fund: „Tag 1 fällt komplett weg"):** die Datums-Beispielwerte begannen am **2.** des Monats — in der Tages-Spalte sah das wie ein verlorener Datensatz aus. Beginnen jetzt am 1.
- **Neuer Summenbezug `$laufend`** („bis hierher: Übertrag + diese Seite"). Bisher gab es nur `$bisher` (nur Vorseiten), `$seite` (nur diese) und `$alle` (ganzes Dokument) — die fortgeschriebene Zwischensumme, die ein Übertragsformular eigentlich braucht, war damit **nicht** ausdrückbar. Wer sie über `$alle` nachbaute, bekam auf jeder Seite die Gesamtsumme und nur auf der letzten zufällig den richtigen Wert.
- **Waisenzeilen-Schutz entfernt** (User-Fund „Seite 2 hat 11 Zeilen, es werden aber nur 10 eingetragen", danach User-Entscheidung). Der Schutz aus Phase 5 zog eine Zeile von der Vorseite nach, wenn die letzte Seite sonst nur eine einzige Zeile getragen hätte. Auf einem Formular mit vorgedruckten Zeilen hinterlässt das mitten im Dokument einen freien Platz, der wie ein vergessener Eintrag aussieht — und ein Prüfer kann nicht erkennen, ob dort etwas fehlt. Seiten füllen sich jetzt streng der Reihe nach; eine letzte Seite mit einer einzigen Zeile ist ausdrücklich in Ordnung. Neuer Test hält fest, dass **nur** die letzte Seite angebrochen sein darf.
- **Verifikation:** `lint`, `tsc --noEmit`, `test` (1534/1534; der `$laufend`-Test nutzt einen eigenen Kontext mit Zeilen einer Folgeseite, sonst wären laufende Summe und Gesamtsumme in der Fixture zufällig gleich). Am real erzeugten dreiseitigen PDF nachgerechnet — 24 Zeilen à 2:30, Tage 1 bis 24 lückenlos:

  | Seite | Zeilen | Übertrag | diese Seite | bis hierher | gesamt |
  | --- | --- | --- | --- | --- | --- |
  | 1 von 3 | 12 von 12 | 0:00 | 30:00 | 30:00 | 60:00 |
  | 2 von 3 | 11 von 11 | 30:00 | 27:30 | 57:30 | 60:00 |
  | 3 von 3 | 1 von 11 | 57:30 | 2:30 | 60:00 | 60:00 |

## 2026-08-16 (9)

### fix (PDF-Vorlagen-Pipeline: Summen über Zeit- und Rechenspalten, Phase 8.3)

- **User-Fund:** „bei den Beispieldaten werden die Summen nicht berechnet" — 12 EA-Zeilen à `02:30` müssten 30:00 ergeben. Zwei unabhängige Ursachen, beide führten still zu falschen Zahlen statt zu einem Fehler:
- **(1) Aggregationen konnten keine Zeitwerte lesen.** `OPS.summe`/`max` rechneten mit `Number(...) || 0`, und `Number("02:30")` ist `NaN` — jede Summe über eine gespeicherte Dauer war damit exakt 0. Neue `alsZahl()` liest `"HH:mm"` als Minuten und alles andere wie bisher; sie wird jetzt in `summe`, `max` und als Standard-Operandenleser in Zeilenrechnungen benutzt. Da `Number("02:30")` vorher ohnehin `NaN` ergab, ändert sich für bisher funktionierende Konfigurationen nichts.
- **(2) Summen über berechnete Spalten fanden gar keinen Wert.** Das Ergebnis einer berechneten Spalte (z.B. Bereitschafts-Dauer aus Ende − Beginn) entstand nur beim Zeichnen und stand nirgends in den Daten — eine Fußsumme darüber lief ins Leere. `tabellenZeilen()` legt den berechneten Wert jetzt unter dem Spalten-Key in eine **Kopie** der Zeile (Nutzdaten bleiben unangetastet), womit jede Aggregation ihn findet. Ein gleichnamiges gespeichertes Feld wird dabei überschrieben, damit die Summe zu dem passt, was in der Spalte gedruckt steht. Ankreuz-Spalten (`wenn`) bleiben außen vor — ihr Inhalt ist Text, keine Zahl.
- **Verifikation:** `shared` 53/53 (13 neue Tests: `alsZahl`, Summe/Maximum über Dauer-Spalten, berechnete Spalten in `tabellenZeilen`, Unversehrtheit der Nutzdaten), Frontend `lint`/`tsc --noEmit`/`test` (1533/1533), Backend `tsc --noEmit`/`test` (929/931, dieselben 2 vorbestehenden EA-Fehlschläge). Der gemeldete Fall am real erzeugten PDF nachgerechnet: 12 Zeilen à 2:30 ergeben Seiten- **und** Gesamtsumme `30:00`, das Maximum `2:30`.

## 2026-08-16 (8)

### feat (PDF-Vorlagen-Pipeline: Werte-Vorschau je Eintrag im Editor, Phase 8.3)

- **User-Wunsch:** die Beispielwerte direkt im Editor sehen, „so dass ich z.B. auch die Summen richtig sehe". Bisher war jeder Wert nur über die Testdaten-Vorschau als PDF prüfbar — für einen Tippfehler im Datenpfad oder einen falschen Summenbezug ein unverhältnismäßig langer Weg.
- **Jedes Feld und jede Spalte zeigt jetzt ihren gerenderten Beispielwert** unter den Einstellungen, leere Werte als `(leer)` gekennzeichnet. Berechnet wird er über denselben `wert()`/`spaltenWert()`-Pfad wie im PDF, es kann also nicht auseinanderlaufen.
- **Die Vorschau bekommt den echten Renderer-Kontext** (`erzeugeVorschau()`): die Beispielzeilen werden über `verteile()` auf Seiten aufgeteilt und die zum aktiven Tab passende Seite ausgewählt. Dadurch stimmen `$alle`-Gesamtsummen, `$seite`-Zwischensummen **und** der `$bisher`-Übertrag — letzterer wäre mit einem Behelfskontext immer 0 geblieben, also genau bei dem Feld nutzlos, das am schwersten zu prüfen ist. Auch `{seite}`/`{seite-1}` zeigen die Nummern der gewählten Seite. Wirft `verteile()` bei halbfertiger Konfiguration, fällt die Vorschau auf eine Einzelseite zurück, statt die Feldliste unbrauchbar zu machen.
- **Bugfix Testdaten-Vorschau:** Datenpfade **innerhalb** von Text-Platzhaltern wurden nie mit Beispielwerten belegt — `Zulagen {Monat}/{Jahr}` erschien im Vorschau-PDF als „Zulagen /". Ursache war eine zu grobe Regel („feste Texte lesen nichts aus den Daten"): der Feld-*Key* ist bei einem Textfeld tatsächlich kein Datenpfad, die Pfade stecken aber in den Platzhaltern. Neue `datenPlatzhalter()` zieht genau diese heraus (ohne die vom Kontext bedienten `seite`/`seiten`/`heute`), sie werden jetzt mitbefüllt.
- **Zweite Werteart „Beispieldaten"** (User-Nachtrag: „ich möchte nicht »Testwert 1« stehen haben, sondern einen passenden Wert"). Der Datenkatalog trägt jetzt je Feld einen fachlich passenden Beispielwert — konstant (Nachname „Mustermann", Betrieb, Entgeltgruppe) oder als Funktion über den Zeilenindex, wo Wiederholung stören würde (Tage, Auftragsnummern). Beide Vorschauen bleiben nebeneinander bestehen: `Beispieldaten` sieht aus wie ein ausgefülltes Formular, `Platzhalter` zeigt weiterhin, welche Zelle zu welchem Eintrag gehört. Die Werte-Vorschau in der Feldliste nutzt die Beispieldaten. Pfade ohne hinterlegtes Beispiel fallen auf den generischen Platzhalter zurück.
  - Für Bereitschaft liegt hinter `Beginn`/`Ende` bewusst ein **Zeitstempel**, kein `"HH:mm"`: Format „Uhrzeit" liest daraus die Tageszeit, „Datum kurz" das Datum — ein Wert bedient damit BZ (Zeitraum über Tage) und BE (Einsatz-Uhrzeit) gleichermaßen.
  - Bei berechneten Spalten werden die Operanden zuerst aus dem Katalog belegt, sonst gewinnt der generische Zeitwert über das `??=` in `fuelleOperanden()`.
- **Verifikation:** `lint`, `tsc --noEmit`, `test` (1533/1533, 10 neue Tests für `erzeugeVorschau` — Gesamtsumme ungleich 0, gefülltes `$bisher` auf der Folgeseite, Seitenzahlen passend zum Tab, befüllte Text-Platzhalter, der Rückfall bei unfertiger Konfiguration sowie beide Wertearten). Beide Vorschauen zusätzlich als echtes PDF gegenübergestellt: `Mustermann, Max` / `30012345` / `I / IW / MI` / `Zulagen 3/2026` / `02.03.2026 06:00 14:30 A-10023` gegenüber `Name (Test)` / `PNummer (Test)` / `Zulagen Monat (Test)/Jahr (Test)`.

## 2026-08-16 (7)

### feat (PDF-Vorlagen-Pipeline: Seitenzahl-Platzhalter mit Versatz, Phase 8.3)

- **User-Frage:** wie kommt die Nummer in „Übertrag von Seite ##" — `{seite - 1}`? Genau so ging es bisher nicht: alles außer `{seite}`/`{seiten}`/`{heute}` wurde als Datenpfad gelesen, `{seite - 1}` lief also ins Leere.
- **`{seite}` und `{seiten}` vertragen jetzt einen ganzzahligen Versatz:** `{seite-1}`, `{seite + 1}`, `{seiten-1}`; Leerzeichen sind erlaubt, damit die naheliegende Schreibweise funktioniert. Bewusst nur Plus/Minus auf den beiden Seitenzahlen und keine allgemeine Formel — gebraucht wird der Verweis auf die Nachbarseite, alles darüber hinaus wäre eine Ausdruckssprache im Fließtext. Andere Muster (`{seite*2}`, `{seite-1.5}`) bleiben Datenpfade und damit leer, statt still etwas Falsches zu rechnen.
- **Verifikation:** `lint`, `tsc --noEmit`, `test` (1523/1523, 4 neue Tests inkl. der abgelehnten Muster). Am real erzeugten zweiseitigen PDF gegengeprüft: Seite 2 trägt „Übertrag von Seite 1" neben „Seite 2 von 2".

## 2026-08-16 (6)

### feat (PDF-Vorlagen-Pipeline: Datum neben der Unterschrift, Phase 8.3)

- **User-Anforderung:** ein Datumsfeld neben der Unterschrift — „heute, oder wenn der letzte Eintrag innerhalb der letzten 14 Tage liegt, dann das letzte Datum aus den Einträgen".
- **Neue Summenart `letztesDatum`** (`OpName`): jüngster Datumswert eines Feldes über `$alle`/`$seite`/`$bisher`, wahlweise auf eine Tabelle eingegrenzt. Liefert bewusst einen Zeitstempel in Millisekunden statt eines Datums-Strings — dadurch bleibt der `OPS`-Rückgabetyp einheitlich und jedes Datumsformat (`datum`, `datumKurz`, `monatJahr`, …) greift unverändert. Das vorhandene `max` taugt dafür nicht: es rechnet `Number("2026-03-20")` und bekäme `NaN`.
- **Neues `Berechnet.maxTage`** als Frist in Tagen: ist der jüngste Eintrag älter — oder gibt es gar keine Zeilen —, wird das heutige Datum gesetzt. Ohne Angabe bleibt es immer beim letzten Eintrag. Ein Eintrag in der Zukunft zählt als aktuell, damit vorausgefüllte Termine nicht überraschend auf heute zurückfallen.
- **Neuer Platzhalter `{heute}`** im festen Text für den einfachen Fall („Musterstadt, den {heute}") — wie bei der Seitenzahl kein eigener Feldtyp nötig.
- **Der Erzeugungstag steckt im `Kontext`**, nicht in einem `new Date()` mitten im Renderer: einmal je Dokument bestimmt (ein Lauf über Mitternacht ergäbe sonst zwei verschiedene Datumsangaben im selben PDF) und in Tests injizierbar.
- **Editor:** „Letztes Datum" in der Summenart-Auswahl mit Eingabefeld für die Frist, plus Schnellanlage-Knopf „+ Datum (Unterschrift)" mit 14 Tagen und Format `datum` vorbelegt; das Datumsfeld der Tabelle wählt der Admin, es ist je Ressource ein anderes.
- **Verifikation:** `shared` 41/41 (9 neue Tests für `OPS.letztesDatum` und `datumMitFrist`, inkl. Fristgrenze, fehlender Zeilen und des `max`-Gegenbeispiels), Frontend `lint`/`tsc --noEmit`/`test` (1519/1519, 6 neue Tests in `wert.test.ts`), Backend `lint`/`tsc --noEmit`/`test` (929/931, dieselben 2 vorbestehenden EA-Fehlschläge). Beide Zweige zusätzlich am real erzeugten PDF geprüft: mit altem letzten Eintrag steht dort `16.08.2026` (heute), mit einem Eintrag vom 10.08. steht `10.08.2026` — während `{heute}` in derselben Datei unverändert `16.08.2026` bleibt.

## 2026-08-16 (5)

### feat (PDF-Vorlagen-Pipeline: Raster-Indikator am Seitenrand und Beispiel-Unterschrift, Phase 8.3)

- **Indikator am linken Seitenrand** (User-Wunsch): je Tabelle eine Klammer über die Spannweite des Zeilenrasters, mit einem Strich je Zeile und ohne Beschriftung. Bisher zeigte das Overlay nur die erste Datenzeile — ob `maxZeilen` noch aufs Formular passt, war daraus nicht zu sehen. Mehrere Tabellen bekommen nebeneinanderliegende Spuren, die scharf geschaltete ist hervorgehoben.
- **Beispiel-Unterschrift in der Testdaten-Vorschau** (User-Fund: „es gibt kein Beispiel für die Unterschrift"): die Signaturfläche blieb als einziges Element ohne Beispielwert, obwohl gerade dort Größe und Überdeckung schwer einzuschätzen sind. Neue `beispielSignatur.ts` zeichnet einen Schriftzug auf ein Canvas — bewusst gezeichnet statt als Bild eingebettet, damit das Ergebnis dieselbe Beschaffenheit hat wie die echte Unterschrift aus `signaturePad.ts` (transparenter Hintergrund, gleiche Kantenglättung). Ohne 2D-Kontext liefert sie `undefined`, die Vorschau läuft dann wie bisher ohne Unterschrift weiter.
- **Inline-Hilfe** beantwortet zwei wiederkehrende Fragen direkt: senkrecht wird der Text immer in der Zelle zentriert, sobald sie als Rechteck aufgezogen wurde (ohne Ober-/Unterkante bleibt `y` die Grundlinie); und für die zertifikatsbasierte Signatur der zwei Prüfenden ist **nichts** zu hinterlegen — sie ziehen die Box im Adobe Reader selbst auf, im Formular muss nur Platz frei bleiben.
- **Zeilenhöhe aus zwei Zeilen messen** (Folge aus dem Indikator: dessen Striche liefen unten aus den Zeilen heraus). Ursache ist nicht die Vorlage, sondern die Messung — `hoehe` wurde freihändig über EINE Zeile gezogen, und der Renderer zieht je Zeile dieselbe `hoehe` ab, wodurch sich Bruchteile eines Punktes aufsummieren (0,5 pt × 11 Zeilen = 5,5 pt Versatz unten). Neuer Scharf-Modus „letzte Datenzeile": Band über die letzte Zeile ziehen, `zeilenHoeheAus()` mittelt `(startY − y) / (Zeilen − 1)` und trägt das Ergebnis mit zwei Nachkommastellen ein. Das ist bei 12 Zeilen rund 11× genauer als die Einzelmessung; die Snackbar nennt den gemessenen Wert.
- **Bugfix vertikale Zentrierung in Tabellenzeilen (User-Fund: „alles am unteren Rand gerendert"):** `build.ts` übergab je Spalte nur `y`, kein `y2` — ohne Oberkante ist `y` laut `zeichne()` die **Grundlinie**, der Text saß also auf der Zeilenunterkante statt mittig. Die Zentrierung war nie kaputt, sie griff für Spalten nur nicht, weil `Spalte` von sich aus keine y-Kanten hat. Diese kommen jetzt aus der Zeilenhöhe (`y2: y + tabelle.hoehe`) — also aus genau dem Band, das im Editor über die erste Datenzeile gezogen wurde. **Verhaltensänderung:** bestehende Konfigurationen rücken um `(hoehe − 0,72·size)/2` nach oben; bei Zeilenhöhe 14 und Schriftgröße 9 sind das 3,76 pt. `startY` bleibt unverändert die Grundlinie der ersten Zeile.
- **Verifikation:** `lint`, `tsc --noEmit`, `test` (1513/1513, 5 neue Tests für `zeilenHoeheAus` inkl. des Fehlerbildes selbst, plus ein Test für die Zeilenzelle). Die Zentrierung zusätzlich am real erzeugten PDF per `pdftotext -bbox` nachgemessen: Text 3,76 pt höher als vorher, Zeilenabstand unverändert bei exakt 14 pt — deckt sich mit der Formel. Die vertikale Zentrierung ist bereits durch `zeichne.test.ts` abgedeckt („mit y2 liegt die Baseline vertikal mittig in der Zelle"). Indikator und Beispiel-Unterschrift sind headless nicht prüfbar (`happy-dom` liefert keinen Canvas-2D-Kontext) und brauchen den Blick im Browser.

## 2026-08-16 (4)

### feat (PDF-Vorlagen-Pipeline: verschachtelte Zeilenrechnungen und Zeitspannen über Tage, Phase 8.3)

- **User-Fund:** „Es gibt auch mehrere Berechnungen: z.B. Bereitschaft Ende − Beginn + Pause". `ZeilenBerechnet` hatte genau **einen** Operator über N Operanden — gemischte Operatoren waren nicht darstellbar.
- **Operanden dürfen jetzt selbst Rechnungen sein** (`ZeilenOperand = string | number | ZeilenBerechnet`). Die Klammerung steht damit explizit in der Struktur; bewusst **keine** implizite Punkt-vor-Strich-Regel, die man beim Konfigurieren falsch erwarten könnte. Beispiel: `{op:'summe', operanden:[{op:'zeitspanne', operanden:['Ende','Beginn']}, 'Pause']}`. Ob die Pause addiert oder abgezogen wird, ist damit reine Konfiguration (`summe` statt `differenz`), nicht im Code festgelegt.
- **Bugfix `zeitdifferenz` bei Bereitschaftszeiträumen:** `alsMinuten()` liest nur Stunde und Minute **des Tages** — ein Zeitraum vom 02.03. 16:00 bis 05.03. 06:00 kam als 14:00 heraus statt 62:00, ohne Fehler oder Warnung. Neue Rechenart **`zeitspanne`** mit `alsZeitstempelMinuten()` rechnet über vollständige Zeitstempel und darf über Tage laufen. `zeitdifferenz` bleibt für Uhrzeiten eines Tages (Einsätze, mit Mitternachts-Ergänzung) — die Doku am Typ benennt jetzt beide Bezüge und die Folge des falschen Operators.
- **Auswertung liegt jetzt in `shared`** (`berechneZeile()`), weil sie rekursiv ist und je Operator einen eigenen Operanden-Parser braucht: Zeit-Operatoren lesen `"HH:mm"` bzw. Zeitstempel, alles andere `Number`. Jeder Knoten liest **seine eigenen** Blatt-Operanden — so bleibt `Pause` im äußeren `summe`-Knoten eine schlichte Minutenzahl, während der innere Knoten Zeitstempel parst. `spaltenWert.ts` ruft nur noch auf.
- **Editor:** die berechnete Spalte ist eine eigene, rekursive `Rechnung`-Komponente. Jeder Operand lässt sich auf „Zwischenrechnung (Klammer)…" umstellen oder direkt als solche anhängen; verschachtelte Rechnungen sind eingerückt und einzeln entfernbar. Operator-Auswahl benennt den Unterschied im Klartext („Dauer aus Uhrzeiten (ein Tag, über Mitternacht)" vs. „Zeitspanne aus Zeitstempeln (über mehrere Tage)").
- **Testdaten-Vorschau** füllt Operanden jetzt rekursiv und **positionsabhängig**: Zeit-Operatoren rechnen `erster − folgende`, also bekommt die erste Stelle den späteren Zeitpunkt. Vorher erhielten alle Operanden denselben Wert, wodurch jede Zeit-Rechnung in der Vorschau 0 ergab.
- **Datenkatalog Bereitschaft:** `Beginn`/`Ende` sind **ein** Eintrag unter „Zeile BZ + BE" (User: „einfach BZ Beginn oder Ende reicht"). Datum und Uhrzeit sind im Formular zwei Zellen, aber kein zweites Datenfeld — dafür dasselbe Feld zweimal als Spalte setzen, einmal mit Format „Datum kurz", einmal mit „Uhrzeit".
- **Verifikation:** `shared` 32/32 (10 neue Tests für `berechneZeile`, `alsZeitstempelMinuten`, `operandenFelder`), Frontend `lint`/`tsc --noEmit`/`test` (1507/1507, u.a. rekursive Zod-Validierung inkl. kaputter Zwischenrechnung), Backend `lint`/`tsc --noEmit`/`test` (929/931, dieselben 2 vorbestehenden EA-Fehlschläge; ein Zwischenlauf zeigte zusätzlich wechselnde 5000-ms-Timeouts in Integrationstests, die im Wiederholungslauf verschwanden — flaky, unabhängig von dieser Änderung). Real erzeugtes Bereitschafts-PDF bestätigt die BZ-Dauer `62:30` (62 h Zeitraum + 30 min Pause) und `62:00` ohne Pause, bei unveränderten Einsatz-Dauern über `zeitdifferenz`.

## 2026-08-16 (3)

### feat (PDF-Vorlagen-Pipeline: mehrere Datentabellen je Version, Phase 8.3)

- **User-Fund:** „bei Bereitschaft gibt es 3 Datentabellen" — BZ (Zeiträume), BE gefiltert auf LRE 1+2, BE gefiltert auf LRE 3. Das bisherige Modell kannte genau **eine** Tabelle pro Version und **ein** Zeilenraster pro Seite; Bereitschaft war damit nicht abbildbar.
- **`Version.tabellen: Record<string, TabellenDef>`** ersetzt `Version.zeilen`, **`SeitenDef.bereiche: TabellenBereich[]`** (`{tabelle, startY, maxZeilen}`) ersetzt `startY`/`maxZeilen`. Eine Seite trägt beliebig viele Tabellen, jede mit eigenem Platz.
- **`TabellenDef.filter`** ist der Kern des Falls: dieselbe Quelle (`Daten.BE`) speist zwei Tabellen, getrennt über `LRE` — keine künstliche zweite Datenquelle nötig. **`Berechnet.tabelle`** grenzt Summen auf eine Tabelle ein (ohne Angabe wird weiterhin über alle gerechnet).
- **`Spalte.wenn`** (neu) macht eine Spalte zur Ankreuz-Spalte: trägt einen festen Text („X"/„1") nur ein, wenn das Zeilenfeld einen der gewählten Werte hat. Deckt die LRE-Spalten ab — inklusive „bei keiner LRE bleibt die Zelle leer" (`LRE 1/2 ohne x` fällt in den Tabellenfilter, kreuzt aber nirgends an). Die bekannten LRE-Werte stehen im Editor als Checkboxen, nichts abzutippen.
- **Rechenart `zeitdifferenz`** (neu) mit `alsMinuten()`: die Einsatz-Dauer ist kein gespeichertes Feld, sondern `Ende − Beginn` — `Number("07:00")` wäre `NaN`. Rechnet über Mitternacht korrekt weiter (22:00→01:15 = 3:15) und ergibt mit Format `stunden` eine Zeitspanne.
- **Renderer:** `verteile()` verteilt pro Tabelle in deren eigenen Seitenbereich und öffnet eine Folgeseite, sobald **irgendeine** Tabelle überläuft; Waisenzeilen-Schutz greift pro Tabelle. Wirft mit klarer Meldung, wenn Zeilen übrig bleiben und `weitereSeite` fehlt **oder** die Folgeseite für die betroffene Tabelle keinen Bereich definiert (verhindert eine Endlosschleife). `build.ts` zeichnet je Seite alle Bereiche, `Kontext.$seite`/`$bisher`/`$alle` sind nach Tabellenname aufgeschlüsselt.
- **Editor:** Tabellenliste (anlegen/löschen/umbenennen, Quelle + Filter mit Werte-Checkboxen), je Seite die Zuordnung Tabelle → Bereich mit eigenem `startY`/`maxZeilen`.
- **Achsen-Bänder statt Rechteck (User-Rückfrage: „ist ein Quadrat bei nur x- oder nur y-Werten sinnvoll?"):** Beim Zeilenraster wurden die x-Kanten verworfen, bei Spalten die y-Kanten — ein Rechteck zu ziehen, von dem die Hälfte weggeworfen wird, war irreführend. Jetzt zeigt die Vorschau nur die genutzte Achse als Band (Raster = waagerecht über die Seitenbreite, Spalte = senkrecht über die Seitenhöhe), Hinweistext und Live-Koordinaten nennen ebenfalls nur diese Achse.
- **Verifikation:** `shared` 22/22, Frontend `lint`/`tsc --noEmit`/`test` (1504/1504), Backend `lint`/`tsc --noEmit`/`test` (929/931, dieselben 2 vorbestehenden EA-Download-Fehlschläge). Real erzeugtes Bereitschafts-PDF mit allen drei Tabellen, `qpdf --check` fehlerfrei, per `pdftotext` gegengerechnet: BZ mit Datum (`02.03.`) und Uhrzeit (`16:00`) als getrennte Spalten aus demselben Feld, `be12` = 3 gefilterte Zeilen mit Ankreuzern nur bei `LRE 1`/`LRE 2`, `be3` = 2 Zeilen, Dauer 2:30/3:15 (über Mitternacht)/2:45, `anzahl` über `be12` = 3 und `summe` der Privat-km nur über `be3` = 50. Zweiter Lauf mit Überlauf einer von drei Tabellen: nur `be12` bricht um (2+2 statt 3+1 wegen Waisenschutz), BZ und `be3` bleiben vollständig auf Seite 1.

## 2026-08-16 (2)

### refactor (PDF-Vorlagen-Pipeline: ein Feldbereich statt drei, Seitenzahl konfigurierbar, Phase 8.1)

- **User-Frage deckte auf:** `kopf` und `seitenfuss` waren im Renderer **exakt identisch** (beide mit seitenbezogenem Kontext), nur `fuss` unterschied sich (Summen über alle Zeilen statt über die aktuelle Seite). Drei Bereiche, aber nur zwei Verhalten — und die Namen suggerierten eine Position, die in Wahrheit allein aus den Koordinaten kommt.
- **`SeitenDef.felder` ersetzt `kopf`/`seitenfuss`/`fuss`/`uebertrag`.** Der einzige echte Unterschied steckt jetzt dort, wo er hingehört: in `Berechnet.ueber`, das neben `$seite` und `$bisher` nun auch **`$alle`** kennt (Gesamtsumme des Dokuments). `build.ts` braucht dadurch keine vier Renderphasen und keinen zweiten Kontext mehr.
- **Seitenzahl war fest verdrahtet** (`x:500, y:30, size:8`) und damit weder positionier- noch abschaltbar. Jetzt entsteht sie als normales Feld über **Platzhalter im festen Text**: `{seite}`/`{seiten}` — und, auf Wunsch des Users allgemein gehalten, **jeder Datenpfad** als `{name}` (z.B. `"Zulagen {Monat}/{Jahr} — Seite {seite} von {seiten}"`). Unbekannte Platzhalter werden zu leerem Text, damit nie ein roher `{…}`-Rest im PDF landet.
- **Editor:** eine Feldliste statt vier, mit Schnellanlage-Knöpfen (`+ Feld`, `+ Gesamtsumme`, `+ Übertrag`, `+ Seitenzahl`), die die passende Vorkonfiguration mitbringen. Der Summen-Bezug ist als Klartext wählbar („alle Zeilen (Gesamtsumme)" / „nur diese Seite" / „alle Vorseiten (Übertrag)").
- **JSON-Ansicht der Konfiguration** (User-Wunsch: „alles auf einmal kopieren/einfügen") unter dem Editor: zeigt den kompletten Stand, nimmt eingefügtes JSON aber erst auf Knopfdruck an und validiert es dabei gegen das neue, aus `configSchema.ts` exportierte `konfigSchema` — halbfertiges Tippen setzt den Editor also nicht laufend zurück, und kaputtes JSON landet nie im State.
- **Bugfix Overlay-Beschriftungen (User-Fund):** Das Rechteck des Zeilenrasters teilt sich die linke Kante mit der ersten Spalte, wodurch beide Beschriftungen exakt übereinander lagen und unlesbar wurden. Das Raster beschriftet sich jetzt an der rechten Kante (`Rechteck.labelRechts`), zusätzlich weichen kollidierende Beschriftungen generell nach oben aus — das greift auch bei mehreren Feldern auf gleicher Höhe, nicht nur in diesem Fall.
- **Verifikation:** `shared` 22/22, Frontend `lint`/`tsc --noEmit`/`build`/`test` (1504/1504), Backend `lint`/`tsc --noEmit`/`test` (929/931, dieselben 2 vorbestehenden EA-Download-Fehlschläge). Real erzeugtes zweiseitiges PDF bestätigt `Seite 1 von 2 — 3/2026` (Seiten- **und** Datenpfad-Platzhalter zusammen), Gesamtsumme 150,00 über `$alle` und Übertrag 60,00 über `$bisher`. Dabei fingen die Tests erneut zwei nicht typgeprüfte Fixtures (`pdf-test.ts`, `configSchema.test.ts`) ab, die `tsc` wegen untypisierter Objektliterale durchgelassen hatte — dieselbe Falle wie beim Layout-Redesign. Die Overlay-Beschriftung selbst ist headless nicht prüfbar (`happy-dom` liefert kein Canvas-`2d`-Kontext) und braucht den Blick im Browser.

## 2026-08-16 (1)

### feat (PDF-Vorlagen-Pipeline: Editor-Nachbesserungen aus dem User-Review, Phase 8.1)

- **Zellen statt Punkte:** Felder und Spalten werden als Rechteck aufgezogen (Maustaste gedrückt halten, ziehen, loslassen) statt per Einzelklick gesetzt. `Feld` hat dafür optionale `x2`/`y2` (rechte/obere Kante), `Spalte` ein `x2`. `zeichne.ts` platziert den Text laut `align` in dieser Zelle und immer vertikal mittig; ohne `x2`/`y2` bleibt das alte Ankerpunkt-Verhalten erhalten (abwärtskompatibel zu Konfigurationen aus Phase 3–8).
- **Ausrichtung `zentriert`** — laut User sind die meisten Formularzellen zentriert; der Text wird zwischen den beiden gezogenen Kanten mittig gesetzt.
- **Lupe** beim Positionieren: sobald ein Eintrag scharf geschaltet ist, zeigt eine Lupe (3-fach) den Ausschnitt unter dem Cursor — **schon beim Hover, nicht erst beim Ziehen**, sonst wäre der Startpunkt gesetzt, bevor man ihn vergrößert sieht. Zusätzlich Zoom-Auswahl (100–300 %).
- **Datenzuordnung statt Freitext:** neuer `datenKatalog.ts` mit den tatsächlich vom Download-Body gelieferten Feldern je Ressource (abgeleitet aus `shared/src/download.ts`), gruppiert als Dropdown. Freier Datenpfad bleibt als Escape-Hatch. Formularwechsel setzt die Konfiguration zurück, da Zeilen-Quelle und Datenpfade ressourcenspezifisch sind.
- **Berechnete Spalten** (`Spalte.berechnet`): Produkt/Summe/Differenz/Quotient über Felder **derselben** Datenzeile (z.B. Betrag = Dauer × Satz), Operanden sind Zeilenfelder oder feste Zahlen — neue `spaltenWert.ts`, abgegrenzt von `wert.ts` (das über mehrere Zeilen aggregiert).
- **Übertragszeile** (`SeitenDef.uebertrag`): eigene Zellen im Datenbereich der Folgeseiten, je Zelle fester `text` (Beschriftung) oder Summe über `$bisher`. `Feld.text` neu für feste Beschriftungen.
- **Mehr Formate** (User: „die Formate sind zu wenige"): zusätzlich `zahl`, `ganzzahl`, `datumKurz`, `tag`, `wochentag`, `monatJahr`, `uhrzeit`, `stunden`, `liste`, `grossbuchstaben`. `liste` fügt Arrays zusammen (z.B. `Pers.OE` als Hierarchie-Ebenen), `uhrzeit`/`stunden` verstehen sowohl `"HH:mm"` als auch ISO-Zeitstempel. **Verhaltensänderung:** `datum` liefert jetzt `15.03.2026` statt `15.3.2026` (Formularzellen erwarten zweistellig).
- **`autoGroesse`/`umbruch`** je Feld und Spalte: Schrift wird verkleinert, bis der Text in die Zelle passt (Untergrenze 4pt), und/oder an Wortgrenzen umgebrochen; mehrzeilige Blöcke werden vertikal in der Zelle zentriert. Harte Umbrüche (`\n`) werden dabei immer respektiert.
- **Zusammengesetzte Felder** (`Feld.quellen` + `Feld.trenner`): mehrere Datenpfade in einer Zelle, verbunden mit frei wählbarem Trennzeichen (`", "`, `" / "`, `"; "`, `" - "`, `" | "`, Zeilenumbruch oder eigenes). Leere/fehlende Teile fallen weg, damit optionale Werte wie `Adress2` keine doppelten Trennzeichen hinterlassen; ein gesetztes Format gilt für jeden Teil einzeln (z.B. zwei Datumswerte als Zeitraum).
- **Koordinaten nachjustierbar:** die Koordinaten-Anzeige im Kopf jedes Eintrags klappt zu Zahlenfeldern für alle vier Kanten auf — freihändig gezogene Rechtecke treffen selten exakt dieselbe Höhe wie das Feld daneben. Zeilenraster und Signaturfläche ebenfalls direkt eingebbar.
- **Live-Koordinaten** beim Positionieren: während des Ziehens zeigt eine Anzeige die PDF-Punkte, die beim Loslassen gesetzt würden (inkl. Breite × Höhe), beim reinen Hover die Cursorposition.
- **Bugfix Overlay:** die Rechteck-Vorschau liegt jetzt auf einem eigenen Canvas über dem PDF — vorher löste jede Mausbewegung beim Ziehen einen kompletten `pdfjs`-Seitenrender aus (Ruckeln, parallele `render()`-Aufrufe auf demselben Canvas).
- **Bugfix Querformat (User-Fund):** das Zeilenraster-Rechteck war auf feste x-Werte (40–555) verdrahtet und deckte bei Querformat-Vorlagen nur einen Teil der markierten Zeile ab. Es spannt jetzt über die konfigurierten Spalten bzw. die echte Seitenbreite aus dem Viewport.
- **Verifikation:** `shared` 22/22, Frontend `lint`/`tsc --noEmit`/`build`/`test` (1499/1499), Backend `lint`/`tsc --noEmit`/`test` (929/931, dieselben 2 vorbestehenden EA-Download-Fehlschläge). Zusätzlich real erzeugtes zweiseitiges PDF über den echten `build()`-Pfad, mit `qpdf --check` (fehlerfrei) und `pdftotext` gegengerechnet: zentrierte Kopfzellen, `liste`-Format (`I / IW / MI`), umgebrochener Text über zwei Zeilen, `uhrzeit` aus `"7:05"` **und** ISO-Zeitstempel je `07:05`/`08:30`, berechnete Spalte (×2), Fußsumme 150,00 über alle fünf Zeilen, Übertrag 60,00 auf Seite 2 = Summe der drei Zeilen von Seite 1. Zusammengesetzte Felder ebenfalls im echten PDF bestätigt: `Mustermann, Max`, `Bahnweg 1 / 12345 Berlin` (fehlendes `Adress2` sauber übersprungen) und `01.03.2026 - 05.03.2026` (Format je Teil).

## 2026-08-15 (7)

### feat (PDF-Vorlagen-Pipeline: visueller Koordinaten-Editor, Phase 8)

- **JSON-Textarea aus Phase 7 vollständig ersetzt** — User-Review verwarf den Rohtext-Modus ("Wo ist die Hilfe zur Konfiguration der Felder?"), Nachfolge-Anforderung: Koordinaten per Klick auf die echte PDF-Vorschau setzen statt Hand-JSON.
- **Neue Komponenten unter `features/Admin/components/FormularEditor/`:** `PdfCanvas.tsx` (rendert die lokal gewählte PDF-Datei via `pdfjs-dist`, kein Server-Roundtrip; Seiten-Navigator; zeichnet Feld-/Spalten-/Signatur-Marker; Klick auf Canvas nur bei scharf geschaltetem Feld aktiv), `FeldPanel.tsx` (volles CRUD für Kopf/Seitenfuß/Fuß/Spalten/Zeilenraster/Signatur — Interaktionsmodell: Feld in Liste "scharf schalten", dann Klick auf dem PDF setzt die Koordinate), `dummyDaten.ts` (Testdaten-Generator für die Vorschau), `FormularEditor.tsx` (Tabs Erste/Weitere Seite, Testdaten-Vorschau ruft das bestehende `build()` unverändert mit `layout.template = URL.createObjectURL(datei)` auf).
- **Neue Dependency `pdfjs-dist`.** Worker-Setup (`pdf.worker.mjs?url`, Vite-Konvention) bewusst per dynamischem Import statt statisch geladen — Bun (Testlauf) kennt das `?url`-Suffix nicht und würde beim statischen Modulgraph-Aufbau abbrechen, auch wenn kein Test die Komponente rendert.
- **`FormularUpload.tsx`:** `konfigJson`/`KONFIG_PLATZHALTER`/`JsonEditor`-Nutzung entfernt, ersetzt durch `<FormularEditor>` (aktiv sobald eine PDF-Datei gewählt ist). Inline-Hilfe auf das neue Interaktionsmodell umgeschrieben.
- **Verifikation:** `bun run lint`, `bunx tsc --noEmit`, `bun run build` (bestätigt korrektes Worker-Chunk-Bundling durch Vite) und `bun run test` (1470/1470) grün. Neuer Test `dummyDaten.test.ts`. **Offen:** manueller PC-Durchlauf (Felder setzen, Testdaten-Vorschau, echter Upload-Flow) steht beim User noch aus — reines Canvas-Zeichnen/Klick-Verhalten ist headless nicht sinnvoll testbar (siehe Phase-4-Lesson zu `happy-dom`).

## 2026-08-15 (6)

### refactor (PDF-Vorlagen-Pipeline: ein Layout pro Version statt einseitig/mehrseitig-Split)

- **User-Review nach Phase 7** deckte auf: die Aufteilung `Version.einseitig`/`Version.mehrseitig` war nur wegen Kandidat C (pyHanko-Signaturfeld-Namenskollision) nötig und entfällt unter Kandidat E — ergänzend: `SeitenDef.fuss` sollte pro-Seite datengetrieben bleiben statt hart auf "letzte Seite" verdrahtet, damit Bereitschafts abweichender Fall (Summe über alles auf Seite 1) ohne Sonderfall im Renderer funktioniert.
- **`verteile.ts` neu:** verteilt auf `ersteSeite` (immer genau einmal) + `weitereSeite` (wiederholt nur bei tatsächlichem Überlauf) statt auf ein `seiten[]`-Array mit `wiederholSeite`-Index — keine erzwungenen leeren Folgeseiten mehr bei wenig/keinen Zeilen.
- **`build.ts`:** keine `einseitig`/`mehrseitig`-Auswahl mehr, `verteile()` bekommt direkt `cfg.layout`. `fuss` rechnet weiterhin über ALLE Zeilen, unabhängig davon, auf welcher Seite es steht.
- **`configSchema.ts`:** Zod-Schema folgt der neuen `Layout`-Form.
- **`FormularUpload.tsx`:** EIN Datei-Upload statt zwei, Config-JSON als `{ersteSeite, weitereSeite?, zeilen}` in einem Editor. **Neu: Inline-Hilfe zur Feldkonfiguration** (`<details>`-Aufklapper — User-Review: "Wo ist die Hilfe zur Konfiguration der Felder?") — Koordinatensystem, Feld-Typen, `berechnet`-Syntax, kurzes Beispiel direkt auf der Seite.
- **Tests:** `verteile.test.ts`, `build.test.ts`, `configSchema.test.ts` auf die neue Form umgeschrieben (u. a. "0 Zeilen" liefert jetzt nur 1 Seite statt 3 erzwungene leere Seiten — Verhalten bewusst geändert, nicht nur die Fixtures).
- **Verifikation:** `bun run lint`, `bunx tsc --noEmit`, `bun run test` (1465/1465) grün. Zusätzlich real erzeugtes Bereitschafts-PDF (Fuß/Summe auf Seite 1 statt Seite 3) über den echten `build()`-Codepfad geprüft: `qpdf --check` fehlerfrei, `pdftotext` bestätigt Summe 57,00 (alle 5 Zeilen) korrekt auf Seite 1.

## 2026-08-15 (5)

### feat (PDF-Vorlagen-Pipeline: Minimal-Admin-UI für Vorlagen-Upload, Phase 7)

- **Neue Komponente `features/Admin/components/FormularUpload.tsx`:** lädt zwei PDF-Vorlagen (einseitig + mehrseitig, "zwei Vorlagendateien je Version" laut Konzept) hoch und legt darüber eine neue Formular-Version im Backend an. Koordinaten-Config als JSON über die bestehende `JsonEditor.tsx`-Komponente (Wiederverwendung wie geplant) — bewusst schlicht, wird in Phase 13 zur vollen Drag/Resize-Oberfläche ausgebaut, JSON-Modus bleibt dann als Power-User-Fallback.
- **`FetchRetry` kann keine Multipart-Bodies senden** (JSON-only) — Upload nutzt einen eigenen Roh-`fetch()` mit denselben Auth-Headern (`getServerUrl()`/`Storage`-Token), Versionsanlage selbst läuft über `FetchRetry` (JSON).
- **Neuer Admin-Tab "Formular-Vorlagen"** in `features/Admin/index.tsx`, sichtbar ab Team-Admin (passend zur Backend-Rollenschwelle `authorize(Role.TEAM_ADMIN)` für die Upload-Routen) — kein neues Capability-Flag nötig, reine Rollen-Prüfung wie serverseitig.
- **Verifikation:** `bun run lint`, `bunx tsc --noEmit`, `bun run test` (1464/1464) grün. Kein dedizierter Komponententest — die Plan-Verifikation für Phase 7 sieht hierfür explizit den manuellen End-zu-End-Durchlauf vor (PDF hochladen, Version anlegen, beide ausgelieferten PDFs prüfen), noch nicht durchgeführt.

## 2026-08-15 (4)

### feat (PDF-Vorlagen-Pipeline: Versionsauflösung verdrahten, Phase 6)

- **Neue Dependency `zod`.**
- **`infrastructure/pdf/configSchema.ts`:** spiegelt das Typsystem aus `@otto-kirchheim/nebengeld-shared` (`formular/types.ts`) als Zod-Schema. `parseRegistry(json: unknown): Registry` validiert die vom Server geladene Konfiguration (zur Laufzeit `unknown`) und wirft `ZodError` statt eines stillen Fehlverhaltens bei kaputten/unerwarteten Daten.
- **Dev-Testseite umgestellt:** `pdf-test.ts` ruft jetzt `resolve(registry, 'ez', leistungsdatum)` statt eine feste `Version` zu verwenden — Registry mit zwei Testversionen (`v1` bis 2026-01-01, `v2` danach offen), neues Datumsfeld auf der Testseite steuert die Auflösung, Titel im PDF zeigt zur Kontrolle die getroffene Version.
- **Tests:** `configSchema.test.ts` — valide Registry parst korrekt; kaputte Eingaben (fehlendes Pflichtfeld, falscher Feldtyp, komplett falsche Form: Array/`null`/String) werfen `ZodError` statt eines Laufzeitabsturzes; unbekannte Zusatzfelder werden toleriert (kein `.strict()`); Integrationstest bestätigt dieselben Datumsgrenzfälle wie mit Handdaten (siehe `shared`s `resolve.test.ts`) auch über den Schema-validierten Pfad.
- **Verifikation:** `bun run lint`, `bunx tsc --noEmit`, `bun run test` grün. Rein automatisiert, kein manueller Schritt nötig (reine Logik laut Plan).

## 2026-08-15 (3)

### feat (PDF-Vorlagen-Pipeline: Mehrseitigkeit, Phase 5)

- **`infrastructure/pdf/verteile.ts`:** verteilt Zeilen auf die Layout-Seiten, wiederholt die `wiederholSeite` bei Überlauf beliebig oft. **Waisenzeilen-Schutz** (über den Original-Konzept-Code hinaus, explizit von der Planung gefordert): hätte die Abschlussseite dadurch nur 1 Zeile, wird stattdessen eine Zeile von der vorletzten Seite übernommen, sofern die noch mehr als 1 Zeile behält und die Abschlussseite Kapazität hat — vermeidet eine fast leer wirkende letzte Seite.
- **`build()` erweitert:** wählt `einseitig`/`mehrseitig` anhand der Zeilenzahl, rendert alle von `verteile()` gelieferten Seiten, führt `$bisher` (kumulierte Vorseiten-Zeilen) über die Seiten fort, zeichnet `seitenfuss` auf jeder Seite (laufende Zwischensumme/Übertrag) und `fuss` nur auf der Abschlussseite (rechnet über ALLE Original-Zeilen, nicht nur die der letzten Seite). Neu: Seitenzahl-Anzeige `Seite X von Y` auf jeder Seite — generisch gebaut, fachlich erst ab Phase 11 (Bereitschaft) und Phase 12 (EA) relevant, da EZ/EWT immer einseitig bleiben.
- **Tests:** `verteile.test.ts` (Grenzwerte 0/1/maxZeilen/maxZeilen+1/2×maxZeilen∓1, Wiederholseiten-Überlauf, Waisenzeilen-Schutz, Zeilenreihenfolge bleibt erhalten); `wert.test.ts` (neu — `$seite`/`$bisher`-Summenbildung war bisher ungetestet, jetzt inkl. `anzahl`/`max`/Datenpfad-Aggregation).
- **Verifikation:** `bun run lint`, `bunx tsc --noEmit`, `bun run test` grün. Zusätzlich zwei reale Mehrseiten-PDFs über den echten `build()`-Codepfad erzeugt und mit `qpdf --check`+`pdftotext` seitenweise geprüft: ein Zweiseiter (Waisenzeilen-Schutz im Zusammenspiel mit `$bisher` bestätigt) und ein echter Dreiseiter nach Konzept-Vorlage (Kopf/Kennzeile-wiederholt/Kennzeile+Fuß+Signatur) — Übertragssummen (30,00 → 45,00) und Gesamtsumme (57,00, über alle 5 Original-Zeilen) exakt wie von Hand berechnet, Signatur korrekt nur auf der Abschlussseite (via `pdfimages -list` bestätigt).

## 2026-08-15 (2)

### feat (PDF-Vorlagen-Pipeline: Canvas-Unterschrift, optional, Phase 4)

- **Neue Dependency `signature_pad`.**
- **`infrastructure/pdf/signaturePad.ts`:** Canvas-Wrapper — `skaliereFuerDisplay()` (pure, testbar) berechnet die Canvas-Pixelgröße für scharfe Linien auf High-DPI-Displays (`devicePixelRatio`), `erstelleSignaturPad()` wendet das auf ein echtes Canvas an (transparenter Hintergrund), `holeSignaturPng()` liefert `pad.toDataURL('image/png')` oder `null` bei leerem Pad.
- **`build()` erweitert:** neuer optionaler dritter Parameter `signaturPng?: string` — bei vorhandenem Input **und** `signaturBild`-Koordinaten auf der Seite wird die Unterschrift per `embedPng()`/`drawImage()` eingebettet, sonst bleibt die Fläche leer. Kein Nachsignieren eines bereits heruntergeladenen PDFs vorgesehen.
- **Neue Dev-Testseite `src/pdf-test.html`+`src/ts/pdf-test.ts`:** NICHT Teil der echten App (kein Link aus `index.html`, kein Produktions-Build-Eintrag — Vite bündelt standardmäßig nur `index.html`). Dummy-Formular mit "Jetzt unterschreiben?"-Dialog (wiederverwendet `confirmDialog`) → Ja: Canvas-Pad zeichnen → PDF mit Signatur; Nein: PDF direkt ohne Signatur. Vorlage wird im Browser selbst erzeugt (leeres A4-Blatt, `blob:`-URL) statt als Static-Asset abgelegt, damit nichts davon versehentlich mit ins Produktions-Build wandert.
- **Tests:** `signaturePad.test.ts` (`skaliereFuerDisplay()` gegen Grenzfälle); `build.test.ts` erweitert um Image-XObject-Anwesenheit/Abwesenheit (mit/ohne Signatur-Input, mit/ohne `signaturBild`-Koordinaten).
- **Verifikation:** `bun run lint`, `bunx tsc --noEmit`, `bun run test` grün. Der eigentliche Canvas-Zeichentest (Schärfe/Transparenz bei echtem Pointer-Input) ist headless nicht prüfbar (`happy-dom` liefert `getContext('2d')` als `null`) — **manueller Browser-Test durch den User über die neue Testseite steht noch aus.**

## 2026-08-15

### feat (PDF-Vorlagen-Pipeline: Renderer-Grundgerüst, Phase 3)

- **Neue Dependency `@cantoo/pdf-lib`** (aktiv gepflegter Fork des originalen `pdf-lib`, siehe Plan-Kontext für die Begründung).
- **`infrastructure/pdf/build.ts`:** einseitiges Renderer-Grundgerüst — lädt eine PDF-Vorlage per `fetch`+`PDFDocument.load()`, kopiert die Zielseite (`copyPages`/`addPage`), zeichnet Kopf-/Zeilen-/Fuß-Felder via `page.drawText()`. Noch ohne Mehrseitigkeit (Phase 5), Unterschrift (Phase 4) und `resolve()`-Anbindung (Phase 6) — die `Version`-Konfiguration wird direkt übergeben, nicht aufgelöst.
- **`infrastructure/pdf/wert.ts`/`zeichne.ts`:** Feld-Wertauflösung (Direktwert oder `Berechnet`-Aggregation über `$seite`/`$bisher`, via `OPS`/`FORMAT`/`get` aus `@otto-kirchheim/nebengeld-shared`) und minimale `drawText`-Zeichenfunktion mit Rechtsbündig-Unterstützung.
- **Test-Vorlage `test/fixtures/test_1seitig.pdf`:** leeres A4-Blatt (595×842pt, kein AcroForm-Feld) — programmatisch erzeugt statt in LibreOffice, da für ein reines Koordinaten-Overlay kein visueller Inhalt nötig ist.
- **Tests:** `test/infrastructure/pdf/build.test.ts` (neues Testmuster, erster PDF-Struktur-Test im Repo) — Seitenzahl, `Subject`-Metadaten, Template-URL-Aufruf, leere Datenliste.
- **Verifikation:** `bun run lint`, `bunx tsc --noEmit`, `bun run test` grün. Zusätzlich manuell: Dummy-PDF über den echten `build()`-Codepfad erzeugt und mit `qpdf --check` (fehlerfrei) sowie `pdftotext` geprüft — Titel/Name/Zeilen/Summe erscheinen exakt wie erwartet (Summenbildung über `$seite` inkl. Währungsformat bestätigt).

## 2026-08-11

### feat (Entgeltausgleich: neues Feature-Modul, spiegelt Nebengeld-Struktur)

- **Neues Feature `EA`** (`features/EA/`): Monatstabelle mit einer Zeile je Kalendertag (`Tag`, `Dauer`, `Taetigkeit`, `Entgeltgruppe`), optional verknuepft mit einem EWT-Eintrag. Mirror der `Neben`-Struktur (`index.ts` → `EaTab.tsx` → `components/` → `utils/`), aber ohne Zulagen-Konzept.
- **Dauer-Berechnung bei EWT-Verknuepfung:** `calculateEaDauerFromEwt.ts` berechnet die Dauer aus `beginE`/`endeE` des verknuepften EWT-Eintrags abzueglich der gesetzlichen Pause nach §4 ArbZG (ab 6h 30 Minuten, ab 9h 45 Minuten — ersetzt, addiert sich nicht). Ohne Verknuepfung ist `Dauer` ein freies `HH:mm`-Feld. `syncEwtToEa.ts`/`syncEaDurationFromEwtRows` haelt die Dauer bei nachtraeglichen EWT-Aenderungen synchron (Storage + gemountete Tabelle), analog `syncEwtToNeben.ts`; `unlinkEaRefsForDeletedEwtIds` (`savePipeline.ts`) loest die EWT-Verknuepfung beim Loeschen des referenzierten EWT-Eintrags, analog dem Nebengeld-Pendant.
- **Tab standardmaessig deaktiviert:** Anders als Bereitschaft/EWT/Neben ist der EA-Tab fuer alle Bestands- und Neu-User zunaechst unsichtbar. Der bisherige Fallback bei leerem `aktivierteTabs` ("alle Tabs an") galt sowohl fuer `syncFeatureTabs.ts` (Feature-Mount) als auch fuer `updateTabVisibility.ts` (Nav-Sichtbarkeit) — beide haetten den EA-Tab ungewollt fuer alle User sichtbar gemacht. Neue Konstante `LEGACY_DEFAULT_ON_KEYS`/`LEGACY_DEFAULT_ON_TAB_IDS` entkoppelt den Alt-User-Fallback (`bereitschaft`/`ewt`/`neben`) von der vollstaendigen Feature-/Tab-Map; `ea` mountet/erscheint nur, wenn `aktivierteTabs` es explizit enthaelt.
- **Berechnung-Integration:** EA fliesst als reine Stunden-Anzeige (`IVorgabenBerechnungMonat.EA.Minuten`, `IBerechnungMonatsErgebnis.eaMinuten`) in die Jahresuebersicht und die mobile Kartenansicht ein, bewusst **ohne** Einfluss auf `summeGesamt` (kein Geldwert). Neuer Helper `parseDauerToMinutes` (Kehrfunktion zu `timeConvert`).
- **UserProfile-Kopf-Felder:** `Pers.Taetigkeit`/`Pers.Entgeltgruppe` (optional, Grundtaetigkeit/-Entgeltgruppe des Nutzers, unabhaengig von den gleichnamigen Tages-Feldern der EA-Zeilen) ergaenzt in `IVorgabenU`, `fieldMapper.ts`, `AdminUserProfileEditor.tsx` und `profileTemplates.shared.ts` (Vorlagen-Editor).
- **Backend-Anbindung:** Volle Bulk-CRUD-Anbindung an `/ea` (Create/Update/Delete via AutoSave/Speichern-Button, wie bei Nebengeld) sowie `POST /ea/download` fuer den PDF-Export. **EA ist wie BZ/BE/EWT/N vollstaendig in den jahresweiten Server-Load/Konflikt-Abgleich eingebunden** (`loadAllYearData`/`SyncTimestamps`/`LoadedYearData` um `EA`/`dataEA` erweitert, `syncLoadedYearResources`/`loadUserDaten.helpers.ts` (`MONTH_AWARE_STORAGE_NAMES`, `countByMonth`, `rowMatchesMonth`) behandeln `dataEA` gleichwertig, alle drei Konflikt-Aktionen in `loadUserDaten.ts` sowie `overwriteUserDaten.ts` haben einen `EA`-Zweig, `#tableEA` wird beim Login/Jahreswechsel geladen und gefiltert).
- **Admin-Panel:** `AdminResourceBrowser.tsx` (`RESOURCES`/`SCHEMA_FIELDS`/`TIME_STRING_FIELDS`) um Entgeltausgleich (`entgeltausgleich`-Endpunkt) erweitert, `AdminDashboard.tsx`/`Admin/utils/api.ts` (`AdminStats`) zeigen die neuen `resources.entgeltausgleich`/`growth.entgeltausgleichLast7d`-Kennzahlen.
- **Bugfix (Bestandsdaten):** `calculateBerechnungRows.ts` griff beim App-Start ungeprüft auf `item.EA.Minuten` zu — ein aus einer Session vor Einführung von EA gecachtes `datenBerechnung` (Storage-Snapshot, wird beim Boot ungeprüft gerendert, siehe `Berechnung/index.ts`) hat kein `EA`-Feld und crashte den Start (`Cannot read properties of undefined`). Jetzt mit `item.EA?.Minuten ?? 0` defensiv.
- **Tests:** `test/EA.test.ts`, `test/EA.calculateEaDauerFromEwt.test.ts` (Pausen-Staffelung inkl. Grenzwerte bei 360/540 Minuten), `test/EA.syncEwtToEa.test.ts`, Erweiterungen in `Berechnung.*.test.ts`, `Utilities/savePipeline.test.ts`, `orchestration/syncFeatureTabs.test.ts`, `Utilities/updateTabVisibility.test.ts`, `Utilities/apiService.test.ts`, `core/auth/loadUserDaten.sync.test.ts`.
- **Verifikation:** `bun run lint`, `bunx tsc --noEmit`, `bun run test` (1424 Tests), `bun run build` gruen.

### feat (Entgeltausgleich: durchgängige Schnellerfassung über EWT-Einträge, Tätigkeit-Schnellauswahl, Entgeltgruppen-Vorschlag)

- **Neues, dediziertes Hinzufügen-Modal** (`createAddModalEA.tsx`): schließt nach dem Speichern NICHT mehr, sondern wählt automatisch den nächsten noch nicht mit einer EA-Zeile verknüpften EWT-Eintrag des Monats (chronologisch) und füllt Tag/Dauer daraus — durchgängige Eingabe mehrerer EWT-Tage ohne Modal-Neustart, kein manuelles Weiterklicken nötig. Sind alle EWT-Einträge bereits verknüpft, wird Tag/Dauer für die manuelle Eingabe freigegeben (Hinweis-Snackbar). `addEaTag.ts` liefert jetzt `boolean` zurück (Zeile angelegt ja/nein), damit das Modal nur bei echtem Erfolg weiterspringt. Der bisherige `EditorModalEA` bleibt unverändert für das Bearbeiten einzelner Zeilen (schließt wie gehabt nach dem Speichern).
- **Tätigkeit bleibt Freitext, jetzt mit Schnellauswahl:** `list`-Attribut auf `MyInput` ergänzt (neuer optionaler Prop), `TAETIGKEIT_VORSCHLAEGE` (aktuell: "Teamleiter in Vertretung LST Kirchheim") als HTML-`<datalist>` im Hinzufügen- und im Bearbeiten-Modal — Autovervollständigung, Feld bleibt frei editierbar.
- **Entgeltgruppe-Vorschlag:** Neue Zeile schlägt `VorgabenU.Pers.Entgeltgruppe - 1` als Startwert vor (nur bei numerischer Basis-Entgeltgruppe, sonst leer) — bleibt frei überschreibbar; da das Add-Formular zwischen Einträgen nicht zurückgesetzt wird, bleibt ein manuell angepasster Wert für die nächste Zeile erhalten (identisches Verhalten wie Tätigkeit).
- **Tests:** `test/EA.addEaTag.test.ts` (inkl. Rückgabewert), `test/EA.suggestNextEntgeltgruppe.test.ts`.
- **Verifikation:** `bun run lint`, `bunx tsc --noEmit`, `bun run test` (1432 Tests), `bun run build` gruen.

### fix (Entgeltausgleich: Tag-Feld blieb nach Rueckwechsel auf "keine Zuordnung" gesperrt)

- **Problem:** `applyEwtSelection` (`createAddModalEA.tsx`) sperrte bei EWT-Auswahl nur `Dauer`, nicht `Tag`. Wechselte man das EWT-Auswahlfeld zurueck auf "— keine Zuordnung —", blieb `Tag` weiterhin `disabled` und war nicht mehr editierbar.
- **Fix:** `applyEwtSelection` togglet jetzt `Tag` und `Dauer` gemeinsam ueber denselben `Boolean(selectedId)`-Zweig; die beiden Aufrufstellen, die zuvor das Tag-Feld separat gesetzt haben, wurden entsprechend vereinfacht.

### fix (Entgeltausgleich: Weiterschalten nach dem Hinzufügen aenderte nur das Tag-Feld, EWT-Auswahl blieb stehen)

- **Problem:** `applySelectOptions` (geteiltes Util, `Neben/utils/`) haelt bewusst die vorherige Select-Auswahl, solange ihr Wert unter den neuen Optionen noch existiert — praktisch fuer den Hintergrund-Sync-Listener, aber falsch fuer `advanceToNextEwt`: der gerade verknuepfte EWT-Eintrag bleibt nach dem Speichern weiterhin in der Liste (jetzt nur `disabled`), also sprang die Auswahl nie zum naechsten Eintrag — nur `Tag`/`Dauer` wurden durch den separaten `applyEwtSelection`-Aufruf sichtbar aktualisiert.
- **Fix:** `advanceToNextEwt` setzt `select.value` nach `applySelectOptions` explizit auf den naechsten Eintrag (`next?._id ?? ''`), statt sich auf das automatische Beibehalten zu verlassen.
- **Neuer Fallback ohne freien EWT-Eintrag:** Statt Tag/Dauer nur zu leeren, wird jetzt der naechste Kalendertag im Monat ohne bestehenden EA-Eintrag vorgeschlagen (`findNextFreeDay`). Entspricht dieser Tag zufaellig einem noch nicht verknuepften EWT-Eintrag (z.B. gerade erst angelegt), wird direkt dieser verknuepft statt Tag/Dauer manuell zu verlangen.
- **Nachbesserung 1 (weiterhin wurde immer der erste statt der naechste EWT-Eintrag gewaehlt):** `getUsedEwtRefs` las den "bereits verknuepft"-Status bisher aus dem Storage-Snapshot (`Storage.get('dataEA')`) — dieser wird erst durch `persistTableData`/`mergeVisibleResourceRows` geschrieben, ein Roundtrip mit eigener Serialisierungs-/Filterlogik. Liest jetzt direkt aus der Live-Tabelle (`tableEA.rows.array`), synchron und ohne Storage-Abhaengigkeit — `findNextAvailableEwt` erkennt den gerade verknuepften Eintrag dadurch zuverlaessig als verbraucht.
- **Nachbesserung 2 (Weiterschalten sprang bei fruehen Luecken zurueck statt vorwaerts):** Beispiel: Tag 1 hat bereits einen EA-Eintrag, Tag 2 ist offen (kein EWT-Bezug), Tag 3 wird gerade angelegt — danach sollte Tag 4 folgen, es kam aber wieder Tag 2. Ursache: `findNextAvailableEwt` suchte den chronologisch *ersten* noch offenen EWT-Eintrag im gesamten Monat, nicht den naechsten *nach* dem gerade bearbeiteten Tag — ein frueher liegender, weiterhin unverknuepfter Tag riss den Fortschritt bei jedem Speichern zurueck. Neuer optionaler `after`-Parameter (chronologisch letzter bearbeiteter Tag, aus dem `Tag`-Feld unmittelbar vor dem Ueberschreiben gelesen) grenzt die Suche auf "danach" ein; `findNextFreeDay`-Fallback bekommt denselben unteren Rand. Tag 2 bleibt dabei jederzeit manuell ueber das Dropdown waehlbar, wird nur nicht mehr automatisch angesprungen.
- **Verifikation:** `bun run lint`, `bunx tsc --noEmit`, `bun run format`, `bun run test` (1432 Tests) gruen.

### fix (Admin: Taetigkeit/Entgeltgruppe-Felder im User-Profil-Editor unsichtbar)

- **Problem:** `AdminUserProfileEditor.tsx` blendete die beiden Felder nur ein, wenn der bearbeitete User `ea` in `aktivierteTabs` hatte — der EA-Tab ist aber bewusst standardmaessig deaktiviert (siehe oben), also praktisch nie sichtbar. Zusaetzlich fehlen `Pers.Taetigkeit`/`Pers.Entgeltgruppe` bei Bestandsusern als Schluessel im Dokument (kein Schema-Default), wodurch `Object.entries(edit.pers)` sie auch ohne die Sichtbarkeitsbedingung uebersprungen haette.
- **Fix:** Sichtbarkeitsbedingung entfernt — die Felder rendern jetzt unconditional ueber dieselbe generische Pers-Feld-Schleife wie z.B. `Gewerk` (Admin muss die Grunddaten unabhaengig vom eigenen Tab-Toggle des Users pflegen koennen). `buildEditState` setzt `Taetigkeit`/`Entgeltgruppe` per `??= ''` auf einen Default, damit die Schluessel bei Bestandsusern ohne die Felder ueberhaupt in der Schleife auftauchen.
- **Verifikation:** `bun run lint`, `bunx tsc --noEmit`, `bun run format`, `bun run test` (1432 Tests) gruen.

### fix (Entgeltausgleich: Taetigkeit/Entgeltgruppe fehlten auch in Einstellungen > Persoenliche Daten)

- **Problem:** Der vorherige Fix betraf nur `AdminUserProfileEditor.tsx`. Im eigentlichen Nutzer-Formular (`index.html`, Accordion "Persönliche Daten") gab es fuer `Taetigkeit`/`Entgeltgruppe` gar keine `<input>`-Elemente — `setElementValues`/`saveEinstellungen` sind generisch (iterieren `Object.keys(VorgabenU.Pers)` bzw. suchen `#<key>` im DOM), koennen aber kein Feld anzeigen oder einlesen, das im Markup nicht existiert.
- **Fix:** Zwei neue `<input>`-Felder in `index.html` neben `Gewerk` ergaenzt (nicht `required`, da nur fuer EA relevant). `generateEingabeMaskeEinstellungen.ts`/`saveEinstellungen.ts` defaulten `VorgabenU.Pers.Taetigkeit`/`Entgeltgruppe` per `??= ''`, bevor die `Object.keys`-Schleifen laufen — sonst fehlt bei Bestandsusern (kein Server-Default) der Object-Key komplett und weder Anzeige noch Speichern wuerden das Feld je erreichen (identische Ursache wie beim Admin-Editor-Fix). `addressValidation.ts`: `Taetigkeit`/`Entgeltgruppe` zu `PERS_FIELD_LABELS` ergaenzt plus eigener `switch`-Zweig (optional — leer bleibt gueltig, sonst `TEXT_REGEX`-Pruefung wie bei `Gewerk`/`Betrieb`).
- **Verifikation:** `bun run lint`, `bunx tsc --noEmit`, `bun run format`, `bun run test` (1432 Tests) gruen.

## 2026-08-05

### fix (AutoSave: Commit-Race verlor waehrend eines laufenden Saves neu angelegte/geaenderte Zeilen)

- **Problem:** `_commitCreateAndUpdate` (`CustomTable.ts`) setzte nach jedem erfolgreichen Bulk-Save unconditional alle aktuell `new`/`modified`/`deleted` Zeilen zurueck, ermittelt aus dem *aktuellen* Tabellenzustand statt aus dem Zustand zum Zeitpunkt des Requests. Legte ein Nutzer waehrend eines laufenden AutoSave-Requests (Netzwerk-Roundtrip) eine neue Zeile an oder aenderte eine bestehende, wurde diese Zeile beim Commit der vorherigen Antwort ebenfalls als "gespeichert" markiert — ohne je an den Server gesendet worden zu sein. Neue Zeilen verloren dabei endgueltig ihre `_id`-Zuordnung und waren fuer `getChanges()` danach unsichtbar (stiller Datenverlust); geaenderte Zeilen verloren die zuletzt eingetippte Aenderung. Der bestehende `queuedDuringSave`-Mechanismus (siehe Eintrag vom 2026-08-03, "AutoSave-Race") loeste zwar zuverlaessig einen Folge-Save aus, kam aber zu spaet — der fehlerhafte Commit war zu dem Zeitpunkt bereits gelaufen.
- **Fix:** Neue Methode `Rows.getChangeRows()` liefert die Row-*Referenzen* (statt Zellen-Kopien) hinter den aktuellen Aenderungen; `getChanges()` baut jetzt darauf auf (eine gemeinsame Filterquelle statt zwei unabhaengig gepflegter). `saveResourceNow` (`autoSave.ts`) nimmt vor dem Request einen Row-Referenz-Snapshot und reicht ihn als `includedRows` an `commitChanges`/`commitAutoSave` durch — nur Zeilen aus diesem Snapshot werden committet/entfernt, alles danach Angelegte/Geaenderte bleibt unangetastet und wird vom naechsten (bereits vorhandenen) Save-Lauf sauber erfasst. `mapCreatedIdsByClientRequestId`/`mapCreatedIdsByContent` (`changeTracking.ts`) und `collectRowErrorMatches` (`savePipeline.ts`) nutzen denselben Snapshot statt den Live-Tabellenzustand erneut zu filtern, damit sich Positions-Indizes nicht mehr durch zwischenzeitliche Aenderungen verschieben koennen. `markFetchErrorRows` (`errorHandling.ts`, Fehlerpfad) markiert ebenfalls nur noch Zeilen aus dem Snapshot als Fehler.
- **Regressionstests:** `CustomTable.test.ts` ("AutoSave-Commit-Race") deckt beide Faelle direkt an der echten `Rows`-Klasse ab — waehrend des Requests neu angelegte Zeile bleibt nach `commitAutoSave` `new` ohne `_id`; waehrend des Requests geloeschte Zeile bleibt nach `commitChanges` erhalten.
- **Verifikation:** `bunx tsc --noEmit`, `bun run lint`, `bunx prettier --check`, `bun run test` (1388 Tests) gruen.

## 2026-08-03

### fix (Nebengeld: Race Condition zwischen EWT-AutoSave und manueller Zulagen-Anlage)

- **Problem:** Legt man während der laufenden EWT-AutoSave-Verzögerung (10 s Debounce) im Neben-Tab eine Zulage für genau den noch nicht synchronisierten EWT-Tag an, listete das Tag-Dropdown (`createAddModalNeben.tsx`/`createEditorModalNeben.tsx`) diesen Tag ganz normal auf. Die EWT-Referenz im Payload (`EWT: day._id`) war zu dem Zeitpunkt aber `undefined` und wurde von `JSON.stringify` stillschweigend aus dem Wert entfernt. Landete der EWT-Eintrag danach vor dem Neben-Request in der DB, quittierte `nebengeld.service.ts` (`assertEwtRules`) das mit `422 Für diesen Tag existiert eine EWT-Schicht`. Landete er danach, entstand ein dauerhaft unverknüpfter Neben-Eintrag ohne Fehler (stille Dateninkonsistenz).
- **Fix:** Tage mit ausstehender EWT-AutoSave — neu angelegt (`!day._id`) oder lokal geändert, aber noch nicht gespeichert (`day.__localState === 'modified'`, direkt aus dem bereits geladenen `dataE` gelesen, kein zusätzlicher State nötig) — sind im Dropdown jetzt `disabled` und tragen den Hinweis "(wird noch gespeichert)".
- **Live-Refresh:** Solange das Modal offen bleibt, hört es über `onEvent('data:changed', …)` auf abgeschlossene EWT-Saves und baut die Options neu auf (neues Util `Neben/utils/applySelectOptions.ts`), damit der Tag nutzbar wird, sobald der Sync durch ist — ohne Modal-Neuöffnen. Abmeldung über den bestehenden `hide.bs.modal`-Listener.
- **Verifikation:** `bun run lint`, `bunx tsc --noEmit`, `bun run test` (1386 Tests) grün.

### fix (Einstellungen: AutoSave-Verzögerung/-Aktivierung griff erst nach Reload)

- Eine Änderung von "AutoSave aktiviert" oder der AutoSave-Verzögerung in den Einstellungen wurde zwar korrekt gespeichert, wirkte sich auf den laufenden AutoSave aber erst nach einem vollständigen Neuladen der Seite aus: `applyEinstellungenToRuntime()` (`Einstellungen/index.ts`), das den Runtime-State in `autoSave.ts` setzt, lief ausschließlich einmalig beim App-Start; der Speichern-Button (`saveDaten.ts`) rief es nie erneut auf.
- Die Apply-Logik liegt jetzt gebündelt als `applyAutoSaveSettings()` in `infrastructure/autoSave/autoSave.ts` (von `Einstellungen/index.ts` und `saveDaten.ts` gemeinsam genutzt) und wird zusätzlich direkt nach dem Speichern der Einstellungen aufgerufen — die Änderung greift damit sofort, ohne Reload.
- **Verifikation:** `bun run lint`, `bunx tsc --noEmit`, `bun run test` (1386 Tests) grün.

## 2026-08-02

### fix (CustomTable: Zellinhalte wurden als HTML interpretiert)

- Aus einem Security-Scan: `CustomTable.ts` setzte Zellwerte über `innerHTML`. Der Standard-Parser reicht den Rohwert durch, betroffen sind also auch Freitextfelder aus Benutzereingaben (`Einsatzort` in EWT, `Auftragsnummer` in Nebenbezüge). Ein Eintrag wie `<img src=x onerror=…>` wurde beim Rendern ausgeführt. Der Radius ist begrenzt, weil jeder Benutzer nur eigene Zeilen sieht (Self-XSS), betrifft aber auch Daten, die ein Admin für einen Benutzer anlegt oder per Vorlagen-/Muster-Übernahme kopiert.
- Zellinhalte werden jetzt über `textContent` gesetzt. HTML gibt es nur noch als bewusste Ausnahme je Spalte über die neue Option `html: true` — sie ist ausschließlich für Spalten gedacht, deren Parser festes Markup aus dem eigenen Code erzeugt, nie für Freitext aus Benutzereingaben.
- Betroffen sind genau zwei Spalten in `EwtTab.tsx`: der Berechnen-Schalter (`<input type="checkbox">`, interpoliert nur einen Boolean) und die Schicht-Spalte (`switch` über feste Fälle). Alle Parser der übrigen Tabellen wurden geprüft und erzeugen kein Markup.
- Die Zulagen-Spalte in `NebenTab.tsx` ersetzte `\n` durch `<br>`; sie liefert jetzt Rohtext, den die neue Spaltenklasse `cell-multiline` (`white-space: pre-line`) umbricht — hier ist kein HTML nötig.
- Regressionstests: `test/Utilities/CustomTable.xss.test.ts` (Markup im Zellwert erzeugt ohne `html: true` kein Element und bleibt wörtlich als Text; mit `html: true` wird es weiterhin gerendert).

### fix (Massenänderung: Bedien-Feedback aus dem ersten Durchlauf)

- **Modal-Breite wirkte nicht.** `MyDivModal` hängte die `size`-Klasse an `.modal-content`, Bootstrap erwartet sie auf `.modal-dialog` — die Massenänderung lief dadurch trotz `size="xl"` in der Standardbreite (500 px). Statt die Semantik des bestehenden `size`-Props (und damit sechs andere Modals) zu ändern, gibt es jetzt `dialogClass` für Klassen auf `.modal-dialog`; die Massenänderung nutzt `modal-xl modal-fullscreen-lg-down modal-dialog-scrollable`. Der Formular-Schritt liegt zusätzlich in einem Grid, das ab `xl` zweispaltig wird (OE-Karte neben "Weitere Felder").
- **Benutzer einzeln abwählen** (`BulkEditUserOverview.tsx`): jede Zeile der Übersicht hat einen Abwählen-Button; die Auswahl ist jetzt Modal-State statt reiner Prop, der Titel zählt mit. Der letzte verbleibende Benutzer lässt sich nicht entfernen.
- **Ersetzen-Boxen sind jetzt leer und tragen den bisherigen Wert nur als Platzhalter.** Vorbefüllte Werte hatten suggeriert, es werde alles ersetzt; ersetzt wird ausschließlich, was eingetippt ist. Die Boxen erscheinen außerdem erst, wenn ein Ziel angehakt ist (analog zu den Checkboxen unter "Weitere Felder"), und lassen sich wie überall sonst um Ebenen erweitern/kürzen.
- **Team-/Org-Admin-OEs sitzen in derselben Karte** wie das Ebenen-Ersetzen ("OE ändern"), weil sie dieselben OE-Pfade betreffen. Ihre Eingabefelder starten mit so vielen Boxen, wie die aktuelle OE tief ist (`defaultLevelCount`), statt mit einer einzelnen — dasselbe gilt für `OeTagInput` in `AdminUserList.tsx`.
- **Numerische Teamnummer ohne Bindestrich:** ist die letzte Ebene rein numerisch, zeigt der Editor davor ein Leerzeichen statt `-` — dieselbe Regel, die `joinOeLevels` beim Zusammensetzen anwendet.
- **Eingabefelder wachsen mit dem Inhalt** (Breite aus Wert- bzw. Platzhalter-Länge, mindestens 2 Zeichen) statt fester 4,5 rem.
- **Eingetippte Ebenen sind erkennbar:** mit leeren Boxen und Platzhaltern war nicht mehr zu sehen, wo etwas geändert wurde. Ausgefüllte Ebenen haben jetzt einen gelben 2-px-Rahmen und halbfette Schrift, Platzhalter sind kursiv und gedimmt (`.oe-level-input::placeholder` in `styles.scss`).
- **Team-/Org-Admin-OE-Hinzufügen bekommt dieselbe Vorlage:** Platzhalter aus den gemeinsamen Ebenen der vorhandenen Admin-OE-Pfade der Auswahl (`computeCommonPathLevels`), ersatzweise aus der gemeinsamen Pers.OE. Anders als beim Ersetzen muss hier ein vollständiger Pfad entstehen, daher werden leer gelassene Ebenen aus der Vorlage übernommen; der resultierende Pfad steht als "Wird hinzugefügt: …" unter den Boxen. Ohne jede Eingabe bleibt die Aktion leer (kein versehentliches Anlegen der Vorlage).
- **Trenner vor der letzten Ebene umgedreht:** dort steht standardmäßig kein Bindestrich (leere Ebene oder Teamnummer); er erscheint erst, sobald etwas anderes als eine Zahl eingetragen wird.
- **Overflow in "Weitere Felder setzen" und im Übernahme-Block:** `ms-4` lag direkt auf `form-control`/`form-select` (Breite 100 %), die Felder ragten dadurch aus der Karte heraus. Die Einrückung sitzt jetzt auf einem Wrapper.
- **OE-Boxen fehlten im Vorlagen-Editor:** `AdminProfileTemplateContentEditor.tsx` rendert `Pers.OE` jetzt ebenfalls über `OeLevelBoxes` statt als Freitextfeld.
- **Massenänderungen im Admin-Log sichtbar:** die Einträge (`admin.UserProfile.bulkUpdate`) wurden schon immer geschrieben, waren in der Liste aber nicht von anderen Aktionen zu unterscheiden (kein Ziel-Benutzer, keine Details). `AdminLogBrowser.tsx` hat jetzt je Zeile einen Details-Aufklapper, der den geloggten Payload zeigt (betroffene Benutzer, geänderte Felder, Summary).
- Die gemeinsame Darstellung der Ebenen-Boxen (Trenner, Breite, Hinzufügen/Entfernen, Platzhalter) liegt neu in `OeLevelInputs.tsx`; `OeLevelBoxes.tsx` ist der String-Wrapper darum, der Massenänderungs-Ersetzen-Block nutzt sie direkt mit positionsgebundenem Array (dort müssen leere Ebenen erhalten bleiben).
- **Verifikation:** `bun run lint && bun run test && bunx tsc --noEmit && bun run build` grün (1383 Tests, 7 neue in `OeLevelBoxes.test.tsx`/`createAdminBulkEditModal.test.tsx` für Standard-Boxenanzahl, erhaltene Leerebene, Trenner-Regeln, Hervorhebung, Abwählen und Vorlagen-Übernahme beim Hinzufügen).

### feat (Massenänderung überarbeitet: Übersicht, Mehrfeld-OE-Editor, neue Felder, Team-/Org-Admin-OE)

- Nutzer-Feedback zur Massenänderung ("unbrauchbar/unübersichtlich/nicht vollständig") behoben: keine Übersicht der ausgewählten Benutzer, OE-Ebene wurde blind über ein Dropdown gewählt, der Übernahme-Bereich wirkte angeflanscht, mehrere gewünschte Felder fehlten.
- **Neue Übersicht** (`BulkEditUserOverview.tsx`): scrollbare Tabelle der ausgewählten Benutzer mit aktueller OE und aktuellem Betrieb, ab 5 Benutzern mit Filterleiste (`matchesOeQuery`/`useDebouncedValue`, wiederverwendet aus `AdminUserList`). Dafür führt `AdminUserRow`/`fetchAdminUsers` neu auch `betrieb` (bislang nicht abgerufen, obwohl der Endpoint es schon liefert).
- **Neuer Mehrfeld-OE-Editor** (`OeLevelBoxes.tsx`): ein Textfeld pro Ebene statt eines zusammengesetzten Strings, String-in/String-out über `joinOeLevels`/`splitOeInput`. Ersetzt das bisherige Freitext-OE-Feld überall im Admin-Bereich (`AdminUserList.tsx`, `AdminUserProfileEditor.tsx`, `OeTagInput.tsx` fürs Hinzufügen neuer Team-/Org-Admin-OE-Einträge) — bewusst nicht in der normalen (nutzereigenen) Einstellungen-Ansicht. Entfernen ist nur für die letzte Ebene möglich (kein Lösch-Button pro Box), Hinzufügen bis maximal 10 Ebenen (Payload-Grenze im Backend).
- **Massenänderung — Ersetzen-Block** (`BulkEditOeLevelsEditor.tsx`): ein gemeinsamer Editor für alle drei OE-Ziele (Pers.OE, Team-Admin-OEs, Org-Admin-OEs, mehrfach wählbar). Boxen sind vorausgefüllt, wo alle ausgewählten Benutzer übereinstimmen, sonst leer; leer = Ebene bleibt unangetastet. Bei Listen (Team-/Org-Admin-OEs) wirkt eine Ersetzung auf jeden Eintrag, der diese Ebene besitzt. Das Ziel-Häkchen ist der bewusste Auslöser — nicht der Box-Inhalt, sonst hätte schon eine reine Vorbefüllung (z. B. bei nur einem ausgewählten Benutzer stimmen alle Ebenen zwangsläufig überein) ungewollt einen Fehler erzwungen.
- **Neue einfache Felder** (`BulkEditSimpleFieldsBlock.tsx`): Gewerk, Erste TkgSt, TkgSt Adresse zusätzlich zu Betrieb, jeweils Checkbox-gated wie bisher.
- **Team-Admin-OEs/Org-Admin-OEs erstmals in der Massenänderung** (`BulkEditAdminOesBlock.tsx`): Hinzufügen (über `OeLevelBoxes` komponierter neuer Pfad) und Entfernen (Auswahl aus der Vereinigungsmenge der bei der Auswahl tatsächlich vorhandenen Pfade, kein blindes Freitext-Tippen).
- **Übernahme-Block entwirrt** (`BulkEditApplySourceBlock.tsx`): Vorlage-/Muster-Benutzer-Select steht jetzt direkt unter dem jeweils gewählten Radio, nicht mehr gemeinsam unterhalb aller drei Optionen.
- **Vorschau-Tabelle** (`BulkEditPreviewTable.tsx`): zeigt nur Spalten für tatsächlich in diesem Lauf aktivierte Felder statt aller möglichen.
- **Breaking Change am Payload:** `oe: { levelIndex, newValue }` ist durch `oeLevels`/`oeLevelsApplyTo` ersetzt (siehe `backend/CHANGELOG.md`) — Frontend und Backend gehören zusammen deployed.
- `createAdminBulkEditModal.tsx` (455 Zeilen) auf einen schlanken Orchestrator (State, `buildPayload`, Vorschau/Anwenden, Footer) plus sieben neue, einzeln testbare Dateien in `Admin/components/` und `Admin/utils/bulkEditOe.ts` aufgeteilt, um unter dem 500-Zeilen-Limit zu bleiben. `AdminBulkEditModal` ist zusätzlich als named export verfügbar (Komponenten-Tests ohne den Bootstrap-Modal-Wrapper).
- **Verifikation:** `bun run lint && bun run test --isolate && bunx tsc --noEmit && bun run build` grün (1376 Tests), davon 28 neue: `OeLevelBoxes.test.tsx` (Split/Join-Rundtrip, Hinzufügen/Entfernen, 10er-Obergrenze), `bulkEditOe.test.ts` (Vorbefüllungs-/Tiefen-Logik), `createAdminBulkEditModal.test.tsx` (Übersicht, Ersetzen-Validierung, Ziel-Kombination, Feld-Gate, Entfernen-Select, dynamische Vorschau-Spalten, Vorlage-Zuordnung).

## 2026-08-01

### fix (Vorlagen-Editor: Tarif/Beamter war ein Freitextfeld)

- `Pers.TB` wurde im Vorlagen-Editor als freies Textfeld gepflegt, im Profil-Editor dagegen als Auswahl. Der Wert dient in der Berechnung als Schlüssel in die Geld-Vorgaben (`datenGeld[monat][TB]`) — ein abweichender Text ergibt dort `undefined` und damit NaN-Beträge für jeden Benutzer, der aus dieser Vorlage angelegt wird. Das Backend prüfte den Wert bislang nicht (`z.string().max(100)`, kein Enum in Zod noch in Mongoose), die Oberfläche war also der einzige Schutz — im selben Arbeitsgang durch ein serverseitiges Enum ergänzt (siehe `backend/CHANGELOG.md`).
- TB ist jetzt in beiden Editoren eine Auswahl; die gültigen Werte kommen als `TB_VALUES` aus `@otto-kirchheim/nebengeld-shared` (dieselbe Liste, die Zod und Mongoose im Backend durchsetzen), `profileTemplates.shared.ts` exportiert sie unter `TB_OPTIONS` weiter statt einer eigenen Kopie im Profil-Editor. `addressValidation.ts` nutzt für dieselbe Prüfung ebenfalls `TB_VALUES` statt einer dritten lokalen Liste.
- Bestandsdaten geprüft: alle 23 Profile und 3 Vorlagen tragen `Tarifkraft`, es sind keine ungültigen Werte entstanden.

### fix (OE-Anzeige in Admin-Profilverwaltung und Vorlagen-Editor)

- Admin-Tab "Profile": die OE erschien nach der Umstellung auf Ebenen sowohl in der Liste als auch im Bearbeiten-Formular als `V,IW,MI,M,KSL,IL` — die generische Feldausgabe reichte das Array direkt an `String()` weiter. Beide Stellen nutzen jetzt `joinOeLevels`, die Eingabe wird über `splitOeInput` wieder zerlegt.
- Vorlagen-Verwaltung: `normalizePrimitiveRecord` filterte beim Laden alles heraus, was kein String/Number/Boolean ist — die OE fiel damit aus dem Formular und wäre beim nächsten Speichern der Vorlage gelöscht worden, da `buildTemplatePayload` `Pers` vollständig aus dem Entwurf neu aufbaut. Beide Funktionen behandeln die OE jetzt gezielt und sind für den Rundlauf-Test exportiert.
- **Verifikation:** `bun run lint && bun run test && bunx tsc --noEmit && bun run build` grün (1346 Tests); neue Tests decken Anzeige, Rückkonvertierung und den Laden-Speichern-Rundlauf einer Vorlage ab.

### feat (Admin-Massenänderung für Benutzerprofile + OE als Hierarchie-Ebenen)

- **OE-Datenmodell:** `Pers.OE` ist im Wire-Format (`IPers` aus `@otto-kirchheim/nebengeld-shared`) jetzt ein Ebenen-Array. Die Eingabe bleibt bewusst ein einzelnes Textfeld: `fieldMapper.ts` fügt die Ebenen beim Laden zusammen (`userProfileFromBackend`) und zerlegt die Eingabe beim Speichern wieder (`userProfileToBackend`) — bestehende Formulare, `setElementValues` und die Adressvalidierung blieben dadurch unangetastet.
- Neu: `infrastructure/data/oeLevels.ts` mit `joinOeLevels`/`splitOeInput`. Bewusst eine lokale Portierung der Backend-Funktionen (`oe-scope.ts`) statt eines geteilten Imports, da laut Shared-Library-Entscheidung vorerst nur Typen und Daten-Konstanten geteilt werden, keine Funktionen — wie bereits bei `overlapGuard.ts` dokumentiert. Ein Test sichert ab, dass das Anzeigeformat identisch zum Backend bleibt, sonst zeigte die Vorschau andere Werte als die gespeicherten.
- `AdminUserRow.oe` ist ein `string[]`; der OE-Filter (`matchesOeQuery`) bekommt die Ebenen jetzt einzeln statt als einen zusammengesetzten String und trifft dadurch pro Ebene genauer.
- **Neu: Massenänderung im Admin-Benutzer-Tab** (nur für Super-Admins sichtbar). Karten haben eine Auswahl-Checkbox plus "Alle auswählen"; bei getroffener Auswahl erscheint eine Aktionsleiste. Die eigene Zeile ist nicht auswählbar — passend dazu, dass Rolle/OE/Rechte des handelnden Admins auch einzeln nicht über diese Oberfläche änderbar sind. Jeder Filterwechsel verwirft die Auswahl, da sonst Benutzer aus einer nicht mehr sichtbaren Ansicht mitgeändert würden.
- `createAdminBulkEditModal.tsx`: dreistufiger Dialog (Formular → Vorschau → Ergebnis). Die Vorschau ruft denselben Endpunkt mit `dryRun: true` und zeigt pro Benutzer die vollständige OE vorher/nachher — nötig, weil das Ersetzen einer Ebene den ganzen String in die kanonische Schreibweise bringt und nicht nur das eine Token austauscht. Der Absenden-Button ist während laufender Anfragen gesperrt.
- Die Ebenen-Auswahl zeigt 1-basierte Beschriftungen ("Ebene 1"), sendet aber den 0-basierten Index; die Anzahl der Optionen ist nur eine Schätzung aus der tiefsten ausgewählten OE — ob eine Ebene wirklich existiert, entscheidet die Vorschau pro Benutzer.
- Kategorie-Übernahme aus Vorlage oder Muster-Benutzer beschränkt sich auf Fahrzeiten, Arbeitszeiten, Bereitschafts-Vorgaben und Einstellungen; persönliche Daten sind ausgeschlossen und der Dialog weist darauf hin.
- `AdminUserList` erhält `isSuperAdmin` als Prop — der Wert wurde in `Admin/index.tsx` bereits berechnet, aber bisher nicht an diese Komponente weitergereicht.
- **Verifikation:** `bun run lint && bun run test && bunx tsc --noEmit && bun run build` grün (1340 Tests, 14 Snapshots), davon neu: Auswahl-Verhalten von `AdminUserList` (Sichtbarkeit nur für Super-Admins, eigene Zeile gesperrt, Übergabe an den Dialog, Reset bei Filterwechsel), `oeLevels`-Rundlauf und der Bulk-API-Aufruf.

### fix (Passwort-Zeichenrestriktion entfernt, Live-Stärkeanzeige ergänzt)

- Alle Passwort-Felder (Login, Registrierung, Passwort-Ändern, Reset, Passkey-Passwort-Setzen, Admin-Passwort-Setzen) hatten ein `pattern`-Attribut, das versehentlich vom Benutzername-Feld kopiert wurde und Zeichen wie Umlaute, `$`, Leerzeichen und Emoji im Passwort verbot, obwohl das Backend nie eine Zeichen-Restriktion hatte (nur Längenprüfung). `pattern`-Prop entfernt.
- Inkonsistentes `.trim()` auf Passwort-Werten behoben: alle Passwort-*setzenden* Flows trimmten den Wert vor dem Senden, der Login-Flow nicht — hätte bei Passwörtern mit Leerzeichen zum Login-Fehlschlag geführt. Trimmen jetzt nirgends mehr angewendet (an Login angeglichen).
- Popover-Hinweistexte und `invalidFeedbackText` auf die einzige tatsächlich geprüfte Regel (Mindestlänge) gekürzt — die bisherigen Bullet-Punkte zu Groß-/Kleinbuchstaben/Zahlen/erlaubten Zeichen waren nie durchgesetzt und damit irreführend.
- Neu: `PasswordStrengthMeter`-Komponente (`components/PasswordStrengthMeter.tsx`, Scoring in `infrastructure/validation/passwordStrength.ts`) — eigenständige, selbst gebaute Live-Stärkeanzeige (4 Bootstrap-Progress-Segmente + Label), angehängt an das jeweilige "Neues Passwort"-Feld in Registrierung/Passwort-Ändern/Reset/Passkey-Set/Admin-Set (nicht Login, nicht Wiederholungs-/Alt-Passwort-Felder).
- **Verifikation:** `bun run lint && bun run test && bunx tsc --noEmit -p tsconfig.json && bun run build` grün.

### feat (Welle 2 Schritt 6 — UserProfile-Container-Keys vereinheitlicht: pers/aZ/fZ/vorgabenB → Pers/Arbeitszeit/Fahrzeit/VorgabenB)

- `IVorgabenU`/`IVorgabenUServer` (`core/types/IVorgabenU.ts`): die 4 Top-Level-Container-Schlüssel `pers`/`aZ`/`fZ`/`vorgabenB` → `Pers`/`Arbeitszeit`/`Fahrzeit`/`VorgabenB` (deckungsgleich mit dem Backend-Modell `UserProfile.ts`). Alle verschachtelten Blattfelder waren laut Vorab-Analyse bereits identisch benannt (Backend nutzt seit längerem das neue Pro-Wochentag-Arbeitszeitmodell) — dieser Schritt ist reines Umbenennen der 4 Container-Keys, keine Feld-für-Feld-Migration.
- `@otto-kirchheim/nebengeld-shared` v0.7.0: neue Typen `IPers`/`IFahrzeit` in `domain.ts` — nur für die beiden Container übernommen, deren Feldnamen UND Optionalität 1:1 mit dem Frontend übereinstimmen. `Arbeitszeit`/`VorgabenB` bewusst NICHT als gemeinsamer Typ verschoben: das Frontend haelt dafuer weiterhin seine eigene, vollstaendig hydrierte Form (`IVorgabenUaZ`/`IVorgabenUvorgabenB`), die zwar dieselben Feldnamen traegt, aber Felder (z. B. `spaet`/`nacht`/`sonder`, `aktiv`) garantiert setzt, die im Backend-Wire-Format optional sind — dieselbe Art bewusst nicht vereinheitlichter Divergenz wie bei `Beginn`/`Ende` in fruaeheren Ressourcen, nur bei Optionalitaet statt Zeitformat.
- `VorgabenB` bleibt intern im Frontend eine Map (`{[key]: IVorgabenUvorgabenB}`), waehrend `IVorgabenUServer.VorgabenB` (Wire-Format) ein Array bleibt — nur der Feldname wurde auf beiden Seiten vereinheitlicht, die bewusst unterschiedliche Form (Array vs. Map) blieb unangetastet (`fieldMapper.ts`s `userProfileFromBackend`/`userProfileToBackend`/`vorgabenUFromServer` konvertieren weiterhin dazwischen).
- Groesster Rename-Umfang dieser Welle: ~50 Dateien betroffen (Bereitschaft-, EWT-, Einstellungen-Feature komplett, `fieldMapper.ts`, `download.ts`, Auth-/Onboarding-Orchestrierung, ~30 Tests). Durchgefuehrt per Typ-Rename-zuerst + `tsc`-Fehlerliste als praezise Landkarte jeder echten Verwendungsstelle (wie schon bei den generischen `code`/`value`-Feldern in Ressource 5), da `pers`/`aZ`/`fZ` zu kurz fuer einen sicheren blinden Grep/Sed waeren (Kollisionsgefahr z. B. mit `IVorgabenE.fZ`, einem fachlich unabhaengigen Fahrzeit-Duration-Typ in `calculateEwtEintraege.ts`, dort bewusst unveraendert gelassen).
- 8 Test-Dateien enthielten `as unknown as IVorgabenU`/`as never`-Fixtures mit den alten Container-Keys, die `tsc` nicht als Fehler erkannte (Cast umgeht die strukturelle Pruefung) und die deshalb erst im vollen Testlauf als echte Laufzeit-Fehlschlaege auffielen (u. a. `Bereitschaft.utils.extra.test.ts`, `EWT.ewtBerechnen.test.ts`, `EWT.utils.extra.test.ts`, mehrere Bereitschaft-Override-Tests) — jeweils die Fixture-Keys auf die neuen Container-Namen korrigiert.
- Keine Business-Logik veraendert — reiner Bezeichner-Rename, durch vollstaendigen Testlauf verifiziert.
- **Verifikation:** `bun run lint && bun run test && bunx tsc --noEmit -p tsconfig.json && bun run build` gruen (1319 Tests, 14 Snapshots) gegen die real veroeffentlichte v0.7.0.

### feat (Welle 2 Schritt 5 — Nebengeld-Feldnamen vereinheitlicht: IDatenN/INebenZulage auf Backend-Namen)

- `IDatenN` (`core/types/IDaten.ts`): `ewtRef`/`tagN`/`beginN`/`endeN`/`auftragN`/`zulagenN` → `EWT`/`Tag`/`Beginn`/`Ende`/`Auftragsnummer`/`Zulagen` (deckungsgleich mit `INebengeld`, siehe `@otto-kirchheim/nebengeld-shared` v0.6.0). `INebenZulage`: `code`/`value` → `Typ`/`Wert` (deckungsgleich mit `IZulage`). `zulagenAnzeigeN` bleibt unverändert (Frontend-only, kein Backend-Gegenstück).
- Zweistufiger Rename: 37 Dateien für die Top-Level-Felder (Sed-Rename, per `tsc` verifiziert — dabei erneut `endeN` als mehrdeutigen String erkannt: kollidiert mit dem unabhängigen UserProfile-`vorgabenB`-Nacht-Ende-Feld, 13 Dateien bewusst ausgeschlossen, `test/mockData.ts` mischt wieder beide Kontexte und wurde gezielt korrigiert). `.code`/`.value` auf `INebenZulage`-Objekten wurden NICHT blind ersetzt (zu generische Wortwahl, Kollisionsgefahr mit Zulagen-Katalog-Feldern `IZulageCatalogItem.code`, DOM-`input.value`, `IVorgabenU`-`{key,value}`-Paaren etc.) — stattdessen gezielt anhand der `tsc`-Fehlerliste jede Stelle einzeln geprüft und nur echte `INebenZulage`-Zugriffe umbenannt (`nebengeldZulagen.ts`, `createEditorModalNeben.tsx`, `calculateZulagenBreakdown.ts`, `fieldMapper.ts`, `download.ts`, mehrere Tests inkl. zwei Test-Helfer mit lokal zu lose typisierten Zulagen-Parametern, die `tsc` deshalb nicht automatisch fing).
- `fieldMapper.ts`: `BackendNebengeld` erweitert jetzt das geteilte `INebengeld` statt die Felder selbst zu deklarieren.
- Keine Business-Logik verändert — reiner Bezeichner-Rename, durch vollständigen Testlauf verifiziert.
- **Verifikation:** `bun run lint && bun run test && bunx tsc --noEmit -p tsconfig.json && bun run build` gruen (1319 Tests) gegen die real veröffentlichte v0.6.0.

### feat (Welle 2 Schritt 4 — EWT-Feldnamen vereinheitlicht: 4 von 13 Feldern auf Backend-Namen)

- `IDatenEWT` (`core/types/IDaten.ts`): `tagE`/`buchungstagE`/`eOrtE`/`schichtE` → `Tag`/`Buchungstag`/`Einsatzort`/`Schicht` (deckungsgleich mit `IEinsatzwechseltaetigkeit`, siehe `@otto-kirchheim/nebengeld-shared` v0.5.0). Die restlichen 9 Felder (`abWE`/`ab1E`/`anEE`/`beginE`/`endeE`/`abEE`/`an1E`/`anWE`/`berechnen`) trugen bereits identische Namen, unverändert. Durchgängig umbenannt in 45 Dateien (EWT-Feature komplett, Neben-Modals über die EWT-Verknüpfung, `fieldMapper.ts`, `download.ts`, Business-Logik, Tests) — keine Snapshot-Datei betroffen, keine Mixed-Context-Kollision gefunden (alle 4 Feldnamen tragen das eindeutige `E`-Suffix).
- `fieldMapper.ts`: `BackendEWT` erweitert jetzt das geteilte `IEinsatzwechseltaetigkeit` statt die Felder selbst zu deklarieren; `ewtFromBackend`/`ewtToBackend` unverändert in ihrer Logik (nur Feldnamen).
- Keine Business-Logik verändert, insbesondere die bekannte `Buchungstag`-Formatdiskrepanz beim PDF-Download (`download.ts`, zweistelliger Tages-String statt ISO-Date) bewusst unangetastet.
- **Verifikation:** `bun run lint && bun run test && bunx tsc --noEmit -p tsconfig.json && bun run build` gruen (1319 Tests) gegen die real veröffentlichte v0.5.0.

### feat (Welle 2 Schritt 3 — Bereitschaftseinsatz-Feldnamen vereinheitlicht: 7 Felder auf Backend-Namen)

- `IDatenBE` (`core/types/IDaten.ts`): `bereitschaftszeitraumBE`/`tagBE`/`auftragsnummerBE`/`beginBE`/`endeBE`/`lreBE`/`privatkmBE` → `Bereitschaftszeitraum`/`Tag`/`Auftragsnummer`/`Beginn`/`Ende`/`LRE`/`PrivatKm` (deckungsgleich mit `IBereitschaftseinsatz`, siehe `@otto-kirchheim/nebengeld-shared` v0.4.0). Durchgängig umbenannt in 25 Dateien: CustomTable-Spaltenkonfiguration, Add/Edit-Modal, `isSameBereitschaftsEinsatz.ts`, `submitBereitschaftsEinsatz.ts`, `aktualisiereBerechnung.ts`, `fieldMapper.ts`, `download.ts`, zugehörige Tests (keine Snapshot-Datei für BE betroffen).
- `fieldMapper.ts`: `BackendBereitschaftseinsatz` erweitert jetzt das geteilte `IBereitschaftseinsatz` statt die Felder selbst zu deklarieren; `beFromBackend`/`beToBackend` dadurch reine Identitäts-Zuordnungen. Nebeneffekt: `LRE` ist jetzt durchgängig als `LreType`-Enum statt `string` typisiert — ein jetzt überflüssiger `as IDatenBE['LRE']`-Cast in `beFromBackend` entfernt, ein Test (`fieldMapper.test.ts`) nutzte noch den rohen String `'LRE 1'` statt `LreType.LRE_1` und wurde korrigiert.
- Keine Business-Logik verändert — reiner Bezeichner-Rename, durch vollständigen Testlauf verifiziert.
- **Verifikation:** `bun run lint && bun run test && bunx tsc --noEmit -p tsconfig.json && bun run build` gruen (1319 Tests) gegen die real veröffentlichte v0.4.0.

### feat (Welle 2 Schritt 2 — Bereitschaftszeitraum-Feldnamen vereinheitlicht: beginB/endeB/pauseB → Beginn/Ende/Pause)

- `IDatenBZ` (`core/types/IDaten.ts`): Felder `beginB`/`endeB`/`pauseB` → `Beginn`/`Ende`/`Pause` (jetzt deckungsgleich mit dem Backend-Modell `IBereitschaftszeitraum`, siehe `@otto-kirchheim/nebengeld-shared` v0.3.0). Durchgängig umbenannt in 31 betroffenen Dateien: CustomTable-Spaltenkonfiguration (`BereitschaftTab.tsx`), Add/Edit-Modal, Business-Logik (`calculateBereitschaftsZeiten.ts`, `submitBereitschaftsEinsatz.ts`, `aktualisiereBerechnung.ts`, `overlapGuard.ts`, `savePipeline.ts`, `getMonatFromItem.ts`), `fieldMapper.ts`, `download.ts` sowie zugehörige Tests + 2 Snapshot-Dateien neu generiert (reiner Feldnamen-Diff, keine Werteänderung).
- **Bewusst nicht angefasst:** Die gleichnamigen, aber fachlich unabhängigen UserProfile-Felder `beginnB`/`endeB` (Bereitschafts-Vorgabe-Zeitplan in `vorgabenB`-Einträgen, z. B. `IVorgabenU.ts`, `AdminProfileTemplatesManager.tsx`) — kollidieren nicht mit den jetzt umbenannten `IDatenBZ`-Feldern und werden erst in Ressource 6 (UserProfile/ProfileTemplate) behandelt.
- `fieldMapper.ts`: `BackendBereitschaftszeitraum` erweitert jetzt das geteilte `IBereitschaftszeitraum` statt die Felder selbst zu deklarieren; `bzFromBackend`/`bzToBackend` sind dadurch reine Identitäts-Zuordnungen (nur noch `_id`-Auswahl + `Pause`-Default), keine Umbenennung mehr nötig.
- Keine Business-Logik verändert — reiner Bezeichner-Rename, durch vollständigen Testlauf (inkl. Snapshot-Vergleich) verifiziert.
- **Verifikation:** `bun run lint && bun run test && bunx tsc --noEmit -p tsconfig.json && bun run build` gruen (1319 Tests, 14 Snapshots) gegen die real veröffentlichte `@otto-kirchheim/nebengeld-shared` v0.3.0 (nicht nur lokal verlinkt via `bun link`).

### feat (Welle 2 Schritt 1 — Vorgabe-Domain-Typ vereinheitlicht: IVorgabeValue)

- `@otto-kirchheim/nebengeld-shared` v0.2.0: `core/types/IVorgabenGeldType.ts` ist jetzt `type IVorgabenGeldType = Required<IVorgabeValue>` statt einer unabhaengig gepflegten Feldliste — `IVorgabeValue` (shared) beschreibt den rohen, pro Monat nur teilweise befuellten Speicher-Eintrag (optionale Felder, wie im Backend-Mongoose-Schema), `Required<>` bildet den nach `createDatenGeldProxy`-Merge garantiert vollstaendigen Wert ab, den `calculateBerechnungRows.ts` konsumiert.
- Keine Feldnamen-Aenderung (alle 17 Felder waren bereits deckungsgleich), keine Aenderung an der Merge-Business-Logik (`createDatenGeldProxy` bleibt Frontend-lokal, Plan: kein Verschieben von Berechnungslogik).
- **Verifikation:** `bun run lint && bun run test && bunx tsc --noEmit -p tsconfig.json && bun run build` gruen (1319 Tests) — insbesondere `calculateBerechnungRows.ts` kompiliert unveraendert trotz optionaler Basis-Felder in `IVorgabeValue`.

### feat (Gemeinsame Bibliothek @otto-kirchheim/nebengeld-shared eingebunden — Welle 1: Enums/Types/Konstanten)

- Wie im Backend (siehe `backend/CHANGELOG.md`): neues privates Repo `otto-kirchheim/nebengeld-shared` als Single-Source-of-Truth. `TUserRole`, `TResourceKey`/`TSaveStatus`, `TDataScope`/`TEwtFilter`, `ZULAGEN_CATALOG` (+ `ZulageCategory`/`ZulageEntryUnit`/`IZulageCatalogItem`/`IZulageEntryRule`), das `lreBE`-Union in `IDatenBE`, `BackendEnvelope` (jetzt `ApiResponse` aus dem Paket) sowie `UserCookieData.role` (jetzt `Role`-Enum statt `string`) sind auf das Paket umgestellt — meist als Re-Export mit Alias (`Role as TUserRole` etc.), damit bestehende Imports aus `@/types` unveraendert funktionieren.
- `infrastructure/data/download.ts`: PDF-Download-Payloads (`data.Daten`) sind jetzt gegen die geteilten Download-DTOs typgeprueft (`satisfies IBereitschaftszeitraumDownloadBody['Daten']` / `INebengeldDownloadBody['Daten']`). EWT-Zweig bewusst ausgenommen: `Buchungstag` wird als zweistelliger Tages-String gesendet, das geteilte DTO typisiert es (wie das bisherige Backend-Modell) als `number` — vorbestehende Diskrepanz, unveraendert übernommen, kein Funktions-Fix im Rahmen dieser Migration.
- `zulagenCatalogByCode`/`CATALOG_BY_CODE`-Maps (`Berechnung`, `Neben`) explizit auf `Map<string, IZulageCatalogItem>` typisiert, da Zulagen-Codes aus gespeicherten Nebengeld-Zeilen (`string`) gegen den jetzt literal-typisierten Katalog (`ZulagenCode`-Union) nachgeschlagen werden.
- Diverse Testdateien auf Enum-Werte (`Role.MEMBER`, `LreType.LRE_1` etc.) statt roher String-Literale umgestellt, wo TypeScript das jetzt einfordert.
- **CI:** `deploy.yml` installiert jetzt mit `NODE_AUTH_TOKEN: secrets.PACKAGES_READ_TOKEN`, da das (oeffentliche) GitHub-Pages-Repo beim Build ein privates Package aufloesen muss.
- Reine Typen-/Konstanten-Migration, keine Business-Logik/Funktionen veraendert (Plan: `plane-das-auslagern-von-concurrent-pearl.md`). Domain-Modell-Feldnamen-Vereinheitlichung (Welle 2) folgt als separater Umbau.
- **Verifikation:** `bun run lint && bun run test && bunx tsc --noEmit -p tsconfig.json && bun run build` gruen (1319 Tests).

## 2026-07-31

### feat (Live-Mount/Unmount beim Speichern in Einstellungen)

- **Aufbauend auf dem modularen Tab-Umbau (siehe unten):** Bisher wirkte eine Änderung an `aktivierteTabs`
  erst beim nächsten Login/Jahreswechsel auf den Tab-Inhalt. Jetzt reagiert der Mount-Zustand direkt auf
  "Speichern" in Einstellungen — ohne Datenverlust und ohne die bereits bestehende, sofort wirksame
  Nav-Sichtbarkeit anzufassen.
- **`saveDaten.ts`:** Ruft `syncFeatureTabs(...)` jetzt direkt nach `await flushAll()` auf (mit den frisch
  aus dem `pre-save:settings`-Hook gesammelten `aktivierteTabs`, oder den vorherigen, falls das Sammeln
  fehlschlug). Bewusst nicht vorher: Ein Unmount vor dem Flush hätte die Tabelle aus dem DOM entfernt,
  bevor `flushAll`s `findTable()`-Check sie noch als "hat offene Änderungen" erkennen konnte — Änderungen
  wären verloren gegangen, ohne dass je ein Request rausging.
- **`syncFeatureTabs.ts`:** Prüft vor jedem Unmount, ob eine der Ressourcen des betroffenen Features noch
  ungesynchte Änderungen hat (`hasPendingTableChanges(..., true)`) oder im `error`-Status feststeckt
  (`getResourceStatus(...).status`). Falls ja: Unmount für diesen Durchlauf übersprungen (Feature bleibt im
  internen Mount-Tracking als "gemountet"), Warn-Snackbar ("X konnte nicht deaktiviert werden – ungespeicherte
  Änderungen"). Wird beim nächsten erfolgreichen Speichern oder Login automatisch nachgeholt — kein manuelles
  Eingreifen nötig. Nav-Button ist in diesem Fall trotzdem schon versteckt (separater, unveränderter
  Mechanismus über `updateTabVisibility.ts`).
- **Tests:** Neue Datei `test/orchestration/syncFeatureTabs.test.ts` (9 Fälle: Mount/Unmount, Idempotenz,
  Snackbar-Block bei offenen Änderungen/Fehlerstatus, automatisches Nachholen, `resetFeatureTabSync`,
  leere/undefined `aktivierteTabs` = alle aktiv); `saveDaten.test.ts` +3 Fälle (`syncFeatureTabs`-Aufruf mit
  korrekten `aktivierteTabs`, Fallback bei Einstellungen-Fehler, Aufruf-Reihenfolge nach `flushAll`). Suite
  1319 Tests grün, `tsc`/Lint sauber.

### feat (Modulare Feature-Tabs: Bereitschaft/EWT/Neben ohne Inhalt, wenn deaktiviert)

- **Root Cause/Ziel:** Ein per `Einstellungen.aktivierteTabs` deaktivierter Tab war bisher nur kosmetisch versteckt (`updateTabVisibility.ts` setzte nur `d-none` auf den Nav-Button) — Tabelle und Buttons wurden trotzdem unconditioniert beim App-Boot gebaut (`registerAppStartTask`, lief vor Login, kannte `aktivierteTabs` also gar nicht). Ziel: ein deaktivierter Tab hat jetzt wirklich keinen Inhalt (kein DOM, keine Tabelle), nicht nur ein verstecktes Nav-Item.
- **Neu: `BereitschaftTab.tsx` / `EwtTab.tsx` / `NebenTab.tsx`:** Je eine dünne Preact-Komponente pro Feature (Chrome als JSX + `useEffect` für `CustomTable`-Aufbau/Button-Wiring — `CustomTable` selbst bleibt Vanilla-DOM). `frontend/src/index.html` enthält für diese drei Tab-Panes nur noch einen leeren Mount-Container (`#bereitschaft-root`/`#ewt-root`/`#neben-root`), analog zu Admin (`#admin-root`).
- **`{Bereitschaft,EWT,Neben}/index.ts`:** Registrieren sich jetzt über `featureLifecycleRegistry` (`register()`/`unregister()` mounten/unmounten die Preact-Komponente) statt über `registerAppStartTask`. `Bereitschaft/index.ts` behält den weiterhin extern genutzten Export `BereitschaftsEinsatzZeiträume` (Einstellungen-Default) unverändert auf Modulebene. `Neben/index.ts` behält den `onEvent('ewt:persisted', ...)`-Listener bewusst außerhalb des Mount-Lifecycles — er aktualisiert `Storage.dataN` unabhängig vom DOM und muss auch synchronisieren, wenn Neben gerade deaktiviert ist (sonst driften verknüpfte Nebengeld-Zeiten bei aktivem EWT unbemerkt).
- **Neu: `core/orchestration/syncFeatureTabs.ts`:** Mountet/unmountet die drei Features passend zu `aktivierteTabs`, aufgerufen aus `loadUserDaten.ts` (Login + Jahr-/Monatswechsel) direkt neben dem bestehenden `updateTabVisibility(...)`. Bewusst nicht aus `saveEinstellungen.ts` verdrahtet — eine Einstellungsänderung wirkt sich auf den Tab-Inhalt (anders als auf die Nav-Sichtbarkeit) erst beim nächsten Login/Reload aus. `resetFeatureTabSync()` wird beim Logout aufgerufen, damit der gemerkte Mount-Zustand nicht stehen bleibt, wenn `featureLifecycleRegistry.teardownAll()` die Features unabhängig davon bereits unmounted hat.
- **`setMonatJahr.ts`:** Warf bisher `throw`, wenn irgendeine der Monats-Headings (`#MonatB`/`#MonatE`/`#MonatN`) fehlte — das hätte bei nur einem deaktivierten Tab den Monatswechsel für die gesamte App blockiert. Jetzt Einzel-Guard pro Heading, `#MonatBerechnung` bleibt Pflicht (Berechnung ist nie deaktiviert).
- **`autoSaveIndicator.ts`:** Neue Funktion `registerAutoSaveButton(buttonId, resources)` — die Save-Buttons von Bereitschaft/EWT/Neben existieren jetzt erst nach dem Mount (später als der einmalige `initAutoSaveIndicator()`-Lauf beim Login), rufen diese Funktion daher selbst in ihrem `useEffect` auf, statt sich auf den globalen Init-Durchlauf zu verlassen.
- **`frontend/CLAUDE.md`:** Regel 4 um eine Ausnahme ergänzt („bei größeren Umbaus kann in Betracht gezogen werden, auf Preact zu wechseln") — Grundlage für den Wechsel von Template-String auf Preact-Shell bei diesen drei Features.
- **Bewusst unverändert:** Datenabruf (`loadAllYearData` lädt weiterhin alle 4 Ressourcen unconditioniert) — `Berechnung/berechnungGroupVisibility.ts` zeigt bewusst Altdaten eines deaktivierten Bereichs weiter in der Gesamtberechnung an, Fetch kappen wäre ein Finanz-Risiko und keine reine DOM-Frage.
- **Tests:** Bestehende Suite (1306 Tests, keine Feature-`index.ts` wird von Tests direkt importiert) unverändert grün; `tsc --noEmit` und `bun run lint` sauber; manuell per Headless-Chrome (Vite-Dev-Server, ohne Backend) geprüft: Mount-Container existieren nach Boot leer, keine Konsolen-Fehler; Kontrollmessung gegen den unveränderten Stand (`git stash`) bestätigt identisches Verhalten für alles, was nicht Teil dieses Umbaus ist.

### fix (Speichern: Tabellen-Buttons zeigten trotz Erfolg keine Snackbar bei Einstellungs-Fehler)

- **`saveDaten.ts`:** Folgefehler aus dem Fix vom 2026-07-17 (Settings-Validierungsfehler entkoppelt von `flushAll`): Die Erfolgs-Snackbar haengte an `userData !== null`, also am Erfolg der (bei jedem Speichern-Button unconditioned mitlaufenden) Einstellungs-Sammlung — nicht am tatsaechlichen Erfolg des geklickten Buttons. Klickte man z. B. `btnSaveB` (nur BZ/BE) mit gueltigen Aenderungen, waehrend irgendwo im (inaktiven) Einstellungen-Tab ein ungueltiges Feld stand, wurden BZ/BE korrekt gespeichert, aber es erschien keinerlei Erfolgsmeldung — nur die feldgenaue, thematisch unpassende Fehler-Snackbar aus `saveEinstellungen`. Fix: Erfolgs-Snackbar wird nur noch unterdrueckt, wenn der Button ausschliesslich die Ressource `settings` betrifft (`btnSaveEinstellungen`) UND diese fehlgeschlagen ist; bei allen anderen Buttons erscheint die Erfolgsmeldung wie vor dem 2026-07-17-Fix.
- **Tests:** `saveDaten.test.ts` — 2 bestehende Faelle angepasst (Default-Button mit Tabellen- und Settings-Ressourcen erwartet jetzt Erfolgs-Snackbar trotz Settings-Fehler); Suite 1305 Tests gruen.

### fix (Ueberschneidungs-/Duplikat-Checks blockierten faelschlich bei lokal geloeschten, ungesynchten Zeilen — weitere Stellen)

- **Root Cause:** Der Fix vom 2026-07-30 (Ersatz-Zeitraum faelschlich als Ueberschneidung blockiert) patchte nur zwei Call-Sites (BZ-/EWT-Editor-Modal) direkt inline. Alle vier Resource-Getter (`getBereitschaftsZeitraumDaten`, `getBereitschaftsEinsatzDaten`, `getEwtDaten`, `getNebengeldDaten`) sind strukturell identisch und keiner filtert `__localState === 'deleted'` — jede weitere Validierungs-/Berechnungs-Stelle, die einen dieser Getter nutzt, hatte denselben Bug.
- **`IDataQueryOptions`:** Neue Option `excludeDeleted?: boolean` (Default `false`, rueckwaertskompatibel). Alle vier Getter filtern lokal geloeschte, ungesynchte Zeilen jetzt nur noch, wenn explizit angefordert — Tabellen-Init/-Reload (die Undo-Zeilen weiterhin anzeigen muss) bleibt unveraendert.
- **Tatsaechlich betroffen und gefixt:**
  - **BE:** `hasOverlap`/`hasLre12TooClose`/`hasConflictingLre1` (`submitBereitschaftsEinsatz.ts`) — Loeschen eines Bereitschaftseinsatzes blockierte einen sofort danach angelegten ueberschneidenden Ersatz-Einsatz faelschlich (Quick-Submit + Editor-Modal).
  - **BZ-Delete-Guard:** `Bereitschaft/index.ts` (`countLinkedEinsaetze`/`beImZeitraum`) zaehlte bereits lokal geloeschte BE-Einsaetze noch als "verknuepft" und blockierte damit das Loeschen eines Bereitschaftszeitraums faelschlich.
  - **BZ-Coverage:** `classifyBzCoverage(getBereitschaftsZeitraumDaten(), ...)` (3 Aufrufstellen in `submitBereitschaftsEinsatz.ts` + Editor-Modal) beruecksichtigte bereits geloeschte Zeitraeume noch als gueltige Abdeckung.
  - **N:** `createAddModalNeben.tsx` deaktivierte einen Tag im Hinzufuegen-Dropdown, obwohl der einzige Eintrag fuer diesen Tag bereits (ungesynct) geloescht war.
  - **EWT-Verknuepfung:** `createEditorModalNeben.tsx` bot bereits geloeschte EWT-Tage weiterhin als gueltiges Verknuepfungsziel an; `setNaechsterEwtTag.ts` uebersprang bereits geloeschte Tage bei der Freie-Tag-Suche unnoetig.
  - **Berechnung:** `calculateZulagenBreakdown.ts` zaehlte bereits geloeschte Nebengeld-Zeilen noch in die Jahres-Zulagen-Summen.
  - **BZ-/EWT-Editor-Modal:** Inline-`__localState`-Checks vom 2026-07-30-Fix auf die neue Getter-Option umgestellt (kein Verhaltensunterschied, nur ein Filter-Ort statt zwei).
- **Bewusst unveraendert:** Tabellen-Init (`rows:` in `Bereitschaft/index.ts`, `EWT/index.ts`, `Neben/index.ts`), `recalculateEwtMonat.ts`-Reload und `overwriteUserDaten.ts` (Server-Daten ohne `__localState`) — muessen geloeschte Zeilen weiterhin anzeigen bzw. sind vom Marker nicht betroffen.
- **Tests:** `EWT.getEwtDaten.test.ts` +1 Fall (`excludeDeleted`-Option); `Bereitschaft.submitBereitschaftsEinsatz.test.ts` — bestehender Ueberschneidungs-Test um Aufruf-Assertion erweitert (Getter wird mit `excludeDeleted: true` aufgerufen); `tsc`/Lint sauber, Suite 1306 Tests gruen.

## 2026-07-30

### fix (Speichern nach Löschen: Ersatz-Zeitraum wurde faelschlich als Ueberschneidung blockiert)

- **`createEditorModalBereitschaftsZeit.tsx` / `createEditorModalEWT.tsx`:** Der lokale Ueberschneidungs-Check beim Anlegen eines neuen BZ-/EWT-Eintrags las `dataBZ`/`dataE` aus dem Storage — inklusive bereits lokal geloeschter, aber noch nicht synchronisierter Zeilen (`__localState: 'deleted'`). Loeschte man einen Zeitraum/Eintrag und legte direkt danach einen ueberschneidenden Ersatz an, blockierte die eigene, noch nicht gesendete Loeschung das Anlegen mit „dürfen sich nicht überschneiden". Fix: Zeilen mit `__localState === 'deleted'` werden im Vergleich jetzt ausgeschlossen.
- **`createEditorModalEWT.tsx` (Ergänzung):** Beim Neuanlegen wird eine bereits zum Löschen vorgemerkte, zeitlich überschneidende Zeile jetzt reaktiviert und mit den neuen Werten überschrieben (`undoDelete()` + `val()`), statt eine zweite, separate Zeile anzulegen — analog zum bereits bestehenden Verhalten in `addEwtTag.ts` (Schnelleingabe). Dadurch bleibt die ursprüngliche `_id` erhalten (z. B. eine verknüpfte Nebengeld-Referenz `ewtRef` verwaist nicht) und es wird als Update statt Delete+Create gesendet.
- **`infrastructure/autoSave/overlapGuard.ts` (neu):** AutoSave sendet Loeschungen bewusst nicht automatisch mit (nur manuelles Speichern tut das, siehe Backend-Aenderung „Bulk-Reihenfolge Delete vor Create/Update" vom 2026-07-17). Ohne Guard konnte AutoSave dadurch trotzdem eine neue/geaenderte Zeile senden, die serverseitig noch mit dem (lokal bereits geloeschten) alten Datensatz kollidiert — sichtbar als unerwarteter 422-Fehler im Hintergrund. Neuer Guard erkennt Zeitfenster-Ueberschneidungen zwischen ausstehenden Neuanlagen/Aenderungen und ausstehenden, ungesyncten Loeschungen derselben Ressource (BZ/EWT; BE/N bewusst ausgenommen — LRE-Adjazenzregeln lassen sich nicht risikofrei im Frontend duplizieren) und haelt die betroffene Ressource für AutoSave zurück, statt den Request zu senden.
- **`autoSave.ts`:** Betroffene Zeilen werden ueber die bestehende Fehler-Darstellung (`markOverlapBlockedRows` in `errorHandling.ts`) markiert (rote Zeile, Tooltip, Modal-Banner) und der Ressourcen-Status auf einen neuen `'blocked'`-Status gesetzt, statt einen vermeidbaren Fehlschlag zu riskieren. Manuelles Speichern (`flushResource`/`flushAll`, `includeDeletes=true`) ist vom Guard unberührt und sendet Loeschung+Neuanlage wie gewohnt zusammen (Server verarbeitet Loeschungen zuerst).
- **`TSaveStatus`/`autoSaveIndicator.ts`:** Neuer Status `'blocked'` (gelbes `warning`-Badge, Tooltip „Überschneidung mit ungespeicherter Löschung – bitte manuell speichern") an den Speichern-Buttons, Prioritaet zwischen `error` und `saving`.
- **Tests:** Neue Testdatei `overlapGuard.test.ts` (8 Faelle: BZ/EWT-Ueberschneidung inkl. Nachtschicht-Tagesuebertrag, kein Block ohne Ueberschneidung/Loeschung, BE/N immer leer); `autoSave.test.ts` +2 Faelle (AutoSave blockiert überschneidende Neuanlage, manuelles Speichern ignoriert den Guard); `autoSaveIndicator.test.ts` +2 Faelle (blocked-Badge, Prioritaet ggü. saving/error); `EWT.utils.extra.test.ts` +1 Fall (Reaktivierung statt Zweitanlage beim Neuanlegen). Suite 1305 Tests gruen, `tsc`/Lint/Format sauber.

## 2026-07-18

### fix (PWA: Workbox-Dev-Logging aus, API-Cache-Pattern geschärft)

- **`vite.config.ts` (Preact-Preset):** Latenter Typfehler behoben — die Option hieß `devtools`, existiert im Preset aber nicht (stiller No-op; korrekt ist `devToolsEnabled`). Verhalten jetzt wie ursprünglich beabsichtigt: Preact-Devtools nur im Dev-Serve, nicht im Build.

- **`vite.config.ts` (Dev-Server-Ausgabe):** Kleines `print-proxy-url`-Plugin — im Proxy-Modus (`bun run start`) zeigt die Vite-Startausgabe jetzt zusätzlich `➜ Proxy: https://dev.otto.home64.de/` an (Vite kennt den Zoraxy nicht und listet sonst nur die lokalen Interfaces); im Lokal-Modus (`bun run dev`) entfällt die Zeile bewusst.
- **`vite.config.ts` (Workbox):** `disableDevLogs: true` — der Dev-Service-Worker (devOptions.enabled) loggte jeden Request in die Konsole. Außerdem `runtimeCaching`-Pattern für den `api-cache` von `/\/api\//` auf `/\/api\/v2\//` geschärft: das alte Pattern traf in Dev auch Quell-Dateien unter `/ts/infrastructure/api/…` (landeten fälschlich im api-cache); echte API-Calls (`…/api/v2/…`) matchen unverändert.

### feat (Dev-Server über HTTPS via Zoraxy-Proxy erreichbar)

- **`vite.base-config.ts`:** Der Dev-Server ist jetzt hinter dem Zoraxy-Reverse-Proxy als `https://dev.otto.home64.de` erreichbar (echtes Wildcard-Zertifikat `*.otto.home64.de` → keine Zertifikatswarnungen, auch am Smartphone; Secure Context für Passkeys/Service Worker). Dafür: `host: true`, `allowedHosts: ['dev.otto.home64.de']` und HMR-Client auf `wss://dev.otto.home64.de:443` (der Websocket läuft über den Proxy zurück — funktioniert auch bei direktem Zugriff auf `localhost:8080`, solange der Proxy erreichbar ist). Für Proxy-losen Betrieb (offline/unterwegs): neues Skript **`bun run dev`** (`VITE_LOCAL_HMR=1`) mit klassischem lokalem HMR.
- **`FetchRetry.ts`:** Dev-API-URLs auf `https://api-dev.otto.home64.de/api/v2` (primär) umgestellt; `http://localhost:8081` und `http://192.168.178.56:8081` bleiben als Fallback (auf der HTTPS-Seite verlieren sie als Mixed Content automatisch das Server-Rennen, im HTTP-Fallback-Betrieb gewinnen sie). Redundanter `127.0.0.1`-Eintrag entfernt.
- **Hinweis:** `https://dev.otto.home64.de` ist ein neuer Origin — einmalig neu einloggen (localStorage wandert nicht mit); alte Service-Worker/Caches der HTTP-Origins bei Bedarf via DevTools → Application → Clear storage aufräumen. Backend-Gegenstück (CORS/Passkey-Env) siehe `backend/CHANGELOG.md`.

## 2026-07-17

### fix (Fahrzeit-Eingaben: Uhrzeit-Picker im Admin-Template-Editor + Legacy-Normalisierung)

- **`AdminProfileTemplateContentEditor.tsx`:** Das Fahrzeit-Wert-Feld im Admin-Template-Editor (Admin → Profile-Templates → Fahrzeit) war ein freies Textfeld ohne Validierung — Eingaben wie „0:30" wurden gespeichert, sind für dayjs aber ungültig (erwartet „00:30"). Jetzt `type="time"` wie im Einstellungs-Panel.
- **`timeString.ts` (neu, infrastructure/validation):** `normalizeTimeString` hebt Legacy-Werte („0:30", „08:15:00") auf `HH:mm`; ungültige Werte ergeben `''`. Wird beim Laden angewendet in `AdminProfileTemplatesManager.normalizeFahrzeit` **und** im `FahrzeitenPanel` (Einstellungen) — ein `type="time"`-Input zeigt nicht normalisierte Werte sonst kommentarlos als leeres Feld an, während der ungültige Wert beim Speichern erhalten bliebe.
- **Tests:** Neuer Unit-Test `timeString.test.ts` (6 Fälle); `FahrzeitenPanel.test.tsx` +1 Fall (Legacy-Wert wird im Input und in der Save-Bridge normalisiert). Backend-Gegenstück (Zod-Validierung) siehe `backend/CHANGELOG.md`.

### feat (E-Mail-Verifizierung läuft jetzt über das Frontend)

- **`handleAuthUrlState.ts`:** Der Verifizierungslink aus der Mail zeigt jetzt aufs Frontend (`?verifyEmailToken=<token>`, Backend-Änderung siehe `backend/CHANGELOG.md`). Die App ruft `GET auth/verify-email/:token` über `FetchRetry` auf (Version-Header + Server-Failover inklusive) und zeigt Erfolg/Fehler als Snackbar. **Update-sicher:** Der URL-Parameter wird nur bei definitivem Ergebnis entfernt (Erfolg oder „Token ungültig/abgelaufen"); bei transienten Fehlern (426 App veraltet, offline, Server nicht erreichbar) bleibt er erhalten — nach dem automatischen PWA-Update + Reload läuft die Verifizierung dann von selbst erneut. Das bisherige `?verify=success|error`-Handling bleibt als Übergangs-Fallback für Redirects eines noch nicht aktualisierten Backends bestehen.
- **Tests:** `Login.handleAuthUrlState.test.ts` um 4 Fälle erweitert (Erfolg, definitiver Token-Fehler, 426 behält Param, Throw behält Param); Suite 1286 Tests grün.

### fix (Persönliche Daten: Leerzeichen lassen sich wieder eintippen)

- **`addressValidation.ts`:** Die Live-Validierung (`input`-Event) schrieb den Feldwert bei jedem Tastendruck mit `trim()`/Whitespace-Normalisierung zurück — ein gerade getipptes Leerzeichen am Wortende wurde dadurch sofort wieder gelöscht. Doppelnamen („Müller Meier") und Adressen ließen sich so praktisch nicht eingeben. `validatePersInput`/`validateGermanAddressInput` haben jetzt eine `normalize`-Option: Beim Tippen wird nur noch validiert (gegen den normalisierten Wert), der Feldwert bleibt unangetastet; die Normalisierung greift weiterhin bei `change`/`blur` und beim Speichern/Onboarding (Default unverändert).
- **Tests:** 2 Regressionstests ergänzt (Leerzeichen bleibt beim `input`-Event erhalten, Trim erst bei `blur`; Name- und Adressfeld).

### fix (Speichern: Einstellungs-Validierungsfehler blockiert Tabellen-Speichern nicht mehr)

- **`saveDaten.ts`:** Die Einstellungs-Sammlung (`pre-save:settings` → `saveEinstellungen`) lief bei jedem Speichern-Button vor dem Tabellen-Flush und warf bei Validierungsfehlern (z. B. „Persönliche Daten fehlerhaft") — dadurch wurde **gar nichts** gespeichert, auch gültige Bereitschafts-/EWT-/Nebengeld-Änderungen nicht. Die Sammlung ist jetzt in einen eigenen try/catch entkoppelt: `flushAll()` läuft immer, Profil-Sync und Success-Snackbar entfallen nur bei Einstellungs-Fehler. Es erscheint dann maximal eine Meldung (die feldgenaue Fehler-Snackbar aus `saveEinstellungen`); die Einstellungen selbst bleiben all-or-nothing. Die Tabellen-Ressourcen waren untereinander bereits isoliert (`Promise.allSettled` in `flushAll`).
- **Tests:** `saveDaten.test.ts` um 4 Fälle erweitert (Flush trotz Settings-Throw, `btnSaveEinstellungen`-Fehlerpfad, finally-Cleanup, nicht registrierter Hook); Suite 1280 Tests grün.

### change (Einstellungen: Speichern-Button nach oben verschoben)

- **`index.html`:** Der Speichern-Button der Einstellungen steht jetzt oberhalb des Einstellungs-Accordions statt ganz unten am Formularende — er ist damit ohne Scrollen erreichbar, unabhängig davon, welche Accordion-Abschnitte aufgeklappt sind. Außerdem einen veralteten TODO-Kommentar entfernt.

## 2026-07-16

### feat (Einstellungen → Fahrzeiten: editierbare Liste mit Hinzufügen/Löschen/Verschieben)

- **`FahrzeitenPanel.tsx` (neu):** Die Fahrzeiten-Tabelle ist jetzt ein Preact-Island statt statischem HTML + DOM-Befüllung. Neue Bedienung: „Zeile hinzufügen"-Button (ersetzt die 3 fixen Leerzeilen, Fokus springt in die neue Zeile), Löschen pro Zeile, ↑/↓-Verschieben (Randpositionen deaktiviert; Reihenfolge wird end-to-end persistiert), Live-Validierung (leere Pflichtfelder teilgefüllter Zeilen werden als `is-invalid` markiert) und Empty-State „Keine Fahrzeiten hinterlegt.". Mobile behält das Karten-Layout mit Feld-Labels; die Aktions-Buttons laufen dort in voller Breite (`styles.scss`).
- **`fahrzeitPanelState.ts` (neu):** State-Bridge analog `arbeitszeitPanelState` — das Panel synchronisiert Änderungen sofort (nicht erst im Effect), `saveEinstellungen()` liest den State von dort statt die Tabelle per DOM-Scraping auszulesen (`table_to_array_einstellungen` entfernt). Komplett leere Zeilen werden beim Speichern weiterhin still verworfen; teilgefüllte Zeilen blockieren mit feldgenauer Snackbar (neu: auch eine Zeile ohne Tätigkeitsstätte blockiert, statt still verworfen zu werden — kein Datenverlust mehr).
- **Beschreibung ist jetzt optional:** `text` ist ein reines Notizfeld (wird fachlich nirgends ausgewertet; EWT nutzt nur Tätigkeitsstätte + Fahrzeit). Speichern verlangt nur noch Tätigkeitsstätte und Fahrzeit; das Eingabefeld zeigt den Platzhalter „optional". Auch der Admin-Template-Editor verwirft Zeilen ohne Beschreibung nicht mehr (`AdminProfileTemplatesManager.tsx`). Backend-Anpassung siehe `backend/CHANGELOG.md`.
- **`index.html` / `generateEingabeMaskeEinstellungen.ts`:** Statische Tabelle durch `<div id="fahrzeiten-panel">` ersetzt; `renderFahrzeitenPanel` mounted das Panel mit Remount-Key (frische Daten bei Profil-Reload/Act-as, wie beim Arbeitszeit-Panel).
- **Tests:** Neuer Komponententest `FahrzeitenPanel.test.tsx` (7 Tests: Rendern, Add/Fokus, Delete, Move, Bridge-Sync, Validierung, Empty-State); `saveEinstellungen.test.ts` um Bridge-basierte fZ-Fälle erweitert; Suite 1276 Tests grün. End-to-end im Browser verifiziert (Add/Move/Delete/Save/Blockier-Pfad, Desktop + Mobile).

## 2026-07-14

### feat (Admin-Dashboard: Memory-Chart mit Session-Lücken + wählbarem Zeitraum)

- **`AdminDashboard.tsx` (MemorySparkline):** Linien verbinden nur noch Datenpunkte derselben Server-Session (`sessionId`, neu vom Backend pro Prozessstart vergeben) — über Downtime-Phasen wird keine Linie mehr gezogen. Fallback für Alt-Daten ohne `sessionId`: Segment-Break bei jedem `startup`-Event. Punkte-Marker bleiben unverändert, einzelne Punkte (Session mit nur einem Snapshot) bleiben sichtbar.
- **`AdminDashboard.tsx` (MemoryCard):** Zeitraum des Memory-Verlaufs wählbar (24 Std. / 3 / 7 / 14 / 30 Tage, Select im Karten-Header) statt fix 7 Tage; Auswahl lädt den Verlauf neu (`GET admin/heap?days=N`). X-Achsen-Ticks passen sich wie bisher automatisch an.
- **`Admin/utils/api.ts`:** `MetricPoint`/`HeapData.current` um `sessionId?` erweitert, `fetchAdminHeap(days = 7)` mit Query-Parameter.

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
