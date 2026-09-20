# Plan: Frontend-Ordnerstruktur `frontend/src/ts` → Feature-Sliced Design + lazy ladbare, steckbare Feature-Module

## Context

`frontend/src/ts` (368 ts/tsx-Dateien, React 19, Bun + Vite) folgt heute `components/` + `core/` + `infrastructure/` + `features/`. Die Schichten sind nicht durchgesetzt:

- `core` ↔ `infrastructure` zyklisch (80 Imports); `components` ↔ `infrastructure` zyklisch; `infrastructure/ui` = 43-Dateien-Grab-Bag (Screens, Stores, Hooks, DOM-Services).
- `core/orchestration/auth` ist ein Feature in `core` und importiert 12× aus `features/*`.
- Global Gedachtes liegt in Features (`zulagenCatalog`, `applySelectOptions`, `SchichtOverrideEditor`, `ArbeitszeiteingabePanel`) → ~12 Cross-Feature-Imports.
- **Feature-Wissen über Ber/EWT/EZ/EA ist an ~25 Stellen außerhalb der Features hartkodiert**, davon dieselbe 4er-Zuordnung (Tab-Key, `modus`, FormularCode, Storage-Key, Ressourcen-Key) ~10× dupliziert
  (`syncFeatureTabs`, `updateTabVisibility`, `resourceConfig`, `Storage`, `generatePDF`, `warmeFormularCaches`, Admin-Katalog, `setMonatJahr` …). Ein neues Feature oder das Entfernen von EA berührt heute ~25 Dateien.
- Die vier **globalen** Bereiche Start, Berechnung, Einstellungen, Admin enthalten viel Feature-spezifisches (Berechnungsformeln/-zeilen pro Feature, Einstellungs-Panels `VorgabenB`/`Fahrzeiten`/`Zulagen`, Admin-Ressourcenkataloge, Schnellzugriff-Buttons). Details siehe „Was in die Features wandert“.
- Kein Feature hat eine echte Public API; EWT/EZ/EA duplizieren ~1,5k Zeilen; 13 Dateien >500 Zeilen; Tests mit 4 konkurrierenden Layouts.

**Entscheidungen des Users**
1. Feature-Sliced Design, Migration in Phasen mit grünem Gate.
2. **Ber (Bereitschaft), EWT, EZ (Erschwerniszulagen, bisher „Neben“/„Nebenbezüge“) und EA sind steckbare Feature-Module**; wo Daten/Verhalten eines Features gebraucht werden, nur per Hook/Registry. Einfaches Hinzufügen/Entfernen, mit Scaffolding bzw. Basis-Vertrag, der alle Hook-Integrationen enthält.
3. **Start, Berechnung, Einstellungen, Admin sind keine Module**, sondern globale Bereiche, die **auf die Features reagieren**; Feature-Teile darin wandern in die Features.
4. **Alles muss funktionieren, wenn die Feature-Module lazy geladen werden.**
5. Der bestehende PDF-Plan (`frontend/tasks/plan-pdf-feature-provider.md`) wird in diesen Plan integriert (Phase P1d).
6. **Dateien verschiebt der User in der IDE; Zielordner legt Claude vorher an.**
7. **Ausnahme Admin:** Admin-Anteile liegen nicht in den Feature-Modulen, sondern im Admin-Bereich, dort nach Features gegliedert (`pages/admin/features/<key>/`, eigenes Admin-Manifest, nur für Admins geladen, alle Feature-Ordner gleichzeitig aktiv). Berechnung und Einstellungen: Teile bleiben im Feature-Modul.

Medium-Artikel: beschreibt die Bulletproof-Variante. Übernommen: Public API per `index.ts`, dünne Pages, domänenfreie globale UI, Colocation. Nicht übernommen: React Query, Zustand, Tailwind, Router (passen nicht zu DB UX/SCSS/handgerollten Stores/Tab-Controller).

## Arbeitsweise beim Verschieben (verbindlich)

- **Ich verschiebe keine Dateien.** Vor jeder Move-Phase lege ich alle Zielordner an (`mkdir -p`; du legst keine Ordner an) und liefere eine exakte Liste `alt → neu`.
  Du verschiebst in der IDE; die IDE aktualisiert die Imports (VS Code: `typescript.updateImportsOnFileMove.enabled` = `always`, sonst pro Move bestätigen). Leere Ordner existieren nur auf der Platte (Git trackt sie erst mit Inhalt) — reicht für den IDE-Move. Leere Alt-Ordner räume ich nachher weg.
- Danach erledige ich, was die IDE nicht kann: `tsc`-Restfehler, `mock.module`-Strings, dynamische `import()`, Skripte/Kommentare (`scripts/gen-iconset.mts`, SCSS), Alias-Änderungen (`tsconfig.json` + `vite.base-config.ts`), Barrels, Boundary-Lint, Gate.
- Inhaltliche Änderungen (Feature-Contract, Slots, Event-Inversionen) sind eigene Commits, getrennt von Moves. Gefundene Latent-Bugs (unten) werden **nicht** im selben Commit mitgefixt.

## Branch-Strategie (größeres Vorhaben ⇒ eigener Branch, vor jeder Änderung)

Betroffen ist nur das Submodul `frontend` (`backend`/`shared` bleiben unberührt; `TResourceKey`/Backend-Verträge ändern sich nicht). Stand: `frontend` steht auf `feat/react-umbau` (sauber bis auf die untracked `tasks/plan-pdf-feature-provider.md`), Eltern-Repo ebenfalls auf `feat/react-umbau`.

