import { useEffect, useState } from 'preact/hooks';
import { fetchAdminLogs, fetchAdminUserNameMap, type AdminPage } from '../utils/api';

const ITEMS_PER_PAGE = 25;

function formatTs(val: unknown): string {
  if (!val) return '—';
  try {
    return new Date(String(val)).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(val);
  }
}

function truncateId(val: unknown): string {
  const s = String(val ?? '');
  return s.length > 10 ? `…${s.slice(-8)}` : s;
}

function userName(map: Record<string, string>, id: string | null): preact.JSX.Element | string {
  if (!id) return '—';
  const name = map[id];
  if (name) return name;
  return <code class="text-muted">{truncateId(id)}</code>;
}

export function AdminLogBrowser() {
  const [logs, setLogs] = useState<AdminPage | null>(null);
  const [userNameMap, setUserNameMap] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminUserNameMap().then(setUserNameMap).catch(() => {});
    loadPage(1, '');
  }, []);

  function loadPage(pageNum: number, action: string) {
    setLoading(true);
    setLoadError(null);
    fetchAdminLogs({ page: pageNum, limit: ITEMS_PER_PAGE, action: action || undefined })
      .then(result => {
        setLogs(result);
        setCurrentPage(pageNum);
      })
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : 'Ladefehler'))
      .finally(() => setLoading(false));
  }

  function search() {
    loadPage(1, actionFilter);
  }

  const totalPages = logs ? Math.ceil(logs.total / ITEMS_PER_PAGE) : 1;

  return (
    <div>
      <div class="d-flex gap-2 mb-3 flex-wrap align-items-center">
        <input
          type="text"
          class="form-control form-control-sm"
          style="max-width:300px"
          placeholder="Aktion filtern (z.B. update, delete)…"
          value={actionFilter}
          onInput={e => setActionFilter((e.target as HTMLInputElement).value)}
          onKeyDown={e => {
            if (e.key === 'Enter') search();
          }}
        />
        <button class="btn btn-sm btn-primary" onClick={search}>
          Suchen
        </button>
        {actionFilter && (
          <button
            class="btn btn-sm btn-outline-secondary"
            onClick={() => {
              setActionFilter('');
              loadPage(1, '');
            }}
          >
            Zurücksetzen
          </button>
        )}
        <button
          class="btn btn-sm btn-outline-secondary ms-auto"
          onClick={() => loadPage(currentPage, actionFilter)}
        >
          <span class="material-icons-round me-1" style="font-size:1rem;vertical-align:middle">
            refresh
          </span>
          Aktualisieren
        </button>
      </div>

      {loadError && <div class="alert alert-danger py-2 small">{loadError}</div>}

      <div class="table-responsive">
        <table class="table table-sm table-hover align-middle mb-0">
          <thead class="table-dark">
            <tr>
              <th>Zeitstempel</th>
              <th>Aktion</th>
              <th>Admin</th>
              <th class="d-none d-md-table-cell">Ziel-User</th>
              <th class="d-none d-lg-table-cell">Ressource-ID</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} class="text-center py-4">
                  <div class="spinner-border spinner-border-sm" role="status" />
                </td>
              </tr>
            )}
            {!loading && (!logs || logs.data.length === 0) && (
              <tr>
                <td colSpan={5} class="text-center py-3 text-muted">
                  Keine Log-Einträge
                </td>
              </tr>
            )}
            {!loading &&
              logs?.data.map(entry => {
                const adminId = String(entry['adminId'] ?? '');
                const targetUserId = entry['targetUserId'] ? String(entry['targetUserId']) : null;
                const targetResourceId = entry['targetResourceId']
                  ? String(entry['targetResourceId'])
                  : null;
                return (
                  <tr key={String(entry['_id'])}>
                    <td class="small text-nowrap">{formatTs(entry['timestamp'])}</td>
                    <td>
                      <code class="small text-break">{String(entry['action'] ?? '')}</code>
                    </td>
                    <td class="small">{userName(userNameMap, adminId)}</td>
                    <td class="small d-none d-md-table-cell">{userName(userNameMap, targetUserId)}</td>
                    <td class="small d-none d-lg-table-cell">
                      {targetResourceId ? (
                        <code class="text-muted">{truncateId(targetResourceId)}</code>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div class="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
          <small class="text-muted">
            Gesamt: {logs?.total ?? 0} · Seite {currentPage}/{totalPages}
          </small>
          <div class="btn-group btn-group-sm">
            <button
              class="btn btn-outline-secondary"
              disabled={currentPage <= 1}
              onClick={() => loadPage(currentPage - 1, actionFilter)}
            >
              ‹
            </button>
            <button
              class="btn btn-outline-secondary"
              disabled={currentPage >= totalPages}
              onClick={() => loadPage(currentPage + 1, actionFilter)}
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
