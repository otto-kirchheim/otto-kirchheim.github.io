import { DBDrawer } from '@db-ux/react-core-components';
import { createPortal } from 'react-dom';

import { DIALOG_RICHTUNG } from '@/components/showModal';

import dayjs from '@/infrastructure/date/configDayjs';
import { JsonEditor } from './JsonEditor';
import {
  CROSS_REFS,
  DATE_ONLY_FIELDS,
  FIELD_ENUMS,
  IMMUTABLE_FIELDS,
  READONLY_FIELDS,
  RESOURCES,
  TIME_STRING_FIELDS,
  formatDateOnly,
  formatDateTime,
  isObjectId,
  looksLikeIso,
  toDateInput,
  toDatetimeLocal,
  truncateId,
  type EditState,
  type ResourceConfig,
} from './adminResourceBrowserGemeinsam';

type Props = {
  edit: EditState;
  resource: ResourceConfig;
  userNameMap: Record<string, string>;
  onNavigateToUser?: (userId: string) => void;
  closeEdit: () => void;
  saveEdit: () => void;
  handleValueChange: (key: string, val: unknown) => void;
  handleTextareaChange: (key: string, raw: string) => void;
  navigateToEntry: (resourceIdx: number, docId: string) => void;
};

/** Bearbeiten-Modal für einen einzelnen Admin-Datensatz -- als Portal gerendert, damit es auch
 * sichtbar bleibt, wenn `AdminResourceBrowser` in einer gerade ausgeblendeten Bootstrap-Tab-Pane
 * steckt. */
