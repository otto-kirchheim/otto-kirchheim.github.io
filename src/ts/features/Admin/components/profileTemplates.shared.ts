import { HOLIDAY_REGION_OPTIONS } from '@/infrastructure/date/holidayRegion';

export type FahrzeitRow = { key: string; text: string; value: string };

export type VorgabenBRow = {
  key: string;
  rawValue: Record<string, unknown>;
  value: {
    Name: string;
    beginnB: { tag: number; zeit: string };
    endeB: { tag: number; zeit: string; Nwoche: boolean };
    nacht: boolean;
    beginnN: { tag: number; zeit: string; Nwoche: boolean };
    endeN: { tag: number; zeit: string; Nwoche: boolean };
    standard: boolean;
  };
};

export type TemplateContentDraft = {
  Pers: Record<string, string>;
  Arbeitszeit: Record<string, string>;
  Fahrzeit: FahrzeitRow[];
  VorgabenB: VorgabenBRow[];
  Einstellungen: {
    aktivierteTabs: string[];
    benoetigteZulagen: string[];
  };
};

type TemplateFieldOption = { value: string; label: string };

type TemplateField = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'select';
  options?: TemplateFieldOption[];
};

export const PERS_FIELDS: TemplateField[] = [
  { key: 'Vorname', label: 'Vorname' },
  { key: 'Nachname', label: 'Nachname' },
  { key: 'PNummer', label: 'Personalnummer' },
  { key: 'Telefon', label: 'Telefon' },
  { key: 'Adress1', label: 'Wohnsitz 1' },
  { key: 'Adress2', label: 'Wohnsitz 2' },
  { key: 'ErsteTkgSt', label: 'Erste Tätigkeitsstätte' },
  { key: 'ErsteTkgStAdresse', label: 'Adresse Erste Tätigkeitsstätte' },
  {
    key: 'Bundesland',
    label: 'Bundesland',
    type: 'select',
    options: [{ value: '', label: 'Bitte wählen…' }, ...HOLIDAY_REGION_OPTIONS],
  },
  { key: 'Betrieb', label: 'Betrieb' },
  { key: 'OE', label: 'OE' },
  { key: 'Gewerk', label: 'Gewerk' },
  { key: 'kmArbeitsort', label: 'Entfernung Arbeitsstätte (km)', type: 'number' },
  { key: 'nBhf', label: 'Nächster Bahnhof' },
  { key: 'kmnBhf', label: 'Entfernung Bahnhof (km)', type: 'number' },
  { key: 'TB', label: 'Tarif / Beamter' },
];

export const ARBEITSZEIT_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'bT', label: 'Beginn Tag' },
  { key: 'eT', label: 'Ende Tag Mo-Do' },
  { key: 'eTF', label: 'Ende Tag Fr' },
  { key: 'bS', label: 'Beginn Sonderschicht' },
  { key: 'eS', label: 'Ende Sonderschicht' },
  { key: 'bN', label: 'Beginn Nacht' },
  { key: 'eN', label: 'Ende Nacht' },
  { key: 'bBN', label: 'Beginn Nacht Bereitschaft' },
  { key: 'rZ', label: 'Fahrzeit Wo/Ao' },
];

export const TAB_OPTIONS = [
  { key: 'bereitschaft', label: 'Bereitschaft' },
  { key: 'ewt', label: 'EWT' },
  { key: 'neben', label: 'Nebenbezüge' },
] as const;

export const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Mo' },
  { value: 2, label: 'Di' },
  { value: 3, label: 'Mi' },
  { value: 4, label: 'Do' },
  { value: 5, label: 'Fr' },
  { value: 6, label: 'Sa' },
  { value: 7, label: 'So' },
] as const;

export function normalizeVorgabenBRows(rows: VorgabenBRow[], preferredStandardIndex?: number): VorgabenBRow[] {
  if (rows.length === 0) return [];

  let standardIndex = preferredStandardIndex ?? rows.findIndex(row => row.value.standard);
  if (standardIndex < 0 || standardIndex >= rows.length) standardIndex = 0;

  return rows.map((row, index) => ({
    ...row,
    key: String(index + 1),
    value: {
      ...row.value,
      standard: index === standardIndex,
    },
  }));
}
