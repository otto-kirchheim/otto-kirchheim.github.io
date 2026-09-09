# Handover – Phase I (DB-UX-Migration, Feinschliff)

**Stand:** 2026-09-08 · Frontend-Branch `feat/db-ux` (Parent: `feat/db-ux-migration`)
**Nichts committed.** 36 geänderte + 4 neue Dateien im Working Tree.

Diese Datei ist die Übergabe an den nächsten Agenten. Der vollständige Plan steht in
[`plan-db-ux-migration.md`](plan-db-ux-migration.md), der laufende Status in [`todo.md`](todo.md).

---

## 1. Checkpoint (zuletzt grün verifiziert)

```
bun run typecheck   → 0 Fehler
bun run lint        → 0 errors / 21 warnings   (Ratsche, siehe I.9)
bun run lint:css    → 0 errors / 90 warnings   (--max-warnings 93 in stylelint.config.mjs)
bun run test        → 2084 pass / 0 fail / 2 skip (2086 across 186 files)
bun run build       → grün, 966 Module, ~25 s
```

Die beiden Log-Zeilen `error: Refresh failed` / `AutoSave … fehlgeschlagen` im Testlauf sind
**erwartete** Negativpfad-Ausgaben, keine Fehlschläge.

---

## 2. Was in Phase I fertig ist

| Thema | Ergebnis |
|---|---|
| **I.1 Layer-Konsolidierung** | `layers.scss` dokumentiert das 3-Stufen-Modell (`db-ux < app < unlayered`). `customtable.css` bleibt bewusst unlayered – Begründung steht in der Datei. |
| **I.2 Marken-Assets** | PostCSS-Plugin `dropDbSubBrandLogos` in `vite.base-config.ts` entfernt `[data-logo=db-*]`-Regeln → ~90 KiB weniger Precache. |
| **I.3 PWA-Farben** | `theme_color`/`background_color` = `#ffffff`; zwei `<meta name="theme-color">` mit `prefers-color-scheme` (`#ffffff` / `#16181b`). |
| **I.5 Density** | `<html data-density="functional">` (Nutzerentscheidung). Kein globales `data-color`. |
| **Neues DB-Design** | `--db-border-radius-*: 0` am `:root` (nur `-full` bleibt) → eckige Formensprache. |
| **DB-Schwelle** | `.schwelle` + `--schwelle-motiv` (Inline-SVG, 15 Rects, Standardversion – **nicht** S-Version) am **unteren** Rand des Start-Panels, bündig am Footer, ohne Scrollbalken. Offizielle Assets unter `src/icons/DB_Schwelle*/Screen/`. |
| **DB-Neo-Schriften im PDF** | Neue Datei `src/ts/infrastructure/pdf/dbFonts.ts`; `db-sans` / `db-head` im Formular-Vorlagen-Editor wählbar (`datenKatalog.ts`, `SchriftartDialog.tsx`) und via `pdf.embedFont(bytes, { subset: true })` eingebettet. |
| **btn-Residuen** | `dbButton.ts` exportiert `DbButtonLook` + `erzeugeDbButtonAusLook()`; `customTableTypes/-Render` nutzen `look` statt Bootstrap-Klassen. |
| **Tabellen-Linien** | `table.customtable { border-collapse: collapse }`, obere Linie bei leerer Tabelle über `tr.customtable-empty`. |
| **AutoSave-Badge** | Nutzt jetzt die echte `db-badge`-Komponente (`data-placement="corner-top-right"`, `data-emphasis="strong"`) statt selbstgebauter Klassen. |
| **React-19-Schalter** | `MyCheckbox` kennt `defaultChecked`; damit hängen die Switches in Bereitschaftszeit (`sonder`/`nacht`/`spaet`) und EWT nicht mehr fest. |
| **I.9 (teilweise)** | 7 von 28 ESLint-Warnungen erledigt (OeLevelBoxes, ArbeitszeiteingabePanel, PdfCanvas, DbFeld, VorgabenBWeekRangeEditor). |
| **I.11 (teilweise)** | `frontend/CLAUDE.md`, `CHANGELOG.md` (Eintrag 69), `.claude/skills/verify/SKILL.md`, `.github/copilot-instructions.md`. |

