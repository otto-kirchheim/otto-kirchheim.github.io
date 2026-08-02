import Modal from 'bootstrap/js/dist/modal';
import { useMemo, useState } from 'preact/hooks';
import { MyDivModal, MyModalBody, showModal } from '@/components';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import {
  bulkUpdateUserProfiles,
  fetchProfileTemplates,
  type AdminUserRow,
  type BulkApplyCategory,
  type BulkApplyResult,
  type BulkOeTargetField,
  type BulkUserProfileUpdatePayload,
  type BackendProfileTemplate,
} from '../utils/api';
import { computeCommonOeLevels, computeCommonPathLevels, computeMaxOeLevels, FIELD_LABELS } from '../utils/bulkEditOe';
import { BulkEditUserOverview } from './BulkEditUserOverview';
import { BulkEditOeLevelsEditor } from './BulkEditOeLevelsEditor';
import { BulkEditSimpleFieldsBlock, SIMPLE_FIELD_KEYS, type SimpleFieldState } from './BulkEditSimpleFieldsBlock';
import { BulkEditApplySourceBlock, type ApplySource } from './BulkEditApplySourceBlock';
import { BulkEditAdminOesBlock, type AdminOeActionState } from './BulkEditAdminOesBlock';
import { BulkEditPreviewTable, type PreviewFieldKey } from './BulkEditPreviewTable';
import { MAX_OE_LEVELS } from './OeLevelInputs';

type Step = 'form' | 'preview' | 'result';

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort();
}

/**
 * Massenänderung für mehrere Benutzerprofile: OE-Ersetzen (Pers.OE und/oder
 * Team-/Org-Admin-OE-Listen), einfache Felder, Team-/Org-Admin-OE Hinzufügen/
 * Entfernen und Übernahme einzelner Kategorien aus einer Vorlage oder einem
 * Muster-Benutzer. Vor dem Speichern läuft immer eine Vorschau (dryRun) über
 * dieselbe API.
 */
