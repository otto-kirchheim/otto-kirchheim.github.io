import type { IVorgabeValue, ListenGruppe, Zeile } from '@otto-kirchheim/nebengeld-shared';
import { ZULAGEN_CATALOG, ZulageEntryUnit } from '@otto-kirchheim/nebengeld-shared';
import { alsZahl } from './aggregatoren';

type ZulagenGeldSatz = Pick<IVorgabeValue, 'A' | 'B' | 'C' | 'Fahrentsch' | 'SIPO' | 'GKR'>;

/**
 * Geldwert eines einzelnen Zulagen-Codes -- gleiche Formel wie `N_ZULAGEN_CALC` in
 * `calculateBerechnungRows.ts`, dort je `paymentHint` über die ganze Kategorie, hier für EINEN Code.
 * `wert` ist bei `ZulageEntryUnit.Minuten`-Codes Minuten (auf volle Stunden gerundet), sonst eine
 * Stückzahl. Unbekannter Code oder fehlender Satz ergibt 0 statt eines Absturzes.
 *
 * @param code - Zulagen-Code aus `ZULAGEN_CATALOG`.
 * @param wert - Minuten bei Minuten-Codes, sonst Stückzahl.
 * @param geldMonat - Sätze des Monats (A, B, C, Fahrentschädigung, SIPO, Ganzkörperreinigung).
 * @returns Geldwert in Euro; `0` bei unbekanntem Code oder fehlendem Satz.
 */
export function geldwertZulagenCode(code: string, wert: number, geldMonat: ZulagenGeldSatz): number {
  /**
   * Satz aus `geldMonat`.
   *
   * @param feld - Name des Satzes.
   * @returns Satz oder `0`, wenn er fehlt.
   */
  const satz = (feld: keyof ZulagenGeldSatz): number => geldMonat[feld] ?? 0;
  switch (ZULAGEN_CATALOG.find(z => z.code === code)?.paymentHint) {
    case 'Fahrentschaedigung':
      return wert * satz('Fahrentsch');
    case 'A':
      return Math.round(wert / 60) * satz('A');
    case 'B':
      return Math.round(wert / 60) * satz('B');
    case 'C':
      return Math.round(wert / 60) * satz('C');
    case 'C+A':
      return Math.round(wert / 60) * (satz('C') + satz('A'));
    case 'C+B':
      return Math.round(wert / 60) * (satz('C') + satz('B'));
    case 'C*9':
      return wert * satz('C') * 9;
    case 'SIPO':
      return Math.round(wert / 60) * satz('SIPO');
    case 'Ganzkoerperreinigung':
      return wert * satz('GKR');
    default:
      return 0;
  }
}

/**
 * Bereinigte Summe [Std.] eines Zulagen-Codes: Minuten-Codes auf volle Stunden gerundet (wie in
 * `geldwertZulagenCode()`). Stück-Codes und unbekannte Codes haben keine Umrechnung -> `undefined`
 * (Renderer zeigt `"-"`).
 *
 * @param code - Zulagen-Code aus `ZULAGEN_CATALOG`.
 * @param wert - Minuten (bei Minuten-Codes).
 * @returns Volle Stunden, oder `undefined` für Stück- und unbekannte Codes.
 */
export function bereinigteZulagenStunden(code: string, wert: number): number | undefined {
  const eintrag = ZULAGEN_CATALOG.find(z => z.code === code);
  return eintrag?.entryRule.unit === ZulageEntryUnit.Minuten ? Math.round(wert / 60) : undefined;
}

/**
 * Alle Zulagen-Einträge einer Listen-Gruppe über mehrere Zeilen (Code + Wert). Einträge ohne
 * String-Code oder aus einer Nicht-Array-Quelle fallen raus. Leer = die Spalte trägt keine Zulage;
 * die Aufrufer geben dann `undefined` statt `0` zurück.
 *
 * @param rows - Zeilen der Tabelle.
 * @param gruppe - Listenfeld (`quelle`), Code-Feld (`schluessel`) und Wertfeld (`wert`).
 * @returns Alle Einträge mit Code und Zahlenwert.
 */
function zulagenEintraegeGruppe(
  rows: Zeile[],
  gruppe: Pick<ListenGruppe, 'quelle' | 'schluessel' | 'wert'>,
): { code: string; wert: number }[] {
  return rows.flatMap(zeile => {
    const eintraege = zeile[gruppe.quelle];
    if (!Array.isArray(eintraege)) return [];
    return eintraege.flatMap((e: unknown) => {
      const eintrag = e as Zeile;
      const code = eintrag[gruppe.schluessel];
      return typeof code === 'string' ? [{ code, wert: alsZahl(eintrag[gruppe.wert]) }] : [];
    });
  });
}

/**
 * Geldwert ALLER Einträge einer Listen-Gruppe zusammen, je mit dem EIGENEN Code aus
 * `zeile[gruppe.schluessel]` (Gesamtsumme über alle Zulagen-Spaltenplätze). Unbekannter Code trägt `0`
 * bei. Ohne Eintrag `undefined` (leere Summenzelle).
 *
 * @param rows - Zeilen der Tabelle.
 * @param gruppe - Listenfeld (`quelle`), Code-Feld (`schluessel`) und Wertfeld (`wert`).
 * @param geldMonat - Sätze des Monats.
 * @returns Summe in Euro, `undefined` ohne Eintrag.
 */
export function summeGeldwertGruppe(
  rows: Zeile[],
  gruppe: Pick<ListenGruppe, 'quelle' | 'schluessel' | 'wert'>,
  geldMonat: ZulagenGeldSatz,
): number | undefined {
  const eintraege = zulagenEintraegeGruppe(rows, gruppe);
  if (eintraege.length === 0) return undefined;
  return eintraege.reduce((s, e) => s + geldwertZulagenCode(e.code, e.wert, geldMonat), 0);
}

/**
 * Bereinigte Summe [Std.] ALLER Einträge einer Listen-Gruppe -- wie `summeGeldwertGruppe()` mit
 * `bereinigteZulagenStunden()`. Stück-Codes tragen `0` bei (anders als die Einzelzelle mit `"-"`, siehe
 * `sonderZeileZelleWert()`): eine Summe ohne den nicht umrechenbaren Anteil bleibt sinnvoll.
 *
 * @param rows - Zeilen der Tabelle.
 * @param gruppe - Listenfeld (`quelle`), Code-Feld (`schluessel`) und Wertfeld (`wert`).
 * @returns Summe in Stunden, `undefined` ohne Eintrag.
 */
export function summeBereinigtGruppe(
  rows: Zeile[],
  gruppe: Pick<ListenGruppe, 'quelle' | 'schluessel' | 'wert'>,
): number | undefined {
  const eintraege = zulagenEintraegeGruppe(rows, gruppe);
  if (eintraege.length === 0) return undefined;
  return eintraege.reduce((s, e) => s + (bereinigteZulagenStunden(e.code, e.wert) ?? 0), 0);
}
