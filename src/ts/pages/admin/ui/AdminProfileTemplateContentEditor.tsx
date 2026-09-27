import { useMemo, useState } from 'react';

import { ArbeitszeiteingabePanel } from '@/shared/ui/arbeitszeit-editor/ArbeitszeiteingabePanel';
import { PERS_FIELDS, tabOptions, type TemplateContentDraft, type TemplateField } from './profileTemplates.shared';
import type { AdminVorlagenAbschnitt } from '../adminFeatures';
import { OeLevelBoxes } from './OeLevelBoxes';
import { DBButton, DBCheckbox, DBStack, DBTag } from '@db-ux/react-core-components';
import { DbAuswahl, DbFeld } from '@/shared/ui/form/DbFeld';

type Props = {
  templateId: string;
  templateContent: TemplateContentDraft;
  isSaving: boolean;
  /** Abschnitte der Features (`profilVorlage.abschnitte`), zwischen Arbeitszeit und Einstellungen angezeigt. */
  abschnitte: readonly AdminVorlagenAbschnitt<unknown>[];
  /** Zusaetzliche Pers-Felder der Features (`profilVorlage.persFelder`), nach den globalen. */
  zusatzPersFelder?: readonly TemplateField[];
  onUpdatePersField: (key: string, value: string) => void;
  onUpdateArbeitszeit: (value: NonNullable<TemplateContentDraft['Arbeitszeit']>) => void;
  onEnableArbeitszeit: () => void;
  onUpdateAbschnitt: (id: string, value: unknown) => void;
  onToggleAktivierterTab: (key: string) => void;
};

/**
 * Editor für den Inhalt eines Profil-Templates, gegliedert in aufklappbare Abschnitte: Pers und Arbeitszeit, dann die
 * Abschnitte der Features (z. B. VorgabenB, Fahrzeit, Zulagen), zuletzt Einstellungen (sichtbare Bereiche).
 *
 * @param props - Template-Entwurf (`templateContent`), `isSaving` sperrt Aktionen, `abschnitte` der Features; die `on*`-Callbacks melden jede Änderung an den Manager.
 */
