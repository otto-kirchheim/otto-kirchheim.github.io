import { alsVergleichswert, operandenFelder } from '@/infrastructure/pdf/aggregatoren';
import { loeseListenAuf } from '@/infrastructure/pdf/listen';
import type { ListenAufloesung } from '@/infrastructure/pdf/listen';
import { maxZeilenFuer } from '@/infrastructure/pdf/spaltenFuer';
import { tabellenZeilen } from '@/infrastructure/pdf/tabellenZeilen';
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
import { datenPlatzhalter, type Kontext, type TabellenZeilen } from '@/infrastructure/pdf/wert';
import { beispielWert, type FormularCode } from './datenKatalog';
import { verteile } from '@/infrastructure/pdf/verteile';

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
 * Woher die Werte kommen. `platzhalter` erzeugt generische Füllwerte („Testwert 1"), die vor allem
 * zeigen, WELCHE Zelle welcher Konfiguration entspricht. `beispiel` nimmt die im Datenkatalog
 * hinterlegten, fachlich passenden Werte -- damit sieht die Vorschau aus wie ein echtes Formular.
 */
export type Werteart = 'platzhalter' | 'beispiel';

function platzhalter(feld: Feld | Spalte, index: number, name?: string): string | number | boolean {
  // Feld-Bedingung: Vorschau soll `wenn.dann` zeigen, nicht zufällig leer bleiben.
  if ('wenn' in feld && feld.wenn?.werte?.length) return feld.wenn.werte[0]!;
  if (feld.format && ZAHL_FORMATE.includes(feld.format)) return 12.3 + index;
  if (feld.format && DATUMS_FORMATE.includes(feld.format)) return new Date(2026, 0, index + 1).toISOString();
  if (feld.format === 'uhrzeit' || feld.format === 'stunden') return `${8 + (index % 10)}:15`;
  // `monatName`/`monatNameKurz` erwarten die eigenständige `Monat`-Zahl (1-12), kein Datum --
  // sonst würde die Vorschau nur einen leeren Monatsnamen zeigen (siehe Kommentar bei FORMAT.monatName).
  if (feld.format === 'monatName' || feld.format === 'monatNameKurz') return (index % 12) + 1;
  // Bei zusammengesetzten Feldern (Text-Platzhalter) steht `name` für den einzelnen Teil, sonst für
  // das ganze Feld.
  const bezeichnung = name?.split('.').at(-1) ?? feld.label;
  return bezeichnung ? `${bezeichnung} (Test)` : `Testwert ${index + 1}`;
}

/** Katalogwert, wenn die Beispiel-Werteart gewählt ist und für den Pfad einer hinterlegt ist. */
function ausKatalog(art: Werteart, formular: FormularCode, pfad: string, index: number, quelle?: string): unknown {
  return art === 'beispiel' ? beispielWert(formular, pfad, index, quelle) : undefined;
}

/**
 * Alle Datenpfade, die eine Seite tatsächlich aus den Nutzdaten liest -- also weder berechnete
 * Aggregationen noch feste Texte. Zusammengesetzte Felder liefern je einen Pfad pro Teil.
 */
function datenpfade(seite: SeitenDef | undefined): [string, Feld][] {
  if (!seite) return [];
  return Object.entries(seite.felder).flatMap(([key, f]) => {
    // Aggregationen rechnen über die Zeilen, lesen also keinen eigenen Pfad -- gilt auch für eine
    // per Berechnung geprüfte Bedingung.
    if (f.berechnet || f.wenn?.berechnet) return [];
    // Der KEY eines Textfeldes ist frei gewählt und kein Datenpfad -- die Pfade stecken in den
    // Platzhaltern des Textes (auch zusammengesetzte Felder laufen darüber). Genau die befüllen,
    // sonst bliebe z.B. `Zulagen {Monat}/{Jahr}` in der Vorschau als "Zulagen /" stehen. `{seite}`/
    // `{heute}` bedient der Kontext.
    if (f.text !== undefined) return datenPlatzhalter(f.text).map(pfad => [pfad, f] as [string, Feld]);
    if (f.quellen) return f.quellen.map(pfad => [pfad, f] as [string, Feld]);
    if (f.wenn?.feld) return [[f.wenn.feld, f] as [string, Feld]];
    return [[key, f] as [string, Feld]];
  });
}

/**
 * Dummy-Wert für einen Operanden einer Zeilenrechnung. `stelle` ist die Position im Operandenfeld:
 * Zeit-Operatoren rechnen `erster − folgende`, deshalb bekommt die erste Stelle den SPÄTEREN
 * Zeitpunkt — sonst zeigt die Vorschau überall eine Dauer von 0 oder negative Werte.
 */
function operandPlatzhalter(op: ZeilenOpName, index: number, stelle: number): string | number {
  if (op === 'zeitdifferenz') return `${Math.max(0, 20 - stelle * 3) + (index % 3)}:00`;
  if (op === 'zeitspanne')
    return new Date(Date.UTC(2026, 2, 2 + index * 2 + Math.max(0, 3 - stelle), 8, 0)).toISOString();
  return index + 2;
}

/**
 * Berechnete Spalten haben keinen eigenen Datenwert -- ihre Operanden brauchen welche, sonst rechnet
 * die Vorschau immer mit 0. Rekursiv, da ein Operand selbst eine Zwischenrechnung sein darf; der
 * Wert-Typ richtet sich nach dem Operator des Knotens, in dem der Operand steht.
 */
function fuelleOperanden(berechnet: ZeilenBerechnet, zeile: Zeile, index: number): void {
  berechnet.operanden.forEach((operand, stelle) => {
    if (typeof operand === 'number') return;
    if (typeof operand === 'object') return fuelleOperanden(operand, zeile, index);
    zeile[operand] ??= operandPlatzhalter(berechnet.op, index, stelle);
  });
}

/**
 * Wie viele Zeilen eine Tabelle braucht, damit die Vorschau ihren Seitenüberlauf zeigt: den Platz
 * aller Seiten plus eine Zeile extra, sobald eine Seite wiederholt wird. Ohne wiederholte Seite
 * bleibt es bei der Gesamtkapazität, sonst würde `verteile()` werfen.
 */
function zeilenBedarf(name: string, seiten: SeitenDef[], tabelle: TabellenDef): number {
  const platz = (seite: SeitenDef) => {
    const bereich = seite.bereiche.find(b => b.tabelle === name);
    return bereich ? maxZeilenFuer(bereich, tabelle) : 0;
  };
  const gesamt = seiten.reduce((summe, seite) => summe + platz(seite), 0);
  const wiederholbar = seiten.some(seite => seite.wiederholt && platz(seite) > 0);
  return wiederholbar ? gesamt + 1 : gesamt;
}

/**
 * Spalten der Tabelle plus die NUR auf einer Seite gesetzten -- sonst bliebe eine dort definierte
 * Spalte ohne Wert. Bewusst nicht über `spaltenFuer()`: das liefert für Seiten ohne eigenes Raster
 * erneut die Tabellenspalten, wodurch jede doppelt gezählt würde (die Anzahl bestimmt, wie viele
 * Listen-Schlüssel die Vorschau erzeugt).
 */
function alleSpalten(name: string, tabelle: TabellenDef, seiten: SeitenDef[]): Spalte[] {
  const jeSeite = seiten.flatMap(seite => seite.bereiche.find(b => b.tabelle === name)?.spalten ?? []);
  return [...tabelle.spalten, ...jeSeite];
}

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
        // Erst die Operanden aus dem Katalog belegen (siehe `spalte.berechnet` unten), sonst rechnet
        // die Bedingung immer mit dem generischen Zeitwert statt dem fachlich passenden Beispiel.
        for (const pfad of operandenFelder(spalte.wenn.berechnet)) {
          const wert = ausKatalog(art, formular, pfad, index, tabelle.quelle);
          if (wert !== undefined) zeile[pfad] ??= wert as string | number;
        }
        fuelleOperanden(spalte.wenn.berechnet, zeile, index);
      } else if (spalte.wenn.feld && spalte.wenn.bereich) {
        // `bereich` statt `werte` (z.B. Boolean-Ankreuz-Quellen wie `Wohnung8bis14` über
        // `{ von: 1, bis: 2 }`, siehe `abgeleiteteWerte.ts`): `von`/`bis` sind selbst kein gültiger
        // Zeilenwert (Uhrzeit-Strings, `"1"` etc.), deshalb über `alsVergleichswert` in eine Zahl
        // umrechnen -- diese Zahl liest `trifftBedingung` beim Vergleich unverändert zurück. `von`
        // selbst liegt IMMER im Bereich (einschließlich), `bis` NIE (ausschließlich) -- ohne diesen
        // Umweg blieb das Feld für jede Zeile leer/„0", weil ein rohes `''`/`undefined` nie in
        // einem `bereich` mit `von >= 1` landet und die Vorschau nie den Treffer-Fall zeigte.
        zeile[spalte.wenn.feld] ??=
          index % 2 === 0 ? alsVergleichswert(spalte.wenn.bereich.von) : alsVergleichswert(spalte.wenn.bereich.bis);
      } else if (index % 2 === 0 && spalte.wenn.feld) {
        // Jede zweite Zeile erfüllt die Bedingung, damit man in der Vorschau beide Fälle sieht.
        zeile[spalte.wenn.feld] ??= spalte.wenn.werte?.[0] ?? '';
      }
    } else if (spalte.berechnet) {
      // Erst die Operanden aus dem Katalog belegen, sonst gewinnt der generische Zeitwert per `??=`.
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
  // Der Tabellenfilter muss zutreffen, sonst wäre die Tabelle in der Vorschau leer.
  if (tabelle.filter) zeile[tabelle.filter.feld] = tabelle.filter.werte[0] ?? '';
  macheListen(tabelle, spalten, zeile, index);
  return zeile;
}

