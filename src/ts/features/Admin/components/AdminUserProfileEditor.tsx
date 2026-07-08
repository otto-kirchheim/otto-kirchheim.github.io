import { createPortal } from 'preact/compat';
import { useEffect, useState } from 'preact/hooks';
import { confirmDialog } from '@/infrastructure/ui/confirmDialog';
import { JsonEditor } from './JsonEditor';
import {
  fetchAdminUserProfiles,
  updateAdminUserProfileDoc,
  setAdminEmailVerified,
  fetchAdminPasskeys,
  deleteAdminPasskey,
  fetchAdminUserEmailVerified,
  type AdminPage,
  type AdminPasskey,
} from '../utils/api';

const BUNDESLAND_OPTIONS = [
  { value: 'BW', label: 'Baden-Württemberg' },
  { value: 'BY', label: 'Bayern' },
  { value: 'BE', label: 'Berlin' },
  { value: 'BB', label: 'Brandenburg' },
  { value: 'HB', label: 'Bremen' },
  { value: 'HH', label: 'Hamburg' },
  { value: 'HE', label: 'Hessen' },
  { value: 'MV', label: 'Mecklenburg-Vorpommern' },
  { value: 'NI', label: 'Niedersachsen' },
  { value: 'NW', label: 'Nordrhein-Westfalen' },
  { value: 'RP', label: 'Rheinland-Pfalz' },
  { value: 'SL', label: 'Saarland' },
  { value: 'SN', label: 'Sachsen' },
  { value: 'ST', label: 'Sachsen-Anhalt' },
  { value: 'SH', label: 'Schleswig-Holstein' },
  { value: 'TH', label: 'Thüringen' },
];

const TB_OPTIONS = ['Besoldungsgruppe A 8', 'Besoldungsgruppe A 9', 'Tarifkraft'];

// Felder in Pers die als Dropdown gerendert werden
const PERS_SELECT_FIELDS: Record<string, { value: string; label: string }[] | string[]> = {
  Bundesland: BUNDESLAND_OPTIONS,
  TB: TB_OPTIONS,
};

const PERS_NUMBER_FIELDS = new Set(['kmArbeitsort', 'kmnBhf']);
const ITEMS_PER_PAGE = 20;

const PERS_FIELD_LABELS: Record<string, string> = {
  Vorname: 'Vorname',
  Nachname: 'Nachname',
  PNummer: 'Personalnummer',
  Telefon: 'Telefon',
  Adress1: 'Adresse 1',
  Adress2: 'Adresse 2',
  ErsteTkgSt: 'Erste TkgSt',
  ErsteTkgStAdresse: 'TkgSt Adresse',
  Bundesland: 'Bundesland',
  Betrieb: 'Betrieb',
  OE: 'OE',
  Gewerk: 'Gewerk',
  kmArbeitsort: 'km Arbeitsort',
  nBhf: 'nächster Bhf',
  kmnBhf: 'km Bhf',
  TB: 'Tarif/Besoldung',
};

const JSON_SECTIONS = ['Fahrzeit', 'Arbeitszeit', 'VorgabenB', 'Einstellungen'] as const;

type ProfileRow = {
  _id: string;
  User: string;
  vorname: string;
  nachname: string;
  oe: string;
  doc: Record<string, unknown>;
};

type EditState = {
  profileId: string;
  userId: string;
  pers: Record<string, unknown>;
  jsonValues: Record<string, unknown>;
  jsonRaw: Record<string, string>;
  jsonErrors: Record<string, string>;
  emailVerified: boolean | null;
  passkeys: AdminPasskey[];
  passkeysLoading: boolean;
  saving: boolean;
  saveError: string | null;
};

function extractRow(doc: Record<string, unknown>): ProfileRow {
  const pers = (doc['Pers'] ?? {}) as Record<string, unknown>;
  return {
    _id: String(doc['_id'] ?? ''),
    User: String(doc['User'] ?? ''),
    vorname: String(pers['Vorname'] ?? ''),
    nachname: String(pers['Nachname'] ?? ''),
    oe: String(pers['OE'] ?? ''),
    doc,
  };
}