1. **Schritt 0 (noch vor P0), nach deiner Freigabe:** in `frontend` `git switch -c feat/fsd-feature-module` von `feat/react-umbau` (Basis-Entscheidung: der Umbau baut auf dem React-Stand auf, der noch nicht in `dev`/`main` ist). Eltern-Repo bekommt optional denselben Branchnamen nur für die Gitlink-Bumps (Muster der letzten Commits „chore: Gitlink-Bump frontend …“).
2. Der Branch bekommt **nur** diesen Umbau; ungebundene Fixes (Latent-Bugs, ESLint-Warnungen) laufen weiter auf `feat/react-umbau` bzw. eigenen kleinen Branches.
3. **Ein Commit je grünem Schritt** (P0, P1a, P1b … P10), Commit-Vorschlag jeweils mit Rückfrage; kein Push ohne Auftrag.
4. `feat/react-umbau` wird regelmäßig (`git rebase`/`merge`, vor jeder größeren Phase, spätestens vor P2) in den Branch geholt, damit Move-Phasen (Pfad-Renames) nicht mit parallelen Änderungen kollidieren. Während der Move-Phasen P2–P10 **keine** parallelen Änderungen an denselben Dateien auf dem Basis-Branch.
5. **Zwischen-Meilensteine mergefähig:** Nach P1h (Contract + Module, ohne Moves) ist der Stand für sich lauffähig und reviewbar — dort Merge-/PR-Entscheidung; P2–P10 optional als zweiter Branch/PR (`feat/fsd-struktur`), falls du kleinere Reviews willst.
6. Die untracked `tasks/plan-pdf-feature-provider.md` wird im ersten Commit des Branchs mit dem Hinweis „aufgegangen in FSD-Plan P1d“ committet (kein Verlust beim Branch-Wechsel).
7. Rollback: Branch verwerfen bzw. je Phase `git revert`; `feat/react-umbau` bleibt unberührt.

## Zwei Klassen von Bausteinen

| Klasse | Mitglieder | Rolle | FSD-Layer |
|---|---|---|---|
| **Feature-Module** (steckbar, lazy) | `ber`, `ewt`, `ez`, `ea` | melden sich über die Registry an; kennen nur `shared` + Contract | `features/*` |
| **Globale Bereiche** (fest, eager-Rahmen) | `start`, `berechnung`, `einstellungen`, `admin` | lesen die Registry, rendern/aggregieren, was Module beitragen; kennen kein Modul | `pages/*` |
| Shell/Orchestrierung | Session, Init, Tab-Controller, Manifest | einzige Stelle, die Module kennt (Manifest) | `app/*` |
| Geteilte Nicht-Module | `auth`, `autosave`, `pdf-export`, `onboarding` | Nutzer-Szenarien, statisch importiert | `features/*` (nicht im Manifest) |

Boundary-Regel: `pages` und `shared` importieren **nie** ein Feature-Modul; Module importieren keine Pages; Modul↔Modul nie. Modul-Code wird **nur** in `app/features.ts` per dynamischem `import()` referenziert (ESLint, siehe P0). `pages/admin/features/<key>/` importiert ebenfalls nie aus `features/*`; es kennt Features nur über Key und `meta`.

## Namenskonvention der Feature-Module (einheitlich)

| Modul | Slug/Key (Ordner, `meta.id`, Manifest, Admin-Ordner, Test-Ordner) | Anzeige im Code (Typen, Symbole, Labels in Kommentaren) | Anzeigetext in der UI |
|---|---|---|---|
| Bereitschaft | `ber` | `Ber` | „Bereitschaft“ (unverändert) |
| Einsatzwechseltätigkeit | `ewt` | `EWT` | „EWT“ (unverändert) |
| Erschwerniszulagen (bisher Neben) | `ez` | `EZ` | heute „Nebenbezüge“; Umbenennung des UI-Texts auf „Erschwerniszulagen“ ist eine eigene Produktentscheidung und **nicht Teil dieses Plans** (Anzeigetext liegt in `meta.label`, Änderung dort einzeilig) |
| Entgeltausgleich | `ea` | `EA` | „Entgeltausgleich“ (unverändert) |

- **Nur Code-Namen werden vereinheitlicht.** Persistierte bzw. vertragliche Werte bleiben unverändert und stehen in `meta.legacy` (Mapping *neuer Key → heutiger Wert*): `aktivierteTabs`-Werte (`bereitschaft|ewt|neben|ea`, liegen in Nutzerdaten/Templates im Backend), Formular-Code (`bereitschaft|ewt|ez|ea`, Backend-Formularversionen), `modus` (`B|E|N|EA`), Ressourcen-Keys (`BZ`,`BE`,`EWT`,`N`,`EA` — `ber` besitzt zwei), Storage-Keys (`dataBZ/BE/E/N/EA`), API-Endpunkte, DOM-IDs (`bereitschaft-tab`, `#Bereitschaft` …) und Help-Schlüssel (`tab.bereitschaft` …). Eine Umstellung dieser Werte wäre eine Datenmigration (Backend + Bestandsdaten) und ist **nicht Teil dieses Plans**.
- Das Mapping steht **einmal** in `meta.legacy`; kein Code außerhalb kennt die alten Werte (Registry übersetzt an den Rändern: Nutzerdaten lesen/schreiben, API, DOM-Adapter).
- Slice-Ordner und Manifest-Keys werden umbenannt (`features/Bereitschaft`→`features/ber`, `features/Neben`→`features/ez`, `features/EWT`→`features/ewt`, `features/EA`→`features/ea`); **Dateinamen bleiben** (Regel „reine Renames beim Move“, deutsche Domänennamen bleiben — also z. B. `createAddModalNeben.tsx` bleibt zunächst; ein späteres Umbenennen auf `…EZ…` ist optional und separat).
- Tests: `test/features/ber/…`, `…/ez/…`; das Präfix `Neben.` bzw. `Bereitschaft.` in Testdateinamen entfällt beim Verschieben ohnehin.

## Feature-Contract (Kernstück, Phase P1)

