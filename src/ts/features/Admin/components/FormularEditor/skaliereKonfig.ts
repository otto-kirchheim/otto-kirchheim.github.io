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

/** Auf 2 Nachkommastellen, wie die Koordinaten-Eingaben im Editor (`ZahlFeld`). */
function r(n: number): number {
  return Number(n.toFixed(2));
}

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
 * unberührt (tiefe Kopie). `neueGroesse` aktualisiert die je Seite gespeicherte Referenzgröße.
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
