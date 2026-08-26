import { createPortal } from 'preact/compat';
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
                            <span class="material-icons-round me-1" style="font-size:0.85rem;vertical-align:middle">
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
                          {(val as string[]).length === 0 && <em class="text-muted small">Keine Verknüpfungen</em>}
                          {(val as string[]).map((id, i) => (
                            <div key={i} class="d-flex align-items-center gap-2 bg-body-secondary rounded px-2 py-1">
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
                          <code class="small bg-body-secondary rounded px-2 py-1 flex-grow-1">{truncateId(val)}</code>
                          <button
                            class="btn btn-sm btn-outline-info"
                            onClick={() => void navigateToEntry(crossRef.resourceIdx, String(val))}
                          >
                            <span class="material-icons-round me-1" style="font-size:0.85rem;vertical-align:middle">
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
                          handleValueChange(key, v ? dayjs(v).toISOString() : null);
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
                        onChange={e => handleValueChange(key, parseFloat((e.target as HTMLInputElement).value) || 0)}
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
  );
}
