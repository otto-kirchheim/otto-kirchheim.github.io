import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';

import { hoeheFuer, maxZeilenFuer, spaltenFuer, startYFuer } from '@/infrastructure/pdf/spaltenFuer';
import type { Feld, Schriftart, SeitenDef, Spalte, Version } from '@otto-kirchheim/nebengeld-shared';
import { build } from '@/infrastructure/pdf/build';
import { konfigSchema } from '@/infrastructure/pdf/configSchema';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { PdfCanvas, type Achse, type Messung, type RasterMarke, type Rechteck } from './PdfCanvas';
import { FeldPanel, type Armed } from './FeldPanel';
import { erzeugeDummyDaten, erzeugeVorschau, type Werteart } from './dummyDaten';
import { beispielSignatur } from './beispielSignatur';
import { seitenMasse } from './pdfjsLoader';
import { dreheKonfig, skaliereKonfig, type Drehwinkel, type SkalierFaktoren } from './skaliereKonfig';
import { dreheTabellenZelle, entdrehePunkt } from '@/infrastructure/pdf/tabellenDrehung';
import { SkalierLeiste } from './SkalierLeiste';
import { vorlageFontFamilien, type VorlageFontFamilie } from './vorlageFonts';
import { schriftKurz } from './SchriftartWahl';
import { SchriftartDialog } from './SchriftartDialog';
import type { FormularCode } from './datenKatalog';

type Masse = { w: number; h: number };
type SkalierState = {
  alt: Masse | null;
  neu: Masse | null;
  faktoren: SkalierFaktoren;
  gekoppelt: boolean;
  drehung: Drehwinkel;
};

export type Konfig = { schriftart?: Schriftart; seiten: SeitenDef[]; tabellen: Version['tabellen'] };

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
 * jeweils ersten Spalte (siehe `spaltenFuer` für seitenspezifische Spalten). Für gedrehte Tabellen
 * gibt es keinen (vertikalen) Raster-Indikator -- die Zell-Rechtecke zeigen die Lage. */
