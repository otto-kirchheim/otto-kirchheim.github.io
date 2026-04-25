import type { CustomTable, CustomTableTypes } from '../table/CustomTable';
import type { BulkErrorEntry } from '../api/apiService';
import type { TResourceKey } from '../../core/types';
import type { RowErrorMatch } from './savePipeline';

export function markErrorRows(
  table: CustomTable<CustomTableTypes>,
  rowErrorMatches: RowErrorMatch[],
  errors: BulkErrorEntry[],
): BulkErrorEntry[] {
  if (errors.length === 0) return [];

  for (const { row, error, sourceState } of rowErrorMatches) {
    row._state = 'error';
    row._errorState = sourceState;
    row._errorMessage = error.message;
  }

  if (typeof table.drawRows === 'function') {
    table.drawRows();
  }

  return errors;
}

export function showErrorDialog(_resource: Exclude<TResourceKey, 'settings'>, errors: BulkErrorEntry[]): void {
  const errorList = errors
    .map((err, idx) => {
      const reference =
        err.operation === 'create'
          ? err.clientRequestId
            ? ` [clientRequestId: ${err.clientRequestId}]`
            : ''
          : err.id
            ? ` [_id: ${err.id}]`
            : '';
      return `${idx + 1}. ${err.operation}${reference}: ${err.message}`;
    })
    .join('\n');

  const modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.innerHTML = `
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header bg-danger text-white">
          <h5 class="modal-title">Fehler beim Speichern</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <p><strong>${errors.length} Fehler gefunden:</strong></p>
          <pre class="error-list" style="overflow-y: auto; max-height: 300px; border: 1px solid #ddd; padding: 10px; background: #f5f5f5;">${escapeHtml(errorList)}</pre>
          <div class="alert alert-info mt-3 mb-0">
            <small>Die fehlerhaften Zeilen sind in der Tabelle gekennzeichnet und können erneut gespeichert werden.</small>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Schließen</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  const bootstrapApi = (window as { bootstrap?: { Modal?: new (element: Element) => { show: () => void } } }).bootstrap;
  if (!bootstrapApi?.Modal) {
    modal.remove();
    return;
  }

  const bsModal = new bootstrapApi.Modal(modal);
  bsModal.show();

  modal.addEventListener('hidden.bs.modal', () => {
    modal.remove();
  });
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
