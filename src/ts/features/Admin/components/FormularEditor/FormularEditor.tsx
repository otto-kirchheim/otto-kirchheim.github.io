import { useMemo, useState } from 'preact/hooks';
import { hoeheFuer, maxZeilenFuer, spaltenFuer, startYFuer } from '@/infrastructure/pdf/spaltenFuer';
import type { Feld, SeitenDef, Spalte, Version } from '@otto-kirchheim/nebengeld-shared';
import { build } from '@/infrastructure/pdf/build';
import { konfigSchema } from '@/infrastructure/pdf/configSchema';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { PdfCanvas, type Achse, type RasterMarke, type Rechteck } from './PdfCanvas';
import { FeldPanel, type Armed } from './FeldPanel';
import { erzeugeDummyDaten, erzeugeVorschau, type Werteart } from './dummyDaten';
import { beispielSignatur } from './beispielSignatur';
import type { FormularCode } from './datenKatalog';

export type Konfig = { seiten: SeitenDef[]; tabellen: Version['tabellen'] };

type Props = {
  formular: FormularCode;
  datei: File;
  value: Konfig;
  onChange: (value: Konfig) => void;
};

export function leereSeite(quelle = 0): SeitenDef {
  return { quelle, bereiche: [], felder: {} };
}

function feldRechteck(f: Feld, label: string, aktiv: boolean): Rechteck {
  return { x: f.x, y: f.y, x2: f.x2 ?? f.x + 40, y2: f.y2 ?? f.y + f.size, label, aktiv };
}

/**
 * Spalten uebernehmen nur die x-Kanten, das Zeilenraster nur die y-Kanten -- das Canvas zeigt beim
 * Ziehen deshalb ein Band statt eines Rechtecks, dessen halbe Angabe verworfen wuerde.
 */
function achseFuer(armed: Armed | null): Achse {
  if (armed?.bereich === 'spalte') return 'x';
  if (armed?.bereich === 'tabelle' || armed?.bereich === 'letzteZeile' || armed?.bereich === 'sonderzeile') return 'y';
  return 'beide';
}

/**
 * Zeilenhöhe aus erster und letzter Datenzeile, über alle Zeilen gemittelt. Eine Einzelmessung an
 * nur einer Zeile ist zwangsläufig ungenau (freihändig gezogenes Band); der Renderer zieht je Zeile
 * dieselbe `hoehe` ab, wodurch sich Bruchteile eines Punktes über die Tabelle zu einem sichtbaren
 * Versatz aufsummieren. `null` bedeutet: nicht messbar (zu wenige Zeilen oder Reihenfolge vertauscht).
 */
export function zeilenHoeheAus(startY: number, letzteY: number, zeilen: number): number | null {
  if (zeilen < 2) return null;
  const hoehe = (startY - letzteY) / (zeilen - 1);
  return hoehe > 0 ? Number(hoehe.toFixed(2)) : null;
}

/** Spannweite jeder Tabelle dieser Seite -- Grundlage für den Zeilenraster-Indikator neben der
 * jeweils ersten Spalte (siehe `spaltenFuer` für seitenspezifische Spalten). */
function sammleRaster(seite: SeitenDef, tabellen: Version['tabellen'], armed: Armed | null): RasterMarke[] {
  return seite.bereiche.flatMap(bereich => {
    const tabelle = tabellen[bereich.tabelle];
    if (!tabelle) return [];
    const spalten = spaltenFuer(bereich, tabelle);
    return [
      {
        // Ohne eigene Spalten (leere Tabelle) bleibt der Rand als Rückfall -- 0 ist derselbe
        // Ursprung, an dem der Indikator vorher immer stand.
        x: spalten.length > 0 ? Math.min(...spalten.map(s => s.x)) : 0,
        startY: startYFuer(bereich, tabelle),
        hoehe: hoeheFuer(bereich, tabelle),
        zeilen: maxZeilenFuer(bereich, tabelle),
        aktiv: Boolean(
          (armed?.bereich === 'tabelle' || armed?.bereich === 'letzteZeile') && armed.tabelle === bereich.tabelle,
        ),
      },
    ];
  });
}

