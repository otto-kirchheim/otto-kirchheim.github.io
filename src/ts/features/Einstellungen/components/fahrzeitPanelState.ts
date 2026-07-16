import type { IVorgabenUfZ } from '@/types';

let panelState: IVorgabenUfZ[] | null = null;

export const getFahrzeitPanelState = (): IVorgabenUfZ[] | null => panelState;

export const setFahrzeitPanelState = (nextState: IVorgabenUfZ[] | null): void => {
  panelState = nextState;
};
