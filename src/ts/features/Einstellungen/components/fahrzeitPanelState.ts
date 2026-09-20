import type { IVorgabenUfZ } from '@/types';

let panelState: IVorgabenUfZ[] | null = null;

/**
 * Liefert den aktuellen Stand des `FahrzeitenPanel`, den `saveEinstellungen` beim Speichern liest, statt Felder aus dem DOM auszulesen.
 *
 * @returns Zuletzt vom Panel gemeldete Fahrzeit-Zeilen oder `null`, wenn keine gesetzt sind.
 */
export const getFahrzeitPanelState = (): IVorgabenUfZ[] | null => panelState;

/**
 * Speichert den Fahrzeit-Stand des Panels im Modul-Speicher.
 *
 * @param nextState - Neue Fahrzeit-Zeilen; `null` verwirft den Stand.
 */
export const setFahrzeitPanelState = (nextState: IVorgabenUfZ[] | null): void => {
  panelState = nextState;
};
