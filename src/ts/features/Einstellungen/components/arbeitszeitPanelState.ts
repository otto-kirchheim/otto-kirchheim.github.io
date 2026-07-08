import type { IVorgabenUaZ } from '@/types';

let panelState: IVorgabenUaZ | null = null;

export const getArbeitszeitPanelState = (): IVorgabenUaZ | null => panelState;

export const setArbeitszeitPanelState = (nextState: IVorgabenUaZ | null): void => {
  panelState = nextState;
};
