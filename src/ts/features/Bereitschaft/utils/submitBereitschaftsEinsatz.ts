import { LreType } from '@otto-kirchheim/nebengeld-shared';
import {
  calculateBereitschaftsZeiten,
  getBereitschaftsEinsatzDaten,
  getBereitschaftsZeitraumDaten,
  persistBereitschaftsEinsatzTableData,
} from '.';
import { classifyBzCoverage, ensureCompleteBzSynced, resolveGap, resolvePartial, type BzCoverage } from './bzCoverage';
import { hasConflictingLre1, hasLre12TooClose, hasOverlap } from './bereitschaftsEinsatzPruefungen';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import type { CustomHTMLTableElement, IDatenBE, IDatenBZ } from '@/types';
import { default as Storage } from '@/shared/lib/storage/Storage';
import { default as clearLoading } from '@/infrastructure/ui/clearLoading';
import { default as setLoading } from '@/infrastructure/ui/setLoading';
import dayjs from '@/shared/lib/date/configDayjs';
import { getMonatFromBZ } from '@/shared/lib/date/getMonatFromItem';
import { flushResource, scheduleAutoSave } from '@/infrastructure/autoSave/autoSave';

// ─── Submit-Hilfsfunktionen ──────────────────────────────────────────────────

/**
 * Bricht den Submit ab: beendet den Lade-Zustand des Buttons `btnESE` und zeigt eine Snackbar.
 *
 * @param message - Text der Meldung (wird mit "Bereitschaft" als Titel gerendert).
 * @param status - Snackbar-Status.
 * @param timeout - Anzeigedauer in ms.
 * @returns Immer `false`, damit Aufrufer direkt `return failWith(...)` schreiben können.
 */
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

/**
 * Lädt die BZ-Tabelle aus dem Storage neu und filtert sie auf den angegebenen Monat.
 *
 * @param tableBZ - BZ-Tabellenelement.
 * @param monat - Monat (1-12), auf den die Tabelle gefiltert wird.
 */
function reloadBzTable(tableBZ: CustomHTMLTableElement<IDatenBZ>, monat: number): void {
  tableBZ.instance.rows.load(getBereitschaftsZeitraumDaten(undefined, undefined, { scope: 'all' }));
  tableBZ.instance.rows.setFilter(row => getMonatFromBZ(row) === monat);
}

// ─── Coverage-Handler ────────────────────────────────────────────────────────

/**
 * Schließt eine Lücke zwischen zwei Bereitschaftszeiträumen in Storage und Tabelle (Grenze setzen oder verschmelzen). Betroffene BZ-Zeilen werden als `modified` markiert; das Speichern übernimmt der Aufrufer.
 *
 * @param coverage - `gap`-Coverage.
 * @param tableBZ - BZ-Tabellenelement.
 * @param tableBE - BE-Tabellenelement (Verweise auf einen entfernten BZ werden umgehängt).
 * @param monat - Monat (1-12) des Einsatzes.
 * @param monthBzs - BZ-Zeilen dieses Monats.
 * @param otherMonths - BZ-Zeilen aller anderen Monate.
 * @returns `needsBeFlush`: `true`, wenn BE-Zeilen auf einen gelöschten BZ verwiesen haben und deshalb ebenfalls gespeichert werden müssen.
 */
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
          be.Bereitschaftszeitraum?.includes(deletedId)
            ? {
                ...be,
                Bereitschaftszeitraum: be.Bereitschaftszeitraum!.map(id =>
                  id === deletedId ? (mergedBz._id ?? id) : id,
                ),
              }
            : be,
        ),
      );
      let beChanged = false;
      for (const row of tableBE.instance.rows.array) {
        const ref = row.cells.Bereitschaftszeitraum;
        if (!ref?.includes(deletedId)) continue;
        row.val({
          ...row.cells,
          Bereitschaftszeitraum: ref.map(id => (id === deletedId ? (mergedBz._id ?? id) : id)),
        });
        beChanged = true;
      }
      if (beChanged) scheduleAutoSave('BE'); // redundant (val() hat _notifyChange() bereits ausgeloest), aber harmlos
      needsBeFlush = true;
    }
    reloadBzTable(tableBZ, monat);
    const mergedRow = tableBZ.instance.rows.findById(mergedBz._id);
    if (mergedRow) mergedRow._state = 'modified';
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
    for (const id of [updatedStartBz._id, updatedEndBz._id]) {
      const row = tableBZ.instance.rows.findById(id);
      if (row) row._state = 'modified';
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

/**
 * Erweitert einen teilweise passenden Bereitschaftszeitraum (ggf. mit neuem Anschluss-BZ) in Storage und Tabelle und markiert ihn als `modified`.
 *
 * @param coverage - `partial`-Coverage.
 * @param einsatzStart - Beginn des Einsatzes.
 * @param einsatzEnd - Ende des Einsatzes.
 * @param tableBZ - BZ-Tabellenelement.
 * @param monat - Monat (1-12) des Einsatzes.
 * @param savedData - Alle BZ-Zeilen aus dem Storage.
 */
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
  const updatedRow = tableBZ.instance.rows.findById(resolution.updatedBz._id);
  if (updatedRow) updatedRow._state = 'modified';
  createSnackBar({
    message: 'Bereitschaft<br/>Bereitschaftszeitraum erweitert',
    status: 'success',
    timeout: 3000,
    fixed: true,
  });
}

