import { alsVergleichswert, operandenFelder } from '@/shared/lib/pdf/aggregatoren';
import { loeseListenAuf } from '@/shared/lib/pdf/listen';
import type { ListenAufloesung } from '@/shared/lib/pdf/listen';
import { maxZeilenFuer } from '@/shared/lib/pdf/spaltenFuer';
import { tabellenZeilen } from '@/shared/lib/pdf/tabellenZeilen';
import type {
  Daten,
  Feld,
  SeitenDef,
  Spalte,
  TabellenDef,
  Zeile,
  ZeilenBerechnet,
  ZeilenOpName,
} from '@otto-kirchheim/nebengeld-shared';
import { datenPlatzhalter, type Kontext, type TabellenZeilen } from '@/shared/lib/pdf/wert';
import { beispielWert, type FormularCode } from './datenKatalog';
import { verteile } from '@/shared/lib/pdf/verteile';

/**
 * Schreibt einen Wert an einen Punkt-Pfad im Datenobjekt.
 *
 * @param ziel - Datenobjekt, das verändert wird.
 * @param pfad - Punkt-getrennter Pfad, fehlende Zwischenknoten werden angelegt.
 * @param wert - Zu setzender Wert.
 */
function setzePfad(ziel: Daten, pfad: string, wert: unknown): void {
  const teile = pfad.split('.');
  let knoten = ziel as Record<string, unknown>;
  for (const teil of teile.slice(0, -1)) {
    if (typeof knoten[teil] !== 'object' || knoten[teil] === null) knoten[teil] = {};
    knoten = knoten[teil] as Record<string, unknown>;
  }
  knoten[teile.at(-1)!] = wert;
}

const DATUMS_FORMATE = ['datum', 'datumKurz', 'tag', 'wochentag', 'monatJahr'];
const ZAHL_FORMATE = ['waehrung', 'zahl', 'ganzzahl'];

/**
 * Woher die Werte kommen. `platzhalter`: generische Füllwerte ("Testwert 1"), die zeigen, WELCHE Zelle
 * welcher Konfiguration entspricht. `beispiel`: fachlich passende Werte aus dem Datenkatalog, die
 * Vorschau sieht wie ein echtes Formular aus.
 */
export type Werteart = 'platzhalter' | 'beispiel';

/**
 * Erzeugt einen generischen Füllwert passend zum `format` des Feldes.
 *
 * @param feld - Feld oder Spalte (Format, Label, Bedingung bestimmen den Wert).
 * @param index - Zeilennummer, lässt Zahlen und Daten variieren.
 * @param name - Datenpfad bei zusammengesetzten Feldern.
 * @returns Passender Füllwert.
 */
function platzhalter(feld: Feld | Spalte, index: number, name?: string): string | number | boolean {
  // Feld-Bedingung: die Vorschau soll `wenn.dann` zeigen.
  if ('wenn' in feld && feld.wenn?.werte?.length) return feld.wenn.werte[0]!;
  if (feld.format && ZAHL_FORMATE.includes(feld.format)) return 12.3 + index;
  if (feld.format && DATUMS_FORMATE.includes(feld.format)) return new Date(2026, 0, index + 1).toISOString();
  if (feld.format === 'uhrzeit' || feld.format === 'stunden') return `${8 + (index % 10)}:15`;
  // `monatName`/`monatNameKurz` erwarten die `Monat`-Zahl (1-12), kein Datum, sonst bliebe der Name leer
  // (siehe `FORMAT.monatName`).
  if (feld.format === 'monatName' || feld.format === 'monatNameKurz') return (index % 12) + 1;
  // Bei zusammengesetzten Feldern (Text-Platzhalter) steht `name` für den Teil, sonst für das Feld.
  const bezeichnung = name?.split('.').at(-1) ?? feld.label;
  return bezeichnung ? `${bezeichnung} (Test)` : `Testwert ${index + 1}`;
}

/**
 * Katalogwert, wenn die Beispiel-Werteart gewählt ist und der Pfad einen hat.
 *
 * @param art - Werteart; nur `beispiel` liest den Katalog.
 * @param formular - Formularcode.
 * @param pfad - Datenpfad.
 * @param index - Zeilennummer.
 * @param quelle - Zeilenquelle bei mehrdeutigen Pfaden.
 * @returns Der Katalogwert, sonst `undefined`.
 */
