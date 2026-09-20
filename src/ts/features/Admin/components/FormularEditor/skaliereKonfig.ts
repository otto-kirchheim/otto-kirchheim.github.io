import type { Drehung } from '@otto-kirchheim/nebengeld-shared';
import type { Konfig } from './FormularEditor';

/**
 * Transformation für einen Vorlagen-Wechsel: jede Koordinate wird `wert * faktor + versatz`.
 * `x`/`y` sind die Skalierfaktoren (aus den gemessenen Seitenmaßen `neu ÷ alt` vorbelegt),
 * `dx`/`dy` ein fester Versatz in PDF-Punkten (nötig, wenn dieselbe Vorlage andere Ränder hat).
 * Schriftgröße und Tabellen-Zeilenhöhe sind Skalare -- sie folgen dem `y`-Faktor, ohne Versatz.
 */
export type SkalierFaktoren = { x: number; y: number; dx: number; dy: number };

/** Die von der Skalierung berührten Zahlenfelder von `Feld` und `Spalte`. */
interface Geometrie {
  x?: number;
  x2?: number;
  y?: number;
  y2?: number;
  size?: number;
  maxBreite?: number;
}

/**
 * Rundet auf 2 Nachkommastellen, wie die Koordinaten-Eingaben im Editor (`ZahlFeld`).
 *
 * @param n - Zu rundende Zahl.
 * @returns Gerundeter Wert.
 */
function r(n: number): number {
  return Number(n.toFixed(2));
}

/**
 * Skaliert die vorhandenen Geometrie-Felder einer Zelle in place: x/x2/maxBreite mit dem x-Faktor,
 * y/y2/size mit dem y-Faktor, Koordinaten zusätzlich mit Versatz.
 *
 * @param z - Feld oder Spalte; wird verändert.
 * @param f - Skalierfaktoren und Versatz.
 */
function skaliereZelle<T extends Geometrie>(z: T, f: SkalierFaktoren): void {
  if (z.x !== undefined) z.x = r(z.x * f.x + f.dx);
  if (z.x2 !== undefined) z.x2 = r(z.x2 * f.x + f.dx);
  if (z.y !== undefined) z.y = r(z.y * f.y + f.dy);
  if (z.y2 !== undefined) z.y2 = r(z.y2 * f.y + f.dy);
  if (z.size !== undefined) z.size = r(z.size * f.y);
  if (z.maxBreite !== undefined) z.maxBreite = r(z.maxBreite * f.x);
}

/**
 * Schreibt alle Geometrie-Werte der Konfiguration um, damit die Platzierung auf einer Vorlage mit
 * anderer Seitengröße bzw. anderen Rändern wieder passt. Reine Funktion -- die Eingabe bleibt
 * unberührt (tiefe Kopie).
 *
 * @param k - Konfiguration vor dem Vorlagen-Wechsel.
 * @param f - Skalierfaktoren und Versatz.
 * @param neueGroesse - Seitenmaße der neuen Vorlage in Punkten; aktualisiert die je Seite gespeicherte Referenzgröße.
 * @returns Skalierte Kopie der Konfiguration.
 */
export function skaliereKonfig(k: Konfig, f: SkalierFaktoren, neueGroesse?: { w: number; h: number }): Konfig {
  const kopie: Konfig = structuredClone(k);

  for (const seite of kopie.seiten) {
    if (neueGroesse) seite.groesse = { w: r(neueGroesse.w), h: r(neueGroesse.h) };

    for (const feld of Object.values(seite.felder)) skaliereZelle(feld, f);

    if (seite.signaturBild) {
      seite.signaturBild.x = r(seite.signaturBild.x * f.x + f.dx);
      seite.signaturBild.y = r(seite.signaturBild.y * f.y + f.dy);
      seite.signaturBild.w = r(seite.signaturBild.w * f.x);
      seite.signaturBild.h = r(seite.signaturBild.h * f.y);
    }

    for (const bereich of seite.bereiche) {
      if (bereich.startY !== undefined) bereich.startY = r(bereich.startY * f.y + f.dy);
      if (bereich.hoehe !== undefined) bereich.hoehe = r(bereich.hoehe * f.y);
      for (const sp of bereich.spalten ?? []) skaliereZelle(sp, f);
      for (const platz of bereich.sonderzeilen ?? []) {
        platz.y = r(platz.y * f.y + f.dy);
        if (platz.y2 !== undefined) platz.y2 = r(platz.y2 * f.y + f.dy);
      }
    }
  }

  for (const tabelle of Object.values(kopie.tabellen)) {
    tabelle.startY = r(tabelle.startY * f.y + f.dy);
    tabelle.hoehe = r(tabelle.hoehe * f.y);
    for (const sp of tabelle.spalten) skaliereZelle(sp, f);
    for (const sonderzeile of Object.values(tabelle.sonderzeilen ?? {})) {
      for (const zelle of sonderzeile.zellen) {
        if (zelle.size !== undefined) zelle.size = r(zelle.size * f.y);
      }
    }
  }

  return kopie;
}

export type Drehwinkel = 0 | 90 | 180 | 270;

