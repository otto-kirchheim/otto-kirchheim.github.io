import { useEffect, useState } from 'preact/hooks';
import { confirmDialog } from '@/infrastructure/ui/confirmDialog';
import { fetchAdminResource, updateAdminDoc, deleteAdminDoc, type AdminPage } from '../utils/api';

const IMMUTABLE_FIELDS = new Set(['_id', '__v', 'createdAt']);
const READONLY_FIELDS = new Set(['updatedAt']);
const ITEMS_PER_PAGE = 25;

type ResourceConfig = {
  label: string;
  shortLabel: string;
  endpoint: string;
  tableFields: string[];
};

const RESOURCES: ResourceConfig[] = [
  {
    label: 'Bereitschaftseinsatz',
    shortLabel: 'BE',
    endpoint: 'bereitschaftseinsaetze',
    tableFields: ['User', 'Jahr', 'Monat', 'LRE', 'Auftragsnummer'],
  },
  {
    label: 'Bereitschaftszeitraum',
    shortLabel: 'BZ',
    endpoint: 'bereitschaftszeitraeume',
    tableFields: ['User', 'Jahr', 'Monat'],
  },
  {
    label: 'Einsatzwechseltätigkeit',
    shortLabel: 'EWT',
    endpoint: 'einsatzwechseltaetigkeiten',
    tableFields: ['User', 'Jahr', 'Monat'],
  },
  {
    label: 'Nebengeld',
    shortLabel: 'NG',
    endpoint: 'nebengeld',
    tableFields: ['User', 'Jahr', 'Monat'],
  },
];

function truncateId(val: unknown): string {
  const s = String(val ?? '');
  return s.length > 10 ? `…${s.slice(-8)}` : s;
}

function formatCell(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'object') return '{…}';
  const s = String(val);
  return s.length > 24 ? `${s.slice(0, 22)}…` : s;
}

type EditState = {
  doc: Record<string, unknown>;
  values: Record<string, unknown>;
  rawStrings: Record<string, string>;
  jsonErrors: Record<string, string>;
  saving: boolean;
  saveError: string | null;
};

function buildEditState(doc: Record<string, unknown>): EditState {
  const rawStrings: Record<string, string> = {};
  for (const [key, val] of Object.entries(doc)) {
    if (val !== null && typeof val === 'object') {
      rawStrings[key] = JSON.stringify(val, null, 2);
    }
  }
  return { doc, values: { ...doc }, rawStrings, jsonErrors: {}, saving: false, saveError: null };
}

