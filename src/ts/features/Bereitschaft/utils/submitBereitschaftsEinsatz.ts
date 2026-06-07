import {
  B_WECHSEL_MINUTE,
  B_WECHSEL_STUNDE,
  calculateBereitschaftsZeiten,
  getBereitschaftsEinsatzDaten,
  getBereitschaftsZeitraumDaten,
  persistBereitschaftsEinsatzTableData,
} from '.';
import isSameBereitschaftsEinsatz from './isSameBereitschaftsEinsatz';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import type { CustomHTMLTableElement, IDatenBE, IDatenBZ } from '@/types';
import { default as Storage } from '@/infrastructure/storage/Storage';
import { default as clearLoading } from '@/infrastructure/ui/clearLoading';
import { default as setLoading } from '@/infrastructure/ui/setLoading';
import dayjs from '@/infrastructure/date/configDayjs';
import { getMonatFromBZ } from '@/infrastructure/date/getMonatFromItem';
import { flushResource, scheduleAutoSave } from '@/infrastructure/autoSave/autoSave';

// ─── Grenz-Hilfsfunktion ─────────────────────────────────────────────────────

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

type PartialResolution =
  | { kind: 'extend-end'; updatedBz: IDatenBZ; newBz?: IDatenBZ }
  | { kind: 'extend-start'; updatedBz: IDatenBZ; newBz?: IDatenBZ };

type GapResolution =
  | { kind: 'merge'; mergedBz: IDatenBZ; deletedBz: IDatenBZ }
  | { kind: 'boundary'; updatedStartBz: IDatenBZ; updatedEndBz: IDatenBZ };

// ─── Coverage-Klassifikation ─────────────────────────────────────────────────

export function classifyBzCoverage(
  bzData: IDatenBZ[],
  einsatzStart: ReturnType<typeof dayjs>,
  einsatzEnd: ReturnType<typeof dayjs>,
): BzCoverage {
  const startBz = bzData.find(bz => {
    const s = dayjs(String(bz.beginB));
    const e = dayjs(String(bz.endeB));
    return einsatzStart.isSameOrAfter(s) && einsatzStart.isSameOrBefore(e);
  });
  const endBz = bzData.find(bz => {
    const s = dayjs(String(bz.beginB));
    const e = dayjs(String(bz.endeB));
    return einsatzEnd.isSameOrAfter(s) && einsatzEnd.isSameOrBefore(e);
  });
  if (!startBz && !endBz) return { kind: 'none' };
  if (startBz && endBz) {
    const adjacent = startBz === endBz || dayjs(String(startBz.endeB)).isSame(dayjs(String(endBz.beginB)));
    return adjacent ? { kind: 'complete', startBz, endBz } : { kind: 'gap', startBz, endBz };
  }
  return { kind: 'partial', startBz, endBz };
}

// ─── Gap / Partial-Auflösung ─────────────────────────────────────────────────

function resolveGap(startBz: IDatenBZ, endBz: IDatenBZ): GapResolution {
  const boundary = findFirstBoundaryInRange(dayjs(String(startBz.endeB)), dayjs(String(endBz.beginB)));
  if (boundary)
    return {
      kind: 'boundary',
      updatedStartBz: { ...startBz, endeB: boundary.toISOString() },
      updatedEndBz: { ...endBz, beginB: boundary.toISOString() },
    };
  return { kind: 'merge', mergedBz: { ...startBz, endeB: endBz.endeB }, deletedBz: endBz };
}

function resolvePartial(
  coverage: Extract<BzCoverage, { kind: 'partial' }>,
  einsatzStart: ReturnType<typeof dayjs>,
  einsatzEnd: ReturnType<typeof dayjs>,
): PartialResolution {
  if (coverage.startBz) {
    const boundary = findFirstBoundaryInRange(dayjs(String(coverage.startBz.endeB)), einsatzEnd);
    if (boundary)
      return {
        kind: 'extend-end',
        updatedBz: { ...coverage.startBz, endeB: boundary.toISOString() },
        newBz: { beginB: boundary.toISOString(), endeB: einsatzEnd.toISOString(), pauseB: 0 },
      };
    return { kind: 'extend-end', updatedBz: { ...coverage.startBz, endeB: einsatzEnd.toISOString() } };
  }
  const boundary = findFirstBoundaryInRange(einsatzStart, dayjs(String(coverage.endBz!.beginB)));
  if (boundary)
    return {
      kind: 'extend-start',
      updatedBz: { ...coverage.endBz!, beginB: boundary.toISOString() },
      newBz: { beginB: einsatzStart.toISOString(), endeB: boundary.toISOString(), pauseB: 0 },
    };
  return { kind: 'extend-start', updatedBz: { ...coverage.endBz!, beginB: einsatzStart.toISOString() } };
}

