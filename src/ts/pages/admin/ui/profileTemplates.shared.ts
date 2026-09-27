import { TB_VALUES } from '@otto-kirchheim/nebengeld-shared';
import { featureRegistry } from '@/shared/lib/feature';
import { HOLIDAY_REGION_OPTIONS } from '@/shared/lib/date/holidayRegion';
import type { IVorgabenUaZ, IVorgabenUPers } from '@/types';

/**
 * Editierbarer Entwurf einer Profil-Vorlage. Pers, Arbeitszeit und die sichtbaren Bereiche sind global; alles
 * Feature-Eigene liegt in `abschnitte` (je `AdminVorlagenAbschnitt.id` aus `profilVorlage` der Admin-Anteile).
 */
export type TemplateContentDraft = {
  Pers: Record<string, string>;
  Arbeitszeit: IVorgabenUaZ | null;
  Einstellungen: {
    aktivierteTabs: string[];
  };
  abschnitte: Record<string, unknown>;
};

export type TemplateFieldOption = { value: string; label: string };

export type TemplateField = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'select';
  options?: TemplateFieldOption[];
};

/**
 * Zulässige Werte für `Pers.TB` aus dem shared-Paket; dieselbe Liste prüfen Zod und Mongoose im
 * Backend. Der Wert dient in der Berechnung als Schlüssel in die Geld-Vorgaben, ein freier Text
 * führt dort zu `undefined` und damit zu NaN-Ergebnissen.
 */
export const TB_OPTIONS: readonly IVorgabenUPers['TB'][] = TB_VALUES;

/** Pers-Felder ohne Feature-Bezug; Features ergaenzen eigene ueber `profilVorlage.persFelder` (z. B. EA). */
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
  {
    key: 'TB',
    label: 'Tarif / Beamter',
    type: 'select',
    options: [{ value: '', label: 'Bitte wählen…' }, ...TB_OPTIONS.map(value => ({ value, label: value }))],
  },
];

/**
 * Auswahl der sichtbaren Bereiche (`aktivierteTabs`) im Profil-Template: ein Eintrag je angemeldetem Feature (`meta.legacy.tabKey`, Langname).
 *
 * @returns Tab-Schluessel und Anzeigetext in `meta.order`; ohne angemeldete Features leer.
 */
export function tabOptions(): { key: string; label: string }[] {
  return featureRegistry.metas().map(meta => ({ key: meta.legacy.tabKey, label: meta.longLabel ?? meta.label }));
}

export const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Mo' },
  { value: 2, label: 'Di' },
  { value: 3, label: 'Mi' },
  { value: 4, label: 'Do' },
  { value: 5, label: 'Fr' },
  { value: 6, label: 'Sa' },
  { value: 7, label: 'So' },
] as const;
