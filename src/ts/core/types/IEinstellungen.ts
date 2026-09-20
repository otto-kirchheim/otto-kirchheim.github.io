import type { ComponentType } from 'react';
import type { IVorgabenU } from './IVorgabenU.js';

/** Abschnitt des Einstellungen-Akkordeons, den ein Feature beisteuert. */
export interface IEinstellungenSection {
  /** Stabile Id des Abschnitts (`collapseThree` ...); Vertrag mit Onboarding-Tour und `offenerAbschnittStore`. */
  id: string;
  /** Ueberschrift des Abschnitts. */
  titel: string;
  /** Position im Akkordeon relativ zu den globalen Abschnitten und anderen Features (aufsteigend). */
  order: number;
  /** Inhalt des Abschnitts. */
  Component: ComponentType;
}

/** Werte, die ein Feature beim Speichern in `VorgabenU` einbringt; `Einstellungen` wird feldweise zusammengefuehrt. */
export type IEinstellungenBeitrag = Partial<Omit<IVorgabenU, 'Einstellungen'>> & {
  Einstellungen?: Partial<IVorgabenU['Einstellungen']>;
};

/**
 * Einstellungen-Slot eines Features (Teil `einstellungen`): Abschnitte im Akkordeon sowie das Befuellen und Einsammeln
 * seiner Felder. `Einstellungen` kennt kein Feature; die Abschnitte und Felder kommen aus den Slots.
 */
export interface IFeatureEinstellungen {
  sections: readonly IEinstellungenSection[];
  /** Befuellt die Felder des Features aus den Benutzer-Vorgaben (die Abschnitte sind dann gerendert). */
  read(vorgabenU: IVorgabenU): void;
  /** Liest die Felder des Features aus und validiert sie. Wirft bei ungueltigen Werten (mit Snackbar-Hinweis). */
  collect(vorgabenU: IVorgabenU): IEinstellungenBeitrag;
}