// ─── Geteilte Validatoren ────────────────────────────────────────────────────

export function hasOverlap(
  einsatzStart: ReturnType<typeof dayjs>,
  einsatzEnd: ReturnType<typeof dayjs>,
  exclude?: IDatenBE,
): boolean {
  return getBereitschaftsEinsatzDaten().some(be => {
    if (exclude && isSameBereitschaftsEinsatz(be, exclude)) return false;
    const beDate = dayjs(be.tagBE, 'DD.MM.YYYY').format('YYYY-MM-DD');
    const existingStart = dayjs(`${beDate}T${be.beginBE}`);
    const existingEndRaw = dayjs(`${beDate}T${be.endeBE}`);
    const existingEnd = existingEndRaw.isAfter(existingStart) ? existingEndRaw : existingEndRaw.add(1, 'day');
    return einsatzStart.isBefore(existingEnd) && existingStart.isBefore(einsatzEnd);
  });
}

export function hasConflictingLre1(einsatzStart: ReturnType<typeof dayjs>, tagBE: string, exclude?: IDatenBE): boolean {
  const cutoff = dayjs(tagBE)
    .set('hour', B_WECHSEL_STUNDE)
    .set('minute', B_WECHSEL_MINUTE)
    .set('second', 0)
    .set('millisecond', 0);
  const windowStart = einsatzStart.isBefore(cutoff)
    ? cutoff.subtract(1, 'day').set('hour', B_WECHSEL_STUNDE).set('minute', B_WECHSEL_MINUTE)
    : cutoff;
  const windowEnd = windowStart.add(1, 'day').set('hour', B_WECHSEL_STUNDE).set('minute', B_WECHSEL_MINUTE);
  return getBereitschaftsEinsatzDaten().some(be => {
    if (be.lreBE !== 'LRE 1') return false;
    if (exclude && isSameBereitschaftsEinsatz(be, exclude)) return false;
    const beDate = dayjs(be.tagBE, 'DD.MM.YYYY').format('YYYY-MM-DD');
    const beStart = dayjs(`${beDate}T${be.beginBE}`);
    return beStart.isSameOrAfter(windowStart) && beStart.isBefore(windowEnd);
  });
}

// ─── Submit-Hilfsfunktionen ──────────────────────────────────────────────────

function failWith(message: string, status: 'warning' | 'error' = 'warning', timeout = 4000): false {
  clearLoading('btnESE');
  createSnackBar({ message: `Bereitschaft<br/>${message}`, status, timeout, fixed: true });
  return false;
}

const COVERAGE_WARNING: Record<'none' | 'gap' | 'partial', string> = {
  none: 'Kein passender Bereitschaftszeitraum gefunden.<br/>Bitte zuerst einen Zeitraum über "Bereitschaftszeitraum hinzufügen" anlegen oder "Bereitschaftszeitraum für diesen Einsatz anlegen?" aktivieren.',
  gap: 'Der Einsatz liegt in einer Lücke zwischen zwei Bereitschaftszeiträumen.<br/>Bitte "Bereitschaftszeitraum für diesen Einsatz anlegen?" aktivieren.',
  partial:
    'Bereitschaftszeitraum nur teilweise vorhanden.<br/>Bitte "Bereitschaftszeitraum für diesen Einsatz anlegen?" aktivieren.',
};

const COVERAGE_FINAL_WARNING: Record<'gap' | 'partial' | 'none', string> = {
  gap: 'Die Lücke zwischen den Bereitschaftszeiträumen konnte nicht geschlossen werden.',
  partial: 'Bereitschaftszeitraum konnte nicht vollständig angelegt werden.',
  none: 'Kein passender Bereitschaftszeitraum gefunden.<br/>Bitte zuerst einen Zeitraum über "Bereitschaftszeitraum hinzufügen" anlegen.',
};

function reloadBzTable(tableBZ: CustomHTMLTableElement<IDatenBZ>, monat: number): void {
  tableBZ.instance.rows.loadSmart(getBereitschaftsZeitraumDaten(undefined, undefined, { scope: 'all' }));
  tableBZ.instance.rows.setFilter(row => getMonatFromBZ(row) === monat);
}

// ─── Coverage-Handler ────────────────────────────────────────────────────────

