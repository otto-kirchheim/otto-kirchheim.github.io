import {
  DBButton,
  DBCheckbox,
  DBDrawer,
  DBDrawerHeader,
  DBHeadingH2,
  DBNotification,
  DBTag,
  DBTooltip,
  DBStack,
} from '@db-ux/react-core-components';
import { createPortal } from 'react-dom';

import { DIALOG_RICHTUNG } from '@/shared/ui/modal/showModal';

import dayjs from '@/shared/lib/date/configDayjs';
import { JsonEditor } from './JsonEditor';
import {
  IMMUTABLE_FIELDS,
  READONLY_FIELDS,
  formatDateOnly,
  formatDateTime,
  isObjectId,
  istNurDatumFeld,
  istZeitFeld,
  looksLikeIso,
  toDateInput,
  toDatetimeLocal,
  truncateId,
  type EditState,
} from './adminResourceBrowserGemeinsam';
import { type AdminResourceConfig, adminCrossRef, adminFieldEnum, adminResourceByEndpoint } from '../adminFeatures';
import { DbAuswahl, DbFeld } from '@/shared/ui/form/DbFeld';

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
            <code className="luft-links-xs farbe-gedaempft titel-code">{truncateId(edit.doc['_id'])}</code>
          </DBHeadingH2>
        </DBDrawerHeader>
      }
    >
      <div className="dialog-rumpf" data-breite="lg">
        <div className="dialog-koerper">
          {edit.saveError && <DBNotification semantic="critical">{edit.saveError}</DBNotification>}

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
            // Feldtypen aus dem Admin-Anteil der Ressource (`nurDatumFelder`, `zeitFelder`).
            const isDateOnly = typeof val === 'string' && looksLikeIso(val) && istNurDatumFeld(resource, key);
            const isDateTime = typeof val === 'string' && looksLikeIso(val) && !istNurDatumFeld(resource, key);
            // String-Zeitfelder: "HH:mm" (kein ISO) → type="time"
            const isTimeString = typeof val === 'string' && !looksLikeIso(val) && istZeitFeld(resource, key);

            return (
              <div key={key} className="luft-unten-sm">
                <label className="fett zelle-klein luft-unten-2xs">
                  {key}
                  {immutable && <span className="normal-fett farbe-gedaempft luft-links-2xs">(nicht änderbar)</span>}
                  {readonly && <span className="normal-fett farbe-gedaempft luft-links-2xs">(nur lesen)</span>}
                  {isUserRef && <span className="normal-fett farbe-gedaempft luft-links-2xs">(Benutzerreferenz)</span>}
                  {crossRef && <span className="normal-fett farbe-info luft-links-2xs">→ {crossTarget?.label}</span>}
                  {isNull && !disabled && !isUserRef && (
                    <DBTag
                      className="luft-links-2xs"
                      semantic="warning"
                      emphasis="strong"
                      style={{ fontSize: '0.65em' }}
                    >
                      leer
                    </DBTag>
                  )}
                </label>

                {isUserRef ? (
                  <DBStack direction="row" wrap gap="x-small" alignment="center">
                    <code className="code-feld">{String(val ?? '')}</code>
                    {userNameMap[String(val)] && <span className="zelle-klein fett">{userNameMap[String(val)]}</span>}
                    {onNavigateToUser && (
                      <DBButton
                        type="button"
                        className="knopf-rechts"
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
                  </DBStack>
                ) : disabled ? (
                  <DbFeld
                    beschriftung={key}
                    dicht
                    className="code-feld-sperre"
                    feldKlasse="schrift-mono"
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
                    <DBStack direction="column" gap="2x-small">
                      {(val as string[]).length === 0 && (
                        <em className="farbe-gedaempft zelle-klein">Keine Verknüpfungen</em>
                      )}
                      {(val as string[]).map((id, i) => (
                        <DBStack key={i} direction="row" alignment="center" gap="x-small" className="code-feld">
                          <code className="zelle-klein waechst">{truncateId(id)}</code>
                          <DBButton
                            type="button"

                            variant="outlined"
                            data-color="informational"
                            size="small"
                            icon="arrow_up_right"
                            onClick={() => void navigateToEntry(crossRef.endpoint, id)}
                          >
                            <span className="luft-links-2xs ab-sm-inline">{crossTarget?.shortLabel}</span>
                          </DBButton>
                        </DBStack>
                      ))}
                    </DBStack>
                  ) : isNull ? (
                    <em className="farbe-gedaempft zelle-klein">Keine Verknüpfung (null)</em>
                  ) : (
                    <DBStack direction="row" gap="x-small" alignment="center">
                      <code className="code-feld waechst">{truncateId(val)}</code>
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
                    </DBStack>
                  )
                ) : typeof val === 'boolean' ? (
                  <DBCheckbox
                    className="luft-oben-2xs"
                    size="small"
                    label={key}
                    checked={val}
                    onChange={e => handleValueChange(key, e.target.checked)}
                  />
                ) : isNull ? (
                  <DbFeld
                    beschriftung="(leer – Wert eingeben oder leer lassen)"
                    dicht
                    className="feld-leer-hinweis"
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
                  <DBStack direction="row" gap="x-small" alignment="center">
                    <code className="code-feld waechst">{val}</code>
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
                  </DBStack>
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
                <span className="laedt luft-rechts-2xs" data-size="small" role="status" />
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
