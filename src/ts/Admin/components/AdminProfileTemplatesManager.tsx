import { useEffect, useMemo, useState } from 'preact/hooks';
import { createSnackBar } from '../../class/CustomSnackbar';
import { getUserCookie } from '../../utilities/decodeAccessToken';
import {
  createProfileTemplate,
  deleteProfileTemplate,
  fetchProfileTemplates,
  updateProfileTemplate,
  type BackendProfileTemplate,
} from '../utils/api';
import { AdminProfileTemplateContentEditor } from './AdminProfileTemplateContentEditor';
import {
  normalizeVorgabenBRows,
  type FahrzeitRow,
  type TemplateContentDraft,
  type VorgabenBRow,
} from './profileTemplates.shared';

type TemplateEditState = {
  code: string;
  name: string;
  description: string;
  active: boolean;
  templateContent: TemplateContentDraft;
};

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function toBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizePrimitiveRecord(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object') return {};
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>)
      .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
      .map(([key, value]) => [key, String(value)]),
  );
}

function normalizeFahrzeit(input: unknown): FahrzeitRow[] {
  if (!Array.isArray(input)) return [];
  return input
    .map(entry => ({
      key: String((entry as { key?: unknown }).key ?? ''),
      text: String((entry as { text?: unknown }).text ?? ''),
      value: String((entry as { value?: unknown }).value ?? ''),
    }))
    .filter(row => row.key || row.text || row.value);
}

function normalizeSettings(input: unknown): TemplateContentDraft['Einstellungen'] {
  if (!input || typeof input !== 'object') return { aktivierteTabs: [], benoetigteZulagen: [] };
  const settings = input as { aktivierteTabs?: unknown; benoetigteZulagen?: unknown };
  const aktivierteTabs = Array.isArray(settings.aktivierteTabs)
    ? settings.aktivierteTabs.filter((value): value is string => typeof value === 'string')
    : [];
  const benoetigteZulagen = Array.isArray(settings.benoetigteZulagen)
    ? settings.benoetigteZulagen.filter((value): value is string => typeof value === 'string')
    : [];
  return { aktivierteTabs, benoetigteZulagen };
}

function normalizeVorgabenB(input: unknown): VorgabenBRow[] {
  if (!Array.isArray(input)) return [];

  const rows = input
    .map((entry, index) => {
      const row = entry as { key?: unknown; value?: unknown };
      const rawValue = row.value && typeof row.value === 'object' ? ({ ...row.value } as Record<string, unknown>) : {};
      const beginnB = rawValue.beginnB as Record<string, unknown> | undefined;
      const endeB = rawValue.endeB as Record<string, unknown> | undefined;
      const beginnN = rawValue.beginnN as Record<string, unknown> | undefined;
      const endeN = rawValue.endeN as Record<string, unknown> | undefined;

      return {
        key: toString(row.key, `vorlage-${index + 1}`),
        rawValue,
        value: {
          Name: toString(rawValue.Name),
          beginnB: {
            tag: Math.min(7, Math.max(1, toNumber(beginnB?.tag, 1))),
            zeit: toString(beginnB?.zeit),
          },
          endeB: {
            tag: Math.min(7, Math.max(1, toNumber(endeB?.tag, 1))),
            zeit: toString(endeB?.zeit),
            Nwoche: toBoolean(endeB?.Nwoche),
          },
          nacht: toBoolean(rawValue.nacht),
          beginnN: {
            tag: Math.min(7, Math.max(1, toNumber(beginnN?.tag, 1))),
            zeit: toString(beginnN?.zeit),
            Nwoche: toBoolean(beginnN?.Nwoche),
          },
          endeN: {
            tag: Math.min(7, Math.max(1, toNumber(endeN?.tag, 1))),
            zeit: toString(endeN?.zeit),
            Nwoche: toBoolean(endeN?.Nwoche),
          },
          standard: toBoolean(rawValue.standard),
        },
      };
    })
    .filter(row => row.key.trim() !== '');

  return normalizeVorgabenBRows(rows);
}

function normalizeTemplateContent(template: BackendProfileTemplate['template']): TemplateContentDraft {
  return {
    Pers: normalizePrimitiveRecord(template?.Pers),
    Arbeitszeit: normalizePrimitiveRecord(template?.Arbeitszeit),
    Fahrzeit: normalizeFahrzeit(template?.Fahrzeit),
    VorgabenB: normalizeVorgabenB(template?.VorgabenB),
    Einstellungen: normalizeSettings(template?.Einstellungen),
  };
}

