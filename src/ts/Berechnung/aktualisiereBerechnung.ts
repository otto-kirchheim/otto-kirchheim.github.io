import { generateTableBerechnung } from '.';
import type {
  IDaten,
  IDatenBE,
  IDatenBZ,
  IDatenEWT,
  IDatenN,
  IVorgabenBerechnung,
  IVorgabenBerechnungMonat,
} from '../interfaces';
import { normalizeResourceRows, Storage } from '../utilities';
import dayjs from '../utilities/configDayjs';
import { getMonatFromBE, getMonatFromBZ, getMonatFromEWT, getMonatFromN } from '../utilities/getMonatFromItem';

export default function aktualisiereBerechnung(daten?: Required<IDaten>): IVorgabenBerechnung {
  const datenQuelle: Required<IDaten> = daten ?? {
    BZ: Storage.get<IDatenBZ[]>('dataBZ', { default: [] }),
    BE: Storage.get<IDatenBE[]>('dataBE', { default: [] }),
    EWT: Storage.get<IDatenEWT[]>('dataE', { default: [] }),
    N: Storage.get<IDatenN[]>('dataN', { default: [] }),
  };

  const Berechnung: IVorgabenBerechnung = Storage.get<IVorgabenBerechnung>('datenBerechnung', {
    check: true,
    default: {} as IVorgabenBerechnung,
  });

  const BZ = normalizeResourceRows<IDatenBZ>(datenQuelle.BZ);
  const BE = normalizeResourceRows<IDatenBE>(datenQuelle.BE);
  const EWT = normalizeResourceRows<IDatenEWT>(datenQuelle.EWT);
  const N = normalizeResourceRows<IDatenN>(datenQuelle.N);

  const filterByMonat = <T>(items: T[], getMonat: (item: T) => number, monat: number): T[] =>
    items.filter(item => getMonat(item) === monat);

  for (let Monat = 1; Monat <= 12; Monat++) {
    const BZMonat = filterByMonat(BZ, getMonatFromBZ, Monat);
    const BEMonat = filterByMonat(BE, getMonatFromBE, Monat);
    const EWTMonat = filterByMonat(EWT, getMonatFromEWT, Monat);
    const NMonat = filterByMonat(N, getMonatFromN, Monat);
    Berechnung[Monat as keyof IVorgabenBerechnung] = aktualisiereBerechnungMonat(BZMonat, BEMonat, EWTMonat, NMonat);
  }

  Storage.set<IVorgabenBerechnung>('datenBerechnung', Berechnung);
  generateTableBerechnung(Berechnung);

  return Berechnung;

  function aktualisiereBerechnungMonat(
    BZMonat: IDatenBZ[],
    BEMonat: IDatenBE[],
    EWTMonat: IDatenEWT[],
    NMonat: IDatenN[],
  ): IVorgabenBerechnungMonat {
    const Berechnung: IVorgabenBerechnungMonat = {
      B: { B: 0, L1: 0, L2: 0, L3: 0, K: 0 },
      E: { A8: 0, A14: 0, A24: 0, S8: 0, S14: 0 },
      N: { F: 0 },
    };

    BZMonat.forEach(value => {
      Berechnung.B.B += dayjs(value.endeB).diff(dayjs(value.beginB), 'minute') + value.pauseB;
    });

    BEMonat.forEach(value => {
      const von = dayjs(`${value.tagBE} ${value.beginBE}`, 'DD.MM.YYYY HH:mm');
      let bis = dayjs(`${value.tagBE} ${value.endeBE}`, 'DD.MM.YYYY HH:mm');
      if (bis.isBefore(von)) bis = bis.add(1, 'day');
      Berechnung.B.B -= bis.diff(von, 'minute');

      const LREValue = value.lreBE;

      if (LREValue === 'LRE 1') Berechnung.B.L1++;
      else if (LREValue === 'LRE 2') Berechnung.B.L2++;
      else if (LREValue === 'LRE 3') Berechnung.B.L3++;

      if (value.privatkmBE) Berechnung.B.K += value.privatkmBE;
    });

    const isInRange = (value: number, min: number, max = Infinity): boolean => value >= min && value < max;

    EWTMonat.forEach(value => {
      const datum = dayjs(value.tagE);
      if (!datum.isValid()) return;
      const tagAnfang = ['BN', 'N'].includes(value.schichtE) ? datum.subtract(1, 'day') : datum;

      if (value.abWE && value.anWE) {
        const [abWH, abWM] = value.abWE.split(':').map(Number);
        const [anWH, anWM] = value.anWE.split(':').map(Number);
        const von = tagAnfang.hour(abWH).minute(abWM);
        const bis = datum.hour(anWH).minute(anWM);

        const abWohnung = bis.diff(von, 'hour', true);

        if (isInRange(abWohnung, 8, 14)) Berechnung.E.A8++;
        else if (isInRange(abWohnung, 14, 24)) Berechnung.E.A14++;
        else Berechnung.E.A24++;
      }
      if (value.ab1E && value.an1E) {
        const [ab1H, ab1M] = value.ab1E.split(':').map(Number);
        const [an1H, an1M] = value.an1E.split(':').map(Number);
        const von = tagAnfang.hour(ab1H).minute(ab1M);
        const bis = datum.hour(an1H).minute(an1M);

        const ab1Taetigkeit = bis.diff(von, 'hour', true);

        if (ab1Taetigkeit >= 8 && ab1Taetigkeit < 24) Berechnung.E.S8++;
        else if (ab1Taetigkeit >= 24) Berechnung.E.S14++;
      }
    });

    Berechnung.N.F = NMonat.length;

    return Berechnung;
  }
}
