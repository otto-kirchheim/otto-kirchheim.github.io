import { useCallback, useEffect, useMemo, useState } from 'react';

import { Role } from '@otto-kirchheim/nebengeld-shared';
import { createSnackBar } from '@/shared/ui/snackbar/CustomSnackbar';
import { confirmDialog } from '@/shared/ui/dialog/confirmDialog';
import { getUserCookie } from '@/shared/api/token/decodeAccessToken';
import {
  createProfileTemplate,
  deleteProfileTemplate,
  fetchProfileTemplates,
  updateProfileTemplate,
  type BackendProfileTemplate,
} from '../api/api';
import { AdminProfileTemplateContentEditor } from './AdminProfileTemplateContentEditor';
import type { TemplateContentDraft } from './profileTemplates.shared';
import { useAdminFeatures, vorlagenAbschnitte, vorlagenPersFelder } from '../adminFeatures';
import {
  DEFAULT_ARBEITSZEIT,
  buildTemplatePayload,
  serializeDraft,
  toEditState,
  type TemplateEditState,
} from './adminProfileTemplatesManagerGemeinsam';
import { DBButton, DBHeadingH5, DBTag, DBStack } from '@db-ux/react-core-components';
import { DbFeld } from '@/shared/ui/form/DbFeld';

/**
 * Verwaltung der Profil-Templates: Liste mit aufklappbarem Editor, Anlegen, Kopieren, Inhalt übernehmen, (De-)Aktivieren und Löschen (nur Super-Admin).
 */
