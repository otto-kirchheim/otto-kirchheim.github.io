import type { Daten, SeitenDef, TabellenDef } from '@otto-kirchheim/nebengeld-shared';
import type { Kontext } from '@/shared/lib/pdf/wert';
import type { FormularCode } from './datenKatalog';

/** Scharf geschaltetes Ziel: das nächste auf dem PDF aufgezogene Rechteck wird dorthin geschrieben. */
export type Armed =
  | { bereich: 'feld'; key: string }
  | { bereich: 'spalte'; tabelle: string; index: number }
  | { bereich: 'tabelle'; tabelle: string }
  | { bereich: 'letzteZeile'; tabelle: string }
  | { bereich: 'sonderzeile'; tabelle: string; index: number }
  | { bereich: 'signaturBild' };

export type Props = {
  formular: FormularCode;
  seite: SeitenDef;
  onSeiteChange: (seite: SeitenDef) => void;
  tabellen: Record<string, TabellenDef>;
  onTabellenChange: (tabellen: Record<string, TabellenDef>) => void;
  armed: Armed | null;
  onArm: (armed: Armed | null) => void;
  vorschau: Vorschau;
  /**
   * Benennt eine Sonderzeile um -- Inhalt (`TabellenDef.sonderzeilen`) UND alle Platzierungen
   * (`TabellenBereich.sonderzeilen[].name`) auf JEDER Seite in einem Zug. Läuft auf `value`-Ebene,
   * weil nur dort alle Seiten bekannt sind.
   */
  onSonderzeileUmbenannt: (tabelle: string, alt: string, neu: string) => void;
};

/**
 * Beispieldaten samt Renderer-Kontext. Damit zeigt die Feldliste denselben Wert wie das erzeugte
 * PDF, auch bei Summen und Uebertrag.
 */
export interface Vorschau {
  daten: Daten;
  kontext: Kontext;
}
