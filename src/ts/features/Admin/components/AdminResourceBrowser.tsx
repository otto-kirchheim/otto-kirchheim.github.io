import { createPortal } from 'preact/compat';
import { useEffect, useState } from 'preact/hooks';
import { confirmDialog } from '@/infrastructure/ui/confirmDialog';
import { JsonEditor } from './JsonEditor';
import {
  fetchAdminResource,
  fetchAdminResourceById,
  fetchAdminResourceYears,
  updateAdminDoc,
  deleteAdminDoc,
  fetchAdminUserNameMap,
  type AdminPage,
} from '../utils/api';

const IMMUTABLE_FIELDS = new Set(['_id', '__v', 'createdAt']);
const READONLY_FIELDS = new Set(['updatedAt']);
const ITEMS_PER_PAGE = 25;

// Felder mit festen Enum-Werten → Dropdown
const FIELD_ENUMS: Record<string, string[]> = {
  LRE: ['LRE 1', 'LRE 2', 'LRE 1/2 ohne x', 'LRE 3', 'LRE 3 ohne x'],
  Schicht: ['T', 'SP', 'N', 'S', 'BN'],
};

// Cross-Resource-Referenzen: Feldname → Ziel-Ressource
type CrossRef = { resourceIdx: number; isArray?: boolean };
const CROSS_REFS: Record<string, CrossRef> = {
  EWT: { resourceIdx: 2 },
  Bereitschaftszeitraum: { resourceIdx: 1, isArray: true },
};

// Schema-Felder je Ressource (für Darstellung optionaler null-Felder)
const SCHEMA_FIELDS: Record<string, string[]> = {
  bereitschaftseinsaetze: [
    'User',
    'Bereitschaftszeitraum',
    'Jahr',
    'Monat',
    'Tag',
    'Auftragsnummer',
    'Beginn',
    'Ende',
    'LRE',
    'PrivatKm',
  ],
  bereitschaftszeitraeume: ['User', 'Jahr', 'Monat', 'Beginn', 'Ende', 'Pause'],
  einsatzwechseltaetigkeiten: [
    'User',
    'Jahr',
    'Monat',
    'Tag',
    'Buchungstag',
    'Einsatzort',
    'Schicht',
    'abWE',
    'ab1E',
    'anEE',
    'beginE',
    'endeE',
    'abEE',
    'an1E',
    'anWE',
    'berechnen',
  ],
  nebengeld: ['User', 'EWT', 'Jahr', 'Monat', 'Tag', 'Beginn', 'Ende', 'Auftragsnummer', 'Zulagen'],
};

// Datumsfelder die NUR als Datum gespeichert sind (kein Zeitanteil relevant)
const DATE_ONLY_FIELDS = new Set(['Tag', 'Buchungstag']);

// Zeitfelder die als "HH:mm"-String gespeichert sind (kein ISO-Datum, kein looksLikeIso-Match)
// BZ.Beginn/Ende sind Date-Typ und greifen über looksLikeIso; diese hier sind String-Typ
const TIME_STRING_FIELDS = new Set([
  'Beginn',
  'Ende', // BE + NG
  'abWE',
  'ab1E',
  'anEE',
  'beginE',
  'endeE',
  'abEE',
  'an1E',
  'anWE', // EWT
]);

type ResourceConfig = {
  label: string;
  shortLabel: string;
  endpoint: string;
  tableFields: string[];
  extraFields?: string[];
};

const RESOURCES: ResourceConfig[] = [
  {
    label: 'Bereitschaftseinsatz',
    shortLabel: 'BE',
    endpoint: 'bereitschaftseinsaetze',
    tableFields: ['User', 'Jahr', 'Monat', 'LRE', 'Auftragsnummer'],
    extraFields: ['Tag', 'createdAt'],
  },
  {
    label: 'Bereitschaftszeitraum',
    shortLabel: 'BZ',
    endpoint: 'bereitschaftszeitraeume',
    tableFields: ['User', 'Jahr', 'Monat', 'Beginn', 'Ende'],
    extraFields: ['createdAt'],
  },
  {
    label: 'Einsatzwechseltätigkeit',
    shortLabel: 'EWT',
    endpoint: 'einsatzwechseltaetigkeiten',
    tableFields: ['User', 'Jahr', 'Monat', 'Schicht', 'Tag'],
    extraFields: ['createdAt'],
  },
  {
    label: 'Nebengeld',
    shortLabel: 'NG',
    endpoint: 'nebengeld',
    tableFields: ['User', 'Jahr', 'Monat', 'Tag'],
    extraFields: ['EWT', 'createdAt'],
  },
];

const MONATE = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

function isObjectId(val: unknown): val is string {
  return typeof val === 'string' && /^[0-9a-f]{24}$/i.test(val);
}

function truncateId(val: unknown): string {
  const s = String(val ?? '');
  return s.length > 10 ? `…${s.slice(-8)}` : s;
}

