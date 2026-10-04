import { useEffect, useState } from 'react';

import { confirmDialog } from '@/shared/ui/dialog/confirmDialog';
import { AdminResourceEditModal } from './AdminResourceEditModal';
import { useAdminFeatures } from '../adminFeatures';
import {
  IMMUTABLE_FIELDS,
  ITEMS_PER_PAGE,
  MONATE,
  READONLY_FIELDS,
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
} from '../api/api';
import {
  DBButton,
  DBCard,
  DBLoadingIndicator,
  DBNotification,
  DBStack,
  DBTag,
  DBTooltip,
} from '@db-ux/react-core-components';
import { DbAuswahl, DbFeld } from '@/shared/ui/form/DbFeld';

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

  // Ressourcen der geladenen Admin-Anteile aller Features (Reihenfolge nach `meta.order`).
  const { features: adminFeatures, fehler: adminFehler, geladen: adminGeladen } = useAdminFeatures();
  const resources = adminFeatures.flatMap(feature => feature.resources);
  const resource = resources[activeIdx];

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
    const ep = resources[activeIdx]?.endpoint;
    if (!ep) return;
    // Microtask: der synchrone Funktionsaufruf direkt im Effect-Body loeste sonst
    // react-hooks/set-state-in-effect aus (loadPageWith setzt synchron setLoading).
    queueMicrotask(() => loadPageWith(1, {}, ep));
    fetchAdminResourceYears(ep)
      .then(setAvailableYears)
      .catch(() => {});
    // loadPageWith ist bewusst keine Dep: sie wird je Render neu erzeugt und wuerde den
    // Effect in eine Schleife ziehen; relevant ist nur der Tabwechsel (activeIdx).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx, resources.length]);

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
   * @param endpoint - `endpoint` der Ziel-Ressource.
   * @param docId - Id des verlinkten Datensatzes.
   */
  async function navigateToEntry(endpoint: string, docId: string) {
    const targetIdx = resources.findIndex(candidate => candidate.endpoint === endpoint);
    if (targetIdx < 0) return;
    closeEdit();
    setActiveIdx(targetIdx);
    try {
      const doc = await fetchAdminResourceById(endpoint, docId);
      // Kurz warten, bis useEffect([activeIdx]) gefeuert hat
      setTimeout(() => setEdit(buildEditState(doc, endpoint)), 50);
    } catch {
      setLoadError(`Verlinkter ${resources[targetIdx].label}-Eintrag nicht gefunden`);
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

  if (!resource) {
    return adminGeladen ? (
      <DBNotification semantic="warning" variant="docked">
        {adminFehler.length > 0
          ? `Ressourcen konnten nicht geladen werden (${adminFehler.join(', ')}) – bitte Seite neu laden.`
          : 'Keine Ressourcen verfügbar.'}
      </DBNotification>
    ) : (
      <p className="farbe-gedaempft">Ressourcen werden geladen …</p>
    );
  }

  const totalPages = page ? Math.ceil(page.total / ITEMS_PER_PAGE) : 1;
  const totalCols = 2 + resource.tableFields.length + (resource.extraFields?.length ?? 0);
  const sortedUsers = Object.entries(userNameMap).sort((a, b) => a[1].localeCompare(b[1]));
  const hasActiveFilter = Boolean(activeFilter.userId || activeFilter.jahr || activeFilter.monat);

  return (
    <div>
      <nav className="db-navigation admin-unternavigation luft-unten-sm" role="tablist" aria-label="Ressourcen">
        <menu>
          {resources.map((r, i) => (
            <li
              key={r.endpoint}
              className="db-navigation-item"
              data-active={String(i === activeIdx)}
              role="presentation"
            >
              <button onClick={() => setActiveIdx(i)} type="button" role="tab" aria-selected={i === activeIdx}>
                <span className="ab-md-inline">{r.label}</span>
                <span className="nur-unter-md">{r.shortLabel}</span>
              </button>
            </li>
          ))}
        </menu>
      </nav>

      <DBCard className="admin-filterkarte" spacing="none">
        <div className="admin-filterkarte__inhalt">
          <DBStack direction="row" wrap gap="x-small" alignment="end">
            {/* Benutzer: Text-Input mit Datalist (Suche) */}
            <div className="waechst" style={{ minWidth: '180px', maxWidth: '300px' }}>
              <label className="zelle-klein luft-unten-2xs">Benutzer</label>
              <div className="feld-mit-knopf">
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
                    className="feld-mit-knopf__loeschen farbe-gedaempft"
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

            <DBStack direction="row" gap="x-small" alignment="end" className="knopf-rechts">
              <DBButton type="button" variant="brand" size="small" icon="funnel" onClick={applyFilter}>
                Filtern
              </DBButton>
              {hasActiveFilter && (
                <DBButton type="button" variant="outlined" size="small" onClick={resetFilter}>
                  Zurücksetzen
                </DBButton>
              )}
            </DBStack>
          </DBStack>

          {hasActiveFilter && (
            <DBStack direction="row" wrap gap="x-small" className="luft-oben-xs">
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
            </DBStack>
          )}
        </div>
      </DBCard>

      {loadError && (
        <DBNotification semantic="critical">
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
        <table className="ohne-luft-unten">
          <thead>
            <tr>
              <th style={{ width: '6rem' }}>ID</th>
              {resource.tableFields.map(f => (
                <th key={f}>{f === 'User' ? 'Benutzer' : f}</th>
              ))}
              {resource.extraFields?.map(f => (
                <th key={f} className="spalte-ab-lg">
                  {f === 'createdAt' ? 'Erstellt' : f}
                </th>
              ))}
              <th style={{ width: '7rem' }} className="zelle-rechts">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={totalCols} className="zelle-mitte zelle-luft">
                  <DBLoadingIndicator size="small" showLabel={false}>
                    Lädt
                  </DBLoadingIndicator>
                </td>
              </tr>
            )}
            {!loading && (!page || page.data.length === 0) && (
              <tr>
                <td colSpan={totalCols} className="zelle-mitte zelle-luft-klein farbe-gedaempft">
                  Keine Einträge {hasActiveFilter && '(Filter aktiv)'}
                </td>
              </tr>
            )}
            {!loading &&
              page?.data.map(doc => (
                <tr key={String(doc['_id'])}>
                  <td style={{ cursor: 'pointer' }} title="Klicken zum Bearbeiten" onClick={() => openEdit(doc)}>
                    <code className="zelle-klein farbe-primary">{truncateId(doc['_id'])}</code>
                  </td>
                  {resource.tableFields.map(f => {
                    if (f === 'User') {
                      const userId = String(doc[f] ?? '');
                      const name = userNameMap[userId];
                      return (
                        <td key={f} className="zelle-klein">
                          <DBStack direction="row" gap="2x-small" alignment="center">
                            <span>{name ?? <code className="farbe-gedaempft">{truncateId(userId)}</code>}</span>
                            {onNavigateToUser && (
                              <DBButton
                                type="button"
                                className="farbe-info nicht-schrumpfen"
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
                          </DBStack>
                        </td>
                      );
                    }
                    return (
                      <td key={f} className="zelle-klein">
                        {formatCell(resource, f, doc[f])}
                      </td>
                    );
                  })}
                  {resource.extraFields?.map(f => (
                    <td key={f} className="zelle-klein spalte-ab-lg">
                      {formatCell(resource, f, doc[f])}
                    </td>
                  ))}
                  <td className="zelle-rechts">
                    <DBButton
                      type="button"
                      className="luft-rechts-2xs"
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

      <DBStack
        direction="row"
        wrap
        alignment="center"
        justifyContent="space-between"
        gap="x-small"
        className="luft-oben-sm"
      >
        <small className="farbe-gedaempft">
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
