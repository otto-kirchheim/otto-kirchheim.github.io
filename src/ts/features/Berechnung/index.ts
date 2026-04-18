import type { IVorgabenBerechnung, IVorgabenGeld } from '../../interfaces';
import { registerAppStartTask, onDataChanged } from '../../core';
import { Storage } from '../../utilities';
import aktualisiereBerechnung from './aktualisiereBerechnung';
import generateTableBerechnung from './generateTableBerechnung';

export { generateTableBerechnung, aktualisiereBerechnung };

registerAppStartTask(() => {
  onDataChanged(() => aktualisiereBerechnung());

  if (Storage.check('VorgabenU') && Storage.check('datenBerechnung') && Storage.check('VorgabenGeld')) {
    generateTableBerechnung(
      Storage.get<IVorgabenBerechnung>('datenBerechnung', { check: true }),
      Storage.get<IVorgabenGeld>('VorgabenGeld', { check: true }),
    );
  }
});
