import { useMemo, useState } from 'preact/hooks';
import { ZULAGEN_CATALOG } from '../../Einstellungen/utils/zulagenCatalog';
import {
  ARBEITSZEIT_FIELDS,
  PERS_FIELDS,
  TAB_OPTIONS,
  WEEKDAY_OPTIONS,
  type FahrzeitRow,
  type TemplateContentDraft,
  type VorgabenBRow,
} from './profileTemplates.shared';

type SectionKey = 'Pers' | 'Arbeitszeit' | 'Fahrzeit' | 'VorgabenB' | 'Einstellungen';

type Props = {
  templateId: string;
  templateContent: TemplateContentDraft;
  isSaving: boolean;
  activeVorgabenBIndex: number;
  onUpdatePersField: (key: string, value: string) => void;
  onUpdateArbeitszeitField: (key: string, value: string) => void;
  onAddFahrzeitRow: () => void;
  onUpdateFahrzeitRow: (index: number, field: keyof FahrzeitRow, value: string) => void;
  onRemoveFahrzeitRow: (index: number) => void;
  onAddVorgabenBRow: () => void;
  onSelectVorgabenBRow: (index: number) => void;
  onMoveVorgabenBRow: (index: number, direction: 'up' | 'down') => void;
  onSetVorgabenBStandard: (index: number) => void;
  onRemoveVorgabenBRow: (index: number) => void;
  onUpdateVorgabenBRow: (index: number, updater: (row: VorgabenBRow) => VorgabenBRow) => void;
  onToggleAktivierterTab: (key: string) => void;
  onToggleZulage: (code: string) => void;
};