function sammleRechtecke(seite: SeitenDef, tabellen: Version['tabellen'], armed: Armed | null): Rechteck[] {
  const rechtecke: Rechteck[] = [];

  for (const [key, feld] of Object.entries(seite.felder) as [string, Feld][]) {
    rechtecke.push(feldRechteck(feld, feld.label ?? key, Boolean(armed?.bereich === 'feld' && armed.key === key)));
  }

  for (const bereich of seite.bereiche) {
    const tabelle = tabellen[bereich.tabelle];
    if (!tabelle) continue;

    const spalten = spaltenFuer(bereich, tabelle);
    const hoehe = hoeheFuer(bereich, tabelle);
    const startY = startYFuer(bereich, tabelle);
    spalten.forEach((spalte: Spalte, index) => {
      rechtecke.push({
        x: spalte.x,
        y: startY,
        x2: spalte.x2 ?? spalte.x + 40,
        y2: startY + hoehe,
        label: spalte.label ?? spalte.key,
        aktiv: Boolean(armed?.bereich === 'spalte' && armed.tabelle === bereich.tabelle && armed.index === index),
      });
    });

    // Der Tabellenrahmen hat selbst keine x-Kanten: er spannt so weit wie seine Spalten, sonst über
    // die ganze Seitenbreite (x/x2 undefined) -- keine festen Werte, die bei Querformat brechen.
    const links = spalten.map(s => Math.min(s.x, s.x2 ?? s.x));
    const rechts = spalten.map(s => Math.max(s.x, s.x2 ?? s.x));
    rechtecke.push({
      x: links.length > 0 ? Math.min(...links) : undefined,
      y: startY,
      x2: rechts.length > 0 ? Math.max(...rechts) : undefined,
      y2: startY + hoehe,
      label: `${bereich.tabelle}: erste Zeile`,
      aktiv: Boolean(armed?.bereich === 'tabelle' && armed.tabelle === bereich.tabelle),
      // Linke Kante teilt sich der Rahmen mit der ersten Spalte -- Beschriftung deshalb nach rechts.
      labelRechts: true,
    });

    // Sonderzeilen-Platzierungen (Kopf-/Summenzeile über mehrere Spalten, siehe SonderZeile) --
    // span wie der Tabellenrahmen über die Spaltenbreite, `index` ist die Position im Array (ein
    // Name kann mehrfach vorkommen, z.B. Überschrift oben + Kopie unten).
    (bereich.sonderzeilen ?? []).forEach((platz, index) => {
      rechtecke.push({
        x: links.length > 0 ? Math.min(...links) : undefined,
        y: platz.y,
        x2: rechts.length > 0 ? Math.max(...rechts) : undefined,
        // Ohne eigenes y2 nur ein schmaler Platzhalter-Streifen zur Orientierung -- reine
        // Anzeige, in die Konfiguration übernommen wird nur, was der Klick tatsächlich liefert.
        y2: platz.y2 ?? platz.y + 12,
        label: `${bereich.tabelle}: ${platz.name}`,
        aktiv: Boolean(armed?.bereich === 'sonderzeile' && armed.tabelle === bereich.tabelle && armed.index === index),
        labelRechts: true,
      });
    });
  }

  if (seite.signaturBild) {
    const s = seite.signaturBild;
    rechtecke.push({
      x: s.x,
      y: s.y,
      x2: s.x + s.w,
      y2: s.y + s.h,
      label: 'Signatur',
      aktiv: Boolean(armed?.bereich === 'signaturBild'),
    });
  }

  return rechtecke;
}

/**
 * Ersetzt die JSON-Textarea aus Phase 7 (User-Vorgabe) -- Zellen werden als Rechteck auf der echten
 * PDF-Vorschau aufgezogen statt per Hand ins JSON getippt. Laeuft komplett gegen die lokal
 * gewaehlte `datei: File`, kein Server-Roundtrip noetig.
 */