---

## 3. Aktuelle Baustelle: EWT-Anzeige-Modal

Datei: [`src/ts/features/EWT/components/createShowModalEWT.tsx`](../src/ts/features/EWT/components/createShowModalEWT.tsx)

User-Meldung war: *„das Wechseln des Switches in der Anzeigemaske EWT hat keine Auswirkung.
Außerdem: Datum zu weit links, ein `.` das ein `<hr>`-Element ist"* – zuletzt präzisiert zu
**„der Switch soll den Status auch ändern, nicht nur die Anzeige"**.

### Drei Code-Änderungen, **im Code fertig, im Browser noch NICHT verifiziert**

1. **Switch-Handler** (Zeile ~90)
   Vorher lief `e.target.closest('.modal').row` ins Leere – `#modal` ist eine **Id**, keine Klasse.
   Jetzt über die Closure-`row`, und bewusst mit `row.val()` statt direkter `cells`-Mutation:

   ```tsx
   row.val({ ...row.cells, berechnen: e.target.checked });
   persistEwtTableData(row.CustomTable);
   ```

   **Warum `val()`:** `Row.val()` ([`Row.ts:118`](../src/ts/infrastructure/table/Row.ts#L118)) setzt
   `_state` von `unchanged` → `modified`, ruft `drawRows()` **und** `_notifyChange()` (AutoSave).
   Eine reine `cells`-Mutation ändert nur die Anzeige – genau der vom User gemeldete Bug.
   Das ist dasselbe Muster wie im Tabellen-Checkbox-Handler
   [`attachBerechnenToggleListeners.ts:12-14`](../src/ts/features/EWT/utils/attachBerechnenToggleListeners.ts#L12-L14).

2. **`createTagElement`** – `divClass` war `"mb-1 row sp-8"`; `.row` ist ein undefinierter
   Bootstrap-Rest, also entstand nie ein Grid und `sp-*` blieb wirkungslos → „Datum zu weit links".
   Jetzt `divClass="raster mb-1"`, `labelClass="sp-4 sp-sm-5 …"`, `spanClass="sp-8 sp-sm-7 …"`.

3. **`<hr>` als Punkt** – im `.raster`-Grid war die `<hr>` eine 1-Spalten-Zelle.
   Jetzt `<hr className="ewt-trenner" />` plus neue Regel in `styles.scss`:
   `.ewt-trenner { grid-column: 1 / -1; border: 0; border-block-start: … }`.

### Offener nächster Schritt: Browser-Verifikation

Skript liegt bereits unter
`/tmp/claude-1000/-workspaces-DB-Nebengeld/0faa8821-2c99-4bef-83dc-c8efd1f28551/scratchpad/ewt.mjs`
und ist **fast** lauffähig. Ein Fehler ist noch drin:

> Es importiert `/ts/features/EWT/index.ts` – das Modul registriert nur das Feature-Lifecycle
> und exportiert nichts. Korrekt ist `/ts/features/EWT/EwtTab.tsx` mit `mountEwtTab()`
> (so steht es auch im `verify`-Skill).

Danach prüfen:

- `tr.data._state === 'modified'` nach dem Klick (das ist der „Status" aus der User-Anforderung)
- `cells.berechnen` gekippt, `localStorage.dataE` aktualisiert
- `.ewt-trenner`-Breite > 200 px (kein Punkt)
- Abstand zwischen Label-`right` und Wert-`left` > 4 px

Dev-Server läuft auf **8080** (Quelle, HMR), Preview auf 8082. Chrome:
`/home/vscode/.cache/puppeteer/chrome/linux-152.0.7977.75/chrome-linux64/chrome`, `--no-sandbox`.
Seeding-Rezept siehe [`.claude/skills/verify/SKILL.md`](../.claude/skills/verify/SKILL.md) –
insbesondere `Version` mitseeden und `localStorage.clear`/`removeItem` stubben, sonst räumt der
Auto-Logout den Seed weg.

---

## 4. Noch offen (Reihenfolge = Vorschlag)

1. **EWT-Modal browser-verifizieren** (siehe oben) – die drei Fixes sind unbestätigt.
2. **Admin-Benutzerliste, Filter** – Label mal über, mal unter dem Feld (Rolle vs. Name/OE).
   `DbFeld`/`DbAuswahl`-Konfiguration vereinheitlichen. *(User-Meldung mit Screenshot)*
3. **Bereitschaftseinsatz-Modal** – Warnung „noch nicht gespeicherter Zeitraum" verschwindet nicht.
   Einstieg: `createAddModalBereitschaftsEinsatz.tsx:45`, Sichtbarkeits-Binding prüfen.
4. **AutoSave-Badge im echten Save-Flow** – isolierter Test rendert korrekt (5 Semantiken,
   hell + dunkel, Skript `scratchpad/badge.mjs`). User meldete trotzdem „Das Icon ist fehlerhaft".
   Verdacht: geringer Kontrast (`neutral`/grau im Dark Mode) **oder** Clipping durch den Button.
   Im realen Speichervorgang nachstellen, nicht isoliert.
5. **`border-radius: 0` Nebenwirkungen** – systematisch durchgehen (Divider, Progress-Bars,
   dekorative Punkte). Bisher nur punktuell gefixt.
6. **I.9 Rest** – 21 ESLint-Warnungen: ~13 „setState synchronously in effect", ~7
   `exhaustive-deps`. Alles in verschachtelten Admin-Komponenten, seit Phase A zurückgestellt.
7. **I.11 Rest-Doku** – `../WORKSPACE.md`, `../CLAUDE.md`, `frontend/.claude/README.md`,
   `.claude/skills/architektur`.
8. **`graphify update .`** nach Abschluss.
9. **Gitlink-Bump im Parent-Repo** nach dem ersten Frontend-Commit.

---

## 5. Rahmenbedingungen (nicht verhandelbar)

- **Nichts committen/pushen ohne ausdrückliche Aufforderung** des Users. Aktuell ist nichts committed.
- **Kein `Co-Authored-By`-Trailer** in User-Commits – `.claude/settings.json` hat kein `attribution.commit`.
- **Nicht nach `.github/workflows/` pushen** – das Codespace-Token hat kein `workflows: write`.
- **Keine Secrets** committen. `frontend/.env` ist per Deny-Regel gesperrt;
  `ASSET_PASSWORD`/`ASSET_INIT_VECTOR` sind Install-Zeit-Secrets für `./scripts/install.sh`.
- `bun test` mit mehreren Dateien in einem Prozess erzeugt Cross-File-Fehler → immer `bun run test`.
- **DB-Markenregeln** stehen in der Memory `db-brand-farben-neues-design`
  (`#EC0016` als UI-Rot, kein rotes Fill, eckige Formen).

---

## 6. Fallstricke, die schon Zeit gekostet haben

- **`import.meta.glob`** muss als *literaler* Aufruf im Code stehen, sonst transformiert Vite ihn
  nicht. In `dbFonts.ts` daher direkt aufgerufen, aber in einer lazy `urls()`-Funktion mit
  `try/catch` – so crasht Bun-Test nicht (der Zweig läuft dort nie).
- **`#start` braucht `.active` im Selektor.** `min-block-size: calc(100dvh - 5.75rem)` ohne
  `.active` griff auch bei `opacity: 0` und hängte ~800 px unsichtbare Höhe an → alle Tabs
  scrollten aus dem Bild. Regression war schon mal live.
- **Stylelint `scss/double-slash-comment-empty-line-before`**: Kommentare innerhalb einer Regel
  nach einer Deklaration brauchen eine Leerzeile davor. Kommentare lieber über den Regelblock.
- **React 19 ist streng bei `checked` ohne State-Sync** → `defaultChecked` verwenden, wenn die
  Wahrheit außerhalb von React liegt (CustomTable-Row). Das war die Ursache der hängenden Switches.
- **`.row`, `.modal`, `.btn-*` sind Bootstrap-Reste** und tun seit Phase H nichts mehr. Wenn ein
  Layout „einfach nicht greift", zuerst nach solchen toten Klassen suchen.
