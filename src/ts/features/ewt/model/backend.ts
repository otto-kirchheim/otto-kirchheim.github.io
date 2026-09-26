/** Backend-Grenze der EWT: Dokumenttyp, Mapper (Laden/Speichern) und Endpunkte. */

import type { IEinsatzwechseltaetigkeit } from '@otto-kirchheim/nebengeld-shared';
import type { IDatenEWT } from '@/types';
import dayjs from '@/shared/lib/date/configDayjs';
import { resolveYearMonth } from '@/shared/lib/date/periodFromDate';
import { createResourceEndpoints } from '@/shared/api/resourceApi';

export interface BackendEWT extends IEinsatzwechseltaetigkeit {
  User?: string;
  Monat: number;
  Jahr: number;
  updatedAt?: string;
}

/**
 * Konvertiert ein Backend-EWT-Dokument in das Frontend-Format.
 *
 * @param doc - Backend-Dokument.
 * @returns Frontend-Zeile mit `Tag`/`Buchungstag` als `YYYY-MM-DD` (Buchungstag Standard: `Tag`); fehlende Zeiten werden leere Strings.
 */
export function ewtFromBackend(doc: BackendEWT): IDatenEWT {
  return {
    _id: doc._id,
    Tag: dayjs(doc.Tag).format('YYYY-MM-DD'),
    Buchungstag: dayjs(doc.Buchungstag ?? doc.Tag).format('YYYY-MM-DD'),
    Einsatzort: doc.Einsatzort ?? '',
    Schicht: doc.Schicht,
    abWE: doc.abWE ?? '',
    ab1E: doc.ab1E ?? '',
    anEE: doc.anEE ?? '',
    beginE: doc.beginE ?? '',
    endeE: doc.endeE ?? '',
    abEE: doc.abEE ?? '',
    an1E: doc.an1E ?? '',
    anWE: doc.anWE ?? '',
    berechnen: doc.berechnen ?? true,
  };
}

/**
 * Konvertiert einen Frontend-EWT-Eintrag in das Backend-Format.
 *
 * @param item - Frontend-Zeile.
 * @param monat - Fallback-Monat bei ungueltigem `Tag`.
 * @param jahr - Fallback-Jahr bei ungueltigem `Tag`.
 * @returns Backend-Dokument ohne `User`; `Tag`/`Buchungstag` als ISO-String (Buchungstag Standard: `Tag`).
 */
export function ewtToBackend(item: IDatenEWT, monat: number, jahr: number): Omit<BackendEWT, 'User'> {
  const buchungstag = item.Buchungstag || item.Tag;
  const period = resolveYearMonth(item.Tag, monat, jahr, 'YYYY-MM-DD');

  return {
    _id: item._id,
    Monat: period.Monat,
    Jahr: period.Jahr,
    Tag: dayjs(item.Tag).toISOString(),
    Buchungstag: dayjs(buchungstag).toISOString(),
    // Leere Strings explizit mitsenden: `undefined` fällt bei JSON.stringify weg,
    // wodurch ein Update gelöschte Zeiten nicht überschreiben würde (alter Wert bliebe erhalten).
    Einsatzort: item.Einsatzort,
    Schicht: item.Schicht,
    abWE: item.abWE,
    ab1E: item.ab1E,
    anEE: item.anEE,
    beginE: item.beginE,
    endeE: item.endeE,
    abEE: item.abEE,
    an1E: item.an1E,
    anWE: item.anWE,
    berechnen: item.berechnen,
  };
}

/** Endpunkte der EWT. */
export const ewtApi = createResourceEndpoints('einsatzwechseltaetigkeit', ewtFromBackend, ewtToBackend);