export function AdminProfileTemplatesManager() {
  const [templates, setTemplates] = useState<BackendProfileTemplate[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, TemplateEditState>>({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Feature-Abschnitte des Editors (VorgabenB, Fahrzeit, Zulagen, ...) kommen aus den Admin-Anteilen der Features.
  const adminFeatures = useAdminFeatures();
  const abschnitte = useMemo(() => vorlagenAbschnitte(adminFeatures.features), [adminFeatures.features]);
  const zusatzPersFelder = useMemo(() => vorlagenPersFelder(adminFeatures.features), [adminFeatures.features]);

  const user = getUserCookie();
  const canDelete = user?.role === Role.SUPER_ADMIN;

  const sortedTemplates = useMemo(
    () => [...templates].sort((a, b) => Number(b.active) - Number(a.active) || a.code.localeCompare(b.code)),
    [templates],
  );

  // `reload` ist per useCallback stabil, damit der Mount-Effect sie als Dep listen kann.
  // Der Effect ruft sie per queueMicrotask auf: ein synchroner Aufruf im Effect-Body
  // loeste react-hooks/set-state-in-effect aus (reload setzt synchron setLoading).
  /**
   * Lädt alle Templates neu und setzt die Bearbeitungsstände darauf zurück (verwirft ungespeicherte Änderungen).
   */
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchProfileTemplates();
      setTemplates(next);
      setEdits(Object.fromEntries(next.map(template => [template._id, toEditState(template, abschnitte)])));
    } finally {
      setLoading(false);
    }
  }, [abschnitte]);

  /**
   * Ändert Stammfelder (Code, Name, Beschreibung, aktiv) im Bearbeitungsstand eines Templates.
   *
   * @param id - Template-Id.
   * @param patch - Zu ändernde Felder des Bearbeitungsstands.
   */
  function updateEdit(id: string, patch: Partial<TemplateEditState>) {
    setEdits(current => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  /**
   * Prüft auf ungespeicherte Änderungen.
   *
   * @param id - Template-Id.
   * @returns `true`, wenn der Bearbeitungsstand vom geladenen Template abweicht; `false` auch, wenn Template oder Stand fehlen.
   */
  function hasChanges(id: string): boolean {
    const source = templates.find(t => t._id === id);
    const edit = edits[id];
    if (!source || !edit) return false;
    const sourceDraft = toEditState(source, abschnitte).templateContent;
    return (
      source.code !== edit.code ||
      source.name !== edit.name ||
      (source.description ?? '') !== edit.description ||
      source.active !== edit.active ||
      serializeDraft(sourceDraft) !== serializeDraft(edit.templateContent)
    );
  }

  /**
   * Ändert Abschnitte des Inhalts-Entwurfs eines Templates.
   *
   * @param id - Template-Id.
   * @param patch - Zu ändernde Abschnitte des Inhalts-Entwurfs.
   */
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

  /**
   * Setzt ein Feld des Abschnitts Pers.
   *
   * @param id - Template-Id.
   * @param key - Name des Pers-Felds.
   * @param value - Neuer Wert.
   */
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

  /**
   * Übernimmt geänderte Arbeitszeit-Vorgaben.
   *
   * @param id - Template-Id.
   * @param value - Neue Arbeitszeit-Vorgaben.
   */
  function updateArbeitszeit(id: string, value: NonNullable<TemplateContentDraft['Arbeitszeit']>) {
    const state = edits[id];
    if (!state) return;
    updateTemplateContent(id, {
      Arbeitszeit: value,
    });
  }

  /**
   * Legt den Abschnitt Arbeitszeit mit den Standardwerten an, falls er noch fehlt.
   *
   * @param id - Template-Id.
   */
  function enableArbeitszeit(id: string) {
    const state = edits[id];
    if (!state || state.templateContent.Arbeitszeit) return;
    updateTemplateContent(id, {
      Arbeitszeit: structuredClone(DEFAULT_ARBEITSZEIT),
    });
  }

  /**
   * Übernimmt den Entwurf eines Feature-Abschnitts.
   *
   * @param id - Template-Id.
   * @param abschnittId - `AdminVorlagenAbschnitt.id`.
   * @param value - Neuer Entwurf des Abschnitts.
   */
  function updateAbschnitt(id: string, abschnittId: string, value: unknown) {
    const state = edits[id];
    if (!state) return;
    updateTemplateContent(id, { abschnitte: { ...state.templateContent.abschnitte, [abschnittId]: value } });
  }

  /**
   * Schaltet einen Tab in den sichtbaren Bereichen um.
   *
   * @param id - Template-Id.
   * @param key - Schlüssel des Tabs.
   */
  function toggleAktivierterTab(id: string, key: string) {
    const state = edits[id];
    if (!state) return;
    const current = new Set(state.templateContent.Einstellungen.aktivierteTabs);
    if (current.has(key)) current.delete(key);
    else current.add(key);
    updateTemplateContent(id, {
      Einstellungen: { aktivierteTabs: [...current] },
    });
  }

  /**
   * Legt nach Abfrage von Code und Name ein leeres, aktives Template an; Abbruch im Prompt beendet still.
   */
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

  /**
   * Kopiert ein Template unter neuem Code und Namen als inaktives Template.
   *
   * @param source - Zu kopierendes Template.
   */
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

  /**
   * Speichert den Bearbeitungsstand eines Templates (Code kleingeschrieben, Texte getrimmt) und lädt neu.
   *
   * @param template - Zu speicherndes Template.
   */
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
        template: buildTemplatePayload(template.template, edit.templateContent, abschnitte),
      });
      await reload();
    } finally {
      setSavingId(null);
    }
  }

  /**
   * Überschreibt den Inhalt des Templates mit dem eines per Code gewählten Quell-Templates.
   *
   * @param template - Ziel-Template, dessen Inhalt überschrieben wird.
   */
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

  /**
   * Schaltet ein Template aktiv/inaktiv und lädt neu.
   *
   * @param template - Template, dessen Aktiv-Status umgeschaltet wird.
   */
  async function handleToggleActive(template: BackendProfileTemplate) {
    setSavingId(template._id);
    try {
      await updateProfileTemplate(template._id, { active: !template.active });
      await reload();
    } finally {
      setSavingId(null);
    }
  }

  /**
   * Löscht ein Template nach Bestätigung; nur für Super-Admins erlaubt.
   *
   * @param template - Zu löschendes Template.
   */
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

  // Erst nach den Admin-Anteilen laden: ohne sie fehlten die Feature-Abschnitte im Entwurf.
  useEffect(() => {
    if (!adminFeatures.geladen) return;
    queueMicrotask(() => void reload());
  }, [reload, adminFeatures.geladen]);

  return (
    <div>
      <DBStack direction="row" gap="none" alignment="center" justifyContent="space-between" className="luft-unten-sm">
        <DBHeadingH5 className="ohne-luft-unten">Profile-Templates</DBHeadingH5>
        <DBButton type="button" variant="outlined" size="small" onClick={handleCreate} data-disabler>
          Hinzufügen
        </DBButton>
      </DBStack>

      {(loading || !adminFeatures.geladen) && <div className="farbe-gedaempft">Lädt Templates...</div>}
      {!loading && sortedTemplates.length === 0 && (
        <p className="farbe-gedaempft ohne-luft-unten">Keine Templates vorhanden.</p>
      )}

      <DBStack direction="column" gap="x-small">
        {sortedTemplates.map(template => {
          const edit = edits[template._id] ?? toEditState(template, abschnitte);
          const expanded = expandedId === template._id;
          const changed = hasChanges(template._id);
          const isSaving = savingId === template._id;
          const templateContent = edit.templateContent;

          return (
            <div key={template._id} className={`vorlagen-karte ${changed ? 'vorlagen-karte--geaendert' : ''}`}>
              <DBButton
                type="button"
                className="vorlagen-karte__kopf"
                variant="filled"
                width="full"
                onClick={() => setExpandedId(expanded ? null : template._id)}
              >
                <span>
                  <strong>{template.code}</strong> - {template.name}
                </span>
                <DBTag semantic={template.active ? 'successful' : 'neutral'} emphasis="strong">
                  {template.active ? 'aktiv' : 'inaktiv'}
                </DBTag>
              </DBButton>

              {expanded && (
                <div className="vorlagen-karte__inhalt">
                  <div className="raster luft-unten-xs abstand-2">
                    <div className="sp-md-4">
                      <DbFeld
                        beschriftung="Code"
                        beschriftungZeigen
                        dicht
                        value={edit.code}
                        onChange={e => updateEdit(template._id, { code: (e.target as HTMLInputElement).value })}
                      />
                    </div>
                    <div className="sp-md-8">
                      <DbFeld
                        beschriftung="Name"
                        beschriftungZeigen
                        dicht
                        value={edit.name}
                        onChange={e => updateEdit(template._id, { name: (e.target as HTMLInputElement).value })}
                      />
                    </div>
                  </div>

                  <div className="luft-unten-xs">
                    <DbFeld
                      beschriftung="Beschreibung"
                      beschriftungZeigen
                      dicht
                      value={edit.description}
                      onChange={e => updateEdit(template._id, { description: (e.target as HTMLInputElement).value })}
                    />
                  </div>

                  <div className="luft-unten-xs">
                    <AdminProfileTemplateContentEditor
                      templateId={template._id}
                      templateContent={templateContent}
                      isSaving={isSaving}
                      abschnitte={abschnitte}
                      zusatzPersFelder={zusatzPersFelder}
                      onUpdatePersField={(key, value) => updatePersField(template._id, key, value)}
                      onUpdateArbeitszeit={value => updateArbeitszeit(template._id, value)}
                      onEnableArbeitszeit={() => enableArbeitszeit(template._id)}
                      onUpdateAbschnitt={(abschnittId, value) => updateAbschnitt(template._id, abschnittId, value)}
                      onToggleAktivierterTab={key => toggleAktivierterTab(template._id, key)}
                    />
                  </div>

                  <DBStack direction="row" wrap gap="x-small" className="luft-oben-xs">
                    <DBButton
                      type="button"
                      variant="brand"
                      size="small"
                      onClick={() => handleSave(template)}
                      disabled={!changed || isSaving}
                    >
                      {isSaving ? 'Speichert...' : 'Speichern'}
                    </DBButton>
                    <DBButton
                      type="button"
                      variant="outlined"
                      size="small"
                      onClick={() => handleCopy(template)}
                      disabled={isSaving}
                    >
                      Kopieren
                    </DBButton>
                    <DBButton
                      type="button"
                      variant="outlined"
                      size="small"
                      onClick={() => handleAdoptTemplateContent(template)}
                      disabled={isSaving}
                    >
                      Inhalt uebernehmen
                    </DBButton>
                    <DBButton
                      type="button"
                      variant="outlined"
                      data-color={template.active ? 'warning' : 'successful'}
                      size="small"
                      onClick={() => handleToggleActive(template)}
                      disabled={isSaving}
                    >
                      {template.active ? 'Deaktivieren' : 'Aktivieren'}
                    </DBButton>
                    <DBButton
                      type="button"
                      variant="outlined"
                      data-color="critical"
                      size="small"
                      onClick={() => handleDelete(template)}
                      disabled={isSaving}
                    >
                      Löschen
                    </DBButton>
                  </DBStack>
                </div>
              )}
            </div>
          );
        })}
      </DBStack>
    </div>
  );
}