export function AdminBulkEditModal({
  selectedUsers: initialUsers,
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

  const [selectedUsers, setSelectedUsers] = useState(initialUsers);
  const maxLevels = useMemo(() => computeMaxOeLevels(selectedUsers), [selectedUsers]);
  const [oeLevelValues, setOeLevelValues] = useState<string[]>(() => Array.from({ length: maxLevels }, () => ''));
  const oeLevelPlaceholders = useMemo(
    () => computeCommonOeLevels(selectedUsers, oeLevelValues.length).map(value => value ?? ''),
    [selectedUsers, oeLevelValues.length],
  );
  const [oeLevelsApplyTo, setOeLevelsApplyTo] = useState<Set<BulkOeTargetField>>(new Set());

  const [simpleFields, setSimpleFields] = useState<Record<string, SimpleFieldState>>(() =>
    Object.fromEntries(SIMPLE_FIELD_KEYS.map(key => [key, { enabled: false, value: '' }])),
  );

  const [teamOesAction, setTeamOesAction] = useState<AdminOeActionState>({ mode: 'none', value: '', levels: [] });
  const [organizationOesAction, setOrganizationOesAction] = useState<AdminOeActionState>({
    mode: 'none',
    value: '',
    levels: [],
  });
  const existingTeamOes = useMemo(() => uniqueSorted(selectedUsers.flatMap(user => user.adminForTeamOes)), [selectedUsers]);
  const existingOrganizationOes = useMemo(
    () => uniqueSorted(selectedUsers.flatMap(user => user.adminForOrganizationOes)),
    [selectedUsers],
  );

  // Ohne eigene Team-/Org-Admin-OEs dient die gemeinsame Pers.OE als Vorlage —
  // neue Admin-OEs liegen praktisch immer in derselben Hierarchie.
  const teamOePlaceholders = useMemo(() => {
    const common = computeCommonPathLevels(existingTeamOes, maxLevels);
    return common.length > 0 ? common : oeLevelPlaceholders;
  }, [existingTeamOes, maxLevels, oeLevelPlaceholders]);
  const organizationOePlaceholders = useMemo(() => {
    const common = computeCommonPathLevels(existingOrganizationOes, maxLevels);
    return common.length > 0 ? common : oeLevelPlaceholders;
  }, [existingOrganizationOes, maxLevels, oeLevelPlaceholders]);

  const [applySource, setApplySource] = useState<ApplySource>('none');
  const [templates, setTemplates] = useState<BackendProfileTemplate[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [sourceUserId, setSourceUserId] = useState('');
  const [categories, setCategories] = useState<BulkApplyCategory[]>([]);

  const [preview, setPreview] = useState<BulkApplyResult | null>(null);
  const [previewFields, setPreviewFields] = useState<{ activeFields: PreviewFieldKey[]; showApplyFrom: boolean }>({
    activeFields: [],
    showApplyFrom: false,
  });
  const [result, setResult] = useState<BulkApplyResult | null>(null);

  async function loadTemplates(): Promise<void> {
    if (templates.length > 0) return;
    try {
      setTemplates(await fetchProfileTemplates());
    } catch {
      setError('Vorlagen konnten nicht geladen werden');
    }
  }

  function toggleOeTarget(target: BulkOeTargetField): void {
    setOeLevelsApplyTo(current => {
      const next = new Set(current);
      if (next.has(target)) next.delete(target);
      else next.add(target);
      return next;
    });
  }

  function changeOeLevel(index: number, value: string): void {
    setOeLevelValues(current => current.map((entry, i) => (i === index ? value : entry)));
  }

  function addOeLevel(): void {
    setOeLevelValues(current => (current.length < MAX_OE_LEVELS ? [...current, ''] : current));
  }

  function removeOeLevel(): void {
    setOeLevelValues(current => (current.length > 1 ? current.slice(0, -1) : current));
  }

  function removeSelectedUser(userId: string): void {
    setSelectedUsers(current => (current.length > 1 ? current.filter(user => user._id !== userId) : current));
    if (sourceUserId === userId) setSourceUserId('');
  }

  function updateSimpleField(key: string, patch: Partial<SimpleFieldState>): void {
    setSimpleFields(current => ({ ...current, [key]: { ...current[key], ...patch } }));
  }

  function toggleCategory(category: BulkApplyCategory): void {
    setCategories(current =>
      current.includes(category) ? current.filter(entry => entry !== category) : [...current, category],
    );
  }

  function computeActiveFields(): PreviewFieldKey[] {
    const fields: PreviewFieldKey[] = [];
    if (oeLevelsApplyTo.has('pers')) fields.push('oe');
    for (const key of SIMPLE_FIELD_KEYS) if (simpleFields[key].enabled) fields.push(key);
    if (oeLevelsApplyTo.has('teamOes') || teamOesAction.mode !== 'none') fields.push('teamOes');
    if (oeLevelsApplyTo.has('organizationOes') || organizationOesAction.mode !== 'none') fields.push('organizationOes');
    return fields;
  }

  function buildPayload(dryRun: boolean): BulkUserProfileUpdatePayload | null {
    const payload: BulkUserProfileUpdatePayload = {
      userIds: selectedUsers.map(user => user._id),
      dryRun,
    };

    // Das Ziel-Häkchen ist der bewusste Auslöser fürs Ersetzen — nicht die
    // (evtl. per Vorbefüllung bereits ausgefüllten) Ebenen-Boxen. Sonst würde
    // schon eine reine Vorbefüllung (z.B. bei nur einem ausgewählten Benutzer
    // stimmen alle Ebenen zwangsläufig "überein") ungewollt einen Fehler
    // erzwingen, obwohl niemand OE ändern wollte.
    if (oeLevelsApplyTo.size > 0) {
      const hasFilledLevel = oeLevelValues.some(value => value.trim());
      if (!hasFilledLevel) {
        setError('Bitte mindestens eine Ebene zum Ersetzen ausfüllen');
        return null;
      }
      payload.oeLevels = oeLevelValues.map(value => (value.trim() ? value.trim() : null));
      payload.oeLevelsApplyTo = Array.from(oeLevelsApplyTo);
    }

    for (const key of SIMPLE_FIELD_KEYS) {
      const field = simpleFields[key];
      if (!field.enabled) continue;
      if (!field.value.trim()) {
        setError(`Bitte einen Wert für ${FIELD_LABELS[key]} angeben`);
        return null;
      }
      payload[key] = field.value.trim();
    }

    if (teamOesAction.mode !== 'none') {
      if (!teamOesAction.value.trim()) {
        setError('Bitte einen Pfad für Team-Admin-OEs angeben');
        return null;
      }
      payload.teamOes =
        teamOesAction.mode === 'add' ? { add: teamOesAction.value.trim() } : { remove: teamOesAction.value.trim() };
    }
    if (organizationOesAction.mode !== 'none') {
      if (!organizationOesAction.value.trim()) {
        setError('Bitte einen Pfad für Org-Admin-OEs angeben');
        return null;
      }
      payload.organizationOes =
        organizationOesAction.mode === 'add'
          ? { add: organizationOesAction.value.trim() }
          : { remove: organizationOesAction.value.trim() };
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

    const hasSimpleChange = SIMPLE_FIELD_KEYS.some(key => payload[key] !== undefined);
    const hasAnyChange =
      payload.oeLevels !== undefined ||
      hasSimpleChange ||
      payload.teamOes !== undefined ||
      payload.organizationOes !== undefined ||
      payload.applyFrom !== undefined;

    if (!hasAnyChange) {
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
      const activeFields = computeActiveFields();
      const showApplyFrom = applySource !== 'none';
      setPreview(await bulkUpdateUserProfiles(payload));
      setPreviewFields({ activeFields, showApplyFrom });
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
    <MyDivModal
      dialogClass="modal-xl modal-fullscreen-lg-down modal-dialog-scrollable"
      title={`Massenänderung: ${selectedUsers.length} Benutzer`}
      Footer={footer}
      errorMessage={error}
    >
      <MyModalBody>
        {step === 'form' && (
          <div className="col-12 row g-3">
            <div className="col-12">
              <BulkEditUserOverview selectedUsers={selectedUsers} onRemoveUser={removeSelectedUser} />
            </div>

            <div className="col-12 col-xl-6">
              <div className="border rounded p-3 h-100 d-flex flex-column gap-3">
                <div className="fw-semibold">OE ändern</div>

                <BulkEditOeLevelsEditor
                  levelValues={oeLevelValues}
                  placeholders={oeLevelPlaceholders}
                  onChangeLevel={changeOeLevel}
                  onAddLevel={addOeLevel}
                  onRemoveLevel={removeOeLevel}
                  applyTo={oeLevelsApplyTo}
                  onToggleTarget={toggleOeTarget}
                />

                <BulkEditAdminOesBlock
                  field="teamOes"
                  label="Team-Admin-OEs"
                  action={teamOesAction}
                  onChange={patch => setTeamOesAction(current => ({ ...current, ...patch }))}
                  existingPaths={existingTeamOes}
                  defaultLevelCount={maxLevels}
                  placeholders={teamOePlaceholders}
                />
                <BulkEditAdminOesBlock
                  field="organizationOes"
                  label="Org-Admin-OEs"
                  action={organizationOesAction}
                  onChange={patch => setOrganizationOesAction(current => ({ ...current, ...patch }))}
                  existingPaths={existingOrganizationOes}
                  defaultLevelCount={maxLevels}
                  placeholders={organizationOePlaceholders}
                />
              </div>
            </div>

            <div className="col-12 col-xl-6">
              <BulkEditSimpleFieldsBlock fields={simpleFields} onChange={updateSimpleField} />
            </div>

            <div className="col-12">
              <BulkEditApplySourceBlock
                applySource={applySource}
                onApplySourceChange={source => {
                  setApplySource(source);
                  if (source === 'template') void loadTemplates();
                }}
                templates={templates}
                templateId={templateId}
                onTemplateIdChange={setTemplateId}
                sourceUserId={sourceUserId}
                onSourceUserIdChange={setSourceUserId}
                selectedUsers={selectedUsers}
                categories={categories}
                onToggleCategory={toggleCategory}
              />
            </div>
          </div>
        )}

        {step === 'preview' && preview && (
          <div className="col-12">
            <BulkEditPreviewTable
              preview={preview}
              activeFields={previewFields.activeFields}
              showApplyFrom={previewFields.showApplyFrom}
            />
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