function ausKatalog(art: Werteart, formular: FormularCode, pfad: string, index: number, quelle?: string): unknown {
  return art === 'beispiel' ? beispielWert(formular, pfad, index, quelle) : undefined;
}

/**
 * Alle Datenpfade, die eine Seite aus den Nutzdaten liest (ohne Aggregationen und feste Texte);
 * zusammengesetzte Felder liefern einen Pfad je Teil.
 *
 * @param seite - Seitendefinition, `undefined` ergibt eine leere Liste.
 * @returns Paare aus Datenpfad und zugehörigem Feld.
 */
function datenpfade(seite: SeitenDef | undefined): [string, Feld][] {
  if (!seite) return [];
  return Object.entries(seite.felder).flatMap(([key, f]) => {
    // Aggregationen rechnen über Zeilen und lesen keinen eigenen Pfad, auch mit `berechnet`-Bedingung.
    if (f.berechnet || f.wenn?.berechnet) return [];
    // Der KEY eines Textfeldes ist frei gewählt; die Pfade stecken in den Platzhaltern des Textes (auch bei
    // zusammengesetzten Feldern) -- sonst bliebe `Zulagen {Monat}/{Jahr}` als "Zulagen /" stehen.
    // `{seite}`/`{heute}` bedient der Kontext.
    if (f.text !== undefined) return datenPlatzhalter(f.text).map(pfad => [pfad, f] as [string, Feld]);
    if (f.quellen) return f.quellen.map(pfad => [pfad, f] as [string, Feld]);
    if (f.wenn?.feld) return [[f.wenn.feld, f] as [string, Feld]];
    return [[key, f] as [string, Feld]];
  });
}

/**
 * Dummy-Wert für einen Operanden einer Zeilenrechnung. `stelle` ist die Position im Operandenfeld:
 * Zeit-Operatoren rechnen `erster − folgende`, die erste Stelle bekommt daher den SPÄTEREN Zeitpunkt,
 * sonst zeigt die Vorschau Dauer 0 oder negativ.
 *
 * @param op - Operator des umgebenden Knotens.
 * @param index - Zeilennummer.
 * @param stelle - Position im Operandenfeld.
 * @returns Uhrzeit, Zeitstempel oder Zahl, je nach Operator.
 */
function operandPlatzhalter(op: ZeilenOpName, index: number, stelle: number): string | number {
  if (op === 'zeitdifferenz') return `${Math.max(0, 20 - stelle * 3) + (index % 3)}:00`;
  if (op === 'zeitspanne')
    return new Date(Date.UTC(2026, 2, 2 + index * 2 + Math.max(0, 3 - stelle), 8, 0)).toISOString();
  return index + 2;
}

/**
 * Berechnete Spalten haben keinen eigenen Wert, ihre Operanden brauchen welche (sonst immer 0).
 * Rekursiv; der Wert-Typ folgt dem Operator des umgebenden Knotens.
 *
 * @param berechnet - Rechnung, deren Operanden belegt werden.
 * @param zeile - Zeile, die um fehlende Operandenfelder ergänzt wird.
 * @param index - Zeilennummer.
 */
function fuelleOperanden(berechnet: ZeilenBerechnet, zeile: Zeile, index: number): void {
  berechnet.operanden.forEach((operand, stelle) => {
    if (typeof operand === 'number') return;
    if (typeof operand === 'object') return fuelleOperanden(operand, zeile, index);
    zeile[operand] ??= operandPlatzhalter(berechnet.op, index, stelle);
  });
}

/**
 * Zeilen, die eine Tabelle für den Seitenüberlauf der Vorschau braucht: Platz aller Seiten plus eine
 * Zeile bei wiederholter Seite. Ohne wiederholte Seite genau die Gesamtkapazität, sonst wirft `verteile()`.
 *
 * @param name - Key der Tabelle.
 * @param seiten - Alle Seitendefinitionen.
 * @param tabelle - Definition der Tabelle.
 * @returns Anzahl benötigter Zeilen.
 */
