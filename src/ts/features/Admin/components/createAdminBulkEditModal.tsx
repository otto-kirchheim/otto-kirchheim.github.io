import Modal from 'bootstrap/js/dist/modal';
import { useState } from 'preact/hooks';
import { MyDivModal, MyModalBody, showModal } from '@/components';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import {
  bulkUpdateUserProfiles,
  fetchProfileTemplates,
  type AdminUserRow,
  type BulkApplyCategory,
  type BulkApplyResult,
  type BulkUserProfileUpdatePayload,
  type BackendProfileTemplate,
} from '../utils/api';

const CATEGORY_LABELS: Record<BulkApplyCategory, string> = {
  Fahrzeit: 'Fahrzeiten',
  Arbeitszeit: 'Arbeitszeiten',
  VorgabenB: 'Bereitschafts-Vorgaben',
  Einstellungen: 'Einstellungen',
};

type ApplySource = 'none' | 'template' | 'user';

type Step = 'form' | 'preview' | 'result';

/**
 * Massenänderung für mehrere Benutzerprofile: OE-Ebene, Betrieb und Übernahme
 * einzelner Kategorien aus einer Vorlage oder einem Muster-Benutzer.
 * Vor dem Speichern läuft immer eine Vorschau (dryRun) über dieselbe API.
 */
