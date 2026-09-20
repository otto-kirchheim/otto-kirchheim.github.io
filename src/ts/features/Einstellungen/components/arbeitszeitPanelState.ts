import type { IVorgabenUaZ } from '@/types';

let panelState: IVorgabenUaZ | null = null;

/**
 * Liefert den aktuellen Arbeitszeit-Stand des `ArbeitszeiteingabePanel`, den `saveEinstellungen` beim Speichern liest, statt Felder aus dem DOM auszulesen.
 *
 * @returns Zuletzt vom Panel gemeldeter Stand oder `null`, wenn keiner gesetzt ist.
 */
export const getArbeitszeitPanelState = (): IVorgabenUaZ | null => panelState;

/**
 * Speichert den Arbeitszeit-Stand des Panels im Modul-Speicher.
 *
 * @param nextState - Neuer Stand; `null` verwirft ihn.
 */
export const setArbeitszeitPanelState = (nextState: IVorgabenUaZ | null): void => {
  panelState = nextState;
};