### Lazy-Aufteilung: `meta` (eager, klein) + Modul-Teile `parts` (lazy)
Globale Bereiche brauchen Informationen über **alle** Features auch dann, wenn deren Code nicht geladen ist (Admin bearbeitet fremde Daten aller Ressourcen; Berechnung zeigt Altdaten deaktivierter Gruppen; Einstellungen listet alle Tabs). Deshalb:

- **`FeatureMeta` (eager, rein deklarativ, wenige Bytes):** `id`/`tabKey`, `label`, `icon`, `order`, `legacyDefaultOn`, `modus`, `formularCode`, `resources[]` (`key`, `storageKey`, `tableId`, `monatOf`/`minYear`-Gate als kleine reine Daten/Funktionen), Wake-Events (`wakeOn: ['ewt:persisted']`), Hilfe-/Tour-Schlüssel.
  Ersetzt die ~10 duplizierten Tabellen (`FEATURE_TAB_MAP`, `TAB_MAP`, `RESOURCE_*_MAP`, `FORMULAR_JE_MODUS`, `FEATURE_LABELS`, `FEATURE_RESOURCES`, Admin-`RESOURCES`-Schlüssel, `Storage`-Keys …).
- **`FeatureModule` in Teilen (je Slot-Gruppe ein eigener lazy Chunk):** `parts: { ui, data, berechnung, einstellungen, pdf, help }`, jedes ein `() => import('./parts/<x>')`
  (`features/<x>/parts/*.ts`, `default export`). Wer nur einen Teil braucht, lädt nur diesen: PDF lädt nur `pdf`; Berechnung nur `berechnung`+`data`; der Tab nur `ui`. **Es gibt bewusst keinen `admin`-Teil** — Admin-Wissen liegt im Admin-Bereich (`pages/admin/features/<key>/`), nicht im Feature.
- **Manifest `app/features.ts`:** `defineFeature({ meta, parts: { ui: () => import('@/features/ewt/parts/ui'), … } })` je Feature. Hinzufügen/Entfernen = Ordner + **eine Zeile** (`scripts/new-feature.ts` erzeugt sie).

### Registry (`shared/lib/feature`, hervorgehend aus `core/hooks/featureLifecycle.ts` + `hookRegistry.ts`)
- Eager: `metas()`, `meta(key)`, `enabledKeys(aktivierteTabs)` (löst die widersprüchliche „leeres `aktivierteTabs`“-Regel an **einer** Stelle, siehe Latent-Bugs).
- Async: `await load(key, part)` (Promise-Cache je `key+part`, Fehler nicht cachen, Retry), `loadMany(keys, part)`, `loadAll(part)` (alle Manifest-Features), `preload(keys, parts)` (Idle nach Login, sobald `aktivierteTabs` bekannt), `activate(key, ctx)`/`deactivate(key)` (Mount/Unmount, ersetzt `register/unregister`), `collect(part, keys)` → lädt fehlende Teile und liefert die Beiträge. `loadAll`/`loadMany` sind `allSettled`-artig: ein fehlgeschlagener Teil blockiert die anderen nicht, der Fehler wird pro Feature gemeldet.
- React: `useFeatureParts(keys, part)` (Loading-Zustand, **Teilfehler pro Feature** mit Retry) für globale Bereiche.
- Wake-Events: die Registry abonniert `wakeOn`-Events **stellvertretend**; beim ersten Event `load` + Zustellung (bewahrt heutiges Verhalten von `ez`/`ea`, das `ewt:persisted` auch bei deaktiviertem Tab synchronisiert, siehe Kommentar in `features/Neben/index.tsx`). Reihenfolge/Verlust-Test Pflicht.
- Fehlerpfad: Chunk lädt nicht (offline/PWA-Update): Snackbar + Retry, Rest der App läuft; `initializeAll`-Verhalten „Fehler bricht ab“ bewusst nur für **Mount**, nicht für Preload.
- Build/PWA: Vite erzeugt je `import()` einen Chunk; `vite-plugin-pwa`-Precache-Glob muss die Chunks enthalten (P0 prüfen; Vorbild: Admin wird schon per `import('Admin/mountAdminTab')` lazy geladen).

### Slots des Moduls (alle optional, TSDoc-dokumentiert; Vorlage = lebende Doku)
| Slot | Ersetzt heute | Konsument |
|---|---|---|
| `ui.tab` (Komponente) + `ui.nav`/`ui.quickAccess`/`ui.startHint` aus `meta` | `App.tsx`-Panes, `AppHeader`-Nav, `StartTab`-Schnellzugriff (`#quick-*`), `features/*/index.tsx`-Mount, `updateTabVisibility` (DOM-`d-none` → Store) | app/shell, Start |
| `lifecycle` (`activate`, `deactivate`, `afterLoad`, `beforeSave`, `afterSave`, `onError`, `onLoginSuccess`, `onLogout`) | `featureLifecycleRegistry` | Session |
| `data` (`getDaten`, `applyDaten`, `conflict`, `monatFilter(monat,jahr)`, `fieldNormalizers`) | `loadUserDaten.{,conflict,helpers,sync}`, `overwriteUserDaten`, `changeMonatJahr`, `fieldMapper`, `actAs` | Session, Einstellungen |
| `on: {event: handler}` | verstreute `onEvent(...)` in `index.tsx` | Registry (Wake) |
| `berechnung` (`aggregate(rows,monat)`, `calc(bucket,ctx)`, `inGesamtsumme`, `hatDaten`, `tableRows`, `mobileCard`, `geldFelder`, Detailzeilen z. B. Zulagen-Aufschlüsselung) | `aktualisiereBerechnung`, `calculateBerechnungRows`, `calculateZulagenBreakdown`, `berechnungGroupVisibility`, `BerechnungTableRows`, `BerechnungMobileCards` | Berechnung |
| `einstellungen` (`sections[]`: `id` (stabil, string), `titel`, `order`, `Component`, `read(VorgabenU)`, `collect(): Partial<IVorgabenU>`+Validierung, `help`; `persFields[]`) | `VorgabenBTable`, `FahrzeitenPanel`, `ZulagenCheckboxList`, `Bundesland`, `Taetigkeit`/`Entgeltgruppe`, `saveEinstellungen`-Panel-State, positionsbasierte `collapseOne..Six` | Einstellungen |
| ~~`admin`~~ — entfällt als Feature-Slot; siehe „Admin nach Features gegliedert“ | `adminResourceBrowserGemeinsam`, `AdminDashboard`, `datenKatalog.ts`, `FormularUpload`, Template-/Profil-Editor, `AdminVorgabenEditor` wandern in `pages/admin/features/<key>/` (nicht in die Module) | Admin |
| `pdf` (`modus`, `formular`, `dateiPraefix` in `meta`; `baueDaten(ctx)` im Modul) | `generatePDF` (`switch`, `FORMULAR_JE_MODUS`, `vorDateiName`), `pdf/abgeleiteteWerte.ts` | pdf-export |
| `help`, `onboarding` (`tour`, `steps` → Settings-Section-IDs) | `helpContent.ts`, `OnboardingGuidePanel` | Help, Onboarding |

