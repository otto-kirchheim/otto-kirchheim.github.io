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
import { DBButton, DBCard, DBNotification, DBStack, DBTag, DBTooltip } from '@db-ux/react-core-components';
import { DbAuswahl, DbFeld } from '@/components';

type Props = { onNavigateToUser?: (userId: string) => void };

/**
 * Admin-Browser für Rohdaten der Ressourcen: Tabs je Ressource, Filter (Benutzer, Jahr, Monat), Seitennavigation sowie Bearbeiten und Löschen einzelner Datensätze.
 *
 * @param props - Optional `onNavigateToUser`: wechselt zum Profil eines Benutzers.
 */
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

  /**
   * Lädt eine Seite der Ressource mit dem Filter; Fehler erscheinen als Meldung über der Tabelle.
   *
   * @param pageNum - Seitennummer (ab 1).
   * @param filter - Anzuwendender Filter.
   * @param endpointOverride - Endpunkt statt dem der aktiven Ressource (für den Tabwechsel, bevor der State aktualisiert ist).
   */
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

  // Tabwechsel: Listen- und Filter-Reset bewusst in der Renderphase (React-Docs: "adjusting
  // state when props change") -- synchrone setState im Effect waeren react-hooks/set-state-in-effect.
  const [prevActiveIdx, setPrevActiveIdx] = useState(activeIdx);
  if (prevActiveIdx !== activeIdx) {
    setPrevActiveIdx(activeIdx);
    setPage(null);
    setCurrentPage(1);
    setFilterUserId('');
    setUserSearchText('');
    setFilterJahr('');
    setFilterMonat('');
    setAvailableYears([]);
    setActiveFilter({});
  }

  /**
   * Lädt eine Seite mit dem zuletzt übernommenen Filter.
   *
   * @param pageNum - Seitennummer (ab 1).
   */
  function loadPage(pageNum: number) {
    loadPageWith(pageNum, activeFilter);
  }

  /**
   * Übernimmt die Filter-Eingaben und lädt ab Seite 1.
   */
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

  /**
   * Leert Eingaben und übernommenen Filter und lädt ab Seite 1.
   */
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
    // Microtask: der synchrone Funktionsaufruf direkt im Effect-Body loeste sonst
    // react-hooks/set-state-in-effect aus (loadPageWith setzt synchron setLoading).
    queueMicrotask(() => loadPageWith(1, {}, ep));
    fetchAdminResourceYears(ep)
      .then(setAvailableYears)
      .catch(() => {});
    // loadPageWith ist bewusst keine Dep: sie wird je Render neu erzeugt und wuerde den
    // Effect in eine Schleife ziehen; relevant ist nur der Tabwechsel (activeIdx).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx]);

  /**
   * Öffnet den Bearbeiten-Dialog für einen Datensatz.
   *
   * @param doc - Datensatz, der bearbeitet wird.
   */
  function openEdit(doc: Record<string, unknown>) {
    setEdit(buildEditState(doc, resource.endpoint));
  }

  /**
   * Schließt den Bearbeiten-Dialog.
   */
  function closeEdit() {
    setEdit(null);
  }

  /**
   * Springt zu einem verlinkten Datensatz einer anderen Ressource und öffnet ihn im Bearbeiten-Dialog; ist er nicht auffindbar, erscheint eine Fehlermeldung.
   *
   * @param resourceIdx - Index der Ziel-Ressource in `RESOURCES`.
   * @param docId - Id des verlinkten Datensatzes.
   */
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

  /**
   * Übernimmt JSON-Text eines Feldes; bei ungültigem JSON bleibt der Wert unverändert und ein Fehler wird gemerkt.
   *
   * @param key - Feldname.
   * @param raw - Roher JSON-Text aus dem Editor.
   */
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

  /**
   * Übernimmt den geänderten Wert eines Feldes in den Bearbeitungsstand.
   *
   * @param key - Feldname.
   * @param val - Neuer Wert.
   */
  function handleValueChange(key: string, val: unknown) {
    if (!edit) return;
    setEdit({ ...edit, values: { ...edit.values, [key]: val } });
  }

  /**
   * Speichert den bearbeiteten Datensatz ohne unveränderbare/schreibgeschützte Felder und ohne `User` und ersetzt ihn in der Liste; bei JSON-Fehlern wird nicht gespeichert.
   */
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

  /**
   * Löscht einen Datensatz nach Bestätigung und entfernt ihn aus der Liste.
   *
   * @param doc - Zu löschender Datensatz.
   */
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
      <nav className="db-navigation admin-unternavigation mb-3" role="tablist" aria-label="Ressourcen">
        <menu>
          {RESOURCES.map((r, i) => (
            <li
              key={r.endpoint}
              className="db-navigation-item"
              data-active={String(i === activeIdx)}
              role="presentation"
            >
              <button onClick={() => setActiveIdx(i)} type="button" role="tab" aria-selected={i === activeIdx}>
                <span className="d-none d-md-inline">{r.label}</span>
                <span className="d-md-none">{r.shortLabel}</span>
              </button>
            </li>
          ))}
        </menu>
      </nav>

      <DBCard className="bg-body-secondary border-0 mb-3" spacing="none">
        <div className="py-2 px-3">
          <div className="d-flex flex-wrap gap-2 align-items-end">
            {/* Benutzer: Text-Input mit Datalist (Suche) */}
            <div className="flex-grow-1" style={{ minWidth: '180px', maxWidth: '300px' }}>
              <label className="small mb-1">Benutzer</label>
              <div className="position-relative">
                <DbFeld
                  beschriftung="Alle Benutzer (Name eingeben…)"
                  dicht
                  type="text"
                  list={`user-datalist-${activeIdx}`}
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
                  <DBButton
                    type="button"
                    className="position-absolute end-0 top-50 translate-middle-y p-0 pe-2 text-muted"
                    variant="ghost"
                    size="small"
                    style={{ lineHeight: '1' }}
                    onClick={() => {
                      setFilterUserId('');
                      setUserSearchText('');
                    }}
                    title="Benutzer-Filter löschen"
                  >
                    ×
                  </DBButton>
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
              <DbAuswahl
                beschriftung="Jahr"
                beschriftungZeigen
                dicht
                value={filterJahr}
                onChange={e => setFilterJahr((e.target as HTMLSelectElement).value)}
              >
                <option value="">Alle</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </DbAuswahl>
            </div>

            <div style={{ minWidth: '130px' }}>
              <DbAuswahl
                beschriftung="Monat"
                beschriftungZeigen
                dicht
                value={filterMonat}
                onChange={e => setFilterMonat((e.target as HTMLSelectElement).value)}
              >
                <option value="">Alle</option>
                {MONATE.map((m, i) => (
                  <option key={i + 1} value={i + 1}>
                    {m}
                  </option>
                ))}
              </DbAuswahl>
            </div>

            <div className="d-flex gap-2 ms-auto align-items-end">
              <DBButton type="button" variant="brand" size="small" icon="funnel" onClick={applyFilter}>
                Filtern
              </DBButton>
              {hasActiveFilter && (
                <DBButton type="button" variant="outlined" size="small" onClick={resetFilter}>
                  Zurücksetzen
                </DBButton>
              )}
            </div>
          </div>

          {hasActiveFilter && (
            <div className="mt-2 d-flex flex-wrap gap-2">
              {activeFilter.userId && (
                <DBTag semantic="informational" emphasis="strong">
                  User: {userNameMap[activeFilter.userId] ?? truncateId(activeFilter.userId)}
                </DBTag>
              )}
              {activeFilter.jahr && (
                <DBTag semantic="neutral" emphasis="strong">
                  Jahr: {activeFilter.jahr}
                </DBTag>
              )}
              {activeFilter.monat && (
                <DBTag semantic="neutral" emphasis="strong">
                  Monat: {MONATE[(activeFilter.monat ?? 1) - 1]}
                </DBTag>
              )}
            </div>
          )}
        </div>
      </DBCard>

      {loadError && (
        <DBNotification semantic="critical" className="py-2">
          <DBStack direction="row" alignment="center" justifyContent="space-between" gap="x-small">
            {loadError}
            <DBButton
              type="button"
              variant="outlined"
              data-color="critical"
              size="small"
              onClick={() => setLoadError(null)}
            >
              ×
            </DBButton>
          </DBStack>
        </DBNotification>
      )}

      <div className="db-table" data-width="full" data-size="small" data-divider="both" data-interactive="true">
        <table className="align-middle mb-0">
          <thead>
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
                  <div className="laedt" data-size="small" role="status" />
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
                              <DBButton
                                type="button"
                                className="p-0 text-info flex-shrink-0"
                                variant="ghost"
                                size="small"
                                icon="magnifying_glass"
                                noText
                                style={{ lineHeight: '1' }}
                                onClick={e => {
                                  e.stopPropagation();
                                  onNavigateToUser(userId);
                                }}
                              >
                                <DBTooltip>Zum Profil</DBTooltip>
                              </DBButton>
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
                    <DBButton
                      type="button"
                      className="me-1 py-0"
                      variant="outlined"
                      size="small"
                      icon="pen"
                      noText
                      onClick={() => openEdit(doc)}
                    >
                      <DBTooltip>Bearbeiten</DBTooltip>
                    </DBButton>
                    <DBButton
                      type="button"
                      className="py-0"
                      variant="outlined"
                      data-color="critical"
                      size="small"
                      icon="bin"
                      noText
                      onClick={() => handleDelete(doc)}
                    >
                      <DBTooltip>Löschen</DBTooltip>
                    </DBButton>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <DBStack direction="row" wrap alignment="center" justifyContent="space-between" gap="x-small" className="mt-3">
        <small className="text-muted">
          {page ? `${page.total} Einträge · Seite ${currentPage}/${totalPages}` : ''}
        </small>
        {totalPages > 1 && (
          <DBStack direction="row" wrap gap="2x-small">
            <DBButton
              type="button"
              variant="outlined"
              disabled={currentPage <= 1}
              onClick={() => loadPage(currentPage - 1)}
              aria-label="Vorherige Seite"
            >
              ‹
            </DBButton>
            <DBButton
              type="button"
              variant="outlined"
              disabled={currentPage >= totalPages}
              onClick={() => loadPage(currentPage + 1)}
              aria-label="Nächste Seite"
            >
              ›
            </DBButton>
          </DBStack>
        )}
        <DBButton
          type="button"
          variant="outlined"
          size="small"
          icon="circular_arrows"
          onClick={() => loadPage(currentPage)}
        >
          Aktualisieren
        </DBButton>
      </DBStack>

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