function serializeDraft(draft: TemplateContentDraft): string {
  return JSON.stringify({
    Pers: Object.fromEntries(Object.entries(draft.Pers).sort(([a], [b]) => a.localeCompare(b))),
    Arbeitszeit: Object.fromEntries(Object.entries(draft.Arbeitszeit).sort(([a], [b]) => a.localeCompare(b))),
    Fahrzeit: draft.Fahrzeit,
    VorgabenB: draft.VorgabenB,
    Einstellungen: {
      aktivierteTabs: [...draft.Einstellungen.aktivierteTabs].sort(),
      benoetigteZulagen: [...draft.Einstellungen.benoetigteZulagen].sort(),
    },
  });
}

function removeEmptyValues(record: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value.trim() !== ''));
}

function buildTemplatePayload(
  original: BackendProfileTemplate['template'] | undefined,
  draft: TemplateContentDraft,
): BackendProfileTemplate['template'] {
  const result: Record<string, unknown> = { ...(original ?? {}) };

  const pers = removeEmptyValues(draft.Pers);
  const arbeitszeit = removeEmptyValues(draft.Arbeitszeit);
  const fahrzeit = draft.Fahrzeit.filter(row => row.key.trim() && row.text.trim() && row.value.trim());
  const vorgabenB = draft.VorgabenB.filter(row => row.key.trim() !== '').map(row => ({
    key: row.key.trim(),
    value: {
      ...row.rawValue,
      Name: row.value.Name,
      beginnB: row.value.beginnB,
      endeB: row.value.endeB,
      nacht: row.value.nacht,
      beginnN: row.value.beginnN,
      endeN: row.value.endeN,
      ...(row.value.standard ? { standard: true } : { standard: undefined }),
    },
  }));
  const settings = {
    aktivierteTabs: draft.Einstellungen.aktivierteTabs,
    benoetigteZulagen: draft.Einstellungen.benoetigteZulagen,
  };

  if (Object.keys(pers).length > 0) result.Pers = pers;
  else delete result.Pers;

  if (Object.keys(arbeitszeit).length > 0) result.Arbeitszeit = arbeitszeit;
  else delete result.Arbeitszeit;

  if (fahrzeit.length > 0) result.Fahrzeit = fahrzeit;
  else delete result.Fahrzeit;

  if (vorgabenB.length > 0) result.VorgabenB = vorgabenB;
  else delete result.VorgabenB;

  if (settings.aktivierteTabs.length > 0 || settings.benoetigteZulagen.length > 0) result.Einstellungen = settings;
  else delete result.Einstellungen;

  return result as BackendProfileTemplate['template'];
}

function toEditState(template: BackendProfileTemplate): TemplateEditState {
  return {
    code: template.code,
    name: template.name,
    description: template.description ?? '',
    active: template.active,
    templateContent: normalizeTemplateContent(template.template),
  };
}