**Nutzung im laufenden Betrieb (lazy):** Tab lädt `ui` des Features; Berechnung `loadMany(enabled ∪ hatDatenKeys, 'berechnung'|'data')`; Einstellungen lädt `einstellungen`-Teile der aktivierten Module (Tab-Checkboxen kommen nur aus `meta`, brauchen keinen Chunk); PDF lädt nur `pdf` des gedruckten Modus;
Start/Nav/Tab-Visibility kommen aus `meta` ohne Chunk; **Admin** hat ein eigenes Manifest (siehe unten) und lädt seine Feature-Ordner nur für Admins.

### Scaffolding + Tests
- `bun run new-feature <name>` (`scripts/new-feature.ts`) erzeugt `features/<name>/{meta.ts,index.ts,ui/,model/,lib/}` aus einer vollständig kommentierten Vorlage (jeder Slot vorhanden, ungenutzte auskommentiert), Test-Stub und Manifest-Zeile. Vorlage = Dokumentation aller Integrationspunkte.
- Vertragstests `test/shared/lib/feature/`: (a) jedes Manifest-Feature erfüllt den Contract; (b) **Entfernbarkeit** (App-Start, Login, Speichern, Berechnung, PDF laufen mit jeder Teilmenge des Manifests); (c) **Erweiterbarkeit** (Dummy-Feature „X“ in Fixtures erscheint in Nav, Speichern, Berechnung, Einstellungen, PDF ohne Änderung an `app/`/`pages/`/`shared/`; im Admin über den generischen Fallback aus `meta`); (d) **Lazy** (Teil-Code wird erst bei `load` importiert, Doppel-`load` = 1 Import, Chunk-Fehler → Retry, Wake-Event lädt und stellt zu).
- ESLint: Modul-Code nur per dynamischem Import aus `app/features.ts`; `pages` importieren keine `features/{Modul}`.

### Was in die Features wandert (aus den globalen Bereichen)
- **Berechnung → Module:** Aggregation (`aktualisiereBerechnung.ts:96-217` je Bereich), Formeln (`calculateBerechnungRows.ts:157-220`: Ber `sums[0]`, EWT `sums[1]`, EZ `sums[2]` + `N_ZULAGEN_CALC`, EA nur Anzeige), Zulagen-Aufschlüsselung (Neben), Tabellenzeilen/Mobile-Karten (`BerechnungTableRows` 63-137, `BerechnungMobileCards` 118-165), Sichtbarkeit (`gruppeHatDaten`). **Berechnung behält:** Monatsgerüst, `summeGesamt`, Formatter, `createDatenGeldProxy`, `berechnungMonatsFenster`, Persistenz `datenBerechnung`. Risiko: **Reihenfolge der `sums[]`-Addition** (→ Slot `order`), offene Bucket-Form `IVorgabenBerechnungMonat` (alte Snapshots ohne `EA` tolerieren), `Pers.TB`/`VorgabenGeld` bleiben global.
- **Einstellungen → Module:** `VorgabenBTable`+`createEditor/ShowModalVE`+`BereitschaftsEinsatzZeiträume` (Bereitschaft), `FahrzeitenPanel` (EWT), `ZulagenCheckboxList`+Zulagen-Katalog (Neben), `Bundesland`-Feld (Bereitschaft), `Taetigkeit`/`Entgeltgruppe` (EA). **Einstellungen behält:** Jahr/Monat, Persönliche Daten, E-Mail, Passwort/Passkeys, AutoSave, Speichern/Logout, `TB`, Tab-Checkboxen (aus `meta`). `Einstellungen/index.ts` (380 Zeilen) bleibt inhaltlich global (nur 2 Feature-Referenzen).
  Geteilt Bereitschaft+EWT+Admin: **Arbeitszeit-Editor** (`ArbeitszeiteingabePanel`, `SchichtSection`, `SchichtOverrideEditor`, `arbeitszeitPanelState`) → `shared/ui/arbeitszeit-editor` (domänennah, ≥3 Konsumenten; bewusste FSD-Ausnahme, weil Feature↔Feature-Import verboten).