/**
 * Dreht das gesamte Formular-Layout um `grad` (gegen den Uhrzeigersinn) -- für den Fall, dass die
 * neue Vorlage dasselbe Formular um 90°/180°/270° gedreht zeigt.
 *
 * `felder` und `signaturBild` werden konkret umgerechnet (feste x/y), die `drehung` jeder Zelle
 * mitgezählt, die Referenzgröße (`groesse`) getauscht. Für Datentabellen bleibt die Konfiguration
 * aufrecht -- nur `TabellenDef.drehung` (bzw. `TabellenBereich.drehung`) wird gesetzt; Renderer und
 * Editor-Vorschau drehen jede fertige Tabellenzelle um den Seitenmittelpunkt (siehe
 * `infrastructure/pdf/tabellenDrehung.ts`). Reine Funktion (tiefe Kopie).
 *
 * @param k - Konfiguration vor der Drehung.
 * @param grad - Drehwinkel gegen den Uhrzeigersinn; `0` liefert nur die Kopie.
 * @param alt - Seitenmaße in Punkten VOR der Drehung.
 * @returns Gedrehte Kopie der Konfiguration.
 */
export function dreheKonfig(k: Konfig, grad: Drehwinkel, alt: { w: number; h: number }): Konfig {
  const kopie: Konfig = structuredClone(k);
  if (grad === 0) return kopie;

  /**
   * Dreht einen Punkt aus dem alten in das neue Seitenkoordinatensystem.
   *
   * @param x - x im alten System.
   * @param y - y im alten System.
   * @returns Neues Paar `[x, y]`, auf 2 Nachkommastellen gerundet.
   */
  const dreh = (x: number, y: number): [number, number] => {
    if (grad === 90) return [r(alt.h - y), r(x)];
    if (grad === 180) return [r(alt.w - x), r(alt.h - y)];
    return [r(y), r(alt.w - x)]; // 270
  };
  const neueGroesse = grad === 180 ? { w: alt.w, h: alt.h } : { w: alt.h, h: alt.w };
  /**
   * Addiert die Drehung dieser Konfiguration zur bestehenden Zellen-Drehung.
   *
   * @param d - Bisherige Drehung der Zelle.
   * @returns Summe modulo 360; `undefined` bei 0 (keine Drehung).
   */
  const plusDrehung = (d?: Drehung): Drehung | undefined => {
    const summe = (((d ?? 0) + grad) % 360) as Drehung;
    return summe === 0 ? undefined : summe;
  };

  for (const seite of kopie.seiten) {
    seite.groesse = { w: r(neueGroesse.w), h: r(neueGroesse.h) };

    for (const feld of Object.values(seite.felder)) {
      const [nx, ny] = dreh(feld.x, feld.y);
      const [nx2, ny2] = dreh(feld.x2 ?? feld.x, feld.y2 ?? feld.y);
      feld.x = nx;
      feld.y = ny;
      feld.x2 = nx2 === nx ? undefined : nx2;
      feld.y2 = ny2 === ny ? undefined : ny2;
      feld.drehung = plusDrehung(feld.drehung);
    }

    if (seite.signaturBild) {
      const s = seite.signaturBild;
      const [ax, ay] = dreh(s.x, s.y);
      const [bx, by] = dreh(s.x + s.w, s.y + s.h);
      s.x = r(Math.min(ax, bx));
      s.y = r(Math.min(ay, by));
      if (grad !== 180) [s.w, s.h] = [s.h, s.w];
    }

    for (const bereich of seite.bereiche) {
      if (bereich.drehung !== undefined) bereich.drehung = plusDrehung(bereich.drehung);
    }
  }

  for (const tabelle of Object.values(kopie.tabellen)) {
    tabelle.drehung = plusDrehung(tabelle.drehung);
  }

  return kopie;
}

/**
 * Benennt eine Sonderzeile um: den Key im Inhalt (`TabellenDef.sonderzeilen`) UND jede Platzierung
 * (`TabellenBereich.sonderzeilen[].name`) auf JEDER Seite. Ohne den zweiten Teil zeigen die
 * Platzierungen nach dem Umbenennen ins Leere (`build.ts` findet die Sonderzeile nicht mehr).
 * No-op, wenn `alt === neu`, `alt` nicht existiert oder `neu` schon vergeben ist. Reine Funktion.
 * Die Iterationsreihenfolge im Record bleibt erhalten, damit die Editor-Karte nicht springt.
 *
 * @param k - Konfiguration.
 * @param tabelle - Name der Tabelle, deren Sonderzeile umbenannt wird.
 * @param alt - Bisheriger Sonderzeilen-Name.
 * @param neu - Neuer Sonderzeilen-Name.
 * @returns Umbenannte Kopie; bei No-op dieselbe Instanz `k`.
 */
export function benenneSonderzeileUm(k: Konfig, tabelle: string, alt: string, neu: string): Konfig {
  const inhalt = k.tabellen[tabelle]?.sonderzeilen;
  if (!inhalt || alt === neu || !(alt in inhalt) || neu in inhalt) return k;
  const kopie: Konfig = structuredClone(k);
  const t = kopie.tabellen[tabelle]!;
  t.sonderzeilen = Object.fromEntries(Object.entries(t.sonderzeilen!).map(([n, z]) => [n === alt ? neu : n, z]));
  for (const seite of kopie.seiten) {
    for (const bereich of seite.bereiche) {
      if (bereich.tabelle !== tabelle || !bereich.sonderzeilen) continue;
      for (const platz of bereich.sonderzeilen) if (platz.name === alt) platz.name = neu;
    }
  }
  return kopie;
}
