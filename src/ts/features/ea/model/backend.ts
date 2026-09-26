/** Backend-Grenze des Entgeltausgleichs: Dokumenttyp, Mapper (Laden/Speichern) und Endpunkte. */

import type { IEntgeltausgleich } from '@otto-kirchheim/nebengeld-shared';
import type { IDatenEA } from '@/types';
import dayjs from '@/shared/lib/date/configDayjs';
import { resolveYearMonth } from '@/shared/lib/date/periodFromDate';
import { createResourceEndpoints } from '@/shared/api/resourceApi';

export interface BackendEA extends IEntgeltausgleich {
  User?: string;
  Monat: number;
  Jahr: number;
  updatedAt?: string;
}

/**
 * Konvertiert ein Backend-Entgeltausgleich-Dokument in das Frontend-Format.
 *
 * @param doc - Backend-Dokument.
 * @returns Frontend-Zeile mit `Tag` als `DD.MM.YYYY`; fehlende Texte werden leere Strings.
 */
export function eaFromBackend(doc: BackendEA): IDatenEA {
  return {
    _id: doc._id,
    EWT: doc.EWT ?? undefined,
    Tag: dayjs(doc.Tag).format('DD.MM.YYYY'),
    Dauer: doc.Dauer,
    Taetigkeit: doc.Taetigkeit ?? '',
    Entgeltgruppe: doc.Entgeltgruppe ?? '',
  };
}

/**
 * Konvertiert einen Frontend-EA-Eintrag in das Backend-Format.
 *
 * @param item - Frontend-Zeile.
 * @param monat - Fallback-Monat bei ungueltigem `Tag`.
 * @param jahr - Fallback-Jahr bei ungueltigem `Tag`.
 * @returns Backend-Dokument ohne `User`; `EWT` ist `null` ohne Verknuepfung.
 */
export function eaToBackend(item: IDatenEA, monat: number, jahr: number): Omit<BackendEA, 'User'> {
  const period = resolveYearMonth(item.Tag, monat, jahr, 'DD.MM.YYYY');
  return {
    _id: item._id,
    // null statt undefined: undefined fällt bei JSON.stringify weg, das Entfernen der
    // EWT-Verknüpfung käme nie am Server an. null wird dort zu $unset übersetzt.
    EWT: item.EWT || null,
    Monat: period.Monat,
    Jahr: period.Jahr,
    Tag: dayjs(item.Tag, 'DD.MM.YYYY').toISOString(),
    Dauer: item.Dauer,
    // Leerstring explizit mitsenden, damit ein gelöschtes Feld beim Update auch serverseitig geleert wird.
    Taetigkeit: item.Taetigkeit,
    Entgeltgruppe: item.Entgeltgruppe,
  };
}

/** Endpunkte des Entgeltausgleichs. */
export const eaApi = createResourceEndpoints('ea', eaFromBackend, eaToBackend);