- **Admin nach Features gegliedert (kein Admin-Code in den Feature-Modulen):** `pages/admin/features/<key>/` (`ber`, `ewt`, `ez`, `ea`) enthält je Feature: Ressourcen-Konfiguration (`adminResourceBrowserGemeinsam.ts:9-122`: Label, Endpoint, `tableFields`, `schemaFields`, `enums`, `fieldTypes`, `crossRefs`), Statistikzeile, `datenKatalog`-Anteile pro Formular, Template-/Profil-Sections, Geld-Felder.
  **Admin-Manifest** `pages/admin/features.ts`: listet die Feature-Ordner explizit per dynamischem `import()` (Schlüssel = `meta.id`). Ein Feature-Modul weiß nichts davon; ESLint verbietet Imports aus `features/*` in `pages/admin`.
  **Ladeverhalten:** Admin-Seite und alle Admin-Feature-Ordner werden — wie heute per `import('Admin/mountAdminTab')` — nur für Nutzer mit Admin-Rolle geladen; Nicht-Admins laden keinen dieser Chunks (Chunk-Test in P1h).
  Beim Betreten: **alle** Admin-Feature-Ordner parallel (`allSettled`), unabhängig von `aktivierteTabs` des Admins oder des betrachteten Nutzers. Teilausfall: nur der Ressourcen-Tab des betroffenen Features zeigt Fehler + Retry.
  **Gleichzeitigkeit:** alle Admin-Feature-Ordner sind gleichzeitig aktiv → keine Modul-Singletons/globalen Zustände (Zustand nur in Komponenten/Stores mit Feature-Präfix); **Querverweise per Key** (`crossRefs: 'ewt'` statt Array-Index `RESOURCES[2]`), Ziel fehlt ⇒ Link ausblenden statt Fehler; Tab-Reihenfolge aus `meta.order`. `actAs` wechselt nur Daten/`aktivierteTabs` der normalen App-Ansicht, der Admin sieht weiter alle Features.
  **Fallback ohne Admin-Ordner:** Ein Feature im Feature-Manifest, aber ohne Eintrag im Admin-Manifest, erscheint im Admin als generische Ressourcentabelle + JSON-Editor aus `meta.resources`. Ein Admin-Eintrag ohne Feature im Manifest wird ignoriert. `new-feature` legt den Admin-Ordner + Manifest-Zeile optional mit an.
  **Preis:** Ein neues Feature berührt damit optional zwei Manifeste (Feature + Admin), dafür bleibt jedes Feature frei von Admin-Code.
  **Admin behält:** Shell, Nutzerliste/-karten/-links, Log, Bulk-Edit-Mechanik, JsonEditor, OE-Editoren, FormularEditor-Kern, Formular-Versions-API, Dashboard-Systemkarten. Backend-Verträge (`AdminStats`-Schlüssel, `BulkApplyCategory`, Template-Payload) bleiben unverändert; die Feature-Ordner mappen nur.
- **Start → Module:** vier Schnellzugriffe + Startbeschreibung (aus `meta`, EA fehlt heute im Text), Sichtbarkeit aus Store statt DOM.
- **Sonstiges:** Help-Texte je Tab/Modal (`helpContent.ts`), Onboarding-Tour/-Schritte, Monats-Überschriften (`setMonatJahr` → jedes Tab liest Monat/Jahr selbst aus Store bzw. Event `period:changed`).

### Grenzen (offen benannt)
(1) `TResourceKey`/`IDaten`/Backend-Schema liegen in `@otto-kirchheim/nebengeld-shared`/Backend — ein *völlig neues* Datenobjekt braucht dort weiterhin einen Eintrag; das Frontend-Scaffold nimmt aber die gesamte Frontend-Verdrahtung ab.
(2) Alle Einstellungen bleiben ein Dokument `IVorgabenU` (`fieldMapper`); Sections liefern Teil-Objekte.
(3) Der genaue Slot-Zuschnitt (v. a. `berechnung`, `einstellungen`) wird in P1 gegen den Code verifiziert, bevor er festgeschrieben wird.

### Latent-Bugs (im Contract-Commit **nicht** mitfixen; danach mit deinem OK je einzeln)
- `Admin/utils/actAs.ts:9-17` leert `dataBZ/BE/E/N`, nicht `dataEA`.
- „Leeres `aktivierteTabs`“: `berechnungGroupVisibility` = alle inkl. EA sichtbar, `syncFeatureTabs`/`updateTabVisibility` = Legacy-Set ohne EA.
- EA-Jahresgate `jahr >= 2025` in `loadUserDaten.ts:314`, nicht in `changeMonatJahr.ts:80`.
- `calculateZulagenBreakdown` nutzt `getNebengeldDaten(minYear:2024)`, `aktualisiereBerechnung` liest `dataN` ungefiltert.
Vorgehen: erst aktuelles Verhalten je Stelle exakt in `meta` abbilden (ggf. mehrere Felder), dann angleichen.

## Ziel-Struktur

```
src/ts/
  app/      App.tsx  features.ts (Manifest, dynamische Imports)  init/  session/  shell/
  pages/    start berechnung einstellungen admin              (global; lesen Registry; index.ts)
            admin/features/{ber,ewt,ez,ea}/ + features.ts   (Admin nach Features gegliedert, Manifest, nur für Admins)
  widgets/  app-header app-footer theme-switcher snackbar-host autosave-badge help-modal
  features/ ber ewt ez ea                         (Module: meta.ts + lazy index.ts; ui/ model/ lib/)
            auth autosave pdf-export onboarding              (geteilte Nicht-Module, statisch)
  shared/   ui/{modal,form,custom-table,dialog,snackbar,button-loading,icons,arbeitszeit-editor}
            lib/{feature,date,storage,validation,events,lifecycle,state,version,media,ressource}
            api/  model/navigation  types/  config/
scripts/new-feature.ts
```
Regeln: Import nur abwärts (app → pages/widgets → features → shared); kein Same-Layer-Import; Slices nur über `index.ts`; `shared/*` ohne Sammel-Barrel; kein `processes/`, kein `entities/`. Slice-Ordner kebab-case, Dateinamen unverändert, deutsche Domänennamen bleiben.