function AdminBulkEditModal({
  selectedUsers,
  onApplied,
  closeModal,
}: {
  selectedUsers: AdminUserRow[];
  onApplied: () => void;
  closeModal: () => void;
}) {
  const [step, setStep] = useState<Step>('form');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [oeEnabled, setOeEnabled] = useState(false);
  const [oeLevelIndex, setOeLevelIndex] = useState(0);
  const [oeNewValue, setOeNewValue] = useState('');

  const [betriebEnabled, setBetriebEnabled] = useState(false);
  const [betrieb, setBetrieb] = useState('');

  const [applySource, setApplySource] = useState<ApplySource>('none');
  const [templates, setTemplates] = useState<BackendProfileTemplate[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [sourceUserId, setSourceUserId] = useState('');
  const [categories, setCategories] = useState<BulkApplyCategory[]>([]);

  const [preview, setPreview] = useState<BulkApplyResult | null>(null);
  const [result, setResult] = useState<BulkApplyResult | null>(null);

  // Die Auswahl kann unterschiedlich tiefe OE-Ketten enthalten; für die
  // Beschriftung zählt die tiefste. Ob eine Ebene wirklich existiert, entscheidet
  // die Vorschau pro Benutzer.
  const maxLevels = Math.max(1, ...selectedUsers.map(user => user.oe.length));

  async function loadTemplates(): Promise<void> {
    if (templates.length > 0) return;
    try {
      setTemplates(await fetchProfileTemplates());
    } catch {
      setError('Vorlagen konnten nicht geladen werden');
    }
  }

  function toggleCategory(category: BulkApplyCategory): void {
    setCategories(current =>
      current.includes(category) ? current.filter(entry => entry !== category) : [...current, category],
    );
  }

  function buildPayload(dryRun: boolean): BulkUserProfileUpdatePayload | null {
    const payload: BulkUserProfileUpdatePayload = {
      userIds: selectedUsers.map(user => user._id),
      dryRun,
    };

    if (oeEnabled) {
      if (!oeNewValue.trim()) {
        setError('Bitte einen neuen Wert für die OE-Ebene angeben');
        return null;
      }
      payload.oe = { levelIndex: oeLevelIndex, newValue: oeNewValue.trim() };
    }

    if (betriebEnabled) {
      if (!betrieb.trim()) {
        setError('Bitte einen Betrieb angeben');
        return null;
      }
      payload.betrieb = betrieb.trim();
    }

    if (applySource !== 'none') {
      if (categories.length === 0) {
        setError('Bitte mindestens eine Kategorie zur Übernahme auswählen');
        return null;
      }
      if (applySource === 'template') {
        if (!templateId) {
          setError('Bitte eine Vorlage auswählen');
          return null;
        }
        payload.applyFrom = { type: 'template', templateId, categories };
      } else {
        if (!sourceUserId) {
          setError('Bitte einen Muster-Benutzer auswählen');
          return null;
        }
        payload.applyFrom = { type: 'user', sourceUserId, categories };
      }
    }

    if (!payload.oe && !payload.betrieb && !payload.applyFrom) {
      setError('Bitte mindestens eine Änderung auswählen');
      return null;
    }

    return payload;
  }

  async function runPreview(): Promise<void> {
    setError('');
    const payload = buildPayload(true);
    if (!payload) return;

    setBusy(true);
    try {
      setPreview(await bulkUpdateUserProfiles(payload));
      setStep('preview');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function runApply(): Promise<void> {
    setError('');
    const payload = buildPayload(false);
    if (!payload) return;

    setBusy(true);
    try {
      const applied = await bulkUpdateUserProfiles(payload);
      setResult(applied);
      setStep('result');
      onApplied();
      createSnackBar({
        message: `${applied.summary.ok} Profile aktualisiert`,
        status: applied.summary.errors > 0 ? 'warning' : 'success',
        timeout: 3000,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const footer = (
    <div className="modal-footer">
      {step === 'preview' && (
        <button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={() => setStep('form')}>
          Zurück
        </button>
      )}
      <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
        {step === 'result' ? 'Schließen' : 'Abbrechen'}
      </button>
      {step === 'form' && (
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void runPreview()}>
          {busy && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
          Vorschau
        </button>
      )}
      {step === 'preview' && (
        <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void runApply()}>
          {busy && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
          {preview ? `${preview.summary.ok} Profile ändern` : 'Änderungen anwenden'}
        </button>
      )}
      {step === 'result' && (
        <button type="button" className="btn btn-primary" onClick={closeModal}>
          Fertig
        </button>
      )}
    </div>
  );

  return (
    <MyDivModal size="lg" title={`Massenänderung: ${selectedUsers.length} Benutzer`} Footer={footer} errorMessage={error}>
      <MyModalBody>
        {step === 'form' && (
          <div className="col-12 d-flex flex-column gap-3">
            <div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="bulkOeEnabled"
                  checked={oeEnabled}
                  onChange={e => setOeEnabled((e.target as HTMLInputElement).checked)}
                />
                <label className="form-check-label fw-semibold" for="bulkOeEnabled">
                  OE-Ebene ersetzen
                </label>
              </div>
              {oeEnabled && (
                <div className="row g-2 mt-1 ms-1">
                  <div className="col-sm-5">
                    <select
                      className="form-select"
                      aria-label="Zu ersetzende OE-Ebene"
                      value={String(oeLevelIndex)}
                      onChange={e => setOeLevelIndex(Number((e.target as HTMLSelectElement).value))}
                    >
                      {Array.from({ length: maxLevels }, (_, index) => (
                        <option key={index} value={String(index)}>
                          Ebene {index + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-sm-7">
                    <input
                      className="form-control"
                      type="text"
                      placeholder="Neuer Wert, z.B. M"
                      value={oeNewValue}
                      onInput={e => setOeNewValue((e.target as HTMLInputElement).value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="bulkBetriebEnabled"
                  checked={betriebEnabled}
                  onChange={e => setBetriebEnabled((e.target as HTMLInputElement).checked)}
                />
                <label className="form-check-label fw-semibold" for="bulkBetriebEnabled">
                  Betrieb setzen
                </label>
              </div>
              {betriebEnabled && (
                <div className="mt-1 ms-1">
                  <input
                    className="form-control"
                    type="text"
                    placeholder="Betrieb"
                    value={betrieb}
                    onInput={e => setBetrieb((e.target as HTMLInputElement).value)}
                  />
                </div>
              )}
            </div>

            <div>
              <span className="fw-semibold">Daten übernehmen von</span>
              <div className="d-flex gap-3 mt-1 ms-1 flex-wrap">
                {(
                  [
                    ['none', 'Nichts übernehmen'],
                    ['template', 'Vorlage'],
                    ['user', 'Muster-Benutzer'],
                  ] as [ApplySource, string][]
                ).map(([value, label]) => (
                  <div className="form-check" key={value}>
                    <input
                      className="form-check-input"
                      type="radio"
                      name="bulkApplySource"
                      id={`bulkApplySource-${value}`}
                      checked={applySource === value}
                      onChange={() => {
                        setApplySource(value);
                        if (value === 'template') void loadTemplates();
                      }}
                    />
                    <label className="form-check-label" for={`bulkApplySource-${value}`}>
                      {label}
                    </label>
                  </div>
                ))}
              </div>

              {applySource === 'template' && (
                <select
                  className="form-select mt-2 ms-1"
                  aria-label="Vorlage"
                  value={templateId}
                  onChange={e => setTemplateId((e.target as HTMLSelectElement).value)}
                >
                  <option value="">Vorlage wählen …</option>
                  {templates.map(template => (
                    <option key={template._id} value={template._id}>
                      {template.name} ({template.code})
                    </option>
                  ))}
                </select>
              )}

              {applySource === 'user' && (
                <select
                  className="form-select mt-2 ms-1"
                  aria-label="Muster-Benutzer"
                  value={sourceUserId}
                  onChange={e => setSourceUserId((e.target as HTMLSelectElement).value)}
                >
                  <option value="">Benutzer wählen …</option>
                  {selectedUsers.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.fullName || user.userName}
                    </option>
                  ))}
                </select>
              )}

              {applySource !== 'none' && (
                <div className="mt-2 ms-1">
                  <div className="small text-body-secondary mb-1">
                    Persönliche Daten (Name, Personalnummer, Adresse) werden nie übernommen.
                  </div>
                  <div className="d-flex gap-3 flex-wrap">
                    {(Object.keys(CATEGORY_LABELS) as BulkApplyCategory[]).map(category => (
                      <div className="form-check" key={category}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`bulkCategory-${category}`}
                          checked={categories.includes(category)}
                          onChange={() => toggleCategory(category)}
                        />
                        <label className="form-check-label" for={`bulkCategory-${category}`}>
                          {CATEGORY_LABELS[category]}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'preview' && preview && (
          <div className="col-12">
            <p className="mb-2">
              {preview.summary.ok} von {preview.summary.total} Benutzern werden geändert
              {preview.summary.skipped > 0 && `, ${preview.summary.skipped} übersprungen`}.
            </p>
            <div className="table-responsive" style="max-height:50vh">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th scope="col">Benutzer</th>
                    <th scope="col">OE</th>
                    <th scope="col">Betrieb</th>
                    <th scope="col">Übernahme</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.results.map(entry => (
                    <tr key={entry.userId} class={entry.status === 'skipped' ? 'text-body-secondary' : undefined}>
                      <td>{entry.userName}</td>
                      <td>
                        {entry.status === 'skipped' ? (
                          <span className="fst-italic">{entry.message}</span>
                        ) : entry.oe.before === entry.oe.after ? (
                          entry.oe.before || '–'
                        ) : (
                          <>
                            <span className="text-body-secondary text-decoration-line-through">{entry.oe.before}</span>{' '}
                            <span className="fw-semibold">{entry.oe.after}</span>
                          </>
                        )}
                      </td>
                      <td>
                        {entry.betrieb.before === entry.betrieb.after ? (
                          entry.betrieb.before || '–'
                        ) : (
                          <>
                            <span className="text-body-secondary text-decoration-line-through">
                              {entry.betrieb.before}
                            </span>{' '}
                            <span className="fw-semibold">{entry.betrieb.after}</span>
                          </>
                        )}
                      </td>
                      <td>
                        {entry.status === 'skipped' || entry.categoriesApplied.length === 0
                          ? '–'
                          : entry.categoriesApplied.map(category => CATEGORY_LABELS[category]).join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {step === 'result' && result && (
          <div className="col-12">
            <p className="fw-semibold">
              {result.summary.ok} aktualisiert, {result.summary.skipped} übersprungen, {result.summary.errors} Fehler
            </p>
            {result.results.some(entry => entry.status !== 'ok') && (
              <ul className="list-group list-group-flush">
                {result.results
                  .filter(entry => entry.status !== 'ok')
                  .map(entry => (
                    <li className="list-group-item px-0" key={entry.userId}>
                      <span
                        className={`badge me-2 text-bg-${entry.status === 'error' ? 'danger' : 'secondary'}`}
                      >
                        {entry.status === 'error' ? 'Fehler' : 'Übersprungen'}
                      </span>
                      {entry.userName}
                      {entry.message && <span className="text-body-secondary"> — {entry.message}</span>}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}
      </MyModalBody>
    </MyDivModal>
  );
}

export default function createAdminBulkEditModal(selectedUsers: AdminUserRow[], onApplied: () => void): void {
  const modal = showModal(
    <AdminBulkEditModal
      selectedUsers={selectedUsers}
      onApplied={onApplied}
      closeModal={() => Modal.getInstance(modal)?.hide()}
    />,
  );
}