function handleGap(
  coverage: Extract<BzCoverage, { kind: 'gap' }>,
  tableBZ: CustomHTMLTableElement<IDatenBZ>,
  tableBE: CustomHTMLTableElement<IDatenBE>,
  monat: number,
  monthBzs: IDatenBZ[],
  otherMonths: IDatenBZ[],
): { needsBeFlush: boolean } {
  const resolution = resolveGap(coverage.startBz, coverage.endBz);
  let needsBeFlush = false;

  if (resolution.kind === 'merge') {
    const { mergedBz, deletedBz } = resolution;
    const deletedId = deletedBz._id;
    Storage.set('dataBZ', [
      ...otherMonths,
      ...monthBzs.filter(bz => bz._id !== deletedId).map(bz => (bz._id === mergedBz._id ? mergedBz : bz)),
    ]);
    if (deletedId) {
      Storage.set(
        'dataBE',
        Storage.get<IDatenBE[]>('dataBE', { default: [] }).map(be =>
          be.bereitschaftszeitraumBE?.includes(deletedId)
            ? {
                ...be,
                bereitschaftszeitraumBE: be.bereitschaftszeitraumBE!.map(id =>
                  id === deletedId ? (mergedBz._id ?? id) : id,
                ),
              }
            : be,
        ),
      );
      let beChanged = false;
      for (const row of tableBE.instance.rows.array) {
        const ref = row.cells.bereitschaftszeitraumBE;
        if (!ref?.includes(deletedId)) continue;
        row.cells.bereitschaftszeitraumBE = ref.map(id => (id === deletedId ? (mergedBz._id ?? id) : id));
        if (row._state === 'unchanged') row._state = 'modified';
        beChanged = true;
      }
      if (beChanged) scheduleAutoSave('BE');
      needsBeFlush = true;
    }
    reloadBzTable(tableBZ, monat);
    for (const row of tableBZ.instance.rows.array) {
      if (row._id === mergedBz._id) {
        row._state = 'modified';
        break;
      }
    }
  } else {
    const { updatedStartBz, updatedEndBz } = resolution;
    Storage.set('dataBZ', [
      ...otherMonths,
      ...monthBzs.map(bz => {
        if (bz._id === updatedStartBz._id) return updatedStartBz;
        if (bz._id === updatedEndBz._id) return updatedEndBz;
        return bz;
      }),
    ]);
    reloadBzTable(tableBZ, monat);
    for (const row of tableBZ.instance.rows.array) {
      if (row._id === updatedStartBz._id || row._id === updatedEndBz._id) row._state = 'modified';
    }
  }

  createSnackBar({
    message: 'Bereitschaft<br/>Bereitschaftszeitraum angepasst',
    status: 'success',
    timeout: 3000,
    fixed: true,
  });
  return { needsBeFlush };
}

function handlePartial(
  coverage: Extract<BzCoverage, { kind: 'partial' }>,
  einsatzStart: ReturnType<typeof dayjs>,
  einsatzEnd: ReturnType<typeof dayjs>,
  tableBZ: CustomHTMLTableElement<IDatenBZ>,
  monat: number,
  savedData: IDatenBZ[],
): void {
  const resolution = resolvePartial(coverage, einsatzStart, einsatzEnd);
  const updatedAll = savedData.map(bz => (bz._id === resolution.updatedBz._id ? resolution.updatedBz : bz));
  if (resolution.newBz) updatedAll.push(resolution.newBz);
  Storage.set('dataBZ', updatedAll);
  reloadBzTable(tableBZ, monat);
  for (const row of tableBZ.instance.rows.array) {
    if (row._id === resolution.updatedBz._id) {
      row._state = 'modified';
      break;
    }
  }
  createSnackBar({
    message: 'Bereitschaft<br/>Bereitschaftszeitraum erweitert',
    status: 'success',
    timeout: 3000,
    fixed: true,
  });
}

function handleNone(
  einsatzStart: ReturnType<typeof dayjs>,
  einsatzEnd: ReturnType<typeof dayjs>,
  tableBZ: CustomHTMLTableElement<IDatenBZ>,
  monat: number,
  monthBzs: IDatenBZ[],
  otherMonths: IDatenBZ[],
): void {
  const data = calculateBereitschaftsZeiten(einsatzStart, einsatzEnd, einsatzEnd, einsatzEnd, false, monthBzs);
  if (!data) return;
  Storage.set('dataBZ', [...otherMonths, ...data]);
  reloadBzTable(tableBZ, monat);
  createSnackBar({
    message: 'Bereitschaft<br/>Neuer Zeitraum hinzugefügt',
    status: 'success',
    timeout: 3000,
    fixed: true,
  });
}

// ─── Submit ──────────────────────────────────────────────────────────────────

