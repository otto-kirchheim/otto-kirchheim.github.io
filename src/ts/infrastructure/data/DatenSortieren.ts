import type { Dayjs } from 'dayjs';

export default function DatenSortieren<T extends Record<string, string | number | boolean | Dayjs | undefined>>(
  daten: T[],
  sortBy: string | number = 0,
  type = 'number',
) {
  daten.sort((x: T, y: T) => {
    let xp: string | number | boolean | Dayjs = x[sortBy] ?? '';
    let yp: string | number | boolean | Dayjs = y[sortBy] ?? '';
    if (type === 'number') {
      xp = +xp;
      yp = +yp;
    }
    if (xp < yp) return xp == yp ? 0 : -1;
    else return xp == yp ? 0 : 1;
  });
}