export function AdminResourceEditModal({
  edit,
  resource,
  userNameMap,
  onNavigateToUser,
  closeEdit,
  saveEdit,
  handleValueChange,
  handleTextareaChange,
  navigateToEntry,
}: Props) {
  return createPortal(
    // Kopfzeile samt Titel und Schliessen-Knopf bringt der Dialog selbst mit.
    // eslint-disable-next-line db-ux/drawer-header-required
    <DBDrawer open direction={DIALOG_RICHTUNG} showSpacing={false} rounded onClose={closeEdit}>
      <div className="dialog-rumpf" data-breite="lg">
        <div className="db-drawer-header">
          <h5>
            {resource.label} bearbeiten
            <code className="ms-2 fs-6 text-muted">{truncateId(edit.doc['_id'])}</code>
          </h5>
          <button
            type="button"
            className="db-button"
            data-icon="cross"
            data-variant="ghost"
            data-no-text="true"
            onClick={closeEdit}
          >
            Schließen
          </button>
        </div>

        <div className="dialog-koerper">
          {edit.saveError && <div className="alert alert-danger py-2 small">{edit.saveError}</div>}

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
              <div key={key} className="mb-3">
                <label className="form-label fw-semibold small mb-1">
                  {key}
                  {immutable && <span className="fw-normal text-muted ms-1">(nicht änderbar)</span>}
                  {readonly && <span className="fw-normal text-muted ms-1">(nur lesen)</span>}
                  {isUserRef && <span className="fw-normal text-muted ms-1">(Benutzerreferenz)</span>}
                  {crossRef && (
                    <span className="fw-normal text-info ms-1">→ {RESOURCES[crossRef.resourceIdx].label}</span>
                  )}
                  {isNull && !disabled && !isUserRef && (
                    <span className="badge bg-warning text-dark ms-1" style={{ fontSize: '0.65em' }}>
                      leer
                    </span>
                  )}
                </label>

                {isUserRef ? (
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <code className="small bg-body-secondary rounded px-2 py-1">{String(val ?? '')}</code>
                    {userNameMap[String(val)] && <span className="small fw-semibold">{userNameMap[String(val)]}</span>}
                    {onNavigateToUser && (
                      <button
                        className="db-button ms-auto"
                        data-variant="outlined"
                        data-color="informational"
                        data-size="small"
                        onClick={() => {
                          closeEdit();
                          onNavigateToUser(String(val));
                        }}
                      >
                        <span
                          className="db-icon me-1 db-font-size-xs"
                          data-icon="magnifying_glass"
                          style={{ verticalAlign: 'middle' }}
                        />
                        Zum Profil
                      </button>
                    )}
                  </div>
                ) : disabled ? (
                  <input
                    className="form-control form-control-sm bg-body-secondary text-muted font-monospace"
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
                    <div className="d-flex flex-column gap-1">
                      {(val as string[]).length === 0 && <em className="text-muted small">Keine Verknüpfungen</em>}
                      {(val as string[]).map((id, i) => (
                        <div key={i} className="d-flex align-items-center gap-2 bg-body-secondary rounded px-2 py-1">
                          <code className="small flex-grow-1">{truncateId(id)}</code>
                          <button
                            className="db-button py-0"
                            data-variant="outlined"
                            data-color="informational"
                            data-size="small"
                            onClick={() => void navigateToEntry(crossRef.resourceIdx, id)}
                          >
                            <span className="db-icon db-font-size-xs" data-icon="arrow_up_right" />
                            <span className="ms-1 d-none d-sm-inline">
                              {RESOURCES[crossRef.resourceIdx].shortLabel}
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : isNull ? (
                    <em className="text-muted small">Keine Verknüpfung (null)</em>
                  ) : (
                    <div className="d-flex align-items-center gap-2">
                      <code className="small bg-body-secondary rounded px-2 py-1 flex-grow-1">{truncateId(val)}</code>
                      <button
                        className="db-button"
                        data-variant="outlined"
                        data-color="informational"
                        data-size="small"
                        onClick={() => void navigateToEntry(crossRef.resourceIdx, String(val))}
                      >
                        <span
                          className="db-icon me-1 db-font-size-xs"
                          data-icon="arrow_up_right"
                          style={{ verticalAlign: 'middle' }}
                        />
                        {RESOURCES[crossRef.resourceIdx].label}
                      </button>
                    </div>
                  )
                ) : typeof val === 'boolean' ? (
                  <div className="form-check mt-1">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={val}
                      onChange={e => handleValueChange(key, (e.target as HTMLInputElement).checked)}
                    />
                  </div>
                ) : isNull ? (
                  <input
                    type="text"
                    className="form-control form-control-sm border-warning"
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
                    className="form-control form-control-sm"
                    value={String(val)}
                    onChange={e => handleValueChange(key, (e.target as HTMLInputElement).value)}
                  />
                ) : isDateOnly ? (
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={toDateInput(String(val))}
                    onChange={e => {
                      const v = (e.target as HTMLInputElement).value;
                      handleValueChange(key, v ? `${v}T00:00:00.000Z` : null);
                    }}
                  />
                ) : isDateTime ? (
                  <input
                    type="datetime-local"
                    className="form-control form-control-sm"
                    value={toDatetimeLocal(String(val))}
                    onChange={e => {
                      const v = (e.target as HTMLInputElement).value;
                      handleValueChange(key, v ? dayjs(v).toISOString() : null);
                    }}
                  />
                ) : fieldEnum ? (
                  <select
                    className="form-select form-select-sm"
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
                    className="form-control form-control-sm"
                    value={val}
                    onChange={e => handleValueChange(key, parseFloat((e.target as HTMLInputElement).value) || 0)}
                  />
                ) : isObjectId(val) ? (
                  <div className="d-flex align-items-center gap-2">
                    <code className="small bg-body-secondary rounded px-2 py-1 flex-grow-1">{val}</code>
                    <button
                      className="db-button"
                      data-variant="outlined"
                      data-size="small"
                      title="Kopieren"
                      onClick={() => void navigator.clipboard?.writeText(val)}
                    >
                      <span className="db-icon db-font-size-xs" data-icon="copy" />
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={String(val ?? '')}
                    onChange={e => handleValueChange(key, (e.target as HTMLInputElement).value)}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="dialog-fuss">
          <button className="db-button" data-variant="filled" onClick={closeEdit} disabled={edit.saving}>
            Abbrechen
          </button>
          <button className="db-button" data-variant="brand" onClick={saveEdit} disabled={edit.saving}>
            {edit.saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status" />
                Speichern…
              </>
            ) : (
              'Speichern'
            )}
          </button>
        </div>
      </div>
    </DBDrawer>,
    document.body,
  );
}
