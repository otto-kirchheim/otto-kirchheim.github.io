import type React from 'react';
import { Fragment, useEffect, useState } from 'react';

import dayjs from '@/shared/lib/date/configDayjs';
import { fetchAdminLogs, fetchAdminUserNameMap, type AdminPage } from '../api/api';
import { DBButton, DBLoadingIndicator, DBNotification, DBStack, DBTooltip } from '@db-ux/react-core-components';
import { DbFeld } from '@/shared/ui/form/DbFeld';

const ITEMS_PER_PAGE = 25;

/**
 * Formatiert einen Log-Zeitstempel für die Tabelle.
 *
 * @param val - Zeitstempel (ISO-String o.ä.), beliebiger Typ.
 * @returns "DD.MM.YY, HH:mm", "—" bei leerem Wert oder der Rohwert bei ungültigem Datum.
 */
function formatTs(val: unknown): string {
  if (!val) return '—';
  const d = dayjs(String(val));
  return d.isValid() ? d.format('DD.MM.YY, HH:mm') : String(val);
}

/**
 * Kürzt eine lange Id für die Anzeige.
 *
 * @param val - Id (beliebiger Typ, wird zu String).
 * @returns Bei mehr als 10 Zeichen "…" plus die letzten 8, sonst unverändert.
 */
function truncateId(val: unknown): string {
  const s = String(val ?? '');
  return s.length > 10 ? `…${s.slice(-8)}` : s;
}

/**
 * Löst eine Benutzer-Id zum Anzeigenamen auf.
 *
 * @param map - Zuordnung Benutzer-Id zu Anzeigename.
 * @param id - Benutzer-Id oder `null`.
 * @returns Name, gekürzte Id als `<code>` bei unbekanntem Benutzer oder "—" ohne Id.
 */
function userName(map: Record<string, string>, id: string | null): React.JSX.Element | string {
  if (!id) return '—';
  const name = map[id];
  if (name) return name;
  return <code className="farbe-gedaempft">{truncateId(id)}</code>;
}

/**
 * Der geloggte Payload liegt unter `params.payload` (siehe writeAdminLog im Backend).
 *
 * @param entry - Log-Eintrag der Admin-Log-API.
 * @returns Payload oder `null`, wenn keiner vorhanden ist.
 */
function logPayload(entry: Record<string, unknown>): unknown {
  const params = entry['params'];
  if (!params || typeof params !== 'object') return null;
  return (params as { payload?: unknown }).payload ?? null;
}

/**
 * Seitenweise Ansicht der Admin-Logs mit Aktionsfilter und aufklappbarem Payload je Eintrag.
 */