/**
 * Legt für einen Einsatz ohne passenden Bereitschaftszeitraum einen neuen BZ über die Einsatzdauer an (ohne Nacht/Spät/Sonder).
 * Ohne berechnetes Ergebnis (z. B. BZ bereits vorhanden) passiert nichts.
 *
 * @param einsatzStart - Beginn des Einsatzes.
 * @param einsatzEnd - Ende des Einsatzes.
 * @param tableBZ - BZ-Tabellenelement.
 * @param monat - Monat (1-12) des Einsatzes.
 * @param monthBzs - BZ-Zeilen dieses Monats.
 * @param otherMonths - BZ-Zeilen aller anderen Monate.
 */
function handleNone(
  einsatzStart: ReturnType<typeof dayjs>,
  einsatzEnd: ReturnType<typeof dayjs>,
  tableBZ: CustomHTMLTableElement<IDatenBZ>,
  monat: number,
  monthBzs: IDatenBZ[],
  otherMonths: IDatenBZ[],
): void {
  const data = calculateBereitschaftsZeiten(
    einsatzStart,
    einsatzEnd,
    einsatzEnd,
    einsatzEnd,
    false,
    false,
    false,
    monthBzs,
  );
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

/**
 * Validiert und speichert einen Bereitschaftseinsatz. Der Einsatz braucht einen passenden Bereitschaftszeitraum; nur mit `#berZeit` wird ein fehlender BZ angelegt bzw. angepasst und vor dem BE gespeichert.
 * Weitere Prüfungen: keine Überschneidung, höchstens ein LRE 1 je Bereitschaftstag, 10 Minuten Abstand nach LRE 1/2.
 *
 * @param $modal - Modal mit den Eingabefeldern (`#Datum`, `#SAPNR`, `#ZeitVon`, `#ZeitBis`, `#LRE`, `#privatkm`, `#berZeit`).
 * @param tableBE - BE-Tabellenelement, dem der Einsatz hinzugefügt wird.
 * @param tableBZ - BZ-Tabellenelement (für automatisch angelegte/angepasste Zeiträume).
 * @returns `true`, wenn der Einsatz hinzugefügt wurde; `false` nach einer Validierungs-Snackbar.
 * @throws {Error} Wenn ein Eingabefeld fehlt oder der LRE-Wert unbekannt ist.
 */
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

  const Tag = datumInput.value;

  if (!(Object.values(LreType) as string[]).includes(lreSelect.value)) throw new Error('LRE unbekannt');

  if (vonInput.value === bisInput.value) return failWith('Beginn und Ende dürfen nicht identisch sein.');

  const daten: IDatenBE = {
    Tag: dayjs(Tag).format('DD.MM.YYYY'),
    Auftragsnummer: sapnrInput.value,
    Beginn: vonInput.value,
    Ende: bisInput.value,
    LRE: lreSelect.value as IDatenBE['LRE'],
    PrivatKm: Number(privatkmInput.value),
  };

  const berZeit = berZeitInput.checked;
  const einsatzStart = dayjs(`${Tag}T${daten.Beginn}`);
  const einsatzEndRaw = dayjs(`${Tag}T${daten.Ende}`);
  const einsatzEnd = einsatzEndRaw.isAfter(einsatzStart) ? einsatzEndRaw : einsatzEndRaw.add(1, 'day');

  let coverage = classifyBzCoverage(
    getBereitschaftsZeitraumDaten(undefined, undefined, { excludeDeleted: true }),
    einsatzStart,
    einsatzEnd,
  );
  coverage = await ensureCompleteBzSynced(coverage, einsatzStart, einsatzEnd);

  if (coverage.kind !== 'complete') {
    if (!berZeit) return failWith(COVERAGE_WARNING[coverage.kind], 'warning', 5000);

    const savedData = Storage.get<IDatenBZ[]>('dataBZ', { default: [] });
    const savedBeData = Storage.get<IDatenBE[]>('dataBE', { default: [] });
    const monat = einsatzStart.month() + 1;
    const monthBzs = savedData.filter(item => getMonatFromBZ(item) === monat);
    const otherMonths = savedData.filter(item => getMonatFromBZ(item) !== monat);

    try {
      let needsBeFlush = false;
      if (coverage.kind === 'gap')
        ({ needsBeFlush } = handleGap(coverage, tableBZ, tableBE, monat, monthBzs, otherMonths));
      else if (coverage.kind === 'partial')
        handlePartial(coverage, einsatzStart, einsatzEnd, tableBZ, monat, savedData);
      else handleNone(einsatzStart, einsatzEnd, tableBZ, monat, monthBzs, otherMonths);

      await flushResource('BZ');
      if (needsBeFlush) await flushResource('BE');
      coverage = classifyBzCoverage(
        getBereitschaftsZeitraumDaten(undefined, undefined, { excludeDeleted: true }),
        einsatzStart,
        einsatzEnd,
      );
    } catch (error) {
      Storage.set('dataBZ', savedData);
      Storage.set('dataBE', savedBeData);
      reloadBzTable(tableBZ, monat);
      tableBE.instance.rows.load(getBereitschaftsEinsatzDaten());
      return failWith(
        `Fehler beim Anlegen des Zeitraums: ${error instanceof Error ? error.message : String(error)}`,
        'error',
      );
    }
  }

  if (coverage.kind !== 'complete') return failWith(COVERAGE_FINAL_WARNING[coverage.kind], 'warning', 5000);

  const { startBz, endBz } = coverage;
  const bzIds = [startBz._id, endBz._id !== startBz._id ? endBz._id : undefined].filter(Boolean) as string[];
  if (bzIds.length) daten.Bereitschaftszeitraum = bzIds;

  if (hasOverlap(einsatzStart, einsatzEnd)) return failWith('Bereitschaftseinsätze dürfen sich nicht überschneiden.');

  if (daten.LRE === LreType.LRE_1 && hasConflictingLre1(einsatzStart, Tag))
    return failWith('Im gewählten Bereitschaftszeitraum existiert bereits ein LRE 1.');

  if ((daten.LRE === LreType.LRE_1 || daten.LRE === LreType.LRE_2) && hasLre12TooClose(einsatzStart))
    return failWith('Weniger als 10 Minuten nach einem LRE 1/2-Einsatz: Bitte "LRE 1/2 ohne x" verwenden.');

  tableBE.instance.rows.add(daten);
  persistBereitschaftsEinsatzTableData(tableBE.instance);
  clearLoading('btnESE');
  return true;
}
