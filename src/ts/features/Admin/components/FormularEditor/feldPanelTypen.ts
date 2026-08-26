import type { Daten, SeitenDef, TabellenDef } from '@otto-kirchheim/nebengeld-shared';
import type { Kontext } from '@/infrastructure/pdf/wert';
import type { FormularCode } from './datenKatalog';

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
};

/**
 * Beispieldaten samt Renderer-Kontext. Damit zeigt die Feldliste denselben Wert, den das erzeugte
 * PDF zeigen wuerde -- Summen und Uebertrag eingeschlossen, die sonst nur ueber die PDF-Vorschau
 * pruefbar waeren.
 */
export interface Vorschau {
  daten: Daten;
  kontext: Kontext;
}
