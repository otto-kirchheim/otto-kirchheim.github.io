import { describe, expect, it, mock } from 'bun:test';
import { klickeCheckbox, render } from '@test/reactRender';

import '@/app/features';
import { AdminProfileTemplateContentEditor } from '@/pages/admin/ui/AdminProfileTemplateContentEditor';
import { normalizeTemplateContent } from '@/pages/admin/ui/adminProfileTemplatesManagerGemeinsam';
import { vorlagenAbschnitte, vorlagenPersFelder } from '@/pages/admin/adminFeatures';
import berAdmin from '@/pages/admin/features/ber';
import eaAdmin from '@/pages/admin/features/ea';
import ewtAdmin from '@/pages/admin/features/ewt';
import ezAdmin from '@/pages/admin/features/ez';

/** Abschnitte aller vier Admin-Anteile (wie `useAdminFeatures` sie im Manager liefert). */
const ADMIN_FEATURES = [berAdmin, ewtAdmin, ezAdmin, eaAdmin];
const ABSCHNITTE = vorlagenAbschnitte(ADMIN_FEATURES);

function zeichne(overrides: Partial<Parameters<typeof AdminProfileTemplateContentEditor>[0]> = {}) {
  const spies = {
    onUpdatePersField: mock(() => {}),
    onUpdateArbeitszeit: mock(() => {}),
    onEnableArbeitszeit: mock(() => {}),
    onUpdateAbschnitt: mock(() => {}),
    onToggleAktivierterTab: mock(() => {}),
  };
  const container = document.createElement('div');
  document.body.append(container);
  render(
    <AdminProfileTemplateContentEditor
      templateId="t1"
      templateContent={normalizeTemplateContent({}, ABSCHNITTE)}
      isSaving={false}
      abschnitte={ABSCHNITTE}
      zusatzPersFelder={vorlagenPersFelder(ADMIN_FEATURES)}
      {...spies}
      {...overrides}
    />,
    container,
  );
  return { container, spies };
}

/** Die Abschnittsschalter sind interaktive DB-Tags: eine Checkbox im `<label>` der `.db-tag`. */
function abschnittsSchalter(container: Element, label: string): HTMLInputElement {
  const treffer = [...container.querySelectorAll('.db-tag label')].find(l => l.textContent?.trim() === label);
  if (!treffer) throw new Error(`Abschnittsschalter "${label}" nicht gefunden`);
  return treffer.querySelector('input[type="checkbox"]') as HTMLInputElement;
}

describe('AdminProfileTemplateContentEditor', () => {
  it('zeigt anfangs den Pers-Abschnitt und schaltet ihn per Klick zu', () => {
    const { container } = zeichne();

    expect(abschnittsSchalter(container, 'Pers').checked).toBe(true);
    expect(container.textContent).toContain('Personalnummer');

    klickeCheckbox(abschnittsSchalter(container, 'Pers'), false);

    expect(abschnittsSchalter(container, 'Pers').checked).toBe(false);
    expect(container.textContent).not.toContain('Personalnummer');
  });

  it('wechselt den Abschnitt, statt zwei gleichzeitig zu oeffnen', () => {
    const { container } = zeichne();

    klickeCheckbox(abschnittsSchalter(container, 'Fahrzeit'), true);

    expect(abschnittsSchalter(container, 'Fahrzeit').checked).toBe(true);
    expect(abschnittsSchalter(container, 'Pers').checked).toBe(false);
    expect(container.textContent).toContain('Fahrzeit-Einträge');
  });

  it('meldet das Umschalten eines sichtbaren Bereichs', () => {
    const { container, spies } = zeichne();
    klickeCheckbox(abschnittsSchalter(container, 'Einstellungen'), true);

    const ewt = [...container.querySelectorAll('.db-checkbox label')].find(l => l.textContent?.trim() === 'EWT');
    klickeCheckbox(ewt?.querySelector('input') as HTMLInputElement, true);

    expect(spies.onToggleAktivierterTab).toHaveBeenCalledWith('ewt');
  });

  it('meldet das Umschalten einer Zulage ueber den Abschnitt der Erschwerniszulagen', () => {
    const { container, spies } = zeichne();
    klickeCheckbox(abschnittsSchalter(container, 'Zulagen'), true);

    const erste = container.querySelector<HTMLInputElement>('.db-checkbox input[type="checkbox"]');
    klickeCheckbox(erste as HTMLInputElement, true);

    expect(spies.onUpdateAbschnitt).toHaveBeenCalledWith('Zulagen', [expect.any(String)]);
  });

  it('zeigt die Abschnitte der Features zwischen Arbeitszeit und Einstellungen, in Feature-Reihenfolge', () => {
    const { container } = zeichne();
    const labels = [...container.querySelectorAll('.db-tag label')].map(l => l.textContent?.trim());

    expect(labels).toEqual(['Pers', 'Arbeitszeit', 'VorgabenB', 'Fahrzeit', 'Zulagen', 'Einstellungen']);
  });

  it('ohne Admin-Anteile nur die globalen Abschnitte, ohne EA-Felder in Pers', () => {
    const { container } = zeichne({
      abschnitte: [],
      zusatzPersFelder: [],
      templateContent: normalizeTemplateContent({}),
    });
    const labels = [...container.querySelectorAll('.db-tag label')].map(l => l.textContent?.trim());

    expect(labels).toEqual(['Pers', 'Arbeitszeit', 'Einstellungen']);
    expect(container.textContent).not.toContain('Entgeltgruppe');
  });

  it('zeigt die Pers-Felder des Entgeltausgleichs aus dessen Admin-Anteil', () => {
    const { container } = zeichne();
    expect(container.textContent).toContain('Entgeltgruppe (Entgeltausgleich)');
  });

  it('sperrt die Aktionsknoepfe waehrend des Speicherns', () => {
    const { container } = zeichne({ isSaving: true });
    klickeCheckbox(abschnittsSchalter(container, 'Fahrzeit'), true);

    const knopf = [...container.querySelectorAll('button')].find(b => b.textContent?.includes('Zeile hinzufügen'));
    expect(knopf?.disabled).toBe(true);
  });

  it('gibt jedem Knopf einen expliziten type -- sonst schickt er im Formular ab', () => {
    const { container } = zeichne();
    klickeCheckbox(abschnittsSchalter(container, 'Fahrzeit'), true);

    const knoepfe = [...container.querySelectorAll('button')];
    expect(knoepfe.length).toBeGreaterThan(0);
    for (const knopf of knoepfe) expect(knopf.getAttribute('type')).toBe('button');
  });
});
