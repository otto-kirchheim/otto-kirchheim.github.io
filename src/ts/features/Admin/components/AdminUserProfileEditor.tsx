import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { confirmDialog } from '@/infrastructure/ui/confirmDialog';
import { joinOeLevels, splitOeInput } from '@/infrastructure/data/oeLevels';
import { JsonEditor } from './JsonEditor';
import { OeLevelBoxes } from './OeLevelBoxes';
import { TB_OPTIONS } from './profileTemplates.shared';
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

// Felder in Pers die als Dropdown gerendert werden
const PERS_SELECT_FIELDS: Record<string, { value: string; label: string }[] | readonly string[]> = {
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
  Taetigkeit: 'Tätigkeit (EA)',
  Entgeltgruppe: 'Entgeltgruppe (EA)',
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
    oe: joinOeLevels((pers['OE'] as string[] | undefined) ?? []),
    doc,
  };
}

/** OE wird als Ebenen-Array gespeichert, hier aber als ein Textfeld bearbeitet. */
function persFieldToInput(key: string, value: unknown): string {
  if (key === 'OE') return joinOeLevels((value as string[] | undefined) ?? []);
  return String(value ?? '');
}

function buildEditState(doc: Record<string, unknown>): EditState {
  const pers = { ...((doc['Pers'] ?? {}) as Record<string, unknown>) };
  // Bestandsnutzer haben diese Felder noch nicht im Dokument (kein Schema-Default) -- ohne
  // Default fehlt der Object-Key komplett und das Formularfeld wird gar nicht erst gerendert.
  pers['Taetigkeit'] ??= '';
  pers['Entgeltgruppe'] ??= '';
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
    const parsed: unknown = PERS_NUMBER_FIELDS.has(key)
      ? parseFloat(value) || 0
      : key === 'OE'
        ? splitOeInput(value)
        : value;
    setEdit({
      ...edit,
      pers: { ...edit.pers, [key]: parsed },
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
      <div className="mb-3">
        <input
          type="search"
          className="form-control form-control-sm"
          placeholder="Name oder OE suchen…"
          value={search}
          onChange={e => setSearch((e.target as HTMLInputElement).value)}
        />
      </div>

      {loadError && <div className="alert alert-danger py-2 small">{loadError}</div>}

      {/* Table */}
      <div className="table-responsive">
        <table className="table table-sm table-hover align-middle mb-0">
          <thead className="table-dark">
            <tr>
              <th>Name</th>
              <th>OE</th>
              <th>User-ID</th>
              <th style={{ width: '5rem' }} className="text-end">
                Aktion
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="text-center py-4">
                  <div className="spinner-border spinner-border-sm" role="status" />
                </td>
              </tr>
            )}
            {!loading && filteredRows.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-3 text-muted">
                  Keine Profile
                </td>
              </tr>
            )}
            {!loading &&
              filteredRows.map(row => (
                <tr key={row._id}>
                  <td className="small">
                    {row.vorname || row.nachname ? (
                      `${row.vorname} ${row.nachname}`.trim()
                    ) : (
                      <em className="text-muted">kein Name</em>
                    )}
                  </td>
                  <td className="small">{row.oe || <em className="text-muted">—</em>}</td>
                  <td>
                    <code className="small text-muted">…{row.User.slice(-8)}</code>
                  </td>
                  <td className="text-end">
                    <button
                      className="btn btn-sm btn-outline-primary py-0"
                      onClick={() => openEdit(row)}
                      title="Bearbeiten"
                    >
                      <span className="db-icon db-font-size-sm" data-icon="pen" />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
          <small className="text-muted">
            Gesamt: {page?.total ?? 0} · Seite {currentPage}/{totalPages}
          </small>
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
        </div>
      )}

      <div className="text-end mt-2">
        <button className="btn btn-sm btn-outline-secondary" onClick={() => loadPage(currentPage)}>
          <span
            className="db-icon me-1 db-font-size-sm"
            data-icon="circular_arrows"
            style={{ verticalAlign: 'middle' }}
          />
          Aktualisieren
        </button>
      </div>

      {/* Edit Modal – Portal: rendert außerhalb des Tab-Pane (display:none-Problem) */}
      {edit &&
        createPortal(
          <>
            <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: '1055' }}>
              <div className="modal-dialog modal-xl modal-fullscreen-sm-down">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      UserProfile: {(edit.pers['Vorname'] as string) ?? ''} {(edit.pers['Nachname'] as string) ?? ''}
                    </h5>
                    <button type="button" className="btn-close" onClick={closeEdit} />
                  </div>

                  <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    {edit.saveError && <div className="alert alert-danger py-2 small">{edit.saveError}</div>}

                    <div className="row g-4">
                      {/* Pers Fields */}
                      <div className="col-md-6">
                        <h6 className="fw-semibold mb-3 border-bottom pb-2">Persönliche Daten</h6>
                        {Object.entries(edit.pers).map(([key, val]) => {
                          const selectOpts = PERS_SELECT_FIELDS[key];
                          return (
                            <div key={key} className="mb-2">
                              <label className="form-label small fw-semibold mb-1">
                                {PERS_FIELD_LABELS[key] ?? key}
                              </label>
                              {selectOpts ? (
                                <select
                                  className="form-select form-select-sm"
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
                              ) : key === 'OE' ? (
                                <OeLevelBoxes
                                  value={persFieldToInput(key, val)}
                                  onChange={value => handlePersChange(key, value)}
                                />
                              ) : (
                                <input
                                  type={PERS_NUMBER_FIELDS.has(key) ? 'number' : 'text'}
                                  className="form-control form-control-sm"
                                  value={persFieldToInput(key, val)}
                                  onChange={e => handlePersChange(key, (e.target as HTMLInputElement).value)}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* JSON Sections */}
                      <div className="col-md-6">
                        <h6 className="fw-semibold mb-3 border-bottom pb-2">Komplexe Felder (JSON)</h6>
                        {JSON_SECTIONS.map(section => (
                          <div key={section} className="mb-3">
                            <label className="form-label small fw-semibold mb-1">{section}</label>
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
                    <div className="border-top mt-4 pt-3">
                      <h6 className="fw-semibold mb-3">Benutzer-Aktionen</h6>
                      <div className="d-flex flex-wrap gap-3 align-items-start">
                        {/* emailVerified */}
                        <div>
                          <div className="small text-muted mb-1">emailVerified</div>
                          <button
                            className={`btn btn-sm ${edit.emailVerified ? 'btn-success' : 'btn-outline-secondary'}`}
                            onClick={handleToggleEmailVerified}
                          >
                            {edit.emailVerified === null
                              ? 'unbekannt'
                              : edit.emailVerified
                                ? 'true ✓'
                                : 'false – umschalten'}
                          </button>
                          {edit.emailVerified === null && (
                            <div className="small text-muted mt-1">Klicken zum Setzen auf true</div>
                          )}
                        </div>

                        {/* Passkeys */}
                        <div className="flex-grow-1">
                          <div className="small text-muted mb-1">
                            Passkeys
                            {edit.passkeysLoading && (
                              <span className="spinner-border spinner-border-sm ms-2" role="status" />
                            )}
                          </div>
                          {edit.passkeys.length === 0 && !edit.passkeysLoading && (
                            <div className="small text-muted">Keine Passkeys</div>
                          )}
                          {edit.passkeys.map(pk => (
                            <div key={pk.credentialId} className="d-flex align-items-center gap-2 mb-1">
                              <span className="small">
                                {pk.name ?? 'Passkey'} <code className="text-muted">…{pk.credentialId.slice(-8)}</code>
                              </span>
                              <button
                                className="btn btn-sm btn-outline-danger py-0"
                                onClick={() => handleDeletePasskey(pk.credentialId)}
                                title="Passkey löschen"
                              >
                                <span className="db-icon db-font-size-xs" data-icon="bin" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={closeEdit} disabled={edit.saving}>
                      Schließen
                    </button>
                    <button className="btn btn-primary" onClick={saveEdit} disabled={edit.saving}>
                      {edit.saving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" role="status" />
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
            <div className="modal-backdrop fade show" style={{ zIndex: '1054' }} />
          </>,
          document.body,
        )}
    </div>
  );
}