## Mapping alt → neu (Kern)

| Alt | Neu |
|---|---|
| `components/` Form-Primitives (`MyInput/Select/Checkbox`, `DbFeld`, `dbFeldHelfer`) | `shared/ui/form` |
| `components/` Modal-Chrome + `showModal(.Helpers)` | `shared/ui/modal` |
| `DBLoadingButton`, `dbIcons`, `iconRegistry`, `PasswordStrengthMeter` | `shared/ui/{button-loading,icons,form}` |
| `AutoSaveBadge`, `MyHelpModal` + `core/help` | `widgets/autosave-badge`, `widgets/help-modal` (Help-Texte je Modul kommen aus dem Modul-Slot) |
| `core/{types,state,events}` | `shared/{types (Alias @/types bleibt),lib/state,lib/events}` |
| `core/hooks/{featureLifecycle,hookRegistry}` | `shared/lib/feature` (Registry + `defineFeature`) |
| `core/types/resolveSchichtDay.ts` | `features/ber/lib` (bei ≥2 Konsumenten `shared/lib`) |
| `core/orchestration/auth/{components, Login-Utils}` | `features/auth/{ui,model}` |
| `auth/utils/{loadUserDaten.*,overwriteUserDaten,userLoginSuccess}`, `syncFeatureTabs`, `bootstrap`, `initSequence` | `app/session`, `app/init` (nur Registry) |
| `core/orchestration/onboarding` | `features/onboarding` |
| `infrastructure/{api,tokenManagement,storage,validation,date}` | `shared/{api,api/token,lib/storage,lib/validation,lib/date}` (Domänenteile wie `calculateBuchungstagEwt` → `features/ewt/lib`) |
| `infrastructure/autoSave` | `features/autosave` |
| `infrastructure/pdf` + `data/generatePDF.ts` | `features/pdf-export` (Ableitungen je Modus → Module) |
| `infrastructure/data` Persistenz | `shared/lib/ressource` (Ressourcen-Meta aus Registry) |
| `infrastructure/table` (+scss) | `shared/ui/custom-table` (bei Domänen-Imports: `widgets/data-table`) |
| `infrastructure/ui` Widgets/Tabs | `widgets/*`, `pages/{start,berechnung,einstellungen}` |
| `infrastructure/ui` `*Store` + `use*` | `shared/ui/*` je Belang; `activeTab*` → `shared/model/navigation` |
| `infrastructure/ui` `tabController`, `pullToRefresh`, `reactRoot`, `setOffline`, ... | `app/shell` |
| `features/{Berechnung,Einstellungen,Admin}` (Rest nach Abzug der Modul-Teile) | `pages/{berechnung,einstellungen,admin}` (`components`→`ui`, `utils`→`model`/`lib`) |
| `features/{Bereitschaft,EWT,Neben,EA}` (+ extrahierte Teile aus Berechnung/Einstellungen; Admin-Anteile → `pages/admin/features/<key>/`) | `features/{ber,ewt,ez,ea}` |
| `Einstellungen/utils/{setMonatJahr,selectYear,changeMonatJahr}` | Monat/Jahr-Store in `shared/model`; Feature-Filter → Slot `data.monatFilter`; `logoutUser` → `features/auth` |
| `infrastructure/index.ts` (unbenutzt) | löschen |

## Phasen (je 1 Commit, grün; Rollback = `git revert`)

Gate jeder Phase: `bun run typecheck && bun run lint && bun run test` (Testanzahl ≥ Baseline vor P0). Bei Alias/CSS/SCSS/Chunks zusätzlich `bun run build` (+ `lint:css`). Danach `bun run format` (User), Commit-Vorschlag mit Rückfrage (kein Co-Authored-By); je Phase `frontend/CHANGELOG.md`; vor Start Checkliste in `tasks/todo.md`.