function sammleRaster(seite: SeitenDef, tabellen: Version['tabellen'], armed: Armed | null): RasterMarke[] {
  return seite.bereiche.flatMap(bereich => {
    const tabelle = tabellen[bereich.tabelle];
    if (!tabelle) return [];
    if ((bereich.drehung ?? tabelle.drehung ?? 0) !== 0) return [];
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

function sammleRechtecke(
  seite: SeitenDef,
  tabellen: Version['tabellen'],
  armed: Armed | null,
  seiteGroesse?: Masse,
): Rechteck[] {
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
    // Tabellen-Konfiguration ist aufrecht gedacht; ist die Vorlage gedreht, dreht diese Funktion die
    // fertigen Rechtecke wie der Renderer (siehe `tabellenDrehung.ts`).
    const drehung = bereich.drehung ?? tabelle.drehung ?? 0;
    const dreheRect = (rr: Rechteck): Rechteck => {
      if (drehung === 0 || !seiteGroesse || rr.x === undefined || rr.x2 === undefined) return rr;
      const g = dreheTabellenZelle({ x: rr.x, x2: rr.x2, y: rr.y, y2: rr.y2 }, drehung, seiteGroesse.w, seiteGroesse.h);
      return { ...rr, x: g.x, x2: g.x2, y: g.y, y2: g.y2 };
    };
    const tabellenRechtecke: Rechteck[] = [];

    spalten.forEach((spalte: Spalte, index) => {
      tabellenRechtecke.push({
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
    tabellenRechtecke.push({
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
      tabellenRechtecke.push({
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

    for (const rr of tabellenRechtecke) rechtecke.push(dreheRect(rr));
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
  // Anteil des Canvas an der Splitbreite in Prozent -- entspricht dem vorherigen col-lg-7 (~58%).
  const [splitAnteil, setSplitAnteil] = useState(58);
  const splitRef = useRef<HTMLDivElement>(null);

  function starteSplitZiehen(e: ReactMouseEvent<HTMLDivElement>) {
    e.preventDefault();
    const container = splitRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    function onMove(ev: MouseEvent) {
      const anteil = ((ev.clientX - rect.left) / rect.width) * 100;
      setSplitAnteil(Math.min(75, Math.max(25, anteil)));
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  // Nach dem Entfernen der letzten Seite zeigt `tab` ins Leere -- dann auf die letzte gültige.
  const seitenIndex = Math.min(tab, value.seiten.length - 1);
  const aktiveSeite = value.seiten[seitenIndex];
  // Beispielwerte samt Renderer-Kontext -- die Feldliste zeigt damit dieselben Zahlen wie das PDF.
  // Neu berechnet, sobald sich die Konfiguration oder der Seiten-Tab ändert.
  const vorschau = useMemo(
    () => erzeugeVorschau(value.tabellen, value.seiten, seitenIndex, formular),
    [value.tabellen, value.seiten, seitenIndex, formular],
  );

  const [skalier, setSkalier] = useState<SkalierState | null>(null);
  const prevDateiRef = useRef(datei);

  // Referenzgröße je Seite nachtragen (alte Konfigurationen ohne `groesse`), einmal je Datei.
  useEffect(() => {
    let abbruch = false;
    void (async () => {
      const seiten = await Promise.all(
        value.seiten.map(async s => {
          if (s.groesse) return s;
          const m = await seitenMasse(datei, s.quelle).catch(() => null);
          return m ? { ...s, groesse: m } : s;
        }),
      );
      if (!abbruch && seiten.some((s, i) => s !== value.seiten[i])) onChange({ ...value, seiten });
    })();
    return () => {
      abbruch = true;
    };
    // Bewusst nur an `datei` gehängt: läuft beim Laden und bei jedem Vorlagen-Wechsel.
  }, [datei]);

  // Vorlagen-Wechsel: Skalierfaktor aus alter (Config) und neuer (gemessener) Seitengröße vorschlagen.
  useEffect(() => {
    const prev = prevDateiRef.current;
    prevDateiRef.current = datei;
    if (!prev || prev === datei) return;
    const hatInhalt = value.seiten.some(s => Object.keys(s.felder).length > 0 || s.bereiche.length > 0);
    if (!hatInhalt) return;
    let abbruch = false;
    void (async () => {
      const quelle = value.seiten[seitenIndex]?.quelle ?? 0;
      const alt = value.seiten[seitenIndex]?.groesse ?? (await seitenMasse(prev, quelle).catch(() => null));
      const neu = await seitenMasse(datei, quelle).catch(() => null);
      if (abbruch || !alt || !neu) return;
      if (Math.abs(alt.w - neu.w) < 1 && Math.abs(alt.h - neu.h) < 1) return;
      const fx = Number((neu.w / alt.w).toFixed(4));
      const fy = Number((neu.h / alt.h).toFixed(4));
      setSkalier({
        alt,
        neu,
        faktoren: { x: fx, y: fy, dx: 0, dy: 0 },
        gekoppelt: Math.abs(fx - fy) < 0.002,
        drehung: 0,
      });
    })();
    return () => {
      abbruch = true;
    };
    // Bewusst nur an `datei` gehängt: der Vorschlag entsteht genau beim Wechsel der Datei.
  }, [datei]);

  const skalierAlt = skalier?.alt ?? aktiveSeite?.groesse ?? null;

  /**
   * Skalieren + Drehen in EINEM Bezugssystem: erst im aufrechten Layout skalieren (`x` mit `f.x`,
   * `y` mit `f.y` -- Felder UND Tabellen gleich), dann drehen, damit erst danach die Achsen tauschen.
   * `alt` für die Drehung ist die mitskalierte Seitengröße. `mitGroesse` nur beim „Anwenden": nur
   * dann wird die Referenzgröße in die Konfiguration geschrieben.
   */
  function skalierenUndDrehen(k: Konfig, mitGroesse: boolean): Konfig {
    if (!skalier) return k;
    if (skalier.drehung === 0) {
      return skaliereKonfig(k, skalier.faktoren, mitGroesse ? (skalier.neu ?? undefined) : undefined);
    }
    const skaliert = skaliereKonfig(k, skalier.faktoren);
    const alt = skalierAlt ?? { w: 0, h: 0 };
    return dreheKonfig(skaliert, skalier.drehung, {
      w: alt.w * skalier.faktoren.x,
      h: alt.h * skalier.faktoren.y,
    });
  }

  // Hängt bewusst an value/skalier/skalierAlt -- `skalierenUndDrehen` liest nur diese.
  const anzeigeKonfig = useMemo(
    () => (skalier ? skalierenUndDrehen(value, false) : value),
    [value, skalier, skalierAlt],
  );
  const anzeigeSeite = anzeigeKonfig.seiten[seitenIndex];

  async function oeffneSkalierenManuell() {
    const masse = aktiveSeite?.groesse ?? (await seitenMasse(datei, aktiveSeite?.quelle ?? 0).catch(() => null));
    setSkalier({ alt: masse, neu: null, faktoren: { x: 1, y: 1, dx: 0, dy: 0 }, gekoppelt: true, drehung: 0 });
  }

  function skalierAnwenden() {
    if (!skalier) return;
    onChange(skalierenUndDrehen(value, true));
    setSkalier(null);
  }

  const [messModus, setMessModus] = useState(false);

  // In der Vorlage eingebettete Schriftfamilien -- Testschritt, nur für die Vorschau (siehe
  // `vorlageFonts.ts`). Einmal je Datei gelesen.
  const [vorlageFonts, setVorlageFonts] = useState<VorlageFontFamilie[]>([]);
  const [unbrauchbareFonts, setUnbrauchbareFonts] = useState<string[]>([]);
  useEffect(() => {
    let abbruch = false;
    void vorlageFontFamilien(datei).then(r => {
      if (abbruch) return;
      setVorlageFonts(r.familien);
      setUnbrauchbareFonts(r.unbrauchbar);
    });
    return () => {
      abbruch = true;
    };
  }, [datei]);
  const eingebetteteFonts = useMemo(() => new Map(vorlageFonts.map(f => [f.id, f.schnitte])), [vorlageFonts]);
  const [schriftDialogOffen, setSchriftDialogOffen] = useState(false);

  /** Setzt nur die Schriftgröße des scharfgeschalteten Feldes/der Spalte -- für den Messmodus. */
  function setzeGroesseAmArmed(size: number): boolean {
    if (!armed || !aktiveSeite) return false;
    if (armed.bereich === 'feld') {
      const feld = aktiveSeite.felder[armed.key];
      if (!feld) return false;
      setzeAktiveSeite({ ...aktiveSeite, felder: { ...aktiveSeite.felder, [armed.key]: { ...feld, size } } });
      return true;
    }
    if (armed.bereich === 'spalte') {
      const tabelle = value.tabellen[armed.tabelle];
      if (!tabelle) return false;
      const bereich = aktiveSeite.bereiche.find(b => b.tabelle === armed.tabelle);
      const gesetzt = (s: Spalte, i: number) => (i === armed.index ? { ...s, size } : s);
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
      return true;
    }
    return false;
  }

  function handleGemessen(m: Messung) {
    if (setzeGroesseAmArmed(m.size)) {
      createSnackBar({
        message: `Schriftgröße ${m.size} pt übernommen (${m.fontFamily})`,
        status: 'success',
        timeout: 3000,
      });
      return;
    }
    void navigator.clipboard?.writeText(String(m.size));
    createSnackBar({
      message: `Gemessen: ${m.size} pt · ${m.fontFamily} — in die Zwischenablage kopiert`,
      status: 'info',
      timeout: 3500,
    });
  }

  function setzeSeite(index: number, seite: SeitenDef) {
    onChange({ ...value, seiten: value.seiten.map((s, i) => (i === index ? seite : s)) });
  }

  function setzeAktiveSeite(seite: SeitenDef) {
    setzeSeite(seitenIndex, seite);
  }

  function handleRechteck(r0: { x: number; y: number; x2: number; y2: number }) {
    if (!armed || !aktiveSeite) return;

    // Für ein Tabellen-Element einer gedrehten Tabelle: die auf der (gedrehten) Vorschau gezogene
    // Fläche zurück in aufrechte Tabellen-Koordinaten rechnen -- die Konfiguration bleibt aufrecht.
    let r = r0;
    if ('tabelle' in armed) {
      const t = value.tabellen[armed.tabelle];
      const b = aktiveSeite.bereiche.find(x => x.tabelle === armed.tabelle);
      const grad = b?.drehung ?? t?.drehung ?? 0;
      const g = aktiveSeite.groesse;
      if (grad !== 0 && g) {
        const [ax, ay] = entdrehePunkt(r0.x, r0.y, grad, g.w, g.h);
        const [bx, by] = entdrehePunkt(r0.x2, r0.y2, grad, g.w, g.h);
        r = { x: Math.min(ax, bx), y: Math.min(ay, by), x2: Math.max(ax, bx), y2: Math.max(ay, by) };
      }
    }

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
          layout: { template: URL.createObjectURL(datei), schriftart: value.schriftart, seiten: value.seiten },
          tabellen: value.tabellen,
          formular,
        },
        daten,
        // Sonst bliebe die Signaturfläche als einziges Element ohne Beispielwert.
        beispielSignatur(),
        undefined,
        // Eingebettete Vorlagen-Schriften nur hier durchreichen -- der Download-Pfad hat sie nicht.
        eingebetteteFonts,
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
    <div className="border rounded p-2">
      <div className="d-flex align-items-center gap-2 mb-2">
        <ul className="nav nav-pills flex-grow-1 flex-wrap">
          {value.seiten.map((s, i) => (
            <li className="nav-item" key={i}>
              <button
                type="button"
                className={`nav-link py-1 ${i === seitenIndex ? 'active' : ''}`}
                onClick={() => setTab(i)}
              >
                Seite {i + 1}
                {s.wiederholt ? ' ↻' : ''}
              </button>
            </li>
          ))}
          <li className="nav-item">
            <button
              type="button"
              className="nav-link py-1"
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
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          title="Alle Koordinaten proportional umrechnen — z.B. nach dem Wechsel auf eine Vorlage mit anderer Seitengröße"
          disabled={skalier !== null}
          onClick={() => void oeffneSkalierenManuell()}
        >
          Skalieren…
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          title="Formularweite Schriftfamilie je Schnitt wählen — mit Live-Vorschau"
          onClick={() => setSchriftDialogOffen(true)}
        >
          Schrift: {schriftKurz(value.schriftart)}
        </button>
        <button
          type="button"
          className={`btn btn-sm ${messModus ? 'btn-warning' : 'btn-outline-secondary'}`}
          title="Auf ein Textstück der PDF klicken, um dessen Schriftgröße abzulesen — z.B. an einer ausgefüllten Vorlage"
          onClick={() => setMessModus(m => !m)}
        >
          {messModus ? 'Messen beenden' : 'Schriftgröße messen'}
        </button>
        <div className="btn-group btn-group-sm">
          <button
            type="button"
            className="btn btn-primary"
            title="Fachlich passende Werte aus dem Datenkatalog — sieht aus wie ein ausgefülltes Formular"
            disabled={vorschauLaeuft !== null}
            onClick={() => void testdatenVorschau('beispiel')}
          >
            {vorschauLaeuft === 'beispiel' ? 'Erzeugt…' : 'Beispieldaten'}
          </button>
          <button
            type="button"
            className="btn btn-outline-primary"
            title="Generische Füllwerte — zeigt vor allem, welche Zelle zu welchem Eintrag gehört"
            disabled={vorschauLaeuft !== null}
            onClick={() => void testdatenVorschau('platzhalter')}
          >
            {vorschauLaeuft === 'platzhalter' ? 'Erzeugt…' : 'Platzhalter'}
          </button>
        </div>
      </div>

      {schriftDialogOffen && (
        <SchriftartDialog
          value={value.schriftart}
          vorlageFonts={vorlageFonts}
          unbrauchbareFonts={unbrauchbareFonts}
          onChange={schriftart => onChange({ ...value, schriftart })}
          onClose={() => setSchriftDialogOffen(false)}
        />
      )}

      {aktiveSeite && (
        <div className="d-flex flex-wrap align-items-center gap-3 mb-2 small">
          <div className="form-check mb-0">
            <input
              className="form-check-input"
              type="checkbox"
              id="seite-wiederholt"
              checked={Boolean(aktiveSeite.wiederholt)}
              onChange={e =>
                setzeAktiveSeite({ ...aktiveSeite, wiederholt: (e.target as HTMLInputElement).checked || undefined })
              }
            />
            <label
              className="form-check-label"
              htmlFor="seite-wiederholt"
              title="Bei Zeilenüberlauf wird genau diese Seite so oft wiederholt, wie noch Zeilen übrig sind"
            >
              Diese Seite bei Überlauf wiederholen
            </label>
          </div>

          {value.seiten.length > 1 && (
            <div className="d-flex align-items-center gap-1">
              <label className="mb-0" htmlFor="seite-kopieren">
                Einstellungen übernehmen von
              </label>
              <select
                id="seite-kopieren"
                className="form-select form-select-sm w-auto"
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

      {skalier && anzeigeSeite && (
        <SkalierLeiste
          alt={skalier.alt}
          neu={skalier.neu}
          faktoren={skalier.faktoren}
          gekoppelt={skalier.gekoppelt}
          drehung={skalier.drehung}
          onChange={next =>
            setSkalier(s => {
              if (!s) return s;
              const naechste = { ...s, ...next };
              // Drehung geändert und beide Seitenmaße bekannt: Faktoren so vorschlagen, dass das im
              // AUFRECHTEN Layout skalierte Formular nach dem Drehen genau auf die neue Seite passt
              // (bei 90/270 tauscht die Drehung anschließend x↔y, deshalb hier über Kreuz).
              if (next.drehung !== undefined && next.drehung !== s.drehung && s.alt && s.neu) {
                const quer = next.drehung === 90 || next.drehung === 270;
                const fx = Number(((quer ? s.neu.h : s.neu.w) / s.alt.w).toFixed(4));
                const fy = Number(((quer ? s.neu.w : s.neu.h) / s.alt.h).toFixed(4));
                naechste.faktoren = { ...naechste.faktoren, x: fx, y: fy };
                naechste.gekoppelt = Math.abs(fx - fy) < 0.002;
              }
              return naechste;
            })
          }
          onAnwenden={skalierAnwenden}
          onAbbrechen={() => setSkalier(null)}
        />
      )}

      {aktiveSeite && anzeigeSeite && (
        <div className="d-lg-flex gap-2" ref={splitRef}>
          <div className="mb-2 mb-lg-0" style={{ flex: `1 1 ${splitAnteil}%`, minWidth: 0 }}>
            <PdfCanvas
              datei={datei}
              seiteIndex={anzeigeSeite.quelle}
              rechtecke={sammleRechtecke(anzeigeSeite, anzeigeKonfig.tabellen, armed, anzeigeSeite.groesse)}
              raster={sammleRaster(anzeigeSeite, anzeigeKonfig.tabellen, armed)}
              scharfGeschaltet={armed !== null && !messModus && !skalier}
              messModus={messModus}
              onGemessen={handleGemessen}
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
                className="btn btn-sm btn-outline-danger mt-2"
                onClick={() => {
                  onChange({ ...value, seiten: value.seiten.filter((_, i) => i !== seitenIndex) });
                  setTab(Math.max(seitenIndex - 1, 0));
                }}
              >
                Seite {seitenIndex + 1} entfernen
              </button>
            )}
          </div>
          <div
            className="d-none d-lg-flex align-items-stretch"
            style={{ width: '10px', cursor: 'col-resize', touchAction: 'none' }}
            onMouseDown={starteSplitZiehen}
            title="Breite ziehen"
          >
            <div className="mx-auto" style={{ width: '2px', background: 'var(--bs-border-color)' }} />
          </div>
          <div style={{ flex: `1 1 ${100 - splitAnteil}%`, minWidth: 0, maxHeight: '70vh', overflowY: 'auto' }}>
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
    <details className="mt-2">
      <summary className="small fw-semibold" style={{ cursor: 'pointer' }}>
        Konfiguration als JSON (kopieren / einfügen)
      </summary>
      <textarea
        className={`form-control form-control-sm font-monospace mt-1${fehler ? ' is-invalid' : ''}`}
        style={{ fontSize: '0.7rem', minHeight: '12rem' }}
        spellCheck={false}
        value={angezeigt}
        onChange={e => {
          setEntwurf((e.target as HTMLTextAreaElement).value);
          setFehler(null);
        }}
      />
      {fehler && <div className="small text-danger mt-1">{fehler}</div>}
      <div className="d-flex gap-1 mt-1">
        <button type="button" className="btn btn-sm btn-primary" disabled={entwurf === null} onClick={uebernehmen}>
          Übernehmen
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          disabled={entwurf === null}
          onClick={() => (setEntwurf(null), setFehler(null))}
        >
          Verwerfen
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary ms-auto"
          onClick={() => void navigator.clipboard?.writeText(angezeigt)}
        >
          In Zwischenablage
        </button>
      </div>
    </details>
  );
}
