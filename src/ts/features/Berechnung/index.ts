import type { IVorgabenBerechnung, IVorgabenGeld } from '@/types';
import { registerAppStartTask } from '@/core';
import { markStep } from '@/core/orchestration/initSequence';
import { onEvent } from '@/core/events/appEvents';
import { default as Storage } from '@/infrastructure/storage/Storage';
import aktualisiereBerechnung from './aktualisiereBerechnung';
import generateTableBerechnung from './generateTableBerechnung';
import { initBerechnungMonatsFensterNav } from './berechnungMonatsFenster';

export { generateTableBerechnung, aktualisiereBerechnung };

registerAppStartTask(async () => {
  onEvent('data:changed', () => {
    Promise.resolve(aktualisiereBerechnung()).catch(error => console.error('Berechnung fehlgeschlagen:', error));
  });
  initBerechnungMonatsFensterNav();

  if (Storage.check('VorgabenU') && Storage.check('datenBerechnung') && Storage.check('VorgabenGeld')) {
    await generateTableBerechnung(
      Storage.get<IVorgabenBerechnung>('datenBerechnung', { check: true }),
      Storage.get<IVorgabenGeld>('VorgabenGeld', { check: true }),
    );
  }
  markStep('boot', 'boot:berechnung');
});
