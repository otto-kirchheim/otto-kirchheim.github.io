import { useEffect, useState } from 'preact/hooks';
import { confirmDialog } from '@/infrastructure/ui/confirmDialog';
import { AdminResourceEditModal } from './AdminResourceEditModal';
import {
  IMMUTABLE_FIELDS,
  ITEMS_PER_PAGE,
  MONATE,
  READONLY_FIELDS,
  RESOURCES,
  buildEditState,
  formatCell,
  truncateId,
  type EditState,
  type FilterParams,
} from './adminResourceBrowserGemeinsam';
import {
  fetchAdminResource,
  fetchAdminResourceById,
  fetchAdminResourceYears,
  updateAdminDoc,
  deleteAdminDoc,
  fetchAdminUserNameMap,
  type AdminPage,
} from '../utils/api';

type Props = { onNavigateToUser?: (userId: string) => void };

export function AdminResourceBrowser({ onNavigateToUser }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [page, setPage] = useState<AdminPage | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [userNameMap, setUserNameMap] = useState<Record<string, string>>({});
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Filter-Inputs
  const [filterUserId, setFilterUserId] = useState('');
  const [userSearchText, setUserSearchText] = useState(''); // Suchtext für Benutzer-Datalist
  const [filterJahr, setFilterJahr] = useState('');
  const [filterMonat, setFilterMonat] = useState('');
  // Committed filter (nur beim Klick auf „Filtern" übernommen)
  const [activeFilter, setActiveFilter] = useState<FilterParams>({});

  const resource = RESOURCES[activeIdx];

  useEffect(() => {
    fetchAdminUserNameMap()
      .then(setUserNameMap)
      .catch(() => {});
  }, []);

  function loadPageWith(pageNum: number, filter: FilterParams, endpointOverride?: string) {
    const ep = endpointOverride ?? resource.endpoint;
    setLoading(true);
    setLoadError(null);
    fetchAdminResource(ep, {
      page: pageNum,
      limit: ITEMS_PER_PAGE,
      userId: filter.userId,
      jahr: filter.jahr,
      monat: filter.monat,
    })
      .then(result => {
        setPage(result);
        setCurrentPage(pageNum);
      })
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : 'Ladefehler'))
      .finally(() => setLoading(false));
  }

  function loadPage(pageNum: number) {
    loadPageWith(pageNum, activeFilter);
  }

  function applyFilter() {
    const filter: FilterParams = {
      userId: filterUserId || undefined,
      jahr: filterJahr ? Number(filterJahr) : undefined,
      monat: filterMonat ? Number(filterMonat) : undefined,
    };
    setActiveFilter(filter);
    setPage(null);
    setCurrentPage(1);
    loadPageWith(1, filter);
  }

  function resetFilter() {
    setFilterUserId('');
    setUserSearchText('');
    setFilterJahr('');
    setFilterMonat('');
    const empty: FilterParams = {};
    setActiveFilter(empty);
    setPage(null);
    setCurrentPage(1);
    loadPageWith(1, empty);
  }

  useEffect(() => {
    const ep = RESOURCES[activeIdx].endpoint;
    setPage(null);
    setCurrentPage(1);
    setFilterUserId('');
    setUserSearchText('');
    setFilterJahr('');
    setFilterMonat('');
    setAvailableYears([]);
    const empty: FilterParams = {};
    setActiveFilter(empty);
    loadPageWith(1, empty, ep);
    fetchAdminResourceYears(ep)
      .then(setAvailableYears)
      .catch(() => {});
  }, [activeIdx]);

  function openEdit(doc: Record<string, unknown>) {
    setEdit(buildEditState(doc, resource.endpoint));
  }

  function closeEdit() {
    setEdit(null);
  }

  async function navigateToEntry(resourceIdx: number, docId: string) {
    closeEdit();
    setActiveIdx(resourceIdx);
    try {
      const doc = await fetchAdminResourceById(RESOURCES[resourceIdx].endpoint, docId);
      // Kurz warten, bis useEffect([activeIdx]) gefeuert hat
      setTimeout(() => setEdit(buildEditState(doc, RESOURCES[resourceIdx].endpoint)), 50);
    } catch {
      setLoadError(`Verlinkter ${RESOURCES[resourceIdx].label}-Eintrag nicht gefunden`);
    }
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
      if (!IMMUTABLE_FIELDS.has(key) && !READONLY_FIELDS.has(key) && key !== 'User') {
        payload[key] = val;
      }
    }
    setEdit({ ...edit, saving: true, saveError: null });
    try {
      const updated = await updateAdminDoc(resource.endpoint, String(edit.doc['_id']), payload);
      setPage(prev =>
        prev ? { ...prev, data: prev.data.map(d => (d['_id'] === updated['_id'] ? updated : d)) } : prev,
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
  const totalCols = 2 + resource.tableFields.length + (resource.extraFields?.length ?? 0);
  const sortedUsers = Object.entries(userNameMap).sort((a, b) => a[1].localeCompare(b[1]));
  const hasActiveFilter = Boolean(activeFilter.userId || activeFilter.jahr || activeFilter.monat);

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

      {/* Filter-Panel */}
      <div class="card bg-body-secondary border-0 mb-3">
        <div class="card-body py-2 px-3">
          <div class="d-flex flex-wrap gap-2 align-items-end">
            {/* Benutzer: Text-Input mit Datalist (Suche) */}
            <div class="flex-grow-1" style="min-width:180px;max-width:300px">
              <label class="form-label small mb-1">Benutzer</label>
              <div class="position-relative">
                <input
                  type="text"
                  list={`user-datalist-${activeIdx}`}
                  class="form-control form-control-sm"
                  placeholder="Alle Benutzer (Name eingeben…)"
                  value={userSearchText}
                  onInput={e => {
                    const text = (e.target as HTMLInputElement).value;
                    setUserSearchText(text);
                    const match = sortedUsers.find(([, name]) => name === text);
                    setFilterUserId(match?.[0] ?? '');
                  }}
                />
                {filterUserId && (
                  <button
                    class="btn btn-sm btn-link position-absolute end-0 top-50 translate-middle-y p-0 pe-2 text-muted"
                    style="line-height:1"
                    onClick={() => {
                      setFilterUserId('');
                      setUserSearchText('');
                    }}
                    title="Benutzer-Filter löschen"
                  >
                    ×
                  </button>
                )}
              </div>
              <datalist id={`user-datalist-${activeIdx}`}>
                {sortedUsers.map(([id, name]) => (
                  <option key={id} value={name} />
                ))}
              </datalist>
            </div>

            {/* Jahr: nur vorhandene Jahre aus Backend */}
            <div style="min-width:100px">
              <label class="form-label small mb-1">Jahr</label>
              <select
                class="form-select form-select-sm"
                value={filterJahr}
                onChange={e => setFilterJahr((e.target as HTMLSelectElement).value)}
              >
                <option value="">Alle</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Monat */}
            <div style="min-width:130px">
              <label class="form-label small mb-1">Monat</label>
              <select
                class="form-select form-select-sm"
                value={filterMonat}
                onChange={e => setFilterMonat((e.target as HTMLSelectElement).value)}
              >
                <option value="">Alle</option>
                {MONATE.map((m, i) => (
                  <option key={i + 1} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div class="d-flex gap-2 ms-auto align-items-end">
              <button class="btn btn-sm btn-primary" onClick={applyFilter}>
                <span class="material-icons-round me-1" style="font-size:0.9rem;vertical-align:middle">
                  filter_list
                </span>
                Filtern
              </button>
              {hasActiveFilter && (
                <button class="btn btn-sm btn-outline-secondary" onClick={resetFilter}>
                  Zurücksetzen
                </button>
              )}
            </div>
          </div>

          {hasActiveFilter && (
            <div class="mt-2 d-flex flex-wrap gap-2">
              {activeFilter.userId && (
                <span class="badge bg-primary rounded-pill">
                  User: {userNameMap[activeFilter.userId] ?? truncateId(activeFilter.userId)}
                </span>
              )}
              {activeFilter.jahr && <span class="badge bg-secondary rounded-pill">Jahr: {activeFilter.jahr}</span>}
              {activeFilter.monat && (
                <span class="badge bg-secondary rounded-pill">Monat: {MONATE[(activeFilter.monat ?? 1) - 1]}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {loadError && (
        <div class="alert alert-danger d-flex align-items-center gap-2 py-2">
          <span class="material-icons-round small">error</span>
          {loadError}
          <button class="btn btn-sm btn-outline-danger ms-auto" onClick={() => setLoadError(null)}>
            ×
          </button>
        </div>
      )}

      {/* Tabelle */}
      <div class="table-responsive">
        <table class="table table-sm table-hover align-middle mb-0">
          <thead class="table-dark">
            <tr>
              <th style="width:6rem">ID</th>
              {resource.tableFields.map(f => (
                <th key={f}>{f === 'User' ? 'Benutzer' : f}</th>
              ))}
              {resource.extraFields?.map(f => (
                <th key={f} class="d-none d-lg-table-cell">
                  {f === 'createdAt' ? 'Erstellt' : f}
                </th>
              ))}
              <th style="width:7rem" class="text-end">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={totalCols} class="text-center py-4">
                  <div class="spinner-border spinner-border-sm" role="status" />
                </td>
              </tr>
            )}
            {!loading && (!page || page.data.length === 0) && (
              <tr>
                <td colSpan={totalCols} class="text-center py-3 text-muted">
                  Keine Einträge {hasActiveFilter && '(Filter aktiv)'}
                </td>
              </tr>
            )}
            {!loading &&
              page?.data.map(doc => (
                <tr key={String(doc['_id'])}>
                  <td style="cursor:pointer" title="Klicken zum Bearbeiten" onClick={() => openEdit(doc)}>
                    <code class="small text-primary-emphasis">{truncateId(doc['_id'])}</code>
                  </td>
                  {resource.tableFields.map(f => {
                    if (f === 'User') {
                      const userId = String(doc[f] ?? '');
                      const name = userNameMap[userId];
                      return (
                        <td key={f} class="small">
                          <div class="d-flex align-items-center gap-1 flex-nowrap">
                            <span>{name ?? <code class="text-muted">{truncateId(userId)}</code>}</span>
                            {onNavigateToUser && (
                              <button
                                class="btn btn-link btn-sm p-0 text-info flex-shrink-0"
                                style="line-height:1"
                                onClick={e => {
                                  (e as MouseEvent).stopPropagation();
                                  onNavigateToUser(userId);
                                }}
                                title="Zum Profil"
                              >
                                <span class="material-icons-round" style="font-size:0.85rem">
                                  person_search
                                </span>
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    }
                    return (
                      <td key={f} class="small">
                        {formatCell(f, doc[f])}
                      </td>
                    );
                  })}
                  {resource.extraFields?.map(f => (
                    <td key={f} class="small d-none d-lg-table-cell">
                      {formatCell(f, doc[f])}
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
      <div class="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
        <small class="text-muted">{page ? `${page.total} Einträge · Seite ${currentPage}/${totalPages}` : ''}</small>
        {totalPages > 1 && (
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
        )}
        <button class="btn btn-sm btn-outline-secondary" onClick={() => loadPage(currentPage)}>
          <span class="material-icons-round me-1" style="font-size:1rem;vertical-align:middle">
            refresh
          </span>
          Aktualisieren
        </button>
      </div>

      {/* Edit Modal – Portal: sichtbar auch in versteckten Bootstrap-Tab-Panes */}
      {edit && (
        <AdminResourceEditModal
          edit={edit}
          resource={resource}
          userNameMap={userNameMap}
          onNavigateToUser={onNavigateToUser}
          closeEdit={closeEdit}
          saveEdit={saveEdit}
          handleValueChange={handleValueChange}
          handleTextareaChange={handleTextareaChange}
          navigateToEntry={navigateToEntry}
        />
      )}
    </div>
  );
}
