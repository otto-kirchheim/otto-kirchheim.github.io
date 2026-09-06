import { useEffect, useState } from 'react';

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
      <ul className="nav nav-tabs mb-3 flex-wrap" role="tablist">
        {RESOURCES.map((r, i) => (
          <li key={r.endpoint} className="nav-item" role="presentation">
            <button
              className={`nav-link ${i === activeIdx ? 'active' : ''}`}
              onClick={() => setActiveIdx(i)}
              type="button"
            >
              <span className="d-none d-md-inline">{r.label}</span>
              <span className="d-md-none">{r.shortLabel}</span>
            </button>
          </li>
        ))}
      </ul>

      {/* Filter-Panel */}
      <div className="card bg-body-secondary border-0 mb-3">
        <div className="card-body py-2 px-3">
          <div className="d-flex flex-wrap gap-2 align-items-end">
            {/* Benutzer: Text-Input mit Datalist (Suche) */}
            <div className="flex-grow-1" style={{ minWidth: '180px', maxWidth: '300px' }}>
              <label className="form-label small mb-1">Benutzer</label>
              <div className="position-relative">
                <input
                  type="text"
                  list={`user-datalist-${activeIdx}`}
                  className="form-control form-control-sm"
                  placeholder="Alle Benutzer (Name eingeben…)"
                  value={userSearchText}
                  onChange={e => {
                    const text = (e.target as HTMLInputElement).value;
                    setUserSearchText(text);
                    const match = sortedUsers.find(([, name]) => name === text);
                    setFilterUserId(match?.[0] ?? '');
                  }}
                />
                {filterUserId && (
                  <button
                    className="btn btn-sm btn-link position-absolute end-0 top-50 translate-middle-y p-0 pe-2 text-muted"
                    style={{ lineHeight: '1' }}
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
            <div style={{ minWidth: '100px' }}>
              <label className="form-label small mb-1">Jahr</label>
              <select
                className="form-select form-select-sm"
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
            <div style={{ minWidth: '130px' }}>
              <label className="form-label small mb-1">Monat</label>
              <select
                className="form-select form-select-sm"
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

            <div className="d-flex gap-2 ms-auto align-items-end">
              <button className="btn btn-sm btn-primary" onClick={applyFilter}>
                <span className="db-icon me-1 db-font-size-xs" data-icon="funnel" style={{ verticalAlign: 'middle' }} />
                Filtern
              </button>
              {hasActiveFilter && (
                <button className="btn btn-sm btn-outline-secondary" onClick={resetFilter}>
                  Zurücksetzen
                </button>
              )}
            </div>
          </div>

          {hasActiveFilter && (
            <div className="mt-2 d-flex flex-wrap gap-2">
              {activeFilter.userId && (
                <span className="badge bg-primary rounded-pill">
                  User: {userNameMap[activeFilter.userId] ?? truncateId(activeFilter.userId)}
                </span>
              )}
              {activeFilter.jahr && <span className="badge bg-secondary rounded-pill">Jahr: {activeFilter.jahr}</span>}
              {activeFilter.monat && (
                <span className="badge bg-secondary rounded-pill">Monat: {MONATE[(activeFilter.monat ?? 1) - 1]}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {loadError && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2">
          <span className="db-icon small" data-icon="exclamation_mark_circle" />
          {loadError}
          <button className="btn btn-sm btn-outline-danger ms-auto" onClick={() => setLoadError(null)}>
            ×
          </button>
        </div>
      )}

      {/* Tabelle */}
      <div className="table-responsive">
        <table className="table table-sm table-hover align-middle mb-0">
          <thead className="table-dark">
            <tr>
              <th style={{ width: '6rem' }}>ID</th>
              {resource.tableFields.map(f => (
                <th key={f}>{f === 'User' ? 'Benutzer' : f}</th>
              ))}
              {resource.extraFields?.map(f => (
                <th key={f} className="d-none d-lg-table-cell">
                  {f === 'createdAt' ? 'Erstellt' : f}
                </th>
              ))}
              <th style={{ width: '7rem' }} className="text-end">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={totalCols} className="text-center py-4">
                  <div className="spinner-border spinner-border-sm" role="status" />
                </td>
              </tr>
            )}
            {!loading && (!page || page.data.length === 0) && (
              <tr>
                <td colSpan={totalCols} className="text-center py-3 text-muted">
                  Keine Einträge {hasActiveFilter && '(Filter aktiv)'}
                </td>
              </tr>
            )}
            {!loading &&
              page?.data.map(doc => (
                <tr key={String(doc['_id'])}>
                  <td style={{ cursor: 'pointer' }} title="Klicken zum Bearbeiten" onClick={() => openEdit(doc)}>
                    <code className="small text-primary-emphasis">{truncateId(doc['_id'])}</code>
                  </td>
                  {resource.tableFields.map(f => {
                    if (f === 'User') {
                      const userId = String(doc[f] ?? '');
                      const name = userNameMap[userId];
                      return (
                        <td key={f} className="small">
                          <div className="d-flex align-items-center gap-1 flex-nowrap">
                            <span>{name ?? <code className="text-muted">{truncateId(userId)}</code>}</span>
                            {onNavigateToUser && (
                              <button
                                className="btn btn-link btn-sm p-0 text-info flex-shrink-0"
                                style={{ lineHeight: '1' }}
                                onClick={e => {
                                  e.stopPropagation();
                                  onNavigateToUser(userId);
                                }}
                                title="Zum Profil"
                              >
                                <span className="db-icon db-font-size-xs" data-icon="magnifying_glass" />
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    }
                    return (
                      <td key={f} className="small">
                        {formatCell(f, doc[f])}
                      </td>
                    );
                  })}
                  {resource.extraFields?.map(f => (
                    <td key={f} className="small d-none d-lg-table-cell">
                      {formatCell(f, doc[f])}
                    </td>
                  ))}
                  <td className="text-end">
                    <button
                      className="btn btn-sm btn-outline-primary me-1 py-0"
                      onClick={() => openEdit(doc)}
                      title="Bearbeiten"
                    >
                      <span className="db-icon db-font-size-sm" data-icon="pen" />
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger py-0"
                      onClick={() => handleDelete(doc)}
                      title="Löschen"
                    >
                      <span className="db-icon db-font-size-sm" data-icon="bin" />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
        <small className="text-muted">
          {page ? `${page.total} Einträge · Seite ${currentPage}/${totalPages}` : ''}
        </small>
        {totalPages > 1 && (
          <div className="btn-group btn-group-sm">
            <button
              className="btn btn-outline-secondary"
              disabled={currentPage <= 1}
              onClick={() => loadPage(currentPage - 1)}
            >
              ‹
            </button>
            <button
              className="btn btn-outline-secondary"
              disabled={currentPage >= totalPages}
              onClick={() => loadPage(currentPage + 1)}
            >
              ›
            </button>
          </div>
        )}
        <button className="btn btn-sm btn-outline-secondary" onClick={() => loadPage(currentPage)}>
          <span
            className="db-icon me-1 db-font-size-sm"
            data-icon="circular_arrows"
            style={{ verticalAlign: 'middle' }}
          />
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