function looksLikeIso(val: unknown): boolean {
  return typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val);
}

// Datumsfelder die nur Datum (kein Zeit) enthalten: UTC-Teile nutzen (kein Timezone-Versatz)
function formatDateOnly(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    const day = String(d.getUTCDate()).padStart(2, '0');
    const mon = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${day}.${mon}.${d.getUTCFullYear()}`;
  } catch {
    return isoStr;
  }
}

// Datetime-Felder: lokale Zeitzone anzeigen
function formatDateTime(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

// ISO → "YYYY-MM-DD" (UTC-Datum für type="date" input)
function toDateInput(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  } catch {
    return '';
  }
}

// ISO → "YYYY-MM-DDTHH:mm" (lokale Zeit für type="datetime-local" input)
function toDatetimeLocal(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

function formatCell(fieldName: string, val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (Array.isArray(val)) return `[${(val as unknown[]).length}]`;
  if (typeof val === 'object') return '{…}';
  if (looksLikeIso(val)) {
    return DATE_ONLY_FIELDS.has(fieldName) ? formatDateOnly(String(val)) : formatDateTime(String(val));
  }
  const s = String(val);
  return s.length > 24 ? `${s.slice(0, 22)}…` : s;
}

type FilterParams = { userId?: string; jahr?: number; monat?: number };

type EditState = {
  doc: Record<string, unknown>;
  values: Record<string, unknown>;
  rawStrings: Record<string, string>;
  jsonErrors: Record<string, string>;
  saving: boolean;
  saveError: string | null;
};

function buildEditState(doc: Record<string, unknown>, endpoint: string): EditState {
  const schemaFields = SCHEMA_FIELDS[endpoint] ?? [];
  const systemFields = ['_id', '__v', 'createdAt', 'updatedAt'];

  // Felder in Reihenfolge: Schema-Felder (mit null für fehlende) → System-Felder → Rest
  const values: Record<string, unknown> = {};
  for (const f of schemaFields) {
    values[f] = f in doc ? doc[f] : null;
  }
  for (const f of systemFields) {
    if (f in doc) values[f] = doc[f];
  }
  for (const [k, v] of Object.entries(doc)) {
    if (!(k in values)) values[k] = v;
  }

  const rawStrings: Record<string, string> = {};
  for (const [key, val] of Object.entries(values)) {
    if (val !== null && typeof val === 'object' && !CROSS_REFS[key]) {
      rawStrings[key] = JSON.stringify(val, null, 2);
    }
  }
  return { doc, values, rawStrings, jsonErrors: {}, saving: false, saveError: null };
}

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
      {edit &&
        createPortal(
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
                      const isUserRef = key === 'User';
                      const crossRef = CROSS_REFS[key];
                      const disabled = immutable || readonly;
                      const isNull = val === null;
                      const fieldEnum = FIELD_ENUMS[key];
                      const isDateOnly = typeof val === 'string' && looksLikeIso(val) && DATE_ONLY_FIELDS.has(key);
                      const isDateTime = typeof val === 'string' && looksLikeIso(val) && !DATE_ONLY_FIELDS.has(key);
                      // String-Zeitfelder: "HH:mm" (kein ISO) → type="time"
                      const isTimeString = typeof val === 'string' && !looksLikeIso(val) && TIME_STRING_FIELDS.has(key);

                      return (
                        <div key={key} class="mb-3">
                          <label class="form-label fw-semibold small mb-1">
                            {key}
                            {immutable && <span class="fw-normal text-muted ms-1">(nicht änderbar)</span>}
                            {readonly && <span class="fw-normal text-muted ms-1">(nur lesen)</span>}
                            {isUserRef && <span class="fw-normal text-muted ms-1">(Benutzerreferenz)</span>}
                            {crossRef && (
                              <span class="fw-normal text-info ms-1">→ {RESOURCES[crossRef.resourceIdx].label}</span>
                            )}
                            {isNull && !disabled && !isUserRef && (
                              <span class="badge bg-warning text-dark ms-1" style="font-size:0.65em">
                                leer
                              </span>
                            )}
                          </label>

                          {isUserRef ? (
                            <div class="d-flex align-items-center gap-2 flex-wrap">
                              <code class="small bg-body-secondary rounded px-2 py-1">{String(val ?? '')}</code>
                              {userNameMap[String(val)] && (
                                <span class="small fw-semibold">{userNameMap[String(val)]}</span>
                              )}
                              {onNavigateToUser && (
                                <button
                                  class="btn btn-sm btn-outline-info ms-auto"
                                  onClick={() => {
                                    closeEdit();
                                    onNavigateToUser(String(val));
                                  }}
                                >
                                  <span
                                    class="material-icons-round me-1"
                                    style="font-size:0.85rem;vertical-align:middle"
                                  >
                                    person_search
                                  </span>
                                  Zum Profil
                                </button>
                              )}
                            </div>
                          ) : disabled ? (
                            <input
                              class="form-control form-control-sm bg-body-secondary text-muted font-monospace"
                              readOnly
                              value={
                                isDateOnly
                                  ? formatDateOnly(String(val))
                                  : isDateTime
                                    ? formatDateTime(String(val))
                                    : isTimeString
                                      ? String(val)
                                      : String(val ?? '')
                              }
                            />
                          ) : crossRef ? (
                            crossRef.isArray && Array.isArray(val) ? (
                              <div class="d-flex flex-column gap-1">
                                {(val as string[]).length === 0 && (
                                  <em class="text-muted small">Keine Verknüpfungen</em>
                                )}
                                {(val as string[]).map((id, i) => (
                                  <div
                                    key={i}
                                    class="d-flex align-items-center gap-2 bg-body-secondary rounded px-2 py-1"
                                  >
                                    <code class="small flex-grow-1">{truncateId(id)}</code>
                                    <button
                                      class="btn btn-sm btn-outline-info py-0"
                                      onClick={() => void navigateToEntry(crossRef.resourceIdx, id)}
                                    >
                                      <span class="material-icons-round" style="font-size:0.85rem">
                                        open_in_new
                                      </span>
                                      <span class="ms-1 d-none d-sm-inline">
                                        {RESOURCES[crossRef.resourceIdx].shortLabel}
                                      </span>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : isNull ? (
                              <em class="text-muted small">Keine Verknüpfung (null)</em>
                            ) : (
                              <div class="d-flex align-items-center gap-2">
                                <code class="small bg-body-secondary rounded px-2 py-1 flex-grow-1">
                                  {truncateId(val)}
                                </code>
                                <button
                                  class="btn btn-sm btn-outline-info"
                                  onClick={() => void navigateToEntry(crossRef.resourceIdx, String(val))}
                                >
                                  <span
                                    class="material-icons-round me-1"
                                    style="font-size:0.85rem;vertical-align:middle"
                                  >
                                    open_in_new
                                  </span>
                                  {RESOURCES[crossRef.resourceIdx].label}
                                </button>
                              </div>
                            )
                          ) : typeof val === 'boolean' ? (
                            <div class="form-check mt-1">
                              <input
                                type="checkbox"
                                class="form-check-input"
                                checked={val}
                                onChange={e => handleValueChange(key, (e.target as HTMLInputElement).checked)}
                              />
                            </div>
                          ) : isNull ? (
                            <input
                              type="text"
                              class="form-control form-control-sm border-warning"
                              placeholder="(leer – Wert eingeben oder leer lassen)"
                              onChange={e => {
                                const v = (e.target as HTMLInputElement).value;
                                handleValueChange(key, v || null);
                              }}
                            />
                          ) : val !== null && typeof val === 'object' ? (
                            <JsonEditor
                              value={edit.rawStrings[key] ?? ''}
                              onChange={raw => handleTextareaChange(key, raw)}
                              error={edit.jsonErrors[key]}
                            />
                          ) : isTimeString ? (
                            <input
                              type="time"
                              class="form-control form-control-sm"
                              value={String(val)}
                              onChange={e => handleValueChange(key, (e.target as HTMLInputElement).value)}
                            />
                          ) : isDateOnly ? (
                            <input
                              type="date"
                              class="form-control form-control-sm"
                              value={toDateInput(String(val))}
                              onChange={e => {
                                const v = (e.target as HTMLInputElement).value;
                                handleValueChange(key, v ? `${v}T00:00:00.000Z` : null);
                              }}
                            />
                          ) : isDateTime ? (
                            <input
                              type="datetime-local"
                              class="form-control form-control-sm"
                              value={toDatetimeLocal(String(val))}
                              onChange={e => {
                                const v = (e.target as HTMLInputElement).value;
                                handleValueChange(key, v ? new Date(v).toISOString() : null);
                              }}
                            />
                          ) : fieldEnum ? (
                            <select
                              class="form-select form-select-sm"
                              value={String(val ?? '')}
                              onChange={e => handleValueChange(key, (e.target as HTMLSelectElement).value)}
                            >
                              {fieldEnum.map(v => (
                                <option key={v} value={v}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          ) : typeof val === 'number' ? (
                            <input
                              type="number"
                              class="form-control form-control-sm"
                              value={val}
                              onChange={e =>
                                handleValueChange(key, parseFloat((e.target as HTMLInputElement).value) || 0)
                              }
                            />
                          ) : isObjectId(val) ? (
                            <div class="d-flex align-items-center gap-2">
                              <code class="small bg-body-secondary rounded px-2 py-1 flex-grow-1">{val}</code>
                              <button
                                class="btn btn-sm btn-outline-secondary"
                                title="Kopieren"
                                onClick={() => void navigator.clipboard?.writeText(val)}
                              >
                                <span class="material-icons-round" style="font-size:0.85rem">
                                  content_copy
                                </span>
                              </button>
                            </div>
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
          </>,
          document.body,
        )}
    </div>
  );
}