function zeilenBedarf(name: string, seiten: SeitenDef[], tabelle: TabellenDef): number {
  /**
   * Zeilenplatz der Tabelle auf einer Seite.
   *
   * @param seite - Seitendefinition.
   * @returns Zeilenkapazität der Tabelle auf dieser Seite, `0` ohne Bereich.
   */
  const platz = (seite: SeitenDef) => {
    const bereich = seite.bereiche.find(b => b.tabelle === name);
    return bereich ? maxZeilenFuer(bereich, tabelle) : 0;
  };
  const gesamt = seiten.reduce((summe, seite) => summe + platz(seite), 0);
  const wiederholbar = seiten.some(seite => seite.wiederholt && platz(seite) > 0);
  return wiederholbar ? gesamt + 1 : gesamt;
}

/**
 * Spalten der Tabelle plus die nur auf einer Seite gesetzten. Nicht über `spaltenFuer()`: das liefert
 * für Seiten ohne eigenes Raster erneut die Tabellenspalten und zählte jede doppelt (die Anzahl
 * bestimmt die Zahl der Listen-Schlüssel).
 *
 * @param name - Key der Tabelle.
 * @param tabelle - Definition der Tabelle.
 * @param seiten - Alle Seitendefinitionen.
 * @returns Tabellenspalten plus seitenspezifische Spalten.
 */
function alleSpalten(name: string, tabelle: TabellenDef, seiten: SeitenDef[]): Spalte[] {
  const jeSeite = seiten.flatMap(seite => seite.bereiche.find(b => b.tabelle === name)?.spalten ?? []);
  return [...tabelle.spalten, ...jeSeite];
}

/**
 * Erzeugt eine Datenzeile mit Werten für alle Spalten (auch Bedingungen, Rechnungen, Listen) und passend zum Tabellenfilter.
 *
 * @param tabelle - Definition der Tabelle (Filter).
 * @param spalten - Alle Spalten der Tabelle.
 * @param index - Zeilennummer.
 * @param art - Werteart.
 * @param formular - Formularcode.
 * @returns Eine befüllte Datenzeile.
 */
function macheZeile(
  tabelle: TabellenDef,
  spalten: Spalte[],
  index: number,
  art: Werteart,
  formular: FormularCode,
): Zeile {
  const zeile: Zeile = {};
  for (const spalte of spalten) {
    if (spalte.wenn) {
      if (spalte.wenn.berechnet) {
        // Operanden zuerst aus dem Katalog belegen (siehe `spalte.berechnet`), sonst rechnet die Bedingung mit
        // dem generischen Zeitwert.
        for (const pfad of operandenFelder(spalte.wenn.berechnet)) {
          const wert = ausKatalog(art, formular, pfad, index, tabelle.quelle);
          if (wert !== undefined) zeile[pfad] ??= wert as string | number;
        }
        fuelleOperanden(spalte.wenn.berechnet, zeile, index);
      } else if (spalte.wenn.feld && spalte.wenn.bereich) {
        // `bereich` statt `werte` (z.B. `Wohnung8bis14` über `{ von: 1, bis: 2 }`): `von`/`bis` sind selbst kein
        // gültiger Zeilenwert, daher per `alsVergleichswert` in eine Zahl umrechnen. `von` liegt IMMER im
        // Bereich, `bis` NIE (ausschließlich): gerade Zeilen treffen, ungerade nicht -- beide Fälle sichtbar.
        zeile[spalte.wenn.feld] ??=
          index % 2 === 0 ? alsVergleichswert(spalte.wenn.bereich.von) : alsVergleichswert(spalte.wenn.bereich.bis);
      } else if (index % 2 === 0 && spalte.wenn.feld) {
        // Jede zweite Zeile erfüllt die Bedingung, damit beide Fälle sichtbar sind.
        zeile[spalte.wenn.feld] ??= spalte.wenn.werte?.[0] ?? '';
      }
    } else if (spalte.berechnet) {
      // Operanden zuerst aus dem Katalog belegen, sonst gewinnt der generische Zeitwert per `??=`.
      for (const pfad of operandenFelder(spalte.berechnet)) {
        const wert = ausKatalog(art, formular, pfad, index, tabelle.quelle);
        if (wert !== undefined) zeile[pfad] ??= wert as string | number;
      }
      fuelleOperanden(spalte.berechnet, zeile, index);
    } else {
      zeile[spalte.key] =
        (ausKatalog(art, formular, spalte.key, index, tabelle.quelle) as string | number) ??
        platzhalter(spalte, index, spalte.key);
    }
  }
  // Der Tabellenfilter muss zutreffen, sonst bliebe die Tabelle leer.
  if (tabelle.filter) zeile[tabelle.filter.feld] = tabelle.filter.werte[0] ?? '';
  macheListen(tabelle, spalten, zeile, index);
  return zeile;
}

