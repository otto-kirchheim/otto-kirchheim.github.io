import type { Spalte, TabellenBereich, TabellenDef } from '@otto-kirchheim/nebengeld-shared';

/**
 * Die auf DIESER Seite gültigen Spalten einer Tabelle: der seitenspezifische Satz, sonst der der
 * Tabelle. Bewusst eine gemeinsame Funktion für Renderer, Editor und Vorschau — sonst zeichnete
 * eine der drei Stellen irgendwann nach der jeweils anderen Regel.
 */
export function spaltenFuer(bereich: TabellenBereich, tabelle: TabellenDef): Spalte[] {
  return bereich.spalten ?? tabelle.spalten;
}

/**
 * Die auf DIESER Seite gültige Zeilenhöhe einer Tabelle: der seitenspezifische Wert, sonst der der
 * Tabelle. Gleiches Muster wie `spaltenFuer()`, aus demselben Grund.
 */
export function hoeheFuer(bereich: TabellenBereich, tabelle: TabellenDef): number {
  return bereich.hoehe ?? tabelle.hoehe;
}

/**
 * Die auf DIESER Seite gültige Startposition einer Tabelle: der seitenspezifische Wert, sonst der
 * der Tabelle. Gleiches Muster wie `spaltenFuer()`, aus demselben Grund.
 */
export function startYFuer(bereich: TabellenBereich, tabelle: TabellenDef): number {
  return bereich.startY ?? tabelle.startY;
}

/**
 * Die auf DIESER Seite gültige Zeilenzahl einer Tabelle: der seitenspezifische Wert, sonst der der
 * Tabelle. Gleiches Muster wie `spaltenFuer()`, aus demselben Grund.
 */
export function maxZeilenFuer(bereich: TabellenBereich, tabelle: TabellenDef): number {
  return bereich.maxZeilen ?? tabelle.maxZeilen;
}