export function FormularEditor({ formular, datei, value, onChange }: Props) {
  const [tab, setTab] = useState(0);
  const [armed, setArmed] = useState<Armed | null>(null);
  const [vorschauLaeuft, setVorschauLaeuft] = useState<Werteart | null>(null);

  // Nach dem Entfernen der letzten Seite zeigt `tab` ins Leere -- dann auf die letzte gültige.
  const seitenIndex = Math.min(tab, value.seiten.length - 1);
  const aktiveSeite = value.seiten[seitenIndex];
  // Beispielwerte samt Renderer-Kontext -- die Feldliste zeigt damit dieselben Zahlen wie das PDF.
  // Neu berechnet, sobald sich die Konfiguration oder der Seiten-Tab ändert.
  const vorschau = useMemo(
    () => erzeugeVorschau(value.tabellen, value.seiten, seitenIndex, formular),
    [value.tabellen, value.seiten, seitenIndex, formular],
  );

  function setzeSeite(index: number, seite: SeitenDef) {
    onChange({ ...value, seiten: value.seiten.map((s, i) => (i === index ? seite : s)) });
  }

  function setzeAktiveSeite(seite: SeitenDef) {
    setzeSeite(seitenIndex, seite);
  }

  function handleRechteck(r: { x: number; y: number; x2: number; y2: number }) {
    if (!armed || !aktiveSeite) return;

    if (armed.bereich === 'feld') {
      const feld = aktiveSeite.felder[armed.key];
      if (!feld) return;
      setzeAktiveSeite({
        ...aktiveSeite,
        felder: { ...aktiveSeite.felder, [armed.key]: { ...feld, x: r.x, y: r.y, x2: r.x2, y2: r.y2 } },
      });
    } else if (armed.bereich === 'spalte') {
      // Spalten liegen im Zeilenraster ihrer Tabelle -- nur die x-Kanten stammen aus der Markierung.
      const tabelle = value.tabellen[armed.tabelle];
      if (!tabelle) return;
      const bereich = aktiveSeite.bereiche.find(b => b.tabelle === armed.tabelle);
      const gesetzt = (s: Spalte, i: number) => (i === armed.index ? { ...s, x: r.x, x2: r.x2 } : s);
      // Hat die Seite ein eigenes Spaltenraster, gilt die Markierung nur dort -- sonst verschöbe
      // das Nachjustieren auf Seite 2 auch die Spalte auf Seite 1.
      if (bereich?.spalten) {
        setzeAktiveSeite({
          ...aktiveSeite,
          bereiche: aktiveSeite.bereiche.map(b =>
            b.tabelle === armed.tabelle ? { ...b, spalten: b.spalten!.map(gesetzt) } : b,
          ),
        });
      } else {
        onChange({
          ...value,
          tabellen: { ...value.tabellen, [armed.tabelle]: { ...tabelle, spalten: tabelle.spalten.map(gesetzt) } },
        });
      }
    } else if (armed.bereich === 'letzteZeile') {
      // Zeilenhöhe über ALLE Zeilen gemittelt statt aus einer einzelnen Messung: eine Ungenauigkeit
      // von Bruchteilen eines Punktes summiert sich sonst über die Tabelle zu einem sichtbaren
      // Versatz auf, weil der Renderer je Zeile dieselbe `hoehe` abzieht.
      const tabelle = value.tabellen[armed.tabelle];
      const bereich = aktiveSeite.bereiche.find(b => b.tabelle === armed.tabelle);
      if (!tabelle || !bereich) return;
      const effMaxZeilen = maxZeilenFuer(bereich, tabelle);
      const gemessen = zeilenHoeheAus(startYFuer(bereich, tabelle), r.y, effMaxZeilen);
      if (gemessen === null) {
        createSnackBar({ message: 'Die letzte Zeile muss unter der ersten liegen', status: 'warning', timeout: 3000 });
        return;
      }
      // Hat diese Seite schon eine eigene Platzierung (startY/Höhe/Zeilen zusammen, siehe
      // "eigene je Seite"-Checkbox), bleibt die Messung dort -- sonst wie bisher für die ganze
      // Tabelle (gleiches Muster wie die Spalten-Markierung oben).
      if (bereich.startY !== undefined) {
        setzeAktiveSeite({
          ...aktiveSeite,
          bereiche: aktiveSeite.bereiche.map(b => (b.tabelle === armed.tabelle ? { ...b, hoehe: gemessen } : b)),
        });
      } else {
        onChange({ ...value, tabellen: { ...value.tabellen, [armed.tabelle]: { ...tabelle, hoehe: gemessen } } });
      }
      createSnackBar({
        message: `Zeilenhöhe: ${gemessen} pt (aus ${effMaxZeilen} Zeilen)`,
        status: 'success',
        timeout: 3000,
      });
    } else if (armed.bereich === 'sonderzeile') {
      const bereich = aktiveSeite.bereiche.find(b => b.tabelle === armed.tabelle);
      if (!bereich) return;
      const platzierungen = bereich.sonderzeilen ?? [];
      const naechste = platzierungen.map((p, i) => (i === armed.index ? { ...p, y: r.y, y2: r.y2 } : p));
      setzeAktiveSeite({
        ...aktiveSeite,
        bereiche: aktiveSeite.bereiche.map(b => (b.tabelle === armed.tabelle ? { ...b, sonderzeilen: naechste } : b)),
      });
    } else if (armed.bereich === 'tabelle') {
      // Erste Datenzeile: y liefert die Startposition, die Höhe den Zeilenabstand. Beides gilt nur
      // dann für diese Seite allein, wenn sie schon eine eigene Platzierung hat ("eigene je Seite")
      // -- sonst bleiben sie beim gemeinsamen Tabellenwert, den JEDE Seite ohne eigenen Wert erbt.
      const tabelle = value.tabellen[armed.tabelle];
      if (!tabelle) return;
      const bestehenderBereich = aktiveSeite.bereiche.find(b => b.tabelle === armed.tabelle);
      const eigenePlatzierung = bestehenderBereich?.startY !== undefined;
      const gemessen = Math.max(r.y2 - r.y, 1);
      const bereiche = bestehenderBereich
        ? aktiveSeite.bereiche.map(b =>
            b.tabelle === armed.tabelle && eigenePlatzierung ? { ...b, startY: r.y, hoehe: gemessen } : b,
          )
        : [...aktiveSeite.bereiche, { tabelle: armed.tabelle }];
      onChange({
        ...value,
        tabellen: eigenePlatzierung
          ? value.tabellen
          : { ...value.tabellen, [armed.tabelle]: { ...tabelle, startY: r.y, hoehe: gemessen } },
        seiten: value.seiten.map((s, i) => (i === seitenIndex ? { ...aktiveSeite, bereiche } : s)),
      });
    } else {
      setzeAktiveSeite({ ...aktiveSeite, signaturBild: { x: r.x, y: r.y, w: r.x2 - r.x, h: r.y2 - r.y } });
    }
    setArmed(null);
  }

  async function testdatenVorschau(art: Werteart) {
    setVorschauLaeuft(art);
    try {
      const daten = erzeugeDummyDaten(value.tabellen, value.seiten, formular, art);
      const bytes = await build(
        {
          version: 'vorschau',
          gueltigVon: '2026-01-01',
          gueltigBis: null,
          layout: { template: URL.createObjectURL(datei), seiten: value.seiten },
          tabellen: value.tabellen,
          formular,
        },
        daten,
        // Sonst bliebe die Signaturfläche als einziges Element ohne Beispielwert.
        beispielSignatur(),
      );
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      window.open(URL.createObjectURL(blob), '_blank');
    } catch (error) {
      createSnackBar({
        message: `Vorschau fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`,
        status: 'error',
        timeout: 4000,
        fixed: true,
      });
    } finally {
      setVorschauLaeuft(null);
    }
  }

  return (
    <div class="border rounded p-2">
      <div class="d-flex align-items-center gap-2 mb-2">
        <ul class="nav nav-pills flex-grow-1 flex-wrap">
          {value.seiten.map((s, i) => (
            <li class="nav-item" key={i}>
              <button
                type="button"
                class={`nav-link py-1 ${i === seitenIndex ? 'active' : ''}`}
                onClick={() => setTab(i)}
              >
                Seite {i + 1}
                {s.wiederholt ? ' ↻' : ''}
              </button>
            </li>
          ))}
          <li class="nav-item">
            <button
              type="button"
              class="nav-link py-1"
              title="Weitere Seite anhängen — die Seitenfolge bildet das Formular ab (Bereitschaft: 1, 2, 3 unterschiedlich)"
              onClick={() => {
                // Quelle der letzten Seite + 1 als Vorschlag: Vorlagen-PDFs sind in der Regel in
                // derselben Reihenfolge aufgebaut wie das Formular.
                const letzte = value.seiten.at(-1);
                onChange({ ...value, seiten: [...value.seiten, leereSeite((letzte?.quelle ?? -1) + 1)] });
                setTab(value.seiten.length);
              }}
            >
              + Seite
            </button>
          </li>
        </ul>
        <div class="btn-group btn-group-sm">
          <button
            type="button"
            class="btn btn-primary"
            title="Fachlich passende Werte aus dem Datenkatalog — sieht aus wie ein ausgefülltes Formular"
            disabled={vorschauLaeuft !== null}
            onClick={() => void testdatenVorschau('beispiel')}
          >
            {vorschauLaeuft === 'beispiel' ? 'Erzeugt…' : 'Beispieldaten'}
          </button>
          <button
            type="button"
            class="btn btn-outline-primary"
            title="Generische Füllwerte — zeigt vor allem, welche Zelle zu welchem Eintrag gehört"
            disabled={vorschauLaeuft !== null}
            onClick={() => void testdatenVorschau('platzhalter')}
          >
            {vorschauLaeuft === 'platzhalter' ? 'Erzeugt…' : 'Platzhalter'}
          </button>
        </div>
      </div>

      {aktiveSeite && (
        <div class="d-flex flex-wrap align-items-center gap-3 mb-2 small">
          <div class="form-check mb-0">
            <input
              class="form-check-input"
              type="checkbox"
              id="seite-wiederholt"
              checked={Boolean(aktiveSeite.wiederholt)}
              onChange={e =>
                setzeAktiveSeite({ ...aktiveSeite, wiederholt: (e.target as HTMLInputElement).checked || undefined })
              }
            />
            <label
              class="form-check-label"
              for="seite-wiederholt"
              title="Bei Zeilenüberlauf wird genau diese Seite so oft wiederholt, wie noch Zeilen übrig sind"
            >
              Diese Seite bei Überlauf wiederholen
            </label>
          </div>

          {value.seiten.length > 1 && (
            <div class="d-flex align-items-center gap-1">
              <label class="mb-0" for="seite-kopieren">
                Einstellungen übernehmen von
              </label>
              <select
                id="seite-kopieren"
                class="form-select form-select-sm w-auto"
                value=""
                onChange={e => {
                  const quelle = value.seiten[Number((e.target as HTMLSelectElement).value)];
                  (e.target as HTMLSelectElement).value = '';
                  if (!quelle) return;
                  // `quelle` (die PDF-Seite) bleibt, alles andere wird übernommen -- gemeint ist
                  // „gleiches Layout, andere Vorlagenseite", nicht „dieselbe Seite zweimal".
                  setzeAktiveSeite({ ...structuredClone(quelle), quelle: aktiveSeite.quelle });
                }}
              >
                <option value="">— Seite wählen —</option>
                {value.seiten.map((_, i) =>
                  i === seitenIndex ? null : (
                    <option key={i} value={i}>
                      Seite {i + 1}
                    </option>
                  ),
                )}
              </select>
            </div>
          )}
        </div>
      )}

      {aktiveSeite && (
        <div class="row g-2">
          <div class="col-lg-7">
            <PdfCanvas
              datei={datei}
              seiteIndex={aktiveSeite.quelle}
              rechtecke={sammleRechtecke(aktiveSeite, value.tabellen, armed)}
              raster={sammleRaster(aktiveSeite, value.tabellen, armed)}
              scharfGeschaltet={armed !== null}
              achse={achseFuer(armed)}
              hinweis={
                armed?.bereich === 'letzteZeile'
                  ? 'Band über die LETZTE Datenzeile ziehen — die Zeilenhöhe wird daraus über alle Zeilen gemittelt.'
                  : undefined
              }
              onRechteck={handleRechteck}
              onQuelleWaehlen={pageIndex => setzeAktiveSeite({ ...aktiveSeite, quelle: pageIndex })}
              aktiveSeiteLabel={`Seite ${seitenIndex + 1}`}
            />
            {value.seiten.length > 1 && (
              <button
                type="button"
                class="btn btn-sm btn-outline-danger mt-2"
                onClick={() => {
                  onChange({ ...value, seiten: value.seiten.filter((_, i) => i !== seitenIndex) });
                  setTab(Math.max(seitenIndex - 1, 0));
                }}
              >
                Seite {seitenIndex + 1} entfernen
              </button>
            )}
          </div>
          <div class="col-lg-5" style="max-height:70vh;overflow-y:auto">
            <FeldPanel
              formular={formular}
              seite={aktiveSeite}
              onSeiteChange={setzeAktiveSeite}
              tabellen={value.tabellen}
              onTabellenChange={t => onChange({ ...value, tabellen: t })}
              armed={armed}
              onArm={setArmed}
              vorschau={vorschau}
            />
          </div>
        </div>
      )}

      <KonfigJson value={value} onChange={onChange} />
    </div>
  );
}