export function AdminProfileTemplateContentEditor({
  templateId,
  templateContent,
  isSaving,
  abschnitte,
  zusatzPersFelder = [],
  onUpdatePersField,
  onUpdateArbeitszeit,
  onEnableArbeitszeit,
  onUpdateAbschnitt,
  onToggleAktivierterTab,
}: Props) {
  const [activeSection, setActiveSection] = useState<string | null>('Pers');
  const persFelder = useMemo(() => [...PERS_FIELDS, ...zusatzPersFelder], [zusatzPersFelder]);

  const badgeState = useMemo(
    (): Record<string, boolean> => ({
      Pers: Object.keys(templateContent.Pers).length > 0,
      Arbeitszeit: templateContent.Arbeitszeit !== null,
      ...Object.fromEntries(
        abschnitte.map(abschnitt => [
          abschnitt.id,
          abschnitt.id in templateContent.abschnitte && abschnitt.hatDaten(templateContent.abschnitte[abschnitt.id]),
        ]),
      ),
      Einstellungen: templateContent.Einstellungen.aktivierteTabs.length > 0,
    }),
    [templateContent, abschnitte],
  );

  // `DBTag` rendert immer ein `<div>` und kann selbst kein Button sein -- das Kontrollelement kommt als Kind hinein.
  // Checkbox statt Radio, weil ein erneuter Klick den Abschnitt wieder zuklappt; `role="tablist"` waere falsch,
  // dort ist immer genau ein Eintrag gewaehlt.
  /**
   * Erzeugt den Umschalter für einen Abschnitt; erneutes Anklicken klappt ihn zu.
   *
   * @param key - Abschnitt, den der Tag steuert.
   * @param label - Beschriftung.
   * @returns Tag mit Checkbox; hervorgehoben, wenn aktiv oder der Abschnitt Daten enthält.
   */
  const sectionButton = (key: string, label: string) => {
    const active = activeSection === key;
    const hasData = badgeState[key];

    return (
      <DBTag key={key} semantic={active || hasData ? 'informational' : 'neutral'} emphasis={active ? 'strong' : 'weak'}>
        <label>
          <input
            type="checkbox"
            checked={active}
            onChange={() => setActiveSection(current => (current === key ? null : key))}
          />
          {label}
        </label>
      </DBTag>
    );
  };

  const offenerAbschnitt = abschnitte.find(abschnitt => abschnitt.id === activeSection);

  return (
    <div>
      <label className="small fw-semibold mb-1">Template-Inhalt</label>
      <DBStack direction="row" wrap gap="x-small" className="mb-2">
        {sectionButton('Pers', 'Pers')}
        {sectionButton('Arbeitszeit', 'Arbeitszeit')}
        {abschnitte.map(abschnitt => sectionButton(abschnitt.id, abschnitt.label))}
        {sectionButton('Einstellungen', 'Einstellungen')}
      </DBStack>

      {activeSection === 'Pers' && (
        <div className="border p-2 mb-2">
          <div className="raster abstand-2">
            {persFelder.map(field => (
              <div className="sp-md-6" key={`${templateId}-pers-${field.key}`}>
                {field.key === 'OE' ? (
                  <>
                    <span className="small">{field.label}</span>
                    <OeLevelBoxes
                      value={templateContent.Pers[field.key] ?? ''}
                      onChange={value => onUpdatePersField(field.key, value)}
                    />
                  </>
                ) : field.type === 'select' && field.options ? (
                  <DbAuswahl
                    beschriftung={field.label}
                    beschriftungZeigen
                    dicht
                    value={templateContent.Pers[field.key] ?? ''}
                    onChange={e => onUpdatePersField(field.key, e.target.value)}
                  >
                    {field.options.map(option => (
                      <option value={option.value} key={`${templateId}-pers-${field.key}-${option.value || 'empty'}`}>
                        {option.label}
                      </option>
                    ))}
                  </DbAuswahl>
                ) : (
                  <DbFeld
                    beschriftung={field.label}
                    beschriftungZeigen
                    dicht
                    type={field.type ?? 'text'}
                    value={templateContent.Pers[field.key] ?? ''}
                    onChange={e => onUpdatePersField(field.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'Arbeitszeit' && (
        <div className="border p-2 mb-2">
          {templateContent.Arbeitszeit ? (
            <ArbeitszeiteingabePanel
              key={`${templateId}-arbeitszeit`}
              initialValues={templateContent.Arbeitszeit}
              onChange={onUpdateArbeitszeit}
            />
          ) : (
            <DBStack direction="row" wrap alignment="center" justifyContent="space-between" gap="none">
              <small className="text-body-secondary">Keine Arbeitszeit hinterlegt.</small>
              <DBButton type="button" variant="outlined" size="small" onClick={onEnableArbeitszeit} disabled={isSaving}>
                Arbeitszeit aktivieren
              </DBButton>
            </DBStack>
          )}
        </div>
      )}

      {offenerAbschnitt && offenerAbschnitt.id in templateContent.abschnitte && (
        <offenerAbschnitt.Editor
          key={`${templateId}-${offenerAbschnitt.id}`}
          templateId={templateId}
          value={templateContent.abschnitte[offenerAbschnitt.id]}
          onChange={value => onUpdateAbschnitt(offenerAbschnitt.id, value)}
          disabled={isSaving}
        />
      )}

      {activeSection === 'Einstellungen' && (
        <div className="border p-2">
          <div>
            <label className="small mb-1">Sichtbare Bereiche</label>
            <DBStack direction="row" wrap gap="x-small">
              {tabOptions().map(option => (
                <DBCheckbox
                  className="m-0"
                  size="small"
                  key={`${templateId}-tab-${option.key}`}
                  label={option.label}
                  checked={templateContent.Einstellungen.aktivierteTabs.includes(option.key)}
                  onChange={() => onToggleAktivierterTab(option.key)}
                />
              ))}
            </DBStack>
          </div>
        </div>
      )}
    </div>
  );
}
