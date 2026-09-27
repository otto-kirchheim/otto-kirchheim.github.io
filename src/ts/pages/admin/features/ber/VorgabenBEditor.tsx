import { useState } from 'react';
import { DBButton, DBCheckbox, DBStack, DBTag } from '@db-ux/react-core-components';

import type { BereitschaftSchichtTyp } from '@/types';
import { DbAuswahl, DbFeld } from '@/shared/ui/form/DbFeld';
import type { AdminVorlagenEditorProps } from '../../adminFeatures';
import { normalizeVorgabenBRows, type VorgabenBRow } from './vorgabenB';
import { VorgabenBWeekRangeEditor } from './VorgabenBWeekRangeEditor';

const SCHICHT_OPTIONEN: { typ: BereitschaftSchichtTyp; label: string }[] = [
  { typ: 'frueh', label: 'Früh' },
  { typ: 'spaet', label: 'Spät' },
  { typ: 'nacht', label: 'Nacht' },
  { typ: 'sonder', label: 'Sonder' },
];

/** Leerer Eintrag (nur Frühschicht) fuer „Vorgabe hinzufügen“. */
const LEERE_VORGABE: VorgabenBRow = {
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

/**
 * Editor der Bereitschaftszeitraum-Vorgaben: ein Eintrag zur Zeit (Navigation/Auswahl), Standard, Verschieben, Entfernen.
 *
 * @param props - Entwurf (`value`), `onChange` fuer jede Aenderung, `disabled` waehrend des Speicherns.
 */
export default function VorgabenBEditor({
  templateId,
  value: rows,
  onChange,
  disabled,
}: AdminVorlagenEditorProps<VorgabenBRow[]>) {
  const [aktiv, setAktiv] = useState(0);

  /** Haengt einen leeren Eintrag an und waehlt ihn aus. */
  const hinzufuegen = () => {
    const next = normalizeVorgabenBRows([...rows, structuredClone(LEERE_VORGABE)]);
    onChange(next);
    setAktiv(Math.max(0, next.length - 1));
  };

  /**
   * Waehlt den angezeigten Eintrag.
   *
   * @param index - Gewuenschter Index (negative Werte werden 0).
   */
  const waehle = (index: number) => setAktiv(Math.max(0, index));

  /**
   * Aendert einen Eintrag per Updater; ein ungueltiger Index wird ignoriert.
   *
   * @param index - Index des Eintrags.
   * @param updater - Liefert aus dem bisherigen Eintrag den neuen.
   */
  const aendere = (index: number, updater: (row: VorgabenBRow) => VorgabenBRow) => {
    const current = rows[index];
    if (!current) return;
    const next = [...rows];
    next[index] = updater(current);
    onChange(next);
  };

  /**
   * Entfernt einen Eintrag und haelt die Auswahl im gueltigen Bereich.
   *
   * @param index - Index des Eintrags.
   */
  const entferne = (index: number) => {
    const next = normalizeVorgabenBRows(rows.filter((_, i) => i !== index));
    onChange(next);
    setAktiv(current =>
      next.length === 0 ? 0 : Math.max(0, Math.min(current >= index ? current - 1 : current, next.length - 1)),
    );
  };

  /**
   * Verschiebt einen Eintrag um eine Position; die Standard-Markierung bleibt am selben Eintrag, die Auswahl folgt ihm.
   *
   * @param index - Index des Eintrags.
   * @param direction - Richtung.
   */
  const verschiebe = (index: number, direction: 'up' | 'down') => {
    const next = [...rows];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= next.length) return;

    const oldStandardIndex = next.findIndex(row => row.value.standard);
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);

    let nextStandardIndex = oldStandardIndex;
    if (oldStandardIndex === index) nextStandardIndex = targetIndex;
    else if (direction === 'up' && oldStandardIndex >= targetIndex && oldStandardIndex < index)
      nextStandardIndex = oldStandardIndex + 1;
    else if (direction === 'down' && oldStandardIndex > index && oldStandardIndex <= targetIndex)
      nextStandardIndex = oldStandardIndex - 1;

    onChange(normalizeVorgabenBRows(next, nextStandardIndex));
    setAktiv(targetIndex);
  };

  /**
   * Markiert einen Eintrag als Standard (genau einer je Vorlage).
   *
   * @param index - Index des neuen Standards.
   */
  const alsStandard = (index: number) => onChange(normalizeVorgabenBRows([...rows], index));

  return (
    <div className="border p-2 mb-2">
      <DBStack direction="row" wrap alignment="center" justifyContent="space-between" gap="none" className="mb-2">
        <label className="small fw-semibold mb-0">Bereitschaftszeitraum-Vorgaben</label>
        <DBButton type="button" variant="outlined" size="small" onClick={hinzufuegen} disabled={disabled} data-disabler>
          Vorgabe hinzufügen
        </DBButton>
      </DBStack>

      {rows.length === 0 && <small className="text-body-secondary">Keine VorgabenB-Einträge vorhanden.</small>}

      {rows.length > 0 &&
        (() => {
          const maxIndex = rows.length - 1;
          const currentIndex = Math.min(Math.max(aktiv, 0), maxIndex);
          const row = rows[currentIndex];

          return (
            <DBStack direction="column" gap="x-small">
              <DBStack direction="row" wrap alignment="center" justifyContent="space-between" gap="x-small">
                <DBStack direction="row" wrap gap="2x-small" role="group" aria-label="VorgabenB Navigation">
                  <DBButton
                    type="button"
                    variant="outlined"
                    onClick={() => waehle(currentIndex - 1)}
                    disabled={disabled || currentIndex <= 0}
                  >
                    Zurück
                  </DBButton>
                  <DBButton
                    type="button"
                    variant="outlined"
                    onClick={() => waehle(currentIndex + 1)}
                    disabled={disabled || currentIndex >= maxIndex}
                  >
                    Weiter
                  </DBButton>
                </DBStack>
                <small className="text-body-secondary">
                  Vorgabe {currentIndex + 1} von {rows.length}
                </small>
              </DBStack>

              <DbAuswahl
                beschriftung="Auswahl"
                beschriftungZeigen
                dicht
                value={currentIndex}
                onChange={e => waehle(Number(e.target.value))}
              >
                {rows.map((item, index) => (
                  <option key={`${templateId}-vb-select-${index}`} value={index}>
                    #{index + 1}
                    {item.value.Name ? ` - ${item.value.Name}` : ''}
                  </option>
                ))}
              </DbAuswahl>

              <div className="border p-2" key={`${templateId}-vb-${currentIndex}`}>
                <DBStack
                  direction="row"
                  wrap
                  alignment="center"
                  justifyContent="space-between"
                  gap="none"
                  className="mb-2"
                >
                  <strong className="small d-flex align-items-center gap-2">
                    <DBTag semantic="neutral" emphasis="strong">
                      #{currentIndex + 1}
                    </DBTag>
                    {row.value.Name ? ` - ${row.value.Name}` : ''}
                    {row.value.standard && (
                      <DBTag semantic="successful" emphasis="strong">
                        Standard
                      </DBTag>
                    )}
                  </strong>
                  <DBStack direction="row" gap="2x-small">
                    <DBButton
                      type="button"
                      variant="outlined"
                      size="small"
                      onClick={() => verschiebe(currentIndex, 'up')}
                      disabled={disabled || currentIndex === 0}
                      title="Nach oben"
                    >
                      ↑
                    </DBButton>
                    <DBButton
                      type="button"
                      variant="outlined"
                      size="small"
                      onClick={() => verschiebe(currentIndex, 'down')}
                      disabled={disabled || currentIndex === rows.length - 1}
                      title="Nach unten"
                    >
                      ↓
                    </DBButton>
                    {!row.value.standard && (
                      <DBButton
                        type="button"
                        variant="outlined"
                        data-color="successful"
                        size="small"
                        onClick={() => alsStandard(currentIndex)}
                        disabled={disabled}
                      >
                        Als Standard
                      </DBButton>
                    )}
                    <DBButton
                      type="button"
                      variant="outlined"
                      data-color="critical"
                      size="small"
                      onClick={() => entferne(currentIndex)}
                      disabled={disabled}
                      data-disabler
                    >
                      Entfernen
                    </DBButton>
                  </DBStack>
                </DBStack>

                <div className="raster mb-2 abstand-2">
                  <div>
                    <DbFeld
                      beschriftung="Bezeichnung"
                      beschriftungZeigen
                      dicht
                      value={row.value.Name}
                      onChange={e =>
                        aendere(currentIndex, current => ({
                          ...current,
                          value: { ...current.value, Name: (e.target as HTMLInputElement).value },
                        }))
                      }
                    />
                  </div>
                </div>

                <VorgabenBWeekRangeEditor
                  selectorKey={`${templateId}-vb-b-${currentIndex}`}
                  label="Bereitschaft"
                  start={row.value.beginnB}
                  end={row.value.endeB}
                  startHasNwoche={false}
                  disabled={disabled}
                  onStartChange={(tag, _Nwoche) =>
                    aendere(currentIndex, current => ({
                      ...current,
                      value: {
                        ...current.value,
                        beginnB: { ...current.value.beginnB, tag },
                      },
                    }))
                  }
                  onEndChange={(tag, Nwoche) =>
                    aendere(currentIndex, current => ({
                      ...current,
                      value: {
                        ...current.value,
                        endeB: { ...current.value.endeB, tag, Nwoche },
                      },
                    }))
                  }
                />

                <div className="raster mb-2 abstand-2">
                  <div className="sp-lg-6">
                    <DbFeld
                      beschriftung="Beginn Bereitschaft"
                      beschriftungZeigen
                      dicht
                      type="time"
                      value={row.value.beginnB.zeit}
                      onChange={e =>
                        aendere(currentIndex, current => ({
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
                  <div className="sp-lg-6">
                    <DbFeld
                      beschriftung="Ende Bereitschaft"
                      beschriftungZeigen
                      dicht
                      type="time"
                      value={row.value.endeB.zeit}
                      onChange={e =>
                        aendere(currentIndex, current => ({
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
                  </div>
                </div>

                <div className="mb-2">
                  <label className="small mb-1">Aktive Schichten</label>
                  <DBStack direction="row" wrap gap="medium">
                    {SCHICHT_OPTIONEN.map(({ typ, label }) => (
                      <DBCheckbox
                        className="m-0"
                        size="small"
                        key={typ}
                        label={label}
                        checked={row.value.schichten.includes(typ)}
                        disabled={typ === 'frueh' || disabled}
                        onChange={e => {
                          const checked = (e.target as HTMLInputElement).checked;
                          aendere(currentIndex, current => {
                            const schichten = checked
                              ? [...current.value.schichten.filter(s => s !== typ), typ]
                              : current.value.schichten.filter(s => s !== typ);
                            const nacht = schichten.includes('nacht');
                            return {
                              ...current,
                              value: {
                                ...current.value,
                                schichten,
                                nacht,
                                ...(nacht
                                  ? {}
                                  : {
                                      beginnN: {
                                        ...current.value.beginnN,
                                        tag: current.value.beginnB.tag,
                                        zeit: current.value.beginnB.zeit,
                                        Nwoche: false,
                                      },
                                      endeN: {
                                        ...current.value.endeN,
                                        tag: current.value.endeB.tag,
                                        zeit: current.value.endeB.zeit,
                                        Nwoche: current.value.endeB.Nwoche,
                                      },
                                    }),
                              },
                            };
                          });
                        }}
                      />
                    ))}
                  </DBStack>
                </div>

                {row.value.schichten.includes('nacht') ? (
                  <>
                    <VorgabenBWeekRangeEditor
                      selectorKey={`${templateId}-vb-n-${currentIndex}`}
                      label="Nachtschicht"
                      start={row.value.beginnN}
                      end={row.value.endeN}
                      startHasNwoche={true}
                      disabled={disabled}
                      onStartChange={(tag, Nwoche) =>
                        aendere(currentIndex, current => ({
                          ...current,
                          value: {
                            ...current.value,
                            beginnN: { ...current.value.beginnN, tag, Nwoche },
                          },
                        }))
                      }
                      onEndChange={(tag, Nwoche) =>
                        aendere(currentIndex, current => ({
                          ...current,
                          value: {
                            ...current.value,
                            endeN: { ...current.value.endeN, tag, Nwoche },
                          },
                        }))
                      }
                    />

                    <div className="raster mb-2 abstand-2">
                      <div className="sp-lg-6">
                        <DbFeld
                          beschriftung="Beginn Nachtschicht"
                          beschriftungZeigen
                          dicht
                          type="time"
                          value={row.value.beginnN.zeit}
                          onChange={e =>
                            aendere(currentIndex, current => ({
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
                      </div>
                      <div className="sp-lg-6">
                        <DbFeld
                          beschriftung="Ende Nachtschicht"
                          beschriftungZeigen
                          dicht
                          type="time"
                          value={row.value.endeN.zeit}
                          onChange={e =>
                            aendere(currentIndex, current => ({
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
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="small text-body-secondary mb-2">Keine Nachtschicht aktiviert.</div>
                )}
              </div>
            </DBStack>
          );
        })()}
    </div>
  );
}
