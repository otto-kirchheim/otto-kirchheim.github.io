import type { IVorgabenU, IVorgabenUvorgabenB } from '@/types';
import { resolveSchichtDay } from '@/types';
import { default as Storage } from '@/infrastructure/storage/Storage';
import dayjs from '@/infrastructure/date/configDayjs';
import hideBereitschaftsNachtfelder from './hideBereitschaftsNachtfelder';
import { mergePerWeekdaySchicht } from '@/types';
import { resolveBzBis, resolveBzVon } from './resolveBereitschaftsGrenze';
import { B_WECHSEL_ZEIT } from './constants';

export default function applyBereitschaftsVorgabe(
  parentElement: HTMLDivElement,
  vorgabenB: IVorgabenUvorgabenB,
  datum = dayjs(parentElement.querySelector<HTMLInputElement>('#bA')?.value) ?? null,
): void {
  if (!datum) throw new Error('Datum nicht gefunden');
  const vorgabenU = Storage.get<Partial<IVorgabenU>>('VorgabenU', { default: {} });
  const az = vorgabenU.Arbeitszeit;

  const bAInput = parentElement.querySelector<HTMLInputElement>('#bA');
  const bATInput = parentElement.querySelector<HTMLInputElement>('#bAT');
  const bEInput = parentElement.querySelector<HTMLInputElement>('#bE');
  const bETInput = parentElement.querySelector<HTMLInputElement>('#bET');
  const nachtInput = parentElement.querySelector<HTMLInputElement>('#nacht');
  const nAInput = parentElement.querySelector<HTMLInputElement>('#nA');
  const nATInput = parentElement.querySelector<HTMLInputElement>('#nAT');
  const nEInput = parentElement.querySelector<HTMLInputElement>('#nE');
  const nETInput = parentElement.querySelector<HTMLInputElement>('#nET');
  const spaetATInput = parentElement.querySelector<HTMLInputElement>('#spaetAT');
  const spaetETInput = parentElement.querySelector<HTMLInputElement>('#spaetET');
  const sonderInput = parentElement.querySelector<HTMLInputElement>('#sonder');
  const sonderVonInput = parentElement.querySelector<HTMLInputElement>('#sonderVon');
  const sonderBisInput = parentElement.querySelector<HTMLInputElement>('#sonderBis');

  if (!bAInput || !bATInput || !bEInput || !bETInput || !nachtInput || !nAInput || !nATInput || !nEInput || !nETInput)
    throw new Error('Input Element nicht gefunden');

  bAInput.value = datum.isoWeekday(vorgabenB.beginnB.tag === 0 ? 7 : vorgabenB.beginnB.tag).format('YYYY-MM-DD');
  bEInput.value = datum
    .isoWeekday(vorgabenB.endeB.tag === 0 ? 7 : vorgabenB.endeB.tag)
    .add(vorgabenB.endeB.Nwoche ? 7 : 0, 'd')
    .format('YYYY-MM-DD');
  nachtInput.checked = vorgabenB.schichten ? vorgabenB.schichten.includes('nacht') : vorgabenB.nacht;
  const spaetInput = parentElement.querySelector<HTMLInputElement>('#spaet');
  if (spaetInput) spaetInput.checked = vorgabenB.schichten?.includes('spaet') ?? false;
  if (sonderInput) sonderInput.checked = vorgabenB.schichten?.includes('sonder') ?? false;
  if (sonderVonInput) sonderVonInput.value = datum.format('YYYY-MM-DD');
  if (sonderBisInput) sonderBisInput.value = datum.format('YYYY-MM-DD');

  const weekday = datum.isoWeekday();
  const spaetActive = spaetInput?.checked ?? false;
  bATInput.value = resolveBzVon(az, vorgabenB.schichtenOverrides, weekday, spaetActive);
  bETInput.value = resolveBzBis(az, vorgabenB.schichtenOverrides, dayjs(bEInput.value).isoWeekday());
  const spaetConfig = az?.spaet?.aktiv
    ? resolveSchichtDay(mergePerWeekdaySchicht(az.spaet, vorgabenB.schichtenOverrides?.spaet), weekday)
    : null;
  if (spaetATInput) spaetATInput.value = spaetConfig?.beginn ?? '';
  if (spaetETInput) spaetETInput.value = spaetConfig?.ende ?? '';

  const nachtConfig = az?.nacht?.aktiv
    ? resolveSchichtDay(mergePerWeekdaySchicht(az.nacht, vorgabenB.schichtenOverrides?.nacht), weekday)
    : null;

  if (nachtConfig) {
    const nachtAnfang = datum.set('hour', 0).set('minute', 0).set('second', 0).set('millisecond', 0);
    const nachtEnde = nachtConfig.ende < nachtConfig.beginn ? nachtAnfang.add(1, 'day') : nachtAnfang;
    nAInput.value = nachtAnfang.format('YYYY-MM-DD');
    nATInput.value = nachtConfig.beginn;
    nEInput.value = nachtEnde.format('YYYY-MM-DD');
    nETInput.value = nachtConfig.ende;
  } else {
    nAInput.value = datum
      .isoWeekday(vorgabenB.beginnN.tag === 0 ? 7 : vorgabenB.beginnN.tag)
      .add(vorgabenB.beginnN.Nwoche ? 7 : 0, 'd')
      .format('YYYY-MM-DD');
    nATInput.value = az?.nacht?.aktiv ? az.nacht.default.beginn : B_WECHSEL_ZEIT;
    nEInput.value = datum
      .isoWeekday(vorgabenB.endeN.tag === 0 ? 7 : vorgabenB.endeN.tag)
      .add(vorgabenB.endeN.Nwoche ? 7 : 0, 'd')
      .format('YYYY-MM-DD');
    nETInput.value = az?.nacht?.aktiv ? az.nacht.default.ende : B_WECHSEL_ZEIT;
  }

  hideBereitschaftsNachtfelder(parentElement);
}
