import type { IVorgabenBerechnung, IVorgabenGeld } from '@/types';
import { registerAppStartTask } from '@/core';
import { markStep } from '@/core/orchestration/initSequence';
import { onEvent } from '@/core/events/appEvents';
import { default as Storage } from '@/infrastructure/storage/Storage';
import aktualisiereBerechnung from './aktualisiereBerechnung';
import generateTableBerechnung from './generateTableBerechnung';

export { generateTableBerechnung, aktualisiereBerechnung };

registerAppStartTask(() => {
  onEvent('data:changed', () => aktualisiereBerechnung());

  if (Storage.check('VorgabenU') && Storage.check('datenBerechnung') && Storage.check('VorgabenGeld')) {
    generateTableBerechnung(
      Storage.get<IVorgabenBerechnung>('datenBerechnung', { check: true }),
      Storage.get<IVorgabenGeld>('VorgabenGeld', { check: true }),
    );
  }
  markStep('boot', 'boot:berechnung');
});