export function AdminProfileTemplatesManager() {
  const [templates, setTemplates] = useState<BackendProfileTemplate[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, TemplateEditState>>({});
  const [activeVorgabenBIndex, setActiveVorgabenBIndex] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const user = getUserCookie();
  const canDelete = user?.role === 'super-admin';

  const sortedTemplates = useMemo(
    () => [...templates].sort((a, b) => Number(b.active) - Number(a.active) || a.code.localeCompare(b.code)),
    [templates],
  );

  async function reload() {
    setLoading(true);
    try {
      const next = await fetchProfileTemplates();
      setTemplates(next);
      setEdits(Object.fromEntries(next.map(template => [template._id, toEditState(template)])));
    } finally {
      setLoading(false);
    }
  }

  function updateEdit(id: string, patch: Partial<TemplateEditState>) {
    setEdits(current => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  function hasChanges(id: string): boolean {
    const source = templates.find(t => t._id === id);
    const edit = edits[id];
    if (!source || !edit) return false;
    const sourceDraft = normalizeTemplateContent(source.template);
    return (
      source.code !== edit.code ||
      source.name !== edit.name ||
      (source.description ?? '') !== edit.description ||
      source.active !== edit.active ||
      serializeDraft(sourceDraft) !== serializeDraft(edit.templateContent)
    );
  }

  function updateTemplateContent(id: string, patch: Partial<TemplateContentDraft>) {
    setEdits(current => ({
      ...current,
      [id]: {
        ...current[id],
        templateContent: {
          ...current[id].templateContent,
          ...patch,
        },
      },
    }));
  }

  function updatePersField(id: string, key: string, value: string) {
    const state = edits[id];
    if (!state) return;
    updateTemplateContent(id, {
      Pers: {
        ...state.templateContent.Pers,
        [key]: value,
      },
    });
  }

  function updateArbeitszeitField(id: string, key: string, value: string) {
    const state = edits[id];
    if (!state) return;
    updateTemplateContent(id, {
      Arbeitszeit: {
        ...state.templateContent.Arbeitszeit,
        [key]: value,
      },
    });
  }

  function addFahrzeitRow(id: string) {
    const state = edits[id];
    if (!state) return;
    updateTemplateContent(id, {
      Fahrzeit: [...state.templateContent.Fahrzeit, { key: '', text: '', value: '' }],
    });
  }

  function updateFahrzeitRow(id: string, index: number, field: keyof FahrzeitRow, value: string) {
    const state = edits[id];
    if (!state) return;
    const next = [...state.templateContent.Fahrzeit];
    next[index] = { ...next[index], [field]: value };
    updateTemplateContent(id, { Fahrzeit: next });
  }

  function removeFahrzeitRow(id: string, index: number) {
    const state = edits[id];
    if (!state) return;
    updateTemplateContent(id, {
      Fahrzeit: state.templateContent.Fahrzeit.filter((_, i) => i !== index),
    });
  }

  function addVorgabenBRow(id: string) {
    const state = edits[id];
    if (!state) return;
    const newRow: VorgabenBRow = {
      key: '',
      rawValue: {},
      value: {
        Name: '',
        beginnB: { tag: 1, zeit: '' },
        endeB: { tag: 1, zeit: '', Nwoche: false },
        nacht: false,
        beginnN: { tag: 1, zeit: '', Nwoche: false },
        endeN: { tag: 1, zeit: '', Nwoche: false },
        standard: false,
      },
    };
    const nextRows = normalizeVorgabenBRows([...state.templateContent.VorgabenB, newRow]);
    updateTemplateContent(id, {
      VorgabenB: nextRows,
    });
    setActiveVorgabenBIndex(current => ({ ...current, [id]: Math.max(0, nextRows.length - 1) }));
  }

  function updateVorgabenBRow(id: string, index: number, updater: (row: VorgabenBRow) => VorgabenBRow) {
    const state = edits[id];
    if (!state) return;
    const next = [...state.templateContent.VorgabenB];
    const current = next[index];
    if (!current) return;
    next[index] = updater(current);
    updateTemplateContent(id, { VorgabenB: next });
  }

  function removeVorgabenBRow(id: string, index: number) {
    const state = edits[id];
    if (!state) return;
    const filtered = state.templateContent.VorgabenB.filter((_, i) => i !== index);
    const nextRows = normalizeVorgabenBRows(filtered);
    const currentIndex = activeVorgabenBIndex[id] ?? 0;
    const nextIndex = Math.max(
      0,
      Math.min(currentIndex >= index ? currentIndex - 1 : currentIndex, nextRows.length - 1),
    );
    updateTemplateContent(id, {
      VorgabenB: nextRows,
    });
    setActiveVorgabenBIndex(current => ({ ...current, [id]: nextRows.length === 0 ? 0 : nextIndex }));
  }

  function moveVorgabenBRow(id: string, index: number, direction: 'up' | 'down') {
    const state = edits[id];
    if (!state) return;
    const rows = [...state.templateContent.VorgabenB];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= rows.length) return;

    const oldStandardIndex = rows.findIndex(row => row.value.standard);
    const [moved] = rows.splice(index, 1);
    rows.splice(targetIndex, 0, moved);

    let nextStandardIndex = oldStandardIndex;
    if (oldStandardIndex === index) nextStandardIndex = targetIndex;
    else if (direction === 'up' && oldStandardIndex >= targetIndex && oldStandardIndex < index)
      nextStandardIndex = oldStandardIndex + 1;
    else if (direction === 'down' && oldStandardIndex > index && oldStandardIndex <= targetIndex)
      nextStandardIndex = oldStandardIndex - 1;

    updateTemplateContent(id, {
      VorgabenB: normalizeVorgabenBRows(rows, nextStandardIndex),
    });
    setActiveVorgabenBIndex(current => ({ ...current, [id]: targetIndex }));
  }

  function setVorgabenBStandard(id: string, index: number) {
    const state = edits[id];
    if (!state) return;
    updateTemplateContent(id, {
      VorgabenB: normalizeVorgabenBRows([...state.templateContent.VorgabenB], index),
    });
  }

  function selectVorgabenBRow(id: string, index: number) {
    setActiveVorgabenBIndex(current => ({ ...current, [id]: Math.max(0, index) }));
  }

  function toggleAktivierterTab(id: string, key: string) {
    const state = edits[id];
    if (!state) return;
    const current = new Set(state.templateContent.Einstellungen.aktivierteTabs);
    if (current.has(key)) current.delete(key);
    else current.add(key);
    updateTemplateContent(id, {
      Einstellungen: {
        ...state.templateContent.Einstellungen,
        aktivierteTabs: [...current],
      },
    });
  }

  function toggleZulage(id: string, code: string) {
    const state = edits[id];
    if (!state) return;
    const current = new Set(state.templateContent.Einstellungen.benoetigteZulagen);
    if (current.has(code)) current.delete(code);
    else current.add(code);
    updateTemplateContent(id, {
      Einstellungen: {
        ...state.templateContent.Einstellungen,
        benoetigteZulagen: [...current],
      },
    });
  }

  async function handleCreate() {
    const code = window.prompt('Neuer Template-Code:');
    if (!code) return;
    const name = window.prompt('Template-Name:', code);
    if (!name) return;

    await createProfileTemplate({
      code: code.trim().toLowerCase(),
      name: name.trim(),
      description: '',
      active: true,
      template: {},
    });
    await reload();
  }

  async function handleCopy(source: BackendProfileTemplate) {
    const code = window.prompt('Neuer Code fuer Kopie:', `${source.code}-copy`);
    if (!code) return;
    const name = window.prompt('Name fuer Kopie:', `${source.name} (Kopie)`);
    if (!name) return;

    await createProfileTemplate({
      code: code.trim().toLowerCase(),
      name: name.trim(),
      description: source.description ?? '',
      active: false,
      template: source.template ?? {},
    });
    await reload();
  }

  async function handleSave(template: BackendProfileTemplate) {
    const edit = edits[template._id];
    if (!edit) return;

    setSavingId(template._id);
    try {
      await updateProfileTemplate(template._id, {
        code: edit.code.trim().toLowerCase(),
        name: edit.name.trim(),
        description: edit.description.trim(),
        active: edit.active,
        template: buildTemplatePayload(template.template, edit.templateContent),
      });
      await reload();
    } finally {
      setSavingId(null);
    }
  }

  async function handleAdoptTemplateContent(template: BackendProfileTemplate) {
    const sourceCode = window.prompt('Template-Code als Quelle eingeben:');
    if (!sourceCode) return;

    const source = templates.find(item => item.code.toLowerCase() === sourceCode.trim().toLowerCase());
    if (!source) {
      createSnackBar({ message: `Template ${sourceCode} nicht gefunden`, status: 'error', timeout: 3000 });
      return;
    }

    setSavingId(template._id);
    try {
      await updateProfileTemplate(template._id, { template: source.template ?? {} });
      createSnackBar({ message: `Inhalt von ${source.code} uebernommen`, status: 'success', timeout: 2200 });
      await reload();
    } finally {
      setSavingId(null);
    }
  }

  async function handleToggleActive(template: BackendProfileTemplate) {
    setSavingId(template._id);
    try {
      await updateProfileTemplate(template._id, { active: !template.active });
      await reload();
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(template: BackendProfileTemplate) {
    if (!canDelete) {
      createSnackBar({ message: 'Löschen nur als Super-Admin erlaubt', status: 'error', timeout: 2500 });
      return;
    }
    if (!window.confirm(`Template ${template.code} wirklich löschen?`)) return;

    setSavingId(template._id);
    try {
      await deleteProfileTemplate(template._id);
      await reload();
    } finally {
      setSavingId(null);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <div>
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0">Profile-Templates</h5>
        <button class="btn btn-sm btn-outline-primary" onClick={handleCreate} data-disabler>
          Hinzufügen
        </button>
      </div>

      {loading && <div class="text-body-secondary">Lädt Templates...</div>}
      {!loading && sortedTemplates.length === 0 && (
        <div class="alert alert-secondary mb-0">Keine Templates vorhanden.</div>
      )}

      <div class="d-flex flex-column gap-2">
        {sortedTemplates.map(template => {
          const edit = edits[template._id] ?? toEditState(template);
          const expanded = expandedId === template._id;
          const changed = hasChanges(template._id);
          const isSaving = savingId === template._id;
          const templateContent = edit.templateContent;

          return (
            <div key={template._id} class={`border rounded ${changed ? 'border-warning' : 'border-secondary-subtle'}`}>
              <button
                class="btn w-100 text-start d-flex justify-content-between align-items-center"
                onClick={() => setExpandedId(expanded ? null : template._id)}
              >
                <span>
                  <strong>{template.code}</strong> - {template.name}
                </span>
                <span class={`badge ${template.active ? 'text-bg-success' : 'text-bg-secondary'}`}>
                  {template.active ? 'aktiv' : 'inaktiv'}
                </span>
              </button>

              {expanded && (
                <div class="p-3 border-top">
                  <div class="row g-2 mb-2">
                    <div class="col-12 col-md-4">
                      <label class="form-label small fw-semibold mb-1">Code</label>
                      <input
                        class="form-control form-control-sm"
                        value={edit.code}
                        onInput={e => updateEdit(template._id, { code: (e.target as HTMLInputElement).value })}
                      />
                    </div>
                    <div class="col-12 col-md-8">
                      <label class="form-label small fw-semibold mb-1">Name</label>
                      <input
                        class="form-control form-control-sm"
                        value={edit.name}
                        onInput={e => updateEdit(template._id, { name: (e.target as HTMLInputElement).value })}
                      />
                    </div>
                  </div>

                  <div class="mb-2">
                    <label class="form-label small fw-semibold mb-1">Beschreibung</label>
                    <input
                      class="form-control form-control-sm"
                      value={edit.description}
                      onInput={e => updateEdit(template._id, { description: (e.target as HTMLInputElement).value })}
                    />
                  </div>

                  <div class="mb-2">
                    <AdminProfileTemplateContentEditor
                      templateId={template._id}
                      templateContent={templateContent}
                      isSaving={isSaving}
                      activeVorgabenBIndex={activeVorgabenBIndex[template._id] ?? 0}
                      onUpdatePersField={(key, value) => updatePersField(template._id, key, value)}
                      onUpdateArbeitszeitField={(key, value) => updateArbeitszeitField(template._id, key, value)}
                      onAddFahrzeitRow={() => addFahrzeitRow(template._id)}
                      onUpdateFahrzeitRow={(index, field, value) =>
                        updateFahrzeitRow(template._id, index, field, value)
                      }
                      onRemoveFahrzeitRow={index => removeFahrzeitRow(template._id, index)}
                      onAddVorgabenBRow={() => addVorgabenBRow(template._id)}
                      onSelectVorgabenBRow={index => selectVorgabenBRow(template._id, index)}
                      onMoveVorgabenBRow={(index, direction) => moveVorgabenBRow(template._id, index, direction)}
                      onSetVorgabenBStandard={index => setVorgabenBStandard(template._id, index)}
                      onRemoveVorgabenBRow={index => removeVorgabenBRow(template._id, index)}
                      onUpdateVorgabenBRow={(index, updater) => updateVorgabenBRow(template._id, index, updater)}
                      onToggleAktivierterTab={key => toggleAktivierterTab(template._id, key)}
                      onToggleZulage={code => toggleZulage(template._id, code)}
                    />
                  </div>

                  <div class="d-flex flex-wrap gap-2 mt-2">
                    <button
                      class="btn btn-primary btn-sm"
                      onClick={() => handleSave(template)}
                      disabled={!changed || isSaving}
                    >
                      {isSaving ? 'Speichert...' : 'Speichern'}
                    </button>
                    <button
                      class="btn btn-outline-secondary btn-sm"
                      onClick={() => handleCopy(template)}
                      disabled={isSaving}
                    >
                      Kopieren
                    </button>
                    <button
                      class="btn btn-outline-secondary btn-sm"
                      onClick={() => handleAdoptTemplateContent(template)}
                      disabled={isSaving}
                    >
                      Inhalt uebernehmen
                    </button>
                    <button
                      class={`btn btn-outline-${template.active ? 'warning' : 'success'} btn-sm`}
                      onClick={() => handleToggleActive(template)}
                      disabled={isSaving}
                    >
                      {template.active ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                    <button
                      class="btn btn-outline-danger btn-sm"
                      onClick={() => handleDelete(template)}
                      disabled={isSaving}
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
