import Modal from 'bootstrap/js/dist/modal';
import type { CustomTable, CustomTableTypes, TableChanges, Row } from '../table/CustomTable';
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
      <span class="material-icons-round text-danger flex-shrink-0" style="font-size:1.1rem;margin-top:2px" aria-hidden="true">error_outline</span>
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
  // Bestehendes offenes Dialog erweitern statt gestapeltes neues Modal zu erzeugen.
  // .show nur vorhanden während Bootstrap das Modal als sichtbar behandelt.
  const existingModal = document.querySelector<HTMLElement>('[data-error-dialog].show');
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

  const modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.setAttribute('tabindex', '-1');
  modal.setAttribute('data-error-dialog', 'true');
  modal.innerHTML = `
    <div class="modal-dialog modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header bg-danger text-white">
          <h5 class="modal-title">Fehler beim Speichern</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <p class="fw-semibold mb-2" data-error-count>${errors.length} Fehler gefunden:</p>
          <ul class="list-group list-group-flush">${itemsHtml}</ul>
          <div class="alert alert-info mt-3 mb-0 py-2 small">
            Die fehlerhaften Zeilen sind in der Tabelle rot markiert und können erneut gespeichert werden.
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Schließen</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  const bsModal = new Modal(modal);
  bsModal.show();

  modal.addEventListener('hide.bs.modal', () => {
    (modal.querySelector<HTMLElement>(':focus') ?? document.activeElement as HTMLElement)?.blur();
  });
  modal.addEventListener('hidden.bs.modal', () => {
    bsModal.dispose();
    modal.remove();
  });
}

/**
 * Markiert alle Zeilen eines fehlgeschlagenen HTTP-Requests als Fehler.
 * Greift, wenn der gesamte Request (z.B. per smartSync) mit einer Exception abbricht,
 * statt Einzelfehler in result.errors zurückzugeben.
 */
export function markFetchErrorRows(
  table: CustomTable<CustomTableTypes>,
  changes: TableChanges<CustomTableTypes>,
  message: string,
): void {
  const updateIds = new Set(
    (changes.update as (CustomTableTypes & { _id?: string })[]).map(u => u._id).filter((id): id is string => !!id),
  );
  const deleteIds = new Set(changes.delete);

  let marked = false;
  for (const row of table.rows.array) {
    const effective = row._state === 'error' ? (row._errorState ?? 'unchanged') : row._state;

    if (effective === 'new' && changes.create.length > 0) {
      row._state = 'error';
      row._errorState = 'new';
      row._errorMessage = message;
      marked = true;
    } else if (effective === 'modified' && row._id != null && updateIds.has(row._id)) {
      row._state = 'error';
      row._errorState = 'modified';
      row._errorMessage = message;
      marked = true;
    } else if (effective === 'deleted' && row._id != null && deleteIds.has(row._id)) {
      row._state = 'error';
      row._errorState = 'deleted';
      row._errorMessage = message;
      marked = true;
    }
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
