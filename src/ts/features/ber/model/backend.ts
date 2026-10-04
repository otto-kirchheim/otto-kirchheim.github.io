/** Backend-Grenze der Bereitschaft: Dokumenttypen, Mapper (Laden/Speichern) und Endpunkte fuer BZ und BE. */

import type { IBereitschaftseinsatz, IBereitschaftszeitraum } from '@otto-kirchheim/nebengeld-shared';
import type { IDatenBE, IDatenBZ } from '@/types';
import dayjs from '@/shared/lib/date/configDayjs';
import { resolveYearMonth } from '@/shared/lib/date/periodFromDate';
import { createResourceEndpoints } from '@/shared/api/resourceApi';

export interface BackendBereitschaftszeitraum extends IBereitschaftszeitraum {
  User?: string;
  Monat: number;
  Jahr: number;
  updatedAt?: string;
}

export interface BackendBereitschaftseinsatz extends IBereitschaftseinsatz {
  User?: string;
  Monat: number;
  Jahr: number;
  updatedAt?: string;
}

/**
 * Konvertiert ein Backend-Bereitschaftszeitraum-Dokument in das Frontend-Format.
 *
 * @param doc - Backend-Dokument.
 * @returns Frontend-Zeile; fehlende `Pause` wird `0`.
 */
export function bzFromBackend(doc: BackendBereitschaftszeitraum): IDatenBZ {
  return {
    _id: doc._id,
    Beginn: doc.Beginn,
    Ende: doc.Ende,
    Pause: doc.Pause ?? 0,
  };
}

/**
 * Konvertiert ein Backend-Bereitschaftseinsatz-Dokument in das Frontend-Format.
 *
 * @param doc - Backend-Dokument.
 * @returns Frontend-Zeile mit `Tag` als `DD.MM.YYYY`; ein einzelner `Bereitschaftszeitraum` wird zum Array.
 */
export function beFromBackend(doc: BackendBereitschaftseinsatz): IDatenBE {
  return {
    _id: doc._id,
    Bereitschaftszeitraum: Array.isArray(doc.Bereitschaftszeitraum)
      ? doc.Bereitschaftszeitraum
      : doc.Bereitschaftszeitraum
        ? [doc.Bereitschaftszeitraum as unknown as string]
        : undefined,
    Tag: dayjs(doc.Tag).format('DD.MM.YYYY'),
    Auftragsnummer: doc.Auftragsnummer,
    Beginn: doc.Beginn,
    Ende: doc.Ende,
    LRE: doc.LRE,
    PrivatKm: doc.PrivatKm,
  };
}

/**
 * Konvertiert einen Frontend-BZ-Eintrag in das Backend-Format.
 *
 * @param item - Frontend-Zeile.
 * @param monat - Fallback-Monat bei ungueltigem `Beginn`.
 * @param jahr - Fallback-Jahr bei ungueltigem `Beginn`.
 * @returns Backend-Dokument ohne `User`; `Monat`/`Jahr` stammen aus `Beginn`.
 */
export function bzToBackend(item: IDatenBZ, monat: number, jahr: number): Omit<BackendBereitschaftszeitraum, 'User'> {
  const period = resolveYearMonth(item.Beginn, monat, jahr);

  return {
    _id: item._id,
    Monat: period.Monat,
    Jahr: period.Jahr,
    Beginn: item.Beginn,
    Ende: item.Ende,
    Pause: item.Pause,
  };
}

/**
 * Konvertiert einen Frontend-BE-Eintrag in das Backend-Format.
 *
 * @param item - Frontend-Zeile.
 * @param monat - Fallback-Monat bei ungueltigem `Tag`.
 * @param jahr - Fallback-Jahr bei ungueltigem `Tag`.
 * @returns Backend-Dokument ohne `User`; `Tag` als ISO-String, `Monat`/`Jahr` aus `Tag`.
 */
export function beToBackend(item: IDatenBE, monat: number, jahr: number): Omit<BackendBereitschaftseinsatz, 'User'> {
  const period = resolveYearMonth(item.Tag, monat, jahr, 'DD.MM.YYYY');

  return {
    _id: item._id,
    Bereitschaftszeitraum: item.Bereitschaftszeitraum,
    Monat: period.Monat,
    Jahr: period.Jahr,
    Tag: dayjs(item.Tag, 'DD.MM.YYYY').toISOString(),
    Auftragsnummer: item.Auftragsnummer,
    Beginn: item.Beginn,
    Ende: item.Ende,
    LRE: item.LRE,
    PrivatKm: item.PrivatKm,
  };
}

/** Endpunkte der Bereitschaftszeitraeume. */
export const bereitschaftszeitraumApi = createResourceEndpoints('bereitschaftszeitraum', bzFromBackend, bzToBackend);

/** Endpunkte der Bereitschaftseinsaetze. */
export const bereitschaftseinsatzApi = createResourceEndpoints('bereitschaftseinsatz', beFromBackend, beToBackend);
