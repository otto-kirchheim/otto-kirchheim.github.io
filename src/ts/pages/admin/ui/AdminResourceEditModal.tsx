import {
  DBButton,
  DBCheckbox,
  DBDrawer,
  DBDrawerHeader,
  DBHeadingH2,
  DBNotification,
  DBTag,
  DBTooltip,
} from '@db-ux/react-core-components';
import { createPortal } from 'react-dom';

import { DIALOG_RICHTUNG } from '@/shared/ui/modal/showModal';

import dayjs from '@/shared/lib/date/configDayjs';
import { JsonEditor } from './JsonEditor';
import {
  DATE_ONLY_FIELDS,
  IMMUTABLE_FIELDS,
  READONLY_FIELDS,
  TIME_STRING_FIELDS,
  formatDateOnly,
  formatDateTime,
  isObjectId,
  looksLikeIso,
  toDateInput,
  toDatetimeLocal,
  truncateId,
  type EditState,
} from './adminResourceBrowserGemeinsam';
import { type AdminResourceConfig, adminCrossRef, adminFieldEnum, adminResourceByEndpoint } from '../adminFeatures';
import { DbAuswahl, DbFeld } from '@/components';

type Props = {
  edit: EditState;
  resource: AdminResourceConfig;
  userNameMap: Record<string, string>;
  onNavigateToUser?: (userId: string) => void;
  closeEdit: () => void;
  saveEdit: () => void;
  handleValueChange: (key: string, val: unknown) => void;
  handleTextareaChange: (key: string, raw: string) => void;
  navigateToEntry: (endpoint: string, docId: string) => void;
};

