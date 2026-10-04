/** Backend-Grenze der Erschwerniszulagen (Nebengeld): Dokumenttyp, Mapper (Laden/Speichern) und Endpunkte. */

import type { INebengeld } from '@otto-kirchheim/nebengeld-shared';
import type { IDatenN } from '@/types';
import { formatNebengeldZulagen, normalizeNebengeldZulagen } from './nebengeldZulagen';
import dayjs from '@/shared/lib/date/configDayjs';
import { resolveYearMonth } from '@/shared/lib/date/periodFromDate';
import { createResourceEndpoints } from '@/shared/api/resourceApi';

export interface BackendNebengeld extends INebengeld {
  User?: string;
  Monat: number;
  Jahr: number;
  updatedAt?: string;
}

/**
 * Konvertiert ein Backend-Nebengeld-Dokument in das Frontend-Format. Zulagen mit `Wert` 0 entfallen;
 * `zulagenAnzeigeN` wird daraus fuer die Tabelle abgeleitet.
 *
 * @param doc - Backend-Dokument.
 * @returns Frontend-Zeile mit `Tag` als `DD.MM.YYYY`.
 */
export function nebengeldFromBackend(doc: BackendNebengeld): IDatenN {
  const Zulagen = doc.Zulagen.map(zulage => ({ Typ: zulage.Typ, Wert: zulage.Wert })).filter(z => z.Wert > 0);
  return {
    _id: doc._id,
    EWT: doc.EWT ?? undefined,
    Tag: dayjs(doc.Tag).format('DD.MM.YYYY'),
    Beginn: doc.Beginn,
    Ende: doc.Ende,
    Zulagen,
    zulagenAnzeigeN: formatNebengeldZulagen(Zulagen),
    Auftragsnummer: doc.Auftragsnummer ?? '',
  };
}

/**
 * Konvertiert einen Frontend-Nebengeld-Eintrag in das Backend-Format.
 *
 * @param item - Frontend-Zeile.
 * @param monat - Fallback-Monat bei ungueltigem `Tag`.
 * @param jahr - Fallback-Jahr bei ungueltigem `Tag`.
 * @returns Backend-Dokument ohne `User`; `EWT` ist `null` ohne Verknuepfung, `Zulagen` sind normalisiert.
 */
export function nebengeldToBackend(item: IDatenN, monat: number, jahr: number): Omit<BackendNebengeld, 'User'> {
  const period = resolveYearMonth(item.Tag, monat, jahr, 'DD.MM.YYYY');
  const normalizedZulagen = normalizeNebengeldZulagen(item);
  const zulagen: BackendNebengeld['Zulagen'] = normalizedZulagen.map(zulage => ({
    Typ: zulage.Typ,
    Wert: zulage.Wert,
  }));
  return {
    _id: item._id,
    // null statt undefined: undefined fällt bei JSON.stringify weg, das Entfernen der
    // EWT-Verknüpfung käme nie am Server an. null wird dort zu $unset übersetzt.
    EWT: item.EWT || null,
    Monat: period.Monat,
    Jahr: period.Jahr,
    Tag: dayjs(item.Tag, 'DD.MM.YYYY').toISOString(),
    Beginn: item.Beginn,
    Ende: item.Ende,
    // Leerstring explizit mitsenden, damit eine gelöschte Auftragsnummer beim Update auch serverseitig geleert wird.
    Auftragsnummer: item.Auftragsnummer,
    Zulagen: zulagen,
  };
}

/** Endpunkte der Erschwerniszulagen. */
export const nebengeldApi = createResourceEndpoints('nebengeld', nebengeldFromBackend, nebengeldToBackend);
