import { useEffect, useMemo, useState } from 'react';

import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { confirmDialog } from '@/infrastructure/ui/confirmDialog';
import { getUserCookie } from '@/infrastructure/tokenManagement/decodeAccessToken';
import {
  createProfileTemplate,
  deleteProfileTemplate,
  fetchProfileTemplates,
  updateProfileTemplate,
  type BackendProfileTemplate,
} from '../utils/api';
import { AdminProfileTemplateContentEditor } from './AdminProfileTemplateContentEditor';
import type { FahrzeitRow, TemplateContentDraft, VorgabenBRow } from './profileTemplates.shared';
import { normalizeVorgabenBRows } from './profileTemplates.shared';
import {
  DEFAULT_ARBEITSZEIT,
  buildTemplatePayload,
  serializeDraft,
  toEditState,
  type TemplateEditState,
} from './adminProfileTemplatesManagerGemeinsam';

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
    const sourceDraft = toEditState(source).templateContent;
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

  function updateArbeitszeit(id: string, value: NonNullable<TemplateContentDraft['Arbeitszeit']>) {
    const state = edits[id];
    if (!state) return;
    updateTemplateContent(id, {
      Arbeitszeit: value,
    });
  }

  function enableArbeitszeit(id: string) {
    const state = edits[id];
    if (!state || state.templateContent.Arbeitszeit) return;
    updateTemplateContent(id, {
      Arbeitszeit: structuredClone(DEFAULT_ARBEITSZEIT),
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
        schichten: ['frueh'],
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
    if (!(await confirmDialog(`Template ${template.code} wirklich löschen?`))) return;

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
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Profile-Templates</h5>
        <button className="db-button" data-variant="outlined" data-size="small" onClick={handleCreate} data-disabler>
          Hinzufügen
        </button>
      </div>

      {loading && <div className="text-body-secondary">Lädt Templates...</div>}
      {!loading && sortedTemplates.length === 0 && (
        <div className="alert alert-secondary mb-0">Keine Templates vorhanden.</div>
      )}

      <div className="d-flex flex-column gap-2">
        {sortedTemplates.map(template => {
          const edit = edits[template._id] ?? toEditState(template);
          const expanded = expandedId === template._id;
          const changed = hasChanges(template._id);
          const isSaving = savingId === template._id;
          const templateContent = edit.templateContent;

          return (
            <div
              key={template._id}
              className={`border rounded ${changed ? 'border-warning' : 'border-secondary-subtle'}`}
            >
              <button
                className="db-button text-start d-flex justify-content-between align-items-center"
                data-variant="filled"
                data-width="full"
                onClick={() => setExpandedId(expanded ? null : template._id)}
              >
                <span>
                  <strong>{template.code}</strong> - {template.name}
                </span>
                <span className={`badge ${template.active ? 'text-bg-success' : 'text-bg-secondary'}`}>
                  {template.active ? 'aktiv' : 'inaktiv'}
                </span>
              </button>

              {expanded && (
                <div className="p-3 border-top">
                  <div className="raster mb-2 abstand-2">
                    <div className="sp-md-4">
                      <label className="form-label small fw-semibold mb-1">Code</label>
                      <input
                        className="form-control form-control-sm"
                        value={edit.code}
                        onChange={e => updateEdit(template._id, { code: (e.target as HTMLInputElement).value })}
                      />
                    </div>
                    <div className="sp-md-8">
                      <label className="form-label small fw-semibold mb-1">Name</label>
                      <input
                        className="form-control form-control-sm"
                        value={edit.name}
                        onChange={e => updateEdit(template._id, { name: (e.target as HTMLInputElement).value })}
                      />
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-semibold mb-1">Beschreibung</label>
                    <input
                      className="form-control form-control-sm"
                      value={edit.description}
                      onChange={e => updateEdit(template._id, { description: (e.target as HTMLInputElement).value })}
                    />
                  </div>

                  <div className="mb-2">
                    <AdminProfileTemplateContentEditor
                      templateId={template._id}
                      templateContent={templateContent}
                      isSaving={isSaving}
                      activeVorgabenBIndex={activeVorgabenBIndex[template._id] ?? 0}
                      onUpdatePersField={(key, value) => updatePersField(template._id, key, value)}
                      onUpdateArbeitszeit={value => updateArbeitszeit(template._id, value)}
                      onEnableArbeitszeit={() => enableArbeitszeit(template._id)}
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

                  <div className="d-flex flex-wrap gap-2 mt-2">
                    <button
                      className="db-button"
                      data-variant="brand"
                      data-size="small"
                      onClick={() => handleSave(template)}
                      disabled={!changed || isSaving}
                    >
                      {isSaving ? 'Speichert...' : 'Speichern'}
                    </button>
                    <button
                      className="db-button"
                      data-variant="outlined"
                      data-size="small"
                      onClick={() => handleCopy(template)}
                      disabled={isSaving}
                    >
                      Kopieren
                    </button>
                    <button
                      className="db-button"
                      data-variant="outlined"
                      data-size="small"
                      onClick={() => handleAdoptTemplateContent(template)}
                      disabled={isSaving}
                    >
                      Inhalt uebernehmen
                    </button>
                    <button
                      className="db-button"
                      data-variant="outlined"
                      data-color={template.active ? 'warning' : 'successful'}
                      data-size="small"
                      onClick={() => handleToggleActive(template)}
                      disabled={isSaving}
                    >
                      {template.active ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                    <button
                      className="db-button"
                      data-variant="outlined"
                      data-color="critical"
                      data-size="small"
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