/**
 * Rohansicht der kompletten Konfiguration -- zum Sichern, Übertragen auf ein anderes Formular oder
 * für Massenänderungen, die im visuellen Editor Feld für Feld zu mühsam wären. Übernommen wird
 * erst auf Knopfdruck, damit halbfertiges Tippen den Editor nicht laufend zurücksetzt.
 */
function KonfigJson({ value, onChange }: { value: Konfig; onChange: (value: Konfig) => void }) {
  const [entwurf, setEntwurf] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const angezeigt = entwurf ?? JSON.stringify(value, null, 2);

  function uebernehmen() {
    try {
      onChange(konfigSchema.parse(JSON.parse(angezeigt)));
      setEntwurf(null);
      setFehler(null);
      createSnackBar({ message: 'Konfiguration übernommen', status: 'success', timeout: 2000 });
    } catch (error) {
      setFehler(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <details class="mt-2">
      <summary class="small fw-semibold" style="cursor:pointer">
        Konfiguration als JSON (kopieren / einfügen)
      </summary>
      <textarea
        class={`form-control form-control-sm font-monospace mt-1${fehler ? ' is-invalid' : ''}`}
        style="font-size:0.7rem;min-height:12rem"
        spellcheck={false}
        value={angezeigt}
        onInput={e => {
          setEntwurf((e.target as HTMLTextAreaElement).value);
          setFehler(null);
        }}
      />
      {fehler && <div class="small text-danger mt-1">{fehler}</div>}
      <div class="d-flex gap-1 mt-1">
        <button type="button" class="btn btn-sm btn-primary" disabled={entwurf === null} onClick={uebernehmen}>
          Übernehmen
        </button>
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary"
          disabled={entwurf === null}
          onClick={() => (setEntwurf(null), setFehler(null))}
        >
          Verwerfen
        </button>
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary ms-auto"
          onClick={() => void navigator.clipboard?.writeText(angezeigt)}
        >
          In Zwischenablage
        </button>
      </div>
    </details>
  );
}