- **P-1 Branch (XS):** siehe Branch-Strategie: `feat/fsd-feature-module` anlegen, Plan-Checkliste nach `frontend/tasks/todo.md`, Baseline (`typecheck`/`lint`/`test`-Anzahl, `build`-Chunkliste) notieren.
- **P0 Enabling (S, keine Moves):** Alias `@/*`→`src/ts/*` und `@test/*` (tsconfig + Vite, zuletzt); toten Bare-Alias `@/features` entfernen; 2 relative Ausreißer + ~41 relative Test-Helper-Imports fixen; `eslint-plugin-boundaries` als `warn` (Legacy erlaubt) + `lint:fsd` mit Warnungs-Ratchet; **PWA-Precache-Glob für Lazy-Chunks prüfen; Baseline der Bundle-Größe/Chunkliste notieren**; VS-Code-Import-Update-Setting prüfen. Gate + `build`.
- **P1 Feature-Contract & Module (XL, keine Moves, In-place, Verhaltensänderung), einzeln grün:**
  - **P1a Contract-Kern:** `FeatureMeta`/`FeatureModule`/`defineFeature`, Registry (`load`, `preload`, `activate`, Wake-Events, Fehlerpfad), Manifest `app/features.ts`, Vertragstests inkl. Lazy. **Verschoben:** `useFeatureParts` (React-Hook) auf den ersten Konsumenten (P1e), `scripts/new-feature.ts` + Vorlage auf P1h (erst sinnvoll, wenn alle Teile existieren). **EA zuerst** (kleinster Slice) als Referenz-Migration (Tab mount lazy).
  - **P1b Shell aus `meta`:** `AppHeader`-Nav, `App.tsx`-Panes, `StartTab`-Schnellzugriff/Startbeschreibung, `updateTabVisibility` (Store statt DOM-`d-none`), `syncFeatureTabs` (awaitet `load`), Onboarding-Tour-Tabs, Tab-Checkboxen in Einstellungen.
  - **P1c Ressourcen-Meta & Daten:** `resourceConfig`, `Storage`, `persist*`, `mergeVisibleResourceRows`, `autoSave/*`, `warmeFormularCaches`, `loadUserDaten.*`, `overwriteUserDaten`, `changeMonatJahr`, `fieldMapper`, `actAs` aus `meta`/`data`-Slot; Neben, EWT, Bereitschaft migrieren (meta + lazy Modul); `setMonatJahr` → Monat/Jahr-Store bzw. `period:changed`.
  - **P1d PDF-Provider (integrierter `plan-pdf-feature-provider.md`):** deren Schritte 1–8 unverändert inhaltlich, mit einer Anpassung: `modus/formular/dateiPraefix` in `meta`, `baueDaten` im lazy Modul; `generatePDF` awaitet `load(featureByModus)` (ist ohnehin async). `zulagenWerte.ts` neben `zulagenCatalog`; `datenKatalog.ts` bleibt handgepflegt (Folge-Slot `admin.formular.zeilenFelder`). `abgeleiteteWerte.ts` entfällt, Tests aufteilen wie dort beschrieben. Eintrag im Plan-File `tasks/plan-pdf-feature-provider.md` „aufgegangen in FSD-Plan P1d“.
  - **P1e Berechnung-Slot (größtes Risiko):** Aggregation/Formeln/Zeilen/Karten/Sichtbarkeit in die Module; `sums[]`-Reihenfolge per `order`; offene Bucket-Form; Loading-Zustand; `test/Berechnung.*` als Ausgabe-Vertrag unverändert grün.
  - **P1f Einstellungen-Sections:** stabile Section-IDs, `read/collect`-Registry statt DOM-Queries/Panel-State, `persFields`; `saveEinstellungen`-Hook `pre-save:settings` lädt nötige Module; `Arbeitszeit-Editor` → `shared/ui`.
  - **P1g Admin nach Features:** `pages/admin/features/<key>/` (Ressourcen-Konfiguration, Stats, Formular-Katalog-Anteile, Template-/Profil-Sections, Geld-Felder) + Admin-Manifest `pages/admin/features.ts` (dynamische Imports, nur für Admins); Key-basierte CrossRefs; generischer Fallback aus `meta.resources`; Admin-Feature-Ordner laden parallel (`allSettled`). Tests: alle Admin-Feature-Ordner gleichzeitig geladen; Teilmengen der Manifeste; ein Chunk schlägt fehl; Cross-Ref auf fehlendes Feature; Feature ohne Admin-Eintrag (Fallback); Admin-Eintrag ohne Feature; kein Admin-Chunk im Netzwerkpfad eines Nicht-Admins.
  - **P1h Help/Onboarding-Slots + Abnahme:** `helpContent`/Tour/Schritte je Modul; Akzeptanztests (a)–(d); Chunkliste zeigt je Modul einen Chunk, Haupt-Bundle kleiner als Baseline.
  Ergebnis: `core`/`infrastructure`/globale Bereiche kennen kein Modul mehr; ESLint-Regel „Modul nur im Manifest“ aktiv (warn).
- **P2 Shared-Leaves (M):** `infrastructure/{api,storage,validation,date,tokenManagement}`, `core/{state,events,hooks→lib/feature,types}` → `shared/*`. Zyklus `IDaten`/`CustomHTMLElements`→`CustomTable` per `import type`; `compareVersion` → `shared/lib/version`. Gate + `build`.
- **P3 Shared-UI (L):** `components/*`, generische `infrastructure/ui`, `infrastructure/table` (+scss) → `shared/ui`, `shared/lib`; `applySelectOptions` → `shared/ui/form`; `gen-iconset.mts` + SCSS-Kommentare. Gate + `build` + `lint:css`.
- **P4 Domänen-Shared (M):** `zulagenCatalog`/`zulagenWerte`, generischer `getResourceDaten`/`createDatenGetter`, `infrastructure/data` Persistenz → `shared/…` (nur Dateien mit ≥2 Konsumenten).
- **P5 Geteilte Features + app/session (L, hohes Risiko):** `features/{auth,autosave,pdf-export,onboarding}`, `app/session`, `app/init`; Hook-Reihenfolge unverändert; Login-/Passkey-Tests + `verify`-Smoke.
- **P6 Widgets (M):** Header/Footer/Impressum, ThemeSwitcher, Snackbar-Host, AutoSaveBadge, HelpModal. Visuell prüfen. Gate + `build`.
- **P7 Module verschieben (M):** `features/{ea,ez,ewt}` dann `ber` (Move-Liste; meta + Modul liegen schon getrennt); Manifest-Pfade anpassen.
- **P8 Globale Bereiche → Pages (L):** `pages/{start,berechnung,einstellungen}` (`EinstellungenTab` beendet `infrastructure→features`).
- **P9 Admin (M):** `pages/admin` (71 Dateien); `FormularEditor` nur `components`→`ui`; `formularVersionenApi.ts` + `utils/api.ts` in ein API-Segment.
- **P10 Abschluss (M):** `main.tsx`/`bootstrap`/`tabController` → `app/`; Legacy-Ordner + -Aliase löschen; Boundaries auf `error`; Rest-Testordner aufräumen; `frontend/CLAUDE.md` + `architektur`-Skill + Root-`.claude/CLAUDE.md` (PDF-Abschnitt) aktualisieren (Contract kurz dokumentieren, keine neue Doku-Datei). `build` + PWA-Precache.

Aufwand grob 16–22 Arbeitstage (P1 allein ~8–10, davon P1e/P1f/P1g die größten). P1 liefert den fachlichen Hauptnutzen (Steckbarkeit, Lazy) und ist ohne die Moves P2–P10 einzeln wertvoll.