/**
 * Bearbeiten-Dialog für einen einzelnen Admin-Datensatz -- als Portal in `document.body` gerendert, damit er auch
 * sichtbar bleibt, wenn `AdminResourceBrowser` in einer gerade ausgeblendeten Tab-Pane steckt.
 *
 * @param props - Bearbeitungsstand (`edit`), Ressourcen-Konfiguration, Namens-Map und die Callbacks des Browsers.
 */
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
    <DBDrawer
      open
      direction={DIALOG_RICHTUNG}
      showSpacing={false}
      rounded
      onClose={closeEdit}
      header={
        <DBDrawerHeader closeButtonText="Schließen">
          <DBHeadingH2 paragraphSpacing>
            {resource.label} bearbeiten
            <code className="ms-2 fs-6 text-muted">{truncateId(edit.doc['_id'])}</code>
          </DBHeadingH2>
        </DBDrawerHeader>
      }
    >
      <div className="dialog-rumpf" data-breite="lg">
        <div className="dialog-koerper">
          {edit.saveError && (
            <DBNotification semantic="critical" className="py-2 small">
              {edit.saveError}
            </DBNotification>
          )}

          {Object.entries(edit.values).map(([key, val]) => {
            const immutable = IMMUTABLE_FIELDS.has(key);
            const readonly = READONLY_FIELDS.has(key);
            const isUserRef = key === 'User';
            // Verweis nur, wenn das Ziel-Feature geladen ist; sonst entfaellt der Link (Feld bleibt als Id sichtbar).
            const crossRef = adminCrossRef(key);
            const crossTarget = crossRef ? adminResourceByEndpoint(crossRef.endpoint) : undefined;
            const disabled = immutable || readonly;
            const isNull = val === null;
            const fieldEnum = adminFieldEnum(key);
            const isDateOnly = typeof val === 'string' && looksLikeIso(val) && DATE_ONLY_FIELDS.has(key);
            const isDateTime = typeof val === 'string' && looksLikeIso(val) && !DATE_ONLY_FIELDS.has(key);
            // String-Zeitfelder: "HH:mm" (kein ISO) → type="time"
            const isTimeString = typeof val === 'string' && !looksLikeIso(val) && TIME_STRING_FIELDS.has(key);

            return (
              <div key={key} className="mb-3">
                <label className="fw-semibold small mb-1">
                  {key}
                  {immutable && <span className="fw-normal text-muted ms-1">(nicht änderbar)</span>}
                  {readonly && <span className="fw-normal text-muted ms-1">(nur lesen)</span>}
                  {isUserRef && <span className="fw-normal text-muted ms-1">(Benutzerreferenz)</span>}
                  {crossRef && <span className="fw-normal text-info ms-1">→ {crossTarget?.label}</span>}
                  {isNull && !disabled && !isUserRef && (
                    <DBTag
                      className="text-dark ms-1"
                      semantic="warning"
                      emphasis="strong"
                      style={{ fontSize: '0.65em' }}
                    >
                      leer
                    </DBTag>
                  )}
                </label>

                {isUserRef ? (
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <code className="small bg-body-secondary px-2 py-1">{String(val ?? '')}</code>
                    {userNameMap[String(val)] && <span className="small fw-semibold">{userNameMap[String(val)]}</span>}
                    {onNavigateToUser && (
                      <DBButton
                        type="button"
                        className="ms-auto"
                        variant="outlined"
                        data-color="informational"
                        size="small"
                        icon="magnifying_glass"
                        onClick={() => {
                          closeEdit();
                          onNavigateToUser(String(val));
                        }}
                      >
                        Zum Profil
                      </DBButton>
                    )}
                  </div>
                ) : disabled ? (
                  <DbFeld
                    beschriftung={key}
                    dicht
                    className="bg-body-secondary text-muted"
                    feldKlasse="font-monospace"
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
                        <div key={i} className="d-flex align-items-center gap-2 bg-body-secondary px-2 py-1">
                          <code className="small flex-grow-1">{truncateId(id)}</code>
                          <DBButton
                            type="button"
                            className="py-0"
                            variant="outlined"
                            data-color="informational"
                            size="small"
                            icon="arrow_up_right"
                            onClick={() => void navigateToEntry(crossRef.endpoint, id)}
                          >
                            <span className="ms-1 d-none d-sm-inline">{crossTarget?.shortLabel}</span>
                          </DBButton>
                        </div>
                      ))}
                    </div>
                  ) : isNull ? (
                    <em className="text-muted small">Keine Verknüpfung (null)</em>
                  ) : (
                    <div className="d-flex align-items-center gap-2">
                      <code className="small bg-body-secondary px-2 py-1 flex-grow-1">{truncateId(val)}</code>
                      <DBButton
                        type="button"
                        variant="outlined"
                        data-color="informational"
                        size="small"
                        icon="arrow_up_right"
                        onClick={() => void navigateToEntry(crossRef.endpoint, String(val))}
                      >
                        {crossTarget?.label}
                      </DBButton>
                    </div>
                  )
                ) : typeof val === 'boolean' ? (
                  <DBCheckbox
                    className="mt-1"
                    size="small"
                    label={key}
                    checked={val}
                    onChange={e => handleValueChange(key, e.target.checked)}
                  />
                ) : isNull ? (
                  <DbFeld
                    beschriftung="(leer – Wert eingeben oder leer lassen)"
                    dicht
                    className="border-warning"
                    type="text"
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
                  <DbFeld
                    beschriftung={key}
                    dicht
                    type="time"
                    value={String(val)}
                    onChange={e => handleValueChange(key, e.target.value)}
                  />
                ) : isDateOnly ? (
                  <DbFeld
                    beschriftung={key}
                    dicht
                    type="date"
                    value={toDateInput(String(val))}
                    onChange={e => {
                      const v = e.target.value;
                      handleValueChange(key, v ? `${v}T00:00:00.000Z` : null);
                    }}
                  />
                ) : isDateTime ? (
                  <DbFeld
                    beschriftung={key}
                    dicht
                    type="datetime-local"
                    value={toDatetimeLocal(String(val))}
                    onChange={e => {
                      const v = e.target.value;
                      handleValueChange(key, v ? dayjs(v).toISOString() : null);
                    }}
                  />
                ) : fieldEnum ? (
                  <DbAuswahl
                    beschriftung={key}
                    dicht
                    value={String(val ?? '')}
                    onChange={e => handleValueChange(key, e.target.value)}
                  >
                    {fieldEnum.map(v => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </DbAuswahl>
                ) : typeof val === 'number' ? (
                  <DbFeld
                    beschriftung={key}
                    dicht
                    type="number"
                    value={val}
                    onChange={e => handleValueChange(key, parseFloat(e.target.value) || 0)}
                  />
                ) : isObjectId(val) ? (
                  <div className="d-flex align-items-center gap-2">
                    <code className="small bg-body-secondary px-2 py-1 flex-grow-1">{val}</code>
                    <DBButton
                      type="button"
                      variant="outlined"
                      size="small"
                      icon="copy"
                      noText
                      onClick={() => void navigator.clipboard?.writeText(val)}
                    >
                      <DBTooltip>Kopieren</DBTooltip>
                    </DBButton>
                  </div>
                ) : (
                  <DbFeld
                    beschriftung={key}
                    dicht
                    type="text"
                    value={String(val ?? '')}
                    onChange={e => handleValueChange(key, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="dialog-fuss">
          <DBButton type="button" variant="filled" onClick={closeEdit} disabled={edit.saving}>
            Abbrechen
          </DBButton>
          <DBButton type="button" variant="brand" onClick={saveEdit} disabled={edit.saving}>
            {edit.saving ? (
              <>
                <span className="laedt me-1" data-size="small" role="status" />
                Speichern…
              </>
            ) : (
              'Speichern'
            )}
          </DBButton>
        </div>
      </div>
    </DBDrawer>,
    document.body,
  );
}