export function AdminLogBrowser() {
  const [logs, setLogs] = useState<AdminPage | null>(null);
  const [userNameMap, setUserNameMap] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [openDetailsId, setOpenDetailsId] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminUserNameMap()
      .then(setUserNameMap)
      .catch(() => {});
    loadPage(1, '');
  }, []);

  /**
   * Lädt eine Log-Seite und übernimmt sie samt Seitennummer; Fehler erscheinen als Meldung über der Tabelle.
   *
   * @param pageNum - Seitennummer (ab 1).
   * @param action - Aktionsfilter; leer = ungefiltert.
   */
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

  /**
   * Startet die Suche mit dem aktuellen Aktionsfilter ab Seite 1.
   */
  function search() {
    loadPage(1, actionFilter);
  }

  const totalPages = logs ? Math.ceil(logs.total / ITEMS_PER_PAGE) : 1;

  return (
    <div>
      <DBStack direction="row" wrap alignment="center" gap="x-small" className="admin-leiste">
        <DbFeld
          beschriftung="Aktion filtern (z.B. update, delete)…"
          dicht
          type="text"
          huelleStyle={{ maxWidth: '300px' }}
          placeholder="Aktion filtern (z.B. update, delete)…"
          value={actionFilter}
          onChange={e => setActionFilter((e.target as HTMLInputElement).value)}
          onKeyDown={e => {
            if (e.key === 'Enter') search();
          }}
        />
        <DBButton type="button" variant="brand" size="small" onClick={search}>
          Suchen
        </DBButton>
        {actionFilter && (
          <DBButton
            type="button"
            variant="outlined"
            size="small"
            onClick={() => {
              setActionFilter('');
              loadPage(1, '');
            }}
          >
            Zurücksetzen
          </DBButton>
        )}
        <DBButton
          type="button"
          className="knopf-rechts"
          variant="outlined"
          size="small"
          icon="circular_arrows"
          onClick={() => loadPage(currentPage, actionFilter)}
        >
          Aktualisieren
        </DBButton>
      </DBStack>

      {loadError && <DBNotification semantic="critical">{loadError}</DBNotification>}

      <div className="db-table" data-width="full" data-size="small" data-divider="both" data-interactive="true">
        <table>
          <thead>
            <tr>
              <th>Zeitstempel</th>
              <th>Aktion</th>
              <th>Admin</th>
              <th className="spalte-ab-md">Ziel-User</th>
              <th className="spalte-ab-lg">Ressource-ID</th>
              <th className="zelle-rechts">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="zelle-mitte zelle-luft">
                  <DBLoadingIndicator size="small" showLabel={false}>
                    Lädt
                  </DBLoadingIndicator>
                </td>
              </tr>
            )}
            {!loading && (!logs || logs.data.length === 0) && (
              <tr>
                <td colSpan={6} className="zelle-mitte zelle-luft-klein farbe-gedaempft">
                  Keine Log-Einträge
                </td>
              </tr>
            )}
            {!loading &&
              logs?.data.map(entry => {
                const adminId = String(entry['adminId'] ?? '');
                const targetUserId = entry['targetUserId'] ? String(entry['targetUserId']) : null;
                const targetResourceId = entry['targetResourceId'] ? String(entry['targetResourceId']) : null;
                const id = String(entry['_id']);
                const payload = logPayload(entry);
                const open = openDetailsId === id;
                return (
                  <Fragment key={id}>
                    <tr>
                      <td className="zelle-klein nowrap">{formatTs(entry['timestamp'])}</td>
                      <td>
                        <code className="zelle-klein umbrechen">{String(entry['action'] ?? '')}</code>
                      </td>
                      <td className="zelle-klein">{userName(userNameMap, adminId)}</td>
                      <td className="zelle-klein spalte-ab-md">{userName(userNameMap, targetUserId)}</td>
                      <td className="zelle-klein spalte-ab-lg">
                        {targetResourceId ? (
                          <code className="farbe-gedaempft">{truncateId(targetResourceId)}</code>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="zelle-rechts">
                        {payload !== null && (
                          <DBButton
                            type="button"
                            variant="ghost"
                            size="small"
                            icon={open ? 'chevron_up' : 'chevron_down'}
                            noText
                            aria-expanded={open}
                            onClick={() => setOpenDetailsId(open ? null : id)}
                          >
                            <DBTooltip>{open ? 'Details ausblenden' : 'Details anzeigen'}</DBTooltip>
                          </DBButton>
                        )}
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={6} className="zelle-hinterlegt">
                          <pre className="admin-pre">{JSON.stringify(payload, null, 2)}</pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <DBStack
          direction="row"
          wrap
          alignment="center"
          justifyContent="space-between"
          gap="x-small"
          className="luft-oben-sm"
        >
          <small className="farbe-gedaempft">
            Gesamt: {logs?.total ?? 0} · Seite {currentPage}/{totalPages}
          </small>
          <DBStack direction="row" wrap gap="2x-small">
            <DBButton
              type="button"
              variant="outlined"
              disabled={currentPage <= 1}
              onClick={() => loadPage(currentPage - 1, actionFilter)}
              aria-label="Vorherige Seite"
            >
              ‹
            </DBButton>
            <DBButton
              type="button"
              variant="outlined"
              disabled={currentPage >= totalPages}
              onClick={() => loadPage(currentPage + 1, actionFilter)}
              aria-label="Nächste Seite"
            >
              ›
            </DBButton>
          </DBStack>
        </DBStack>
      )}
    </div>
  );
}