function buildEditState(doc: Record<string, unknown>): EditState {
  const pers = { ...((doc['Pers'] ?? {}) as Record<string, unknown>) };
  const jsonValues: Record<string, unknown> = {};
  const jsonRaw: Record<string, string> = {};

  for (const section of JSON_SECTIONS) {
    const val = doc[section];
    jsonValues[section] = val ?? (section === 'VorgabenB' || section === 'Fahrzeit' ? [] : {});
    jsonRaw[section] = JSON.stringify(jsonValues[section], null, 2);
  }

  return {
    profileId: String(doc['_id'] ?? ''),
    userId: String(doc['User'] ?? ''),
    pers,
    jsonValues,
    jsonRaw,
    jsonErrors: {},
    emailVerified: null,
    passkeys: [],
    passkeysLoading: false,
    saving: false,
    saveError: null,
  };
}

function isUserId(s: string): boolean {
  return /^[0-9a-f]{24}$/i.test(s);
}

export function AdminUserProfileEditor({
  initialSearch = '',
  searchKey = 0,
}: {
  initialSearch?: string;
  searchKey?: number;
}) {
  const [page, setPage] = useState<AdminPage | null>(null);
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [search, setSearch] = useState('');

  function loadPage(pageNum: number) {
    setLoading(true);
    setLoadError(null);
    fetchAdminUserProfiles({ page: pageNum, limit: ITEMS_PER_PAGE })
      .then(result => {
        setPage(result);
        setRows(result.data.map(extractRow));
        setCurrentPage(pageNum);
      })
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : 'Ladefehler'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadPage(1);
  }, []);

  // Navigation von ResourceBrowser: userId direkt laden und Edit-Modal öffnen
  useEffect(() => {
    if (!initialSearch) return;
    if (isUserId(initialSearch)) {
      fetchAdminUserProfiles({ userId: initialSearch })
        .then(result => {
          const doc = result.data[0];
          if (doc) void openEdit(extractRow(doc));
        })
        .catch(() => {});
    } else {
      setSearch(initialSearch);
    }
  }, [initialSearch, searchKey]);

  async function openEdit(row: ProfileRow) {
    const state = buildEditState(row.doc);
    setEdit({ ...state, passkeysLoading: true });
    try {
      const [passkeys, userInfo] = await Promise.all([
        fetchAdminPasskeys(state.userId),
        fetchAdminUserEmailVerified(state.userId),
      ]);
      setEdit(prev =>
        prev ? { ...prev, passkeys, passkeysLoading: false, emailVerified: userInfo.emailVerified } : prev,
      );
    } catch {
      setEdit(prev => (prev ? { ...prev, passkeysLoading: false } : prev));
    }
  }

  function closeEdit() {
    setEdit(null);
  }

  function handlePersChange(key: string, value: string) {
    if (!edit) return;
    const numVal = PERS_NUMBER_FIELDS.has(key) ? parseFloat(value) || 0 : undefined;
    setEdit({
      ...edit,
      pers: { ...edit.pers, [key]: numVal !== undefined ? numVal : value },
    });
  }

  function handleJsonChange(section: string, raw: string) {
    if (!edit) return;
    const jsonRaw = { ...edit.jsonRaw, [section]: raw };
    const jsonErrors = { ...edit.jsonErrors };
    let jsonValues = edit.jsonValues;
    try {
      const parsed: unknown = JSON.parse(raw);
      jsonValues = { ...jsonValues, [section]: parsed };
      delete jsonErrors[section];
    } catch {
      jsonErrors[section] = 'Ungültiges JSON';
    }
    setEdit({ ...edit, jsonRaw, jsonErrors, jsonValues });
  }

  async function saveEdit() {
    if (!edit) return;
    if (Object.keys(edit.jsonErrors).length > 0) {
      setEdit({ ...edit, saveError: 'Bitte JSON-Fehler zuerst beheben.' });
      return;
    }

    const payload: Record<string, unknown> = {
      Pers: edit.pers,
      ...Object.fromEntries(JSON_SECTIONS.map(s => [s, edit.jsonValues[s]])),
    };

    setEdit({ ...edit, saving: true, saveError: null });
    try {
      const updated = await updateAdminUserProfileDoc(edit.profileId, payload);
      setRows(prev => prev.map(r => (r._id === edit.profileId ? extractRow(updated) : r)));
      closeEdit();
    } catch (err: unknown) {
      setEdit(prev =>
        prev ? { ...prev, saving: false, saveError: err instanceof Error ? err.message : 'Speicherfehler' } : prev,
      );
    }
  }

  async function handleToggleEmailVerified() {
    if (!edit) return;
    const newVal = !(edit.emailVerified ?? false);
    const confirmed = await confirmDialog(`emailVerified wird auf ${String(newVal)} gesetzt.`, {
      title: 'emailVerified ändern?',
      confirmLabel: 'Setzen',
      confirmClass: 'btn-warning',
    });
    if (!confirmed) return;
    try {
      await setAdminEmailVerified(edit.userId, newVal);
      setEdit(prev => (prev ? { ...prev, emailVerified: newVal } : prev));
    } catch (err: unknown) {
      setEdit(prev => (prev ? { ...prev, saveError: err instanceof Error ? err.message : 'Fehler' } : prev));
    }
  }

  async function handleDeletePasskey(credentialId: string) {
    if (!edit) return;
    const confirmed = await confirmDialog(`credentialId: ${credentialId}`, {
      title: 'Passkey löschen?',
      confirmLabel: 'Löschen',
    });
    if (!confirmed) return;
    try {
      await deleteAdminPasskey(edit.userId, credentialId);
      setEdit(prev =>
        prev ? { ...prev, passkeys: prev.passkeys.filter(pk => pk.credentialId !== credentialId) } : prev,
      );
    } catch (err: unknown) {
      setEdit(prev => (prev ? { ...prev, saveError: err instanceof Error ? err.message : 'Löschfehler' } : prev));
    }
  }

  const filteredRows = search
    ? rows.filter(
        r =>
          r.vorname.toLowerCase().includes(search.toLowerCase()) ||
          r.nachname.toLowerCase().includes(search.toLowerCase()) ||
          r.oe.toLowerCase().includes(search.toLowerCase()),
      )
    : rows;

  const totalPages = page ? Math.ceil(page.total / ITEMS_PER_PAGE) : 1;

  return (
    <div>
      {/* Search */}
      <div class="mb-3">
        <input
          type="search"
          class="form-control form-control-sm"
          placeholder="Name oder OE suchen…"
          value={search}
          onInput={e => setSearch((e.target as HTMLInputElement).value)}
        />
      </div>

      {loadError && <div class="alert alert-danger py-2 small">{loadError}</div>}

      {/* Table */}
      <div class="table-responsive">
        <table class="table table-sm table-hover align-middle mb-0">
          <thead class="table-dark">
            <tr>
              <th>Name</th>
              <th>OE</th>
              <th>User-ID</th>
              <th style="width:5rem" class="text-end">
                Aktion
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} class="text-center py-4">
                  <div class="spinner-border spinner-border-sm" role="status" />
                </td>
              </tr>
            )}
            {!loading && filteredRows.length === 0 && (
              <tr>
                <td colSpan={4} class="text-center py-3 text-muted">
                  Keine Profile
                </td>
              </tr>
            )}
            {!loading &&
              filteredRows.map(row => (
                <tr key={row._id}>
                  <td class="small">
                    {row.vorname || row.nachname ? (
                      `${row.vorname} ${row.nachname}`.trim()
                    ) : (
                      <em class="text-muted">kein Name</em>
                    )}
                  </td>
                  <td class="small">{row.oe || <em class="text-muted">—</em>}</td>
                  <td>
                    <code class="small text-muted">…{row.User.slice(-8)}</code>
                  </td>
                  <td class="text-end">
                    <button
                      class="btn btn-sm btn-outline-primary py-0"
                      onClick={() => openEdit(row)}
                      title="Bearbeiten"
                    >
                      <span class="material-icons-round" style="font-size:1rem">
                        edit
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

      <div class="text-end mt-2">
        <button class="btn btn-sm btn-outline-secondary" onClick={() => loadPage(currentPage)}>
          <span class="material-icons-round me-1" style="font-size:1rem;vertical-align:middle">
            refresh
          </span>
          Aktualisieren
        </button>
      </div>

      {/* Edit Modal – Portal: rendert außerhalb des Tab-Pane (display:none-Problem) */}
      {edit &&
        createPortal(
          <>
            <div class="modal fade show d-block" tabIndex={-1} style="z-index:1055">
              <div class="modal-dialog modal-xl modal-fullscreen-sm-down">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title">
                      UserProfile: {(edit.pers['Vorname'] as string) ?? ''} {(edit.pers['Nachname'] as string) ?? ''}
                    </h5>
                    <button type="button" class="btn-close" onClick={closeEdit} />
                  </div>

                  <div class="modal-body" style="max-height:70vh;overflow-y:auto">
                    {edit.saveError && <div class="alert alert-danger py-2 small">{edit.saveError}</div>}

                    <div class="row g-4">
                      {/* Pers Fields */}
                      <div class="col-md-6">
                        <h6 class="fw-semibold mb-3 border-bottom pb-2">Persönliche Daten</h6>
                        {Object.entries(edit.pers).map(([key, val]) => {
                          const selectOpts = PERS_SELECT_FIELDS[key];
                          return (
                            <div key={key} class="mb-2">
                              <label class="form-label small fw-semibold mb-1">{PERS_FIELD_LABELS[key] ?? key}</label>
                              {selectOpts ? (
                                <select
                                  class="form-select form-select-sm"
                                  value={String(val ?? '')}
                                  onChange={e => handlePersChange(key, (e.target as HTMLSelectElement).value)}
                                >
                                  <option value="">(keine Auswahl)</option>
                                  {typeof selectOpts[0] === 'string'
                                    ? (selectOpts as string[]).map(opt => (
                                        <option key={opt} value={opt}>
                                          {opt}
                                        </option>
                                      ))
                                    : (selectOpts as { value: string; label: string }[]).map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                          {opt.label} ({opt.value})
                                        </option>
                                      ))}
                                </select>
                              ) : (
                                <input
                                  type={PERS_NUMBER_FIELDS.has(key) ? 'number' : 'text'}
                                  class="form-control form-control-sm"
                                  value={String(val ?? '')}
                                  onChange={e => handlePersChange(key, (e.target as HTMLInputElement).value)}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* JSON Sections */}
                      <div class="col-md-6">
                        <h6 class="fw-semibold mb-3 border-bottom pb-2">Komplexe Felder (JSON)</h6>
                        {JSON_SECTIONS.map(section => (
                          <div key={section} class="mb-3">
                            <label class="form-label small fw-semibold mb-1">{section}</label>
                            <JsonEditor
                              value={edit.jsonRaw[section] ?? ''}
                              onChange={raw => handleJsonChange(section, raw)}
                              error={edit.jsonErrors[section]}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* User Actions */}
                    <div class="border-top mt-4 pt-3">
                      <h6 class="fw-semibold mb-3">Benutzer-Aktionen</h6>
                      <div class="d-flex flex-wrap gap-3 align-items-start">
                        {/* emailVerified */}
                        <div>
                          <div class="small text-muted mb-1">emailVerified</div>
                          <button
                            class={`btn btn-sm ${edit.emailVerified ? 'btn-success' : 'btn-outline-secondary'}`}
                            onClick={handleToggleEmailVerified}
                          >
                            {edit.emailVerified === null
                              ? 'unbekannt'
                              : edit.emailVerified
                                ? 'true ✓'
                                : 'false – umschalten'}
                          </button>
                          {edit.emailVerified === null && (
                            <div class="small text-muted mt-1">Klicken zum Setzen auf true</div>
                          )}
                        </div>

                        {/* Passkeys */}
                        <div class="flex-grow-1">
                          <div class="small text-muted mb-1">
                            Passkeys
                            {edit.passkeysLoading && (
                              <span class="spinner-border spinner-border-sm ms-2" role="status" />
                            )}
                          </div>
                          {edit.passkeys.length === 0 && !edit.passkeysLoading && (
                            <div class="small text-muted">Keine Passkeys</div>
                          )}
                          {edit.passkeys.map(pk => (
                            <div key={pk.credentialId} class="d-flex align-items-center gap-2 mb-1">
                              <span class="small">
                                {pk.name ?? 'Passkey'} <code class="text-muted">…{pk.credentialId.slice(-8)}</code>
                              </span>
                              <button
                                class="btn btn-sm btn-outline-danger py-0"
                                onClick={() => handleDeletePasskey(pk.credentialId)}
                                title="Passkey löschen"
                              >
                                <span class="material-icons-round" style="font-size:0.9rem">
                                  delete
                                </span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="modal-footer">
                    <button class="btn btn-secondary" onClick={closeEdit} disabled={edit.saving}>
                      Schließen
                    </button>
                    <button class="btn btn-primary" onClick={saveEdit} disabled={edit.saving}>
                      {edit.saving ? (
                        <>
                          <span class="spinner-border spinner-border-sm me-1" role="status" />
                          Speichern…
                        </>
                      ) : (
                        'Profil speichern'
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
