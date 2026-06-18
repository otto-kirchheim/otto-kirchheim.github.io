import type { IPerWeekdaySchicht, IVorgabenU, IVorgabenUvorgabenB } from '@/types';
import { resolveSchichtDay } from '@/types';
import { default as Storage } from '@/infrastructure/storage/Storage';
import type dayjs from '@/infrastructure/date/configDayjs';

const mergePerWeekdaySchicht = (base: IPerWeekdaySchicht, override?: Partial<IPerWeekdaySchicht>): IPerWeekdaySchicht => {
  if (!override) return base;
  return {
    ...base,
    ...override,
    default: {
      ...base.default,
      ...(override.default ?? {}),
    },
    overrides: {
      ...(base.overrides ?? {}),
      ...(override.overrides ?? {}),
    },
  };
};

export default function updateBereitschaftsDatum(
  parentElement: HTMLDivElement,
  vorgabenB: IVorgabenUvorgabenB,
  datum: dayjs.Dayjs,
): void {
  const vorgabenU = Storage.get<Partial<IVorgabenU>>('VorgabenU', { default: {} });
  const az = vorgabenU.aZ;
  const bE = parentElement.querySelector<HTMLInputElement>('#bE');
  const bET = parentElement.querySelector<HTMLInputElement>('#bET');
  const nA = parentElement.querySelector<HTMLInputElement>('#nA');
  const nAT = parentElement.querySelector<HTMLInputElement>('#nAT');
  const nE = parentElement.querySelector<HTMLInputElement>('#nE');
  const nET = parentElement.querySelector<HTMLInputElement>('#nET');
  const spaetAT = parentElement.querySelector<HTMLInputElement>('#spaetAT');
  const spaetET = parentElement.querySelector<HTMLInputElement>('#spaetET');

  if (!bE || !bET || !nA || !nAT || !nE || !nET) throw new Error('Element not found');

  bE.value = datum
    .isoWeekday(vorgabenB.endeB.tag === 0 ? 7 : vorgabenB.endeB.tag)
    .add(vorgabenB.endeB.Nwoche ? 7 : 0, 'd')
    .format('YYYY-MM-DD');
  bET.value = vorgabenB.endeB.zeit;

  const weekday = datum.isoWeekday();
  const spaetConfig = az?.spaet
    ? resolveSchichtDay(mergePerWeekdaySchicht(az.spaet, vorgabenB.schichtenOverrides?.spaet), weekday)
    : null;
  if (spaetAT) spaetAT.value = spaetConfig?.beginn ?? '';
  if (spaetET) spaetET.value = spaetConfig?.ende ?? '';

  const nachtConfig = az?.nacht
    ? resolveSchichtDay(mergePerWeekdaySchicht(az.nacht, vorgabenB.schichtenOverrides?.nacht), weekday)
    : null;

  if (nachtConfig) {
    const nachtAnfang = datum.set('hour', 0).set('minute', 0).set('second', 0).set('millisecond', 0);
    const nachtEnde = nachtConfig.ende < nachtConfig.beginn ? nachtAnfang.add(1, 'day') : nachtAnfang;
    nA.value = nachtAnfang.format('YYYY-MM-DD');
    nAT.value = nachtConfig.beginn;
    nE.value = nachtEnde.format('YYYY-MM-DD');
    nET.value = nachtConfig.ende;
    return;
  }

  nA.value = datum
    .isoWeekday(vorgabenB.beginnN.tag === 0 ? 7 : vorgabenB.beginnN.tag)
    .add(vorgabenB.beginnN.Nwoche ? 7 : 0, 'd')
    .format('YYYY-MM-DD');
  nAT.value = vorgabenB.beginnN.zeit;
  nE.value = datum
    .isoWeekday(vorgabenB.endeN.tag === 0 ? 7 : vorgabenB.endeN.tag)
    .add(vorgabenB.endeN.Nwoche ? 7 : 0, 'd')
    .format('YYYY-MM-DD');
  nET.value = vorgabenB.endeN.zeit;
}