/**
 * Füllt die Listenfelder einer Zeile (EZ: `Zulagen`), aus denen die dynamischen Spalten entstehen.
 * Erzeugt genau so viele Schlüssel, wie Plätze konfiguriert sind — sonst bliebe eine Spalte in der
 * Vorschau unbeschriftet, obwohl sie im Ernstfall belegt wäre. Die erste Zeile trägt alle Schlüssel
 * (nur so ist jeder Platz vergeben), spätere Zeilen lassen einzelne aus, damit auch der Normalfall
 * „diese Zulage gab es an dem Tag nicht" sichtbar wird.
 *
 * Mehrere Gruppen dürfen sich dieselbe `quelle` teilen (bei EZ speisen Erschwerniszulage,
 * Leistungsprämie/Fahrentschädigung UND Ganzkörperreinigung alle dasselbe Zeilenfeld `Zulagen`) --
 * deshalb je Quelle sammeln statt direkt in `zeile` zu schreiben, sonst überschreibt die letzte
 * verarbeitete Gruppe die Beispiele der vorherigen komplett.
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
 * Testdaten für die Vorschau im FormularEditor. Je Tabelle genug Zeilen, um ihren Bereich auf der
 * ersten Seite UND (falls konfiguriert) auf der Folgeseite zu überschreiten, damit `verteile()`
 * den Seitenumbruch tatsächlich zeigt. Ohne Folgeseiten-Bereich bleibt es bei genau der Kapazität
 * der ersten Seite, sonst würde `build()` werfen.
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

  // Mehrere Tabellen dürfen sich eine Quelle teilen (nur der Filter trennt sie) -- die Zeilen
  // deshalb je Quelle sammeln statt sie gegenseitig zu überschreiben.
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

function verbinde(a: TabellenZeilen, b: TabellenZeilen): TabellenZeilen {
  const zusammen: TabellenZeilen = { ...a };
  for (const [name, zeilen] of Object.entries(b)) zusammen[name] = [...(zusammen[name] ?? []), ...zeilen];
  return zusammen;
}

/**
 * Beispieldaten PLUS den Kontext, den der Renderer benutzt -- damit die Werte-Vorschau im Editor
 * dieselben Zahlen zeigt wie das erzeugte PDF, insbesondere Summen (`$alle`/`$seite`) und den
 * Übertrag (`$bisher`). Ohne echten Kontext blieben genau diese Felder auf 0 stehen.
 *
 * Die Zeilen werden dafür über `verteile()` auf Seiten aufgeteilt und die zum angezeigten Tab
 * passende Seite ausgewählt: auf „weitere Seite" ist `$bisher` dadurch gefüllt, der Übertrag also
 * sichtbar. Wirft `verteile()` (unfertige Konfiguration während des Bearbeitens), fällt die
 * Vorschau auf eine einzelne Seite zurück, statt die Feldliste unbrauchbar zu machen.
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
  // Gleiche Platzvergabe wie im Renderer, damit die Werte-Vorschau dieselben Spaltenüberschriften
  // zeigt wie das erzeugte PDF.
  const listen: Record<string, ListenAufloesung> = {};
  for (const [name, def] of Object.entries(tabellen)) {
    const aufgeloest = loeseListenAuf(def, alle[name] ?? []);
    if (aufgeloest) listen[name] = aufgeloest;
  }

  try {
    const bloecke = verteile(alle, { template: '', seiten }, tabellen);
    // Der Editor-Tab zeigt eine KONFIGURIERTE Seite; im Ergebnis kann sie mehrfach vorkommen
    // (wiederholte Seite) oder fehlen. Der erste Block dieser Seitendefinition ist der passende.
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
        // Vorschau zeigt den informativeren Fall: NICHT "Digital", sonst bliebe ein
        // `nurBeiSignatur`-Feld (Unterschriftsdatum) im Editor immer leer und ließe sich nicht
        // positionieren/prüfen.
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