## Tests
Spiegel-Layout `test/<layer>/<slice>/*.test.ts(x)` (kein Colocating: würde `bunfig`-Preload, Coverage-, Lint-/Format-Globs ändern); `Feature.`-Präfix entfällt; Test-Moves gehören zur Move-Liste der Phase; `mock.module`-Strings (9) passe ich an. Bestehende Ausgabe-Verträge bleiben unverändert grün: `test/Utilities/generatePDF.test.ts`, `test/Berechnung.*`, `Login.*`, `syncFeatureTabs`. Neu: Vertragstests (P1a/P1h), `test/EWT.pdfDaten.test.ts` u. ä. (P1d).

## Folge-Refactorings (getrennt)
1. `useTableTab`/`TableTabShell` + Modal-Factory für EWT/EZ/EA/(Ber) — jeder Slice liefert nur Config (Scaffold-Vorlage generiert sie mit).
2. Aufteilen von `Admin/utils/api.ts` (808), `FormularEditor.tsx` (953), `AdminUserProfileEditor.tsx`, `createEditorModalVE.tsx` (592).
3. Hooks (`useDebouncedValue`, `useEmailStatus`, `useVorlagenFaces`) eigene Dateien; 8× Store-Pattern → `createStore`; Doppelquelle `tabController` vs. `activeTabStore`; `datenKatalog` aus Modulen generieren (`pdf.felder`); Zulagen-Formel-Duplikat (`N_ZULAGEN_CALC` ↔ `geldwertZulagenCode`) zusammenführen.

## Risiken / nicht tun
- **P1 ist Verhaltensänderung:** Startreihenfolge (`registerAppStartTask`, `initSequence`), „Mount nach Datenladen“ (`syncFeatureTabs`), Legacy-Default-Tabs (`ea` bewusst nicht default), Wake-Events, `pre-save:settings`-Hook. Lazy verschiebt Timing: alles, was heute synchron ein Modul voraussetzt, awaitet `load`. Jeder P1-Schritt einzeln grün + `verify`-Smoke nach P1b/P1c/P1e/P1f/P1g; zusätzlich Offline-/Chunk-Fehler-Test.
- Persistierte `datenBerechnung`-Form ändert sich (offene Buckets): alte Snapshots tolerieren, kein Backend-Bezug.
- IDE-Move erfasst keine Strings (`mock.module`, dynamische `import()`, Skripte, Kommentare) → `grep` auf verschobenes Präfix nach jeder Phase.
- Tree-Shaking/Lazy: Side-Effect-Registrierung nie an statische Imports knüpfen; nur Manifest referenziert Module (dynamisch).
- Vite-Alias-Drift fängt `tsc` nicht → `build`-Gate in P0/P1a/P1h/P2/P3/P6/P10.
- Keine Re-Export-Shims an alten Pfaden; kein Big-Bang; Boundaries erst in P10 `error`; keine Sammel-Barrels in `shared`; deutsche Domänennamen nicht umbenennen; `.claude-flow/`-Ordner im Source-Tree nicht mitverschieben (gitignored).

## Verifikation
Pro Phase: Gate-Befehle; `grep` auf Alt-Präfixe zeigt nur noch nicht migrierte Reste; `lint:fsd`-Warnungen sinken monoton.
End-to-End im echten Browser (`verify`-Skill, Dev-Server des Users auf :8080 wiederverwenden) nach P1b/P1c/P1e/P1f/P1g, P5, P6, P10: Login, Passkey, Monatswechsel (Überschriften aller Tabs), Tab-Aktivierung/-Deaktivierung, Speichern, PDF je Modus (B, E, N, EA; Werte gegen Stand vor Änderung), Berechnung, Admin-Ressourcenbrowser.
**Akzeptanz Modularität + Lazy:** (1) Manifest-Zeile EA entfernen ⇒ App startet, Tests grün, kein Tab/Fehler; (2) `bun run new-feature demo` ⇒ Feature erscheint ohne Edit außerhalb Manifest; (3) `bun run build` ⇒ pro Modul-Teil (`ui`, `pdf`, …) und pro Admin-Feature-Ordner ein eigener Chunk, Modul-Code nicht im Entry-Chunk, Entry kleiner als Baseline; als Nicht-Admin eingeloggt lädt der Browser (Network-Tab) keinen Admin-Seiten- und keinen Admin-Feature-Chunk; (4) DevTools Offline nach erstem Laden ⇒ vorgecachte Chunks laden, fehlender Chunk ⇒ Snackbar + Retry, App bleibt nutzbar.

## Kritische Dateien
`frontend/tsconfig.json`, `frontend/vite.base-config.ts`, `frontend/eslint.config.js`, `frontend/tasks/plan-pdf-feature-provider.md`,
`src/ts/core/hooks/{featureLifecycle,hookRegistry}.ts`, `src/ts/core/orchestration/syncFeatureTabs.ts`, `src/ts/core/orchestration/auth/utils/{overwriteUserDaten,loadUserDaten*,userLoginSuccess}.ts`,
`src/ts/infrastructure/data/{resourceConfig,saveDaten,fieldMapper,generatePDF}.ts`, `src/ts/infrastructure/pdf/abgeleiteteWerte.ts`, `src/ts/infrastructure/ui/{updateTabVisibility,AppHeader,StartTab,EinstellungenTab}.tsx`, `src/ts/App.tsx`,
`src/ts/features/Berechnung/{aktualisiereBerechnung,calculateBerechnungRows,calculateZulagenBreakdown,berechnungGroupVisibility}.ts`, `src/ts/features/Einstellungen/{index.ts,utils/{saveEinstellungen,generateEingabeMaskeEinstellungen,changeMonatJahr,setMonatJahr}.ts}`,
`src/ts/features/Admin/components/{adminResourceBrowserGemeinsam.ts,FormularEditor/datenKatalog.ts}`, `src/ts/main.tsx`, `frontend/CHANGELOG.md`.