export default async function submitBereitschaftsEinsatz(
  $modal: HTMLDivElement,
  tableBE: CustomHTMLTableElement<IDatenBE>,
  tableBZ: CustomHTMLTableElement<IDatenBZ>,
): Promise<boolean> {
  setLoading('btnESE');

  const datumInput = $modal.querySelector<HTMLInputElement>('#Datum');
  const sapnrInput = $modal.querySelector<HTMLInputElement>('#SAPNR');
  const vonInput = $modal.querySelector<HTMLInputElement>('#ZeitVon');
  const bisInput = $modal.querySelector<HTMLInputElement>('#ZeitBis');
  const lreSelect = $modal.querySelector<HTMLSelectElement>('#LRE');
  const privatkmInput = $modal.querySelector<HTMLInputElement>('#privatkm');
  const berZeitInput = $modal.querySelector<HTMLInputElement>('#berZeit');

  if (!datumInput || !sapnrInput || !vonInput || !bisInput || !lreSelect || !privatkmInput || !berZeitInput)
    throw new Error('Input Element nicht gefunden');

  const tagBE = datumInput.value;

  if (!['LRE 1', 'LRE 2', 'LRE 1/2 ohne x', 'LRE 3', 'LRE 3 ohne x'].includes(lreSelect.value))
    throw new Error('LRE unbekannt');

  if (vonInput.value === bisInput.value) return failWith('Beginn und Ende dürfen nicht identisch sein.');

  const daten: IDatenBE = {
    tagBE: dayjs(tagBE).format('DD.MM.YYYY'),
    auftragsnummerBE: sapnrInput.value,
    beginBE: vonInput.value,
    endeBE: bisInput.value,
    lreBE: lreSelect.value as IDatenBE['lreBE'],
    privatkmBE: Number(privatkmInput.value),
  };

  const berZeit = berZeitInput.checked;
  const einsatzStart = dayjs(`${tagBE}T${daten.beginBE}`);
  const einsatzEndRaw = dayjs(`${tagBE}T${daten.endeBE}`);
  const einsatzEnd = einsatzEndRaw.isAfter(einsatzStart) ? einsatzEndRaw : einsatzEndRaw.add(1, 'day');

  let coverage = classifyBzCoverage(getBereitschaftsZeitraumDaten(), einsatzStart, einsatzEnd);

  if (coverage.kind !== 'complete') {
    if (!berZeit) return failWith(COVERAGE_WARNING[coverage.kind], 'warning', 5000);

    const savedData = Storage.get<IDatenBZ[]>('dataBZ', { default: [] });
    const savedBeData = Storage.get<IDatenBE[]>('dataBE', { default: [] });
    const monat = einsatzStart.month() + 1;
    const monthBzs = savedData.filter(item => getMonatFromBZ(item) === monat);
    const otherMonths = savedData.filter(item => getMonatFromBZ(item) !== monat);

    try {
      let needsBeFlush = false;
      if (coverage.kind === 'gap') ({ needsBeFlush } = handleGap(coverage, tableBZ, tableBE, monat, monthBzs, otherMonths));
      else if (coverage.kind === 'partial')
        handlePartial(coverage, einsatzStart, einsatzEnd, tableBZ, monat, savedData);
      else handleNone(einsatzStart, einsatzEnd, tableBZ, monat, monthBzs, otherMonths);

      await flushResource('BZ');
      if (needsBeFlush) await flushResource('BE');
      coverage = classifyBzCoverage(getBereitschaftsZeitraumDaten(), einsatzStart, einsatzEnd);
    } catch (error) {
      Storage.set('dataBZ', savedData);
      Storage.set('dataBE', savedBeData);
      reloadBzTable(tableBZ, monat);
      tableBE.instance.rows.loadSmart(getBereitschaftsEinsatzDaten());
      return failWith(
        `Fehler beim Anlegen des Zeitraums: ${error instanceof Error ? error.message : String(error)}`,
        'error',
      );
    }
  }

  if (coverage.kind !== 'complete') return failWith(COVERAGE_FINAL_WARNING[coverage.kind], 'warning', 5000);

  const { startBz, endBz } = coverage;
  const bzIds = [startBz._id, endBz._id !== startBz._id ? endBz._id : undefined].filter(Boolean) as string[];
  if (bzIds.length) daten.bereitschaftszeitraumBE = bzIds;

  if (hasOverlap(einsatzStart, einsatzEnd)) return failWith('Bereitschaftseinsätze dürfen sich nicht überschneiden.');

  if (daten.lreBE === 'LRE 1' && hasConflictingLre1(einsatzStart, tagBE))
    return failWith('Im gewählten Bereitschaftszeitraum existiert bereits ein LRE 1.');

  tableBE.instance.rows.add(daten);
  persistBereitschaftsEinsatzTableData(tableBE.instance);
  clearLoading('btnESE');
  return true;
}