/**
 * Füllt die Listenfelder einer Zeile (EZ: `Zulagen`), aus denen die dynamischen Spalten entstehen. So
 * viele Schlüssel wie Plätze konfiguriert sind, sonst bliebe eine Spalte unbeschriftet. Die erste Zeile
 * trägt alle Schlüssel, spätere lassen einzelne aus ("Zulage gab es an dem Tag nicht").
 *
 * Mehrere Gruppen dürfen dieselbe `quelle` teilen (bei EZ speisen mehrere `Zulagen`), daher je Quelle
 * sammeln, sonst überschreibt die letzte Gruppe die Beispiele der vorherigen.
 *
 * @param tabelle - Definition der Tabelle (Listen-Gruppen).
 * @param spalten - Alle Spalten der Tabelle (Zahl der Listenplätze).
 * @param zeile - Zeile, die um die Listenfelder ergänzt wird.
 * @param index - Zeilennummer.
 */
function macheListen(tabelle: TabellenDef, spalten: Spalte[], zeile: Zeile, index: number): void {
  const jeQuelle = new Map<string, unknown[]>();
  for (const [name, gruppe] of Object.entries(tabelle.listen ?? {})) {
    const plaetze = spalten.filter(sp => sp.listenPlatz?.gruppe === name).length;
    const anzahl = Math.max(plaetze, 1);
    const schluessel = (gruppe.auswahl ?? Array.from({ length: anzahl }, (_, i) => `K${i + 1}`)).slice(0, anzahl);
    const eintraege = schluessel
      .filter((_, i) => index === 0 || (index + i) % 3 !== 0)
      .map((k, i) => ({ [gruppe.schluessel]: k, [gruppe.wert]: 1 + ((index + i) % 4) }));
    jeQuelle.set(gruppe.quelle, [...(jeQuelle.get(gruppe.quelle) ?? []), ...eintraege]);
  }
  for (const [quelle, eintraege] of jeQuelle) zeile[quelle] = eintraege;
}

/**
 * Testdaten für die Vorschau: je Tabelle genug Zeilen, um ihren Bereich auf der ersten und (falls
 * konfiguriert) der Folgeseite zu überschreiten, damit `verteile()` den Umbruch zeigt. Ohne
 * Folgeseiten-Bereich genau die Kapazität der ersten Seite, sonst wirft `build()`.
 *
 * @param tabellen - Tabellendefinitionen je Key.
 * @param seiten - Seitendefinitionen.
 * @param formular - Formularcode.
 * @param art - Werteart (Default `platzhalter`).
 * @returns Nutzdaten mit Feldwerten und Zeilen je Quelle.
 */
export function erzeugeDummyDaten(
  tabellen: Record<string, TabellenDef>,
  seiten: SeitenDef[],
  formular: FormularCode,
  art: Werteart = 'platzhalter',
): Daten {
  const daten: Daten = {};

  for (const [pfad, feld] of seiten.flatMap(seite => datenpfade(seite))) {
    setzePfad(daten, pfad, ausKatalog(art, formular, pfad, 0) ?? platzhalter(feld, 0, pfad));
  }

  // Mehrere Tabellen dürfen eine Quelle teilen (nur der Filter trennt sie): Zeilen je Quelle sammeln.
  const jeQuelle = new Map<string, Zeile[]>();
  for (const [name, tabelle] of Object.entries(tabellen)) {
    const anzahl = Math.max(zeilenBedarf(name, seiten, tabelle), 1);
    const spalten = alleSpalten(name, tabelle, seiten);
    const zeilen = Array.from({ length: anzahl }, (_, i) => macheZeile(tabelle, spalten, i, art, formular));
    jeQuelle.set(tabelle.quelle, [...(jeQuelle.get(tabelle.quelle) ?? []), ...zeilen]);
  }
  for (const [quelle, zeilen] of jeQuelle) setzePfad(daten, quelle, zeilen);

  return daten;
}

