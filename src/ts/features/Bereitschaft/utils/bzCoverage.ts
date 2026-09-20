import type { IDatenBZ } from '@/types';
import { B_WECHSEL_MINUTE, B_WECHSEL_STUNDE, getBereitschaftsZeitraumDaten } from '.';
import dayjs from '@/infrastructure/date/configDayjs';
import { flushResource } from '@/infrastructure/autoSave/autoSave';

// ─── Grenz-Hilfsfunktion ─────────────────────────────────────────────────────

/**
 * Sucht die erste Grenze, an der Bereitschaftszeiträume getrennt werden (B-Wechselzeit oder Monatswechsel).
 *
 * @param start - Beginn des Bereichs (exklusiv).
 * @param end - Ende des Bereichs (exklusiv).
 * @returns Frühester Wechselzeitpunkt (nächste 08:00-Uhr-Grenze oder nächster Monatsbeginn) strikt zwischen `start` und `end`; `null`, wenn keiner im Bereich liegt.
 */
function findFirstBoundaryInRange(
  start: ReturnType<typeof dayjs>,
  end: ReturnType<typeof dayjs>,
): ReturnType<typeof dayjs> | null {
  let eightB = start.startOf('day').hour(B_WECHSEL_STUNDE).minute(B_WECHSEL_MINUTE).second(0).millisecond(0);
  if (!eightB.isAfter(start))
    eightB = eightB.add(1, 'day').hour(B_WECHSEL_STUNDE).minute(B_WECHSEL_MINUTE).second(0).millisecond(0);
  const monthB = start.startOf('month').add(1, 'month').startOf('day');
  const candidates = [eightB, monthB].filter(b => b.isAfter(start) && b.isBefore(end));
  if (!candidates.length) return null;
  return candidates.reduce((a, b) => (a.isBefore(b) ? a : b));
}

// ─── Coverage-Typen ──────────────────────────────────────────────────────────

export type BzCoverage =
  | { kind: 'complete'; startBz: IDatenBZ; endBz: IDatenBZ }
  | { kind: 'gap'; startBz: IDatenBZ; endBz: IDatenBZ }
  | { kind: 'partial'; startBz: IDatenBZ | undefined; endBz: IDatenBZ | undefined }
  | { kind: 'none' };

export type PartialResolution =
  | { kind: 'extend-end'; updatedBz: IDatenBZ; newBz?: IDatenBZ }
  | { kind: 'extend-start'; updatedBz: IDatenBZ; newBz?: IDatenBZ };

export type GapResolution =
  | { kind: 'merge'; mergedBz: IDatenBZ; deletedBz: IDatenBZ }
  | { kind: 'boundary'; updatedStartBz: IDatenBZ; updatedEndBz: IDatenBZ };

// ─── Sync-Absicherung ────────────────────────────────────────────────────────

/**
 * Lokal angelegte/geänderte Zeile, die den Server noch nicht erreicht hat (kein `_id` bzw. `__localState`).
 *
 * @param bz - Bereitschaftszeitraum-Zeile.
 * @returns `true`, wenn die Zeile noch nicht auf dem Server ist.
 */
export function isBzUnsynced(bz: IDatenBZ): boolean {
  return !bz._id || bz.__localState === 'modified';
}

/**
 * Erzwingt die Speicherreihenfolge "erst BZ, dann BE" auch für den bisher ungeprüften Fall einer
 * bereits 'complete' Coverage: Ist eine der beiden Grenz-BZ noch nicht synchronisiert (z.B. direkt
 * nacheinander angelegt: BZ, dann BE), wird sie zuerst gespeichert. `flushResource` wirft nie (Fehler
 * werden intern von AutoSave behandelt/angezeigt, siehe `saveResourceNow`) -- schlägt der Sync
 * dennoch fehl, bleibt die Coverage unverändert und das bestehende Verhalten (BE ohne BZ-Referenz)
 * greift wie bisher. Das Speichern selbst wird dadurch nie blockiert oder fehlschlagen gelassen.
 *
 * @param coverage - Bereits ermittelte Coverage; nur `complete` wird bearbeitet.
 * @param einsatzStart - Beginn des Einsatzes.
 * @param einsatzEnd - Ende des Einsatzes.
 * @returns Ursprüngliche Coverage oder, nach dem Flush, die neu klassifizierte.
 */
export async function ensureCompleteBzSynced(
  coverage: BzCoverage,
  einsatzStart: ReturnType<typeof dayjs>,
  einsatzEnd: ReturnType<typeof dayjs>,
): Promise<BzCoverage> {
  if (coverage.kind !== 'complete') return coverage;
  if (!isBzUnsynced(coverage.startBz) && !isBzUnsynced(coverage.endBz)) return coverage;
  await flushResource('BZ');
  return classifyBzCoverage(
    getBereitschaftsZeitraumDaten(undefined, undefined, { excludeDeleted: true }),
    einsatzStart,
    einsatzEnd,
  );
}

