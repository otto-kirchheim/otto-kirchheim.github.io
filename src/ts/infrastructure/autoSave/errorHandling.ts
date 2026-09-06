import { erzeugeDbDialog } from '@/infrastructure/ui/dbDialog';
import type { CustomTable, CustomTableTypes, Row } from '../table/CustomTable';
import type { BulkErrorEntry } from '../api/apiService';
import type { TResourceKey } from '@/types';
import type { RowErrorMatch } from './savePipeline';

export function markErrorRows(
  table: CustomTable<CustomTableTypes>,
  rowErrorMatches: RowErrorMatch[],
  errors: BulkErrorEntry[],
): BulkErrorEntry[] {
  if (errors.length === 0) return [];

  let marked = false;
  for (const { row, error, sourceState } of rowErrorMatches) {
    row._state = 'error';
    row._errorState = sourceState;
    row._errorMessage = error.message;
    marked = true;
  }

  if (marked && typeof table.drawRows === 'function') {
    table.drawRows();
  }

  return errors;
}

export const OVERLAP_BLOCK_MESSAGE =
  'Überschneidet sich mit einer noch nicht gespeicherten Löschung. Bitte manuell auf „Speichern" klicken, damit die Löschung mit übernommen wird.';

/**
 * Markiert Zeilen, deren AutoSave wegen Überschneidung mit einer ungesyncten Löschung derselben
 * Ressource zurückgehalten wird (siehe `overlapGuard.ts`). Nutzt dieselbe Fehler-Darstellung wie
 * echte Server-Fehler (rote Zeile, Tooltip, Modal-Banner), damit der Grund für den Nutzer sichtbar
 * ist, ohne die Zeile tatsächlich an den Server zu senden.
 */
export function markOverlapBlockedRows(table: CustomTable<CustomTableTypes>, rows: Row<CustomTableTypes>[]): void {
  if (rows.length === 0) return;

  for (const row of rows) {
    const dirtyState = row._state === 'error' ? (row._errorState ?? 'new') : (row._state as 'new' | 'modified');
    row._state = 'error';
    row._errorState = dirtyState;
    row._errorMessage = OVERLAP_BLOCK_MESSAGE;
  }

  if (typeof table.drawRows === 'function') table.drawRows();
}

export function buildRowLabel(row: Row<CustomTableTypes>): string {
  if (!row.columns?.array) return '';
  const parts = row.columns.array
    .filter(col => col.visible && col.name !== 'editing')
    .map(col =>
      col
        .parser(row.cells[col.name] as CustomTableTypes[string])
        .toString()
        .trim()
        .replace(/<[^>]*>/g, '')
        .trim(),
    )
    .filter(s => s.length > 0);
  return [...new Set(parts)].slice(0, 4).join(' · ');
}

function buildErrorItemHtml(err: BulkErrorEntry, globalIdx: number): string {
  const opLabel = (op: BulkErrorEntry['operation']) =>
    op === 'create' ? 'Erstellen' : op === 'update' ? 'Ändern' : 'Löschen';
  const rowDesc = err.label ?? (err.operation !== 'create' && err.id ? err.id : `#${globalIdx + 1}`);
  return `<li class="list-group-item px-0">
    <div class="d-flex gap-2 align-items-start">
      <span class="db-icon text-danger flex-shrink-0" data-icon="exclamation_mark_circle" style="font-size:1.1rem;margin-top:2px" aria-hidden="true"></span>
      <div class="flex-grow-1">
        <div class="d-flex align-items-center gap-2 flex-wrap mb-1">
          <span class="badge text-bg-danger">${escapeHtml(opLabel(err.operation))}</span>
          <span class="text-body-secondary small">${escapeHtml(rowDesc)}</span>
        </div>
        <div class="text-danger small">${escapeHtml(err.message)}</div>
      </div>
    </div>
  </li>`;
}