/**
 * Hängt die Zeilen je Tabelle von `b` an die von `a`.
 *
 * @param a - Zeilen je Tabelle (Basis).
 * @param b - Zeilen je Tabelle, die angehängt werden.
 * @returns Neues Objekt; die Eingaben bleiben unverändert.
 */
function verbinde(a: TabellenZeilen, b: TabellenZeilen): TabellenZeilen {
  const zusammen: TabellenZeilen = { ...a };
  for (const [name, zeilen] of Object.entries(b)) zusammen[name] = [...(zusammen[name] ?? []), ...zeilen];
  return zusammen;
}

/**
 * Beispieldaten PLUS den Renderer-Kontext, damit die Werte-Vorschau dieselben Zahlen zeigt wie das PDF
 * (Summen `$alle`/`$seite`, Übertrag `$bisher`).
 *
 * Die Zeilen werden per `verteile()` auf Seiten aufgeteilt und die zum Tab passende Seite gewählt. Wirft
 * `verteile()` (unfertige Konfiguration), fällt die Vorschau auf eine einzelne Seite zurück.
 *
 * @param tabellen - Tabellendefinitionen je Key.
 * @param seiten - Seitendefinitionen.
 * @param seitenIndex - Index der im Editor gezeigten Seite.
 * @param formular - Formularcode.
 * @param art - Werteart (Default `beispiel`).
 * @returns Nutzdaten und Renderer-Kontext.
 */
export function erzeugeVorschau(
  tabellen: Record<string, TabellenDef>,
  seiten: SeitenDef[],
  seitenIndex: number,
  formular: FormularCode,
  art: Werteart = 'beispiel',
): { daten: Daten; kontext: Kontext } {
  const daten = erzeugeDummyDaten(tabellen, seiten, formular, art);
  const alle: TabellenZeilen = Object.fromEntries(
    Object.entries(tabellen).map(([name, def]) => [name, tabellenZeilen(daten, def)]),
  );
  const heute = new Date();
  // Gleiche Platzvergabe wie im Renderer, damit die Spaltenüberschriften zum PDF passen.
  const listen: Record<string, ListenAufloesung> = {};
  for (const [name, def] of Object.entries(tabellen)) {
    const aufgeloest = loeseListenAuf(def, alle[name] ?? []);
    if (aufgeloest) listen[name] = aufgeloest;
  }

  try {
    const bloecke = verteile(alle, { template: '', seiten }, tabellen);
    // Der Tab zeigt eine KONFIGURIERTE Seite, die im Ergebnis mehrfach vorkommen (wiederholt) oder
    // fehlen kann. Der erste Block dieser Seitendefinition passt.
    const gefunden = bloecke.findIndex(b => b.def === seiten[seitenIndex]);
    const index = gefunden >= 0 ? gefunden : Math.min(seitenIndex, bloecke.length - 1);
    const block = bloecke[index];
    if (!block) throw new Error('keine Seite');
    const bisher = bloecke.slice(0, index).reduce<TabellenZeilen>((s, b) => verbinde(s, b.zeilen), {});
    return {
      daten,
      kontext: {
        $seite: block.zeilen,
        $bisher: bisher,
        $laufend: verbinde(bisher, block.zeilen),
        $alle: alle,
        seite: index + 1,
        seiten: bloecke.length,
        heute,
        listen,
        // NICHT "Digital": sonst bliebe ein `nurBeiSignatur`-Feld (Unterschriftsdatum) im Editor leer und
        // ließe sich nicht positionieren.
        digitaleSignatur: false,
      },
    };
  } catch {
    return {
      daten,
      kontext: {
        $seite: alle,
        $bisher: {},
        $laufend: alle,
        $alle: alle,
        seite: 1,
        seiten: 1,
        heute,
        listen,
        digitaleSignatur: false,
      },
    };
  }
}
