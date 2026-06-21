import type { IVorgabenU, IVorgabenUvorgabenB } from '@/types';
import { resolveSchichtDay } from '@/types';
import { default as Storage } from '@/infrastructure/storage/Storage';
import dayjs from '@/infrastructure/date/configDayjs';
import { mergePerWeekdaySchicht } from '@/types';
import { resolveBzBis, resolveBzVon } from './resolveBereitschaftsGrenze';
import { B_WECHSEL_ZEIT } from './constants';

export default function updateBereitschaftsDatum(
  parentElement: HTMLDivElement,
  vorgabenB: IVorgabenUvorgabenB,
  datum: dayjs.Dayjs,
): void {
  const vorgabenU = Storage.get<Partial<IVorgabenU>>('VorgabenU', { default: {} });
  const az = vorgabenU.aZ;
  // Handbetrieb ("Datum manuell anpassen"): berechnete Datumsfelder (bE/nA/nE) nicht überschreiben.
  const eigen = parentElement.querySelector<HTMLInputElement>('#eigen')?.checked ?? false;
  const bAT = parentElement.querySelector<HTMLInputElement>('#bAT');
  const spaetCheckbox = parentElement.querySelector<HTMLInputElement>('#spaet');
  const bE = parentElement.querySelector<HTMLInputElement>('#bE');
  const bET = parentElement.querySelector<HTMLInputElement>('#bET');
  const nA = parentElement.querySelector<HTMLInputElement>('#nA');
  const nAT = parentElement.querySelector<HTMLInputElement>('#nAT');
  const nE = parentElement.querySelector<HTMLInputElement>('#nE');
  const nET = parentElement.querySelector<HTMLInputElement>('#nET');
  const spaetAT = parentElement.querySelector<HTMLInputElement>('#spaetAT');
  const spaetET = parentElement.querySelector<HTMLInputElement>('#spaetET');

  if (!bE || !bET || !nA || !nAT || !nE || !nET) throw new Error('Element not found');

  if (!eigen)
    bE.value = datum
      .isoWeekday(vorgabenB.endeB.tag === 0 ? 7 : vorgabenB.endeB.tag)
      .add(vorgabenB.endeB.Nwoche ? 7 : 0, 'd')
      .format('YYYY-MM-DD');

  const weekday = datum.isoWeekday();
  const spaetActive = spaetCheckbox?.checked ?? false;
  if (bAT) bAT.value = resolveBzVon(az, vorgabenB.schichtenOverrides, weekday, spaetActive);
  // Bis-Zeit aus dem aktuellen (ggf. manuell gesetzten) End-Datum ableiten.
  bET.value = resolveBzBis(az, vorgabenB.schichtenOverrides, dayjs(bE.value).isoWeekday());
  const spaetConfig = az?.spaet?.aktiv
    ? resolveSchichtDay(mergePerWeekdaySchicht(az.spaet, vorgabenB.schichtenOverrides?.spaet), weekday)
    : null;
  if (spaetAT) spaetAT.value = spaetConfig?.beginn ?? '';
  if (spaetET) spaetET.value = spaetConfig?.ende ?? '';

  const nachtConfig = az?.nacht?.aktiv
    ? resolveSchichtDay(mergePerWeekdaySchicht(az.nacht, vorgabenB.schichtenOverrides?.nacht), weekday)
    : null;

  if (nachtConfig) {
    if (!eigen) {
      const nachtAnfang = datum.set('hour', 0).set('minute', 0).set('second', 0).set('millisecond', 0);
      const nachtEnde = nachtConfig.ende < nachtConfig.beginn ? nachtAnfang.add(1, 'day') : nachtAnfang;
      nA.value = nachtAnfang.format('YYYY-MM-DD');
      nE.value = nachtEnde.format('YYYY-MM-DD');
    }
    nAT.value = nachtConfig.beginn;
    nET.value = nachtConfig.ende;
    return;
  }

  if (!eigen) {
    nA.value = datum
      .isoWeekday(vorgabenB.beginnN.tag === 0 ? 7 : vorgabenB.beginnN.tag)
      .add(vorgabenB.beginnN.Nwoche ? 7 : 0, 'd')
      .format('YYYY-MM-DD');
    nE.value = datum
      .isoWeekday(vorgabenB.endeN.tag === 0 ? 7 : vorgabenB.endeN.tag)
      .add(vorgabenB.endeN.Nwoche ? 7 : 0, 'd')
      .format('YYYY-MM-DD');
  }
  nAT.value = az?.nacht?.aktiv ? az.nacht.default.beginn : B_WECHSEL_ZEIT;
  nET.value = az?.nacht?.aktiv ? az.nacht.default.ende : B_WECHSEL_ZEIT;
}
