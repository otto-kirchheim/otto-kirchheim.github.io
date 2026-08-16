import { FORMAT, OPS, get } from '@otto-kirchheim/nebengeld-shared';
import type { Daten, Feld, Zeile } from '@otto-kirchheim/nebengeld-shared';

/** Zeilen je Tabellen-Key -- eine Version kann mehrere Datentabellen tragen. */
export type TabellenZeilen = Record<string, Zeile[]>;

export interface Kontext {
  /** Zeilen der aktuellen Seite */
  $seite: TabellenZeilen;
  /** Zeilen aller vorherigen Seiten (Übertrag) */
  $bisher: TabellenZeilen;
  /** alle Zeilen des Dokuments (Gesamtsumme) */
  $alle: TabellenZeilen;
  seite: number;
  seiten: number;
}

/** Ohne `tabelle` laufen die Zeilen aller Tabellen zusammen in die Rechnung. */
function ausKontext(quelle: TabellenZeilen, tabelle: string | undefined): Zeile[] {
  if (tabelle !== undefined) return quelle[tabelle] ?? [];
  return Object.values(quelle).flat();
}

const PLATZHALTER = /\{([^{}]+)\}/g;

function formatiere(roh: unknown, f: Feld): string {
  if (roh === null || roh === undefined) return '';
  return f.format ? FORMAT[f.format](roh) : String(roh);
}

/**
 * Ersetzt `{name}` in festen Texten: `{seite}`/`{seiten}` liefern die Seitenzahlen, jeder andere
 * Name wird als Datenpfad aufgelöst. Unbekannte Pfade werden zu einem leeren String, damit kein
 * roher Platzhalter im fertigen PDF landet.
 */
function ersetzePlatzhalter(text: string, daten: Daten, kontext: Kontext): string {
  return text.replace(PLATZHALTER, (_treffer, name: string) => {
    const pfad = name.trim();
    if (pfad === 'seite') return String(kontext.seite);
    if (pfad === 'seiten') return String(kontext.seiten);
    const roh = get(daten, pfad);
    return roh === null || roh === undefined ? '' : String(roh);
  });
}

/** Löst ein Feld gegen die Nutzdaten (Direktwert, Zusammensetzung oder Aggregation) auf. */
export function wert(f: Feld, key: string, daten: Daten, kontext: Kontext): string {
  let roh: unknown;

  if (f.text !== undefined) {
    // Platzhalter-Ersetzung liefert bereits fertigen Text -- ein `format` würde ihn nur zerstören.
    return ersetzePlatzhalter(f.text, daten, kontext);
  } else if (f.quellen) {
    // Leere Teile überspringen -- sonst hinterlassen optionale Felder (z.B. Adress2) doppelte
    // oder führende Trennzeichen in der Zelle.
    return f.quellen
      .map(pfad => formatiere(get(daten, pfad), f))
      .filter(teil => teil !== '')
      .join(f.trenner ?? ' ');
  } else if (f.berechnet) {
    const q = f.berechnet.ueber;
    const rows = q.startsWith('$')
      ? ausKontext(kontext[q as '$seite' | '$bisher' | '$alle'], f.berechnet.tabelle)
      : (get(daten, q) as Zeile[] | undefined);
    roh = OPS[f.berechnet.op](rows ?? [], f.berechnet.feld);
  } else {
    roh = get(daten, key);
  }

  return formatiere(roh, f);
}