export function AdminResourceBrowser() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [page, setPage] = useState<AdminPage | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);

  const resource = RESOURCES[activeIdx];

  function loadPage(pageNum: number) {
    setLoading(true);
    setLoadError(null);
    fetchAdminResource(resource.endpoint, { page: pageNum, limit: ITEMS_PER_PAGE })
      .then(result => {
        setPage(result);
        setCurrentPage(pageNum);
      })
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : 'Ladefehler'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setPage(null);
    setCurrentPage(1);
    loadPage(1);
  }, [activeIdx]);

  function openEdit(doc: Record<string, unknown>) {
    setEdit(buildEditState(doc));
  }

  function closeEdit() {
    setEdit(null);
  }

  function handleTextareaChange(key: string, raw: string) {
    if (!edit) return;
    const rawStrings = { ...edit.rawStrings, [key]: raw };
    const jsonErrors = { ...edit.jsonErrors };
    let values = edit.values;
    try {
      const parsed: unknown = JSON.parse(raw);
      values = { ...values, [key]: parsed };
      delete jsonErrors[key];
    } catch {
      jsonErrors[key] = 'Ungültiges JSON';
    }
    setEdit({ ...edit, values, rawStrings, jsonErrors });
  }

  function handleValueChange(key: string, val: unknown) {
    if (!edit) return;
    setEdit({ ...edit, values: { ...edit.values, [key]: val } });
  }

  async function saveEdit() {
    if (!edit) return;
    if (Object.keys(edit.jsonErrors).length > 0) {
      setEdit({ ...edit, saveError: 'Bitte alle JSON-Fehler beheben.' });
      return;
    }

    const payload: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(edit.values)) {
      if (!IMMUTABLE_FIELDS.has(key) && !READONLY_FIELDS.has(key)) {
        payload[key] = val;
      }
    }

    setEdit({ ...edit, saving: true, saveError: null });
    try {
      const updated = await updateAdminDoc(resource.endpoint, String(edit.doc['_id']), payload);
      setPage(prev =>
        prev
          ? {
              ...prev,
              data: prev.data.map(d => (d['_id'] === updated['_id'] ? updated : d)),
            }
          : prev,
      );
      closeEdit();
    } catch (err: unknown) {
      setEdit(prev =>
        prev ? { ...prev, saving: false, saveError: err instanceof Error ? err.message : 'Speicherfehler' } : prev,
      );
    }
  }

  async function handleDelete(doc: Record<string, unknown>) {
    const confirmed = await confirmDialog(`ID: ${String(doc['_id'])}`, {
      title: 'Eintrag löschen?',
      confirmLabel: 'Löschen',
    });
    if (!confirmed) return;
    try {
      await deleteAdminDoc(resource.endpoint, String(doc['_id']));
      setPage(prev =>
        prev ? { ...prev, data: prev.data.filter(d => d['_id'] !== doc['_id']), total: prev.total - 1 } : prev,
      );
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Löschfehler');
    }
  }

  const totalPages = page ? Math.ceil(page.total / ITEMS_PER_PAGE) : 1;

  return (
    <div>
      {/* Resource Tabs */}
      <ul class="nav nav-tabs mb-3 flex-wrap" role="tablist">
        {RESOURCES.map((r, i) => (
          <li key={r.endpoint} class="nav-item" role="presentation">
            <button class={`nav-link ${i === activeIdx ? 'active' : ''}`} onClick={() => setActiveIdx(i)} type="button">
              <span class="d-none d-md-inline">{r.label}</span>
              <span class="d-md-none">{r.shortLabel}</span>
            </button>
          </li>
        ))}
      </ul>

      {/* Error */}
      {loadError && (
        <div class="alert alert-danger d-flex align-items-center gap-2 py-2">
          <span class="material-icons-round small">error</span>
          {loadError}
        </div>
      )}

      {/* Table */}
      <div class="table-responsive">
        <table class="table table-sm table-hover align-middle mb-0">
          <thead class="table-dark">
            <tr>
              <th style="width:6rem">ID</th>
              {resource.tableFields.map(f => (
                <th key={f}>{f}</th>
              ))}
              <th style="width:7rem" class="text-end">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={resource.tableFields.length + 2} class="text-center py-4">
                  <div class="spinner-border spinner-border-sm" role="status" />
                </td>
              </tr>
            )}
            {!loading && (!page || page.data.length === 0) && (
              <tr>
                <td colSpan={resource.tableFields.length + 2} class="text-center py-3 text-muted">
                  Keine Einträge
                </td>
              </tr>
            )}
            {!loading &&
              page?.data.map(doc => (
                <tr key={String(doc['_id'])}>
                  <td>
                    <code class="small">{truncateId(doc['_id'])}</code>
                  </td>
                  {resource.tableFields.map(f => (
                    <td key={f} class="small">
                      {f === 'User' ? <code class="text-muted">{truncateId(doc[f])}</code> : formatCell(doc[f])}
                    </td>
                  ))}
                  <td class="text-end">
                    <button
                      class="btn btn-sm btn-outline-primary me-1 py-0"
                      onClick={() => openEdit(doc)}
                      title="Bearbeiten"
                    >
                      <span class="material-icons-round" style="font-size:1rem">
                        edit
                      </span>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-danger py-0"
                      onClick={() => handleDelete(doc)}
                      title="Löschen"
                    >
                      <span class="material-icons-round" style="font-size:1rem">
                        delete
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div class="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
          <small class="text-muted">
            Gesamt: {page?.total ?? 0} · Seite {currentPage}/{totalPages}
          </small>
          <div class="btn-group btn-group-sm">
            <button
              class="btn btn-outline-secondary"
              disabled={currentPage <= 1}
              onClick={() => loadPage(currentPage - 1)}
            >
              ‹
            </button>
            <button
              class="btn btn-outline-secondary"
              disabled={currentPage >= totalPages}
              onClick={() => loadPage(currentPage + 1)}
            >
              ›
            </button>
          </div>
        </div>
      )}

      {/* Reload button */}
      <div class="text-end mt-2">
        <button class="btn btn-sm btn-outline-secondary" onClick={() => loadPage(currentPage)}>
          <span class="material-icons-round me-1" style="font-size:1rem;vertical-align:middle">
            refresh
          </span>
          Aktualisieren
        </button>
      </div>

      {/* Edit Modal */}
      {edit && (
        <>
          <div class="modal fade show d-block" tabIndex={-1} style="z-index:1055">
            <div class="modal-dialog modal-lg modal-fullscreen-sm-down">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">
                    {resource.label} bearbeiten
                    <code class="ms-2 fs-6 text-muted">{truncateId(edit.doc['_id'])}</code>
                  </h5>
                  <button type="button" class="btn-close" onClick={closeEdit} />
                </div>

                <div class="modal-body" style="max-height:65vh;overflow-y:auto">
                  {edit.saveError && <div class="alert alert-danger py-2 small">{edit.saveError}</div>}
                  {Object.entries(edit.values).map(([key, val]) => {
                    const immutable = IMMUTABLE_FIELDS.has(key);
                    const readonly = READONLY_FIELDS.has(key);
                    const disabled = immutable || readonly;

                    return (
                      <div key={key} class="mb-3">
                        <label class="form-label fw-semibold small mb-1">
                          {key}
                          {immutable && <span class="fw-normal text-muted ms-1">(nicht änderbar)</span>}
                          {readonly && <span class="fw-normal text-muted ms-1">(nur lesen)</span>}
                        </label>

                        {disabled ? (
                          <input
                            class="form-control form-control-sm bg-body-secondary text-muted font-monospace"
                            readOnly
                            value={String(val ?? '')}
                          />
                        ) : typeof val === 'boolean' ? (
                          <div class="form-check mt-1">
                            <input
                              type="checkbox"
                              class="form-check-input"
                              checked={val}
                              onChange={e => handleValueChange(key, (e.target as HTMLInputElement).checked)}
                            />
                          </div>
                        ) : val !== null && typeof val === 'object' ? (
                          <div>
                            <textarea
                              class={`form-control form-control-sm font-monospace${edit.jsonErrors[key] ? ' is-invalid' : ''}`}
                              rows={4}
                              value={edit.rawStrings[key] ?? ''}
                              onChange={e => handleTextareaChange(key, (e.target as HTMLTextAreaElement).value)}
                            />
                            {edit.jsonErrors[key] && <div class="invalid-feedback">{edit.jsonErrors[key]}</div>}
                          </div>
                        ) : typeof val === 'number' ? (
                          <input
                            type="number"
                            class="form-control form-control-sm"
                            value={val}
                            onChange={e =>
                              handleValueChange(key, parseFloat((e.target as HTMLInputElement).value) || 0)
                            }
                          />
                        ) : (
                          <input
                            type="text"
                            class="form-control form-control-sm"
                            value={String(val ?? '')}
                            onChange={e => handleValueChange(key, (e.target as HTMLInputElement).value)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div class="modal-footer">
                  <button class="btn btn-secondary" onClick={closeEdit} disabled={edit.saving}>
                    Abbrechen
                  </button>
                  <button class="btn btn-primary" onClick={saveEdit} disabled={edit.saving}>
                    {edit.saving ? (
                      <>
                        <span class="spinner-border spinner-border-sm me-1" role="status" />
                        Speichern…
                      </>
                    ) : (
                      'Speichern'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-backdrop fade show" style="z-index:1054" />
        </>
      )}
    </div>
  );
}