export function AdminProfileTemplateContentEditor({
  templateId,
  templateContent,
  isSaving,
  activeVorgabenBIndex,
  onUpdatePersField,
  onUpdateArbeitszeitField,
  onAddFahrzeitRow,
  onUpdateFahrzeitRow,
  onRemoveFahrzeitRow,
  onAddVorgabenBRow,
  onSelectVorgabenBRow,
  onMoveVorgabenBRow,
  onSetVorgabenBStandard,
  onRemoveVorgabenBRow,
  onUpdateVorgabenBRow,
  onToggleAktivierterTab,
  onToggleZulage,
}: Props) {
  const [activeSection, setActiveSection] = useState<SectionKey | null>('Pers');

  const badgeState = useMemo(
    () => ({
      Pers: Object.keys(templateContent.Pers).length > 0,
      Arbeitszeit: Object.keys(templateContent.Arbeitszeit).length > 0,
      Fahrzeit: templateContent.Fahrzeit.length > 0,
      VorgabenB: templateContent.VorgabenB.length > 0,
      Einstellungen:
        templateContent.Einstellungen.aktivierteTabs.length > 0 ||
        templateContent.Einstellungen.benoetigteZulagen.length > 0,
    }),
    [templateContent],
  );

  const sectionButton = (key: SectionKey, label: string) => {
    const active = activeSection === key;
    const hasData = badgeState[key];

    return (
      <button
        type="button"
        class={`badge border ${active ? 'text-bg-dark border-dark' : hasData ? 'text-bg-primary border-primary' : 'text-bg-secondary border-secondary'}`}
        onClick={() => setActiveSection(current => (current === key ? null : key))}
        style="cursor: pointer"
      >
        {label}
      </button>
    );
  };

  return (
    <div>
      <label class="form-label small fw-semibold mb-1">Template-Inhalt</label>
      <div class="d-flex flex-wrap gap-2 mb-2">
        {sectionButton('Pers', 'Pers')}
        {sectionButton('Arbeitszeit', 'Arbeitszeit')}
        {sectionButton('Fahrzeit', 'Fahrzeit')}
        {sectionButton('VorgabenB', 'VorgabenB')}
        {sectionButton('Einstellungen', 'Einstellungen')}
      </div>

      {activeSection === 'Pers' && (
        <div class="border rounded p-2 mb-2">
          <div class="row g-2">
            {PERS_FIELDS.map(field => (
              <div class="col-12 col-md-6" key={`${templateId}-pers-${field.key}`}>
                <label class="form-label small mb-1">{field.label}</label>
                {field.type === 'select' && field.options ? (
                  <select
                    class="form-select form-select-sm"
                    value={templateContent.Pers[field.key] ?? ''}
                    onInput={e => onUpdatePersField(field.key, (e.target as HTMLSelectElement).value)}
                  >
                    {field.options.map(option => (
                      <option value={option.value} key={`${templateId}-pers-${field.key}-${option.value || 'empty'}`}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type ?? 'text'}
                    class="form-control form-control-sm"
                    value={templateContent.Pers[field.key] ?? ''}
                    onInput={e => onUpdatePersField(field.key, (e.target as HTMLInputElement).value)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'Arbeitszeit' && (
        <div class="border rounded p-2 mb-2">
          <div class="row g-2">
            {ARBEITSZEIT_FIELDS.map(field => (
              <div class="col-12 col-md-6 col-xl-4" key={`${templateId}-az-${field.key}`}>
                <label class="form-label small mb-1">{field.label}</label>
                <input
                  class="form-control form-control-sm"
                  value={templateContent.Arbeitszeit[field.key] ?? ''}
                  onInput={e => onUpdateArbeitszeitField(field.key, (e.target as HTMLInputElement).value)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'Fahrzeit' && (
        <div class="border rounded p-2 mb-2">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <label class="form-label small fw-semibold mb-0">Fahrzeit-Einträge</label>
            <button
              class="btn btn-sm btn-outline-secondary"
              onClick={onAddFahrzeitRow}
              disabled={isSaving}
              data-disabler
            >
              Zeile hinzufügen
            </button>
          </div>
          <div class="d-flex flex-column gap-2">
            {templateContent.Fahrzeit.length === 0 && (
              <small class="text-body-secondary">Keine Fahrzeit-Einträge vorhanden.</small>
            )}
            {templateContent.Fahrzeit.map((row, index) => (
              <div class="row g-2 align-items-end" key={`${templateId}-fz-${index}`}>
                <div class="col-12">
                  <div class="input-group input-group-sm admin-fahrzeit-input-group">
                    <input
                      class="form-control admin-fahrzeit-key"
                      placeholder="Key"
                      aria-label="Key"
                      value={row.key}
                      onInput={e => onUpdateFahrzeitRow(index, 'key', (e.target as HTMLInputElement).value)}
                    />

                    <input
                      class="form-control admin-fahrzeit-text"
                      placeholder="Beschreibung"
                      aria-label="Beschreibung"
                      value={row.text}
                      onInput={e => onUpdateFahrzeitRow(index, 'text', (e.target as HTMLInputElement).value)}
                    />

                    <input
                      class="form-control admin-fahrzeit-value"
                      placeholder="Wert"
                      aria-label="Wert"
                      value={row.value}
                      onInput={e => onUpdateFahrzeitRow(index, 'value', (e.target as HTMLInputElement).value)}
                    />

                    <button
                      class="btn btn-outline-danger"
                      onClick={() => onRemoveFahrzeitRow(index)}
                      disabled={isSaving}
                      data-disabler
                    >
                      <span class="d-none d-sm-inline">Löschen</span>
                      <span class="d-sm-none">X</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'VorgabenB' && (
        <div class="border rounded p-2 mb-2">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <label class="form-label small fw-semibold mb-0">Bereitschaftszeitraum-Vorgaben</label>
            <button
              class="btn btn-sm btn-outline-secondary"
              onClick={onAddVorgabenBRow}
              disabled={isSaving}
              data-disabler
            >
              Vorgabe hinzufügen
            </button>
          </div>

          {templateContent.VorgabenB.length === 0 && (
            <small class="text-body-secondary">Keine VorgabenB-Einträge vorhanden.</small>
          )}

          {templateContent.VorgabenB.length > 0 &&
            (() => {
              const maxIndex = templateContent.VorgabenB.length - 1;
              const currentIndex = Math.min(Math.max(activeVorgabenBIndex ?? 0, 0), maxIndex);
              const row = templateContent.VorgabenB[currentIndex];

              return (
                <div class="d-flex flex-column gap-2">
                  <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                    <div class="btn-group btn-group-sm" role="group" aria-label="VorgabenB Navigation">
                      <button
                        class="btn btn-outline-secondary"
                        onClick={() => onSelectVorgabenBRow(currentIndex - 1)}
                        disabled={isSaving || currentIndex <= 0}
                      >
                        Zurück
                      </button>
                      <button
                        class="btn btn-outline-secondary"
                        onClick={() => onSelectVorgabenBRow(currentIndex + 1)}
                        disabled={isSaving || currentIndex >= maxIndex}
                      >
                        Weiter
                      </button>
                    </div>
                    <small class="text-body-secondary">
                      Vorgabe {currentIndex + 1} von {templateContent.VorgabenB.length}
                    </small>
                  </div>

                  <div class="input-group input-group-sm">
                    <span class="input-group-text">Auswahl</span>
                    <select
                      class="form-select"
                      value={currentIndex}
                      onInput={e => onSelectVorgabenBRow(Number((e.target as HTMLSelectElement).value))}
                    >
                      {templateContent.VorgabenB.map((item, index) => (
                        <option key={`${templateId}-vb-select-${index}`} value={index}>
                          #{index + 1}
                          {item.value.Name ? ` - ${item.value.Name}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div class="border rounded p-2" key={`${templateId}-vb-${currentIndex}`}>
                    <div class="d-flex justify-content-between align-items-center mb-2">
                      <strong class="small d-flex align-items-center gap-2">
                        <span class="badge text-bg-secondary">#{currentIndex + 1}</span>
                        {row.value.Name ? ` - ${row.value.Name}` : ''}
                        {row.value.standard && <span class="badge text-bg-success">Standard</span>}
                      </strong>
                      <div class="d-flex gap-1">
                        <button
                          class="btn btn-sm btn-outline-secondary"
                          onClick={() => onMoveVorgabenBRow(currentIndex, 'up')}
                          disabled={isSaving || currentIndex === 0}
                          title="Nach oben"
                        >
                          ↑
                        </button>
                        <button
                          class="btn btn-sm btn-outline-secondary"
                          onClick={() => onMoveVorgabenBRow(currentIndex, 'down')}
                          disabled={isSaving || currentIndex === templateContent.VorgabenB.length - 1}
                          title="Nach unten"
                        >
                          ↓
                        </button>
                        {!row.value.standard && (
                          <button
                            class="btn btn-sm btn-outline-success"
                            onClick={() => onSetVorgabenBStandard(currentIndex)}
                            disabled={isSaving}
                          >
                            Als Standard
                          </button>
                        )}
                        <button
                          class="btn btn-sm btn-outline-danger"
                          onClick={() => onRemoveVorgabenBRow(currentIndex)}
                          disabled={isSaving}
                          data-disabler
                        >
                          Entfernen
                        </button>
                      </div>
                    </div>

                    <div class="row g-2 mb-2">
                      <div class="col-12">
                        <label class="form-label small mb-1">Bezeichnung</label>
                        <input
                          class="form-control form-control-sm"
                          value={row.value.Name}
                          onInput={e =>
                            onUpdateVorgabenBRow(currentIndex, current => ({
                              ...current,
                              value: { ...current.value, Name: (e.target as HTMLInputElement).value },
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div class="row g-2 mb-2">
                      <div class="col-12 col-lg-6">
                        <label class="form-label small mb-1">Beginn Bereitschaft</label>
                        <div class="input-group input-group-sm">
                          <span class="input-group-text">Tag</span>
                          <select
                            class="form-select"
                            value={row.value.beginnB.tag}
                            onInput={e =>
                              onUpdateVorgabenBRow(currentIndex, current => ({
                                ...current,
                                value: {
                                  ...current.value,
                                  beginnB: {
                                    ...current.value.beginnB,
                                    tag: Number((e.target as HTMLSelectElement).value),
                                  },
                                },
                              }))
                            }
                          >
                            {WEEKDAY_OPTIONS.map(option => (
                              <option value={option.value} key={`${templateId}-vb-bb-${option.value}`}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <span class="input-group-text">Zeit</span>
                          <input
                            type="time"
                            class="form-control"
                            value={row.value.beginnB.zeit}
                            onInput={e =>
                              onUpdateVorgabenBRow(currentIndex, current => ({
                                ...current,
                                value: {
                                  ...current.value,
                                  beginnB: {
                                    ...current.value.beginnB,
                                    zeit: (e.target as HTMLInputElement).value,
                                  },
                                },
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div class="col-12 col-lg-6">
                        <label class="form-label small mb-1">Ende Bereitschaft</label>
                        <div class="input-group input-group-sm">
                          <span class="input-group-text">Tag</span>
                          <select
                            class="form-select"
                            value={row.value.endeB.tag}
                            onInput={e =>
                              onUpdateVorgabenBRow(currentIndex, current => ({
                                ...current,
                                value: {
                                  ...current.value,
                                  endeB: {
                                    ...current.value.endeB,
                                    tag: Number((e.target as HTMLSelectElement).value),
                                  },
                                },
                              }))
                            }
                          >
                            {WEEKDAY_OPTIONS.map(option => (
                              <option value={option.value} key={`${templateId}-vb-eb-${option.value}`}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <span class="input-group-text">Zeit</span>
                          <input
                            type="time"
                            class="form-control"
                            value={row.value.endeB.zeit}
                            onInput={e =>
                              onUpdateVorgabenBRow(currentIndex, current => ({
                                ...current,
                                value: {
                                  ...current.value,
                                  endeB: {
                                    ...current.value.endeB,
                                    zeit: (e.target as HTMLInputElement).value,
                                  },
                                },
                              }))
                            }
                          />
                          <span class="input-group-text">
                            <input
                              class="form-check-input mt-0 me-1"
                              type="checkbox"
                              checked={row.value.endeB.Nwoche}
                              onInput={e =>
                                onUpdateVorgabenBRow(currentIndex, current => ({
                                  ...current,
                                  value: {
                                    ...current.value,
                                    endeB: {
                                      ...current.value.endeB,
                                      Nwoche: (e.target as HTMLInputElement).checked,
                                    },
                                  },
                                }))
                              }
                            />
                            in Folgewoche
                          </span>
                        </div>
                      </div>
                    </div>

                    <div class="row g-2 mb-2">
                      <div class="col-12 col-lg-6">
                        <label class="form-label small mb-1">Beginn Nachtschicht</label>
                        <div class="input-group input-group-sm">
                          <span class="input-group-text">Tag</span>
                          <select
                            class="form-select"
                            value={row.value.beginnN.tag}
                            onInput={e =>
                              onUpdateVorgabenBRow(currentIndex, current => ({
                                ...current,
                                value: {
                                  ...current.value,
                                  beginnN: {
                                    ...current.value.beginnN,
                                    tag: Number((e.target as HTMLSelectElement).value),
                                  },
                                },
                              }))
                            }
                          >
                            {WEEKDAY_OPTIONS.map(option => (
                              <option value={option.value} key={`${templateId}-vb-bn-${option.value}`}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <span class="input-group-text">Zeit</span>
                          <input
                            type="time"
                            class="form-control"
                            value={row.value.beginnN.zeit}
                            onInput={e =>
                              onUpdateVorgabenBRow(currentIndex, current => ({
                                ...current,
                                value: {
                                  ...current.value,
                                  beginnN: {
                                    ...current.value.beginnN,
                                    zeit: (e.target as HTMLInputElement).value,
                                  },
                                },
                              }))
                            }
                          />
                          <span class="input-group-text">
                            <input
                              class="form-check-input mt-0 me-1"
                              type="checkbox"
                              checked={row.value.beginnN.Nwoche}
                              onInput={e =>
                                onUpdateVorgabenBRow(currentIndex, current => ({
                                  ...current,
                                  value: {
                                    ...current.value,
                                    beginnN: {
                                      ...current.value.beginnN,
                                      Nwoche: (e.target as HTMLInputElement).checked,
                                    },
                                  },
                                }))
                              }
                            />
                            in Folgewoche
                          </span>
                        </div>
                      </div>

                      <div class="col-12 col-lg-6">
                        <label class="form-label small mb-1">Ende Nachtschicht</label>
                        <div class="input-group input-group-sm">
                          <span class="input-group-text">Tag</span>
                          <select
                            class="form-select"
                            value={row.value.endeN.tag}
                            onInput={e =>
                              onUpdateVorgabenBRow(currentIndex, current => ({
                                ...current,
                                value: {
                                  ...current.value,
                                  endeN: {
                                    ...current.value.endeN,
                                    tag: Number((e.target as HTMLSelectElement).value),
                                  },
                                },
                              }))
                            }
                          >
                            {WEEKDAY_OPTIONS.map(option => (
                              <option value={option.value} key={`${templateId}-vb-en-${option.value}`}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <span class="input-group-text">Zeit</span>
                          <input
                            type="time"
                            class="form-control"
                            value={row.value.endeN.zeit}
                            onInput={e =>
                              onUpdateVorgabenBRow(currentIndex, current => ({
                                ...current,
                                value: {
                                  ...current.value,
                                  endeN: {
                                    ...current.value.endeN,
                                    zeit: (e.target as HTMLInputElement).value,
                                  },
                                },
                              }))
                            }
                          />
                          <span class="input-group-text">
                            <input
                              class="form-check-input mt-0 me-1"
                              type="checkbox"
                              checked={row.value.endeN.Nwoche}
                              onInput={e =>
                                onUpdateVorgabenBRow(currentIndex, current => ({
                                  ...current,
                                  value: {
                                    ...current.value,
                                    endeN: {
                                      ...current.value.endeN,
                                      Nwoche: (e.target as HTMLInputElement).checked,
                                    },
                                  },
                                }))
                              }
                            />
                            in Folgewoche
                          </span>
                        </div>
                      </div>
                    </div>

                    <div class="d-flex flex-wrap gap-3">
                      <label class="form-check m-0">
                        <input
                          class="form-check-input me-1"
                          type="checkbox"
                          checked={row.value.nacht}
                          onInput={e =>
                            onUpdateVorgabenBRow(currentIndex, current => ({
                              ...current,
                              value: {
                                ...current.value,
                                nacht: (e.target as HTMLInputElement).checked,
                              },
                            }))
                          }
                        />
                        <span class="form-check-label">Nachtschicht aktiv</span>
                      </label>
                    </div>
                  </div>
                </div>
              );
            })()}
        </div>
      )}

      {activeSection === 'Einstellungen' && (
        <div class="border rounded p-2">
          <div class="mb-2">
            <label class="form-label small mb-1">Sichtbare Bereiche</label>
            <div class="d-flex flex-wrap gap-2">
              {TAB_OPTIONS.map(option => (
                <label class="form-check m-0" key={`${templateId}-tab-${option.key}`}>
                  <input
                    class="form-check-input me-1"
                    type="checkbox"
                    checked={templateContent.Einstellungen.aktivierteTabs.includes(option.key)}
                    onInput={() => onToggleAktivierterTab(option.key)}
                  />
                  <span class="form-check-label">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label class="form-label small mb-1">Benötigte Zulagen</label>
            <div class="d-flex flex-wrap gap-2">
              {ZULAGEN_CATALOG.map(zulage => (
                <label class="form-check m-0" key={`${templateId}-zulage-${zulage.code}`}>
                  <input
                    class="form-check-input me-1"
                    type="checkbox"
                    checked={templateContent.Einstellungen.benoetigteZulagen.includes(zulage.code)}
                    onInput={() => onToggleZulage(zulage.code)}
                  />
                  <span class="form-check-label">{zulage.code}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
