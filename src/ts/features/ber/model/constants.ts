import dayjs from '@/shared/lib/date/configDayjs';
import type { IVorgabenUvorgabenB } from '@/types';

// Wechselzeit 08:00: Bereitschaftszeiträume werden hier getrennt; Rückfall, wenn keine Arbeitszeit vorliegt.
export const B_WECHSEL_STUNDE = 8;
export const B_WECHSEL_MINUTE = 0;
export const B_WECHSEL_ZEIT = dayjs().hour(B_WECHSEL_STUNDE).minute(B_WECHSEL_MINUTE).format('HH:mm');

// Zeiten werden je Wochentag aus `VorgabenU.Arbeitszeit` abgeleitet; die Vorgaben definieren nur Tag-/Wochen-Bereich + Schichten.
// Wird auch von Einstellungen (generateEingabeMaskeEinstellungen.ts, VorgabenBTable.tsx) als Default verwendet.
export const BereitschaftsEinsatzZeiträume: { [key: number]: IVorgabenUvorgabenB } = {
  0: {
    Name: 'B1',
    beginnB: { tag: 4 },
    endeB: { tag: 4, Nwoche: true },
    nacht: false,
    beginnN: { tag: 0, Nwoche: true },
    endeN: { tag: 4, Nwoche: true },
  },
  1: {
    Name: 'B2',
    beginnB: { tag: 4 },
    endeB: { tag: 0, Nwoche: false },
    nacht: false,
    beginnN: { tag: 0, Nwoche: false },
    endeN: { tag: 4, Nwoche: true },
  },
  2: {
    Name: 'B1 + Nacht',
    beginnB: { tag: 4 },
    endeB: { tag: 4, Nwoche: true },
    nacht: true,
    beginnN: { tag: 0, Nwoche: true },
    endeN: { tag: 4, Nwoche: true },
    standard: true,
  },
  3: {
    Name: 'B1 + Nacht (ab Sa)',
    beginnB: { tag: 4 },
    endeB: { tag: 4, Nwoche: true },
    nacht: true,
    beginnN: { tag: 6, Nwoche: false },
    endeN: { tag: 3, Nwoche: true },
  },
};