// ─── Coverage-Klassifikation ─────────────────────────────────────────────────

/**
 * Klassifiziert, wie gut die Bereitschaftszeiträume den Einsatz abdecken: BZ, in dem Start bzw. Ende liegt, entscheidet die Art.
 *
 * @param bzData - Nicht gelöschte BZ-Zeilen.
 * @param einsatzStart - Beginn des Einsatzes.
 * @param einsatzEnd - Ende des Einsatzes.
 * @returns `complete` (Start und Ende in gleichem/direkt angrenzendem BZ), `gap` (beide gefunden, aber nicht angrenzend), `partial` (nur eine Seite gedeckt) oder `none`.
 */
export function classifyBzCoverage(
  bzData: IDatenBZ[],
  einsatzStart: ReturnType<typeof dayjs>,
  einsatzEnd: ReturnType<typeof dayjs>,
): BzCoverage {
  const startBz = bzData.find(bz => {
    const s = dayjs(String(bz.Beginn));
    const e = dayjs(String(bz.Ende));
    return einsatzStart.isSameOrAfter(s) && einsatzStart.isSameOrBefore(e);
  });
  const endBz = bzData.find(bz => {
    const s = dayjs(String(bz.Beginn));
    const e = dayjs(String(bz.Ende));
    return einsatzEnd.isSameOrAfter(s) && einsatzEnd.isSameOrBefore(e);
  });
  if (!startBz && !endBz) return { kind: 'none' };
  if (startBz && endBz) {
    const adjacent = startBz === endBz || dayjs(String(startBz.Ende)).isSame(dayjs(String(endBz.Beginn)));
    return adjacent ? { kind: 'complete', startBz, endBz } : { kind: 'gap', startBz, endBz };
  }
  return { kind: 'partial', startBz, endBz };
}

// ─── Gap / Partial-Auflösung ─────────────────────────────────────────────────

/**
 * Schließt die Lücke zwischen zwei Bereitschaftszeiträumen.
 *
 * @param startBz - BZ, in dem der Einsatz beginnt.
 * @param endBz - BZ, in dem der Einsatz endet.
 * @returns `boundary`: beide BZ werden an der ersten Wechselgrenze in der Lücke aneinandergelegt; ohne Grenze `merge`: `startBz` wird bis `endBz.Ende` verlängert und `endBz` entfällt.
 */
export function resolveGap(startBz: IDatenBZ, endBz: IDatenBZ): GapResolution {
  const boundary = findFirstBoundaryInRange(dayjs(String(startBz.Ende)), dayjs(String(endBz.Beginn)));
  if (boundary)
    return {
      kind: 'boundary',
      updatedStartBz: { ...startBz, Ende: boundary.toISOString() },
      updatedEndBz: { ...endBz, Beginn: boundary.toISOString() },
    };
  return { kind: 'merge', mergedBz: { ...startBz, Ende: endBz.Ende }, deletedBz: endBz };
}

/**
 * Erweitert den vorhandenen Bereitschaftszeitraum bis zum Einsatzende bzw. rückwärts bis zum Einsatzbeginn.
 *
 * @param coverage - `partial`-Coverage; mindestens eine Seite ist gesetzt.
 * @param einsatzStart - Beginn des Einsatzes.
 * @param einsatzEnd - Ende des Einsatzes.
 * @returns Erweiterter BZ (`updatedBz`); liegt eine Wechselgrenze dazwischen, zusätzlich ein neuer BZ (`newBz`) für den Rest.
 */
export function resolvePartial(
  coverage: Extract<BzCoverage, { kind: 'partial' }>,
  einsatzStart: ReturnType<typeof dayjs>,
  einsatzEnd: ReturnType<typeof dayjs>,
): PartialResolution {
  if (coverage.startBz) {
    const boundary = findFirstBoundaryInRange(dayjs(String(coverage.startBz.Ende)), einsatzEnd);
    if (boundary)
      return {
        kind: 'extend-end',
        updatedBz: { ...coverage.startBz, Ende: boundary.toISOString() },
        newBz: { Beginn: boundary.toISOString(), Ende: einsatzEnd.toISOString(), Pause: 0 },
      };
    return { kind: 'extend-end', updatedBz: { ...coverage.startBz, Ende: einsatzEnd.toISOString() } };
  }
  const boundary = findFirstBoundaryInRange(einsatzStart, dayjs(String(coverage.endBz!.Beginn)));
  if (boundary)
    return {
      kind: 'extend-start',
      updatedBz: { ...coverage.endBz!, Beginn: boundary.toISOString() },
      newBz: { Beginn: einsatzStart.toISOString(), Ende: boundary.toISOString(), Pause: 0 },
    };
  return { kind: 'extend-start', updatedBz: { ...coverage.endBz!, Beginn: einsatzStart.toISOString() } };
}