export function showErrorDialog(_resource: Exclude<TResourceKey, 'settings'>, errors: BulkErrorEntry[]): void {
  // Bestehendes offenes Dialog erweitern statt ein gestapeltes neues zu erzeugen.
  // `[open]` trägt der native `<dialog>`, solange er sichtbar ist.
  const existingModal = document.querySelector<HTMLElement>('dialog[open] [data-error-dialog]');
  if (existingModal) {
    const list = existingModal.querySelector('ul');
    const countEl = existingModal.querySelector<HTMLElement>('[data-error-count]');
    if (list) {
      const offset = list.querySelectorAll('li').length;
      errors.forEach((err, i) => {
        list.insertAdjacentHTML('beforeend', buildErrorItemHtml(err, offset + i));
      });
      if (countEl) {
        const total = list.querySelectorAll('li').length;
        countEl.textContent = `${total} Fehler gefunden:`;
      }
    }
    return;
  }

  const itemsHtml = errors.map((err, i) => buildErrorItemHtml(err, i)).join('');

  const { inhalt, schliessen } = erzeugeDbDialog(() => {
    /* nichts aufzuraeumen -- `erzeugeDbDialog` entfernt den Dialog selbst */
  });

  inhalt.innerHTML = `
    <div data-error-dialog="true">
      <div class="db-drawer-header bg-danger text-white">
        <h5>Fehler beim Speichern</h5>
        <button type="button" class="db-button" data-icon="cross" data-variant="ghost" data-no-text="true" data-bs-dismiss="modal">Schließen</button>
      </div>
      <div class="dialog-koerper">
        <p class="fw-semibold mb-2" data-error-count>${errors.length} Fehler gefunden:</p>
        <ul class="list-group list-group-flush">${itemsHtml}</ul>
        <div class="alert alert-info mt-3 mb-0 py-2 small">
          Die fehlerhaften Zeilen sind in der Tabelle rot markiert und können erneut gespeichert werden.
        </div>
      </div>
      <div class="dialog-fuss">
        <button type="button" class="db-button" data-variant="filled" data-bs-dismiss="modal">Schließen</button>
      </div>
    </div>
  `;

  // Der Fokus muss raus, bevor der Dialog verschwindet -- sonst bleibt er am entfernten Knoten.
  inhalt.addEventListener('click', event => {
    if (!(event.target as HTMLElement | null)?.closest('[data-bs-dismiss="modal"]')) return;
    (document.activeElement as HTMLElement | null)?.blur();
    schliessen();
  });
}

/**
 * Markiert alle Zeilen eines fehlgeschlagenen HTTP-Requests als Fehler.
 * Greift, wenn der gesamte Request (z.B. per smartSync) mit einer Exception abbricht,
 * statt Einzelfehler in result.errors zurückzugeben.
 *
 * @param changeRows - Row-Snapshot aus `getChangeRows()`, VOR dem Request genommen. Nur
 *   diese Zeilen waren tatsaechlich Teil der fehlgeschlagenen Anfrage - Zeilen, die erst
 *   waehrend des Requests neu angelegt/geaendert wurden, werden NICHT als Fehler markiert
 *   und bleiben stattdessen fuer den naechsten Save-Lauf vorgemerkt (AutoSave-Commit-Race).
 */
export function markFetchErrorRows(
  table: CustomTable<CustomTableTypes>,
  changeRows: { create: Row<CustomTableTypes>[]; update: Row<CustomTableTypes>[]; delete: Row<CustomTableTypes>[] },
  message: string,
): void {
  let marked = false;

  for (const row of changeRows.create) {
    row._state = 'error';
    row._errorState = 'new';
    row._errorMessage = message;
    marked = true;
  }
  for (const row of changeRows.update) {
    row._state = 'error';
    row._errorState = 'modified';
    row._errorMessage = message;
    marked = true;
  }
  for (const row of changeRows.delete) {
    row._state = 'error';
    row._errorState = 'deleted';
    row._errorMessage = message;
    marked = true;
  }

  if (marked && typeof table.drawRows === 'function') table.drawRows();
}

export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
