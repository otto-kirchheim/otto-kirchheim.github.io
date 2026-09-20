import { describe, expect, it, mock } from 'bun:test';
import { klickeCheckbox, render } from '@test/reactRender';

import '@/app/features';
import { AdminProfileTemplateContentEditor } from '@/features/Admin/components/AdminProfileTemplateContentEditor';
import type { TemplateContentDraft } from '@/features/Admin/components/profileTemplates.shared';

function leererInhalt(): TemplateContentDraft {
  return {
    Pers: {},
    Arbeitszeit: null,
    Fahrzeit: [],
    VorgabenB: [],
    Einstellungen: { aktivierteTabs: [], benoetigteZulagen: [] },
  };
}

function zeichne(overrides: Partial<Parameters<typeof AdminProfileTemplateContentEditor>[0]> = {}) {
  const spies = {
    onUpdatePersField: mock(() => {}),
    onUpdateArbeitszeit: mock(() => {}),
    onEnableArbeitszeit: mock(() => {}),
    onAddFahrzeitRow: mock(() => {}),
    onUpdateFahrzeitRow: mock(() => {}),
    onRemoveFahrzeitRow: mock(() => {}),
    onAddVorgabenBRow: mock(() => {}),
    onSelectVorgabenBRow: mock(() => {}),
    onMoveVorgabenBRow: mock(() => {}),
    onSetVorgabenBStandard: mock(() => {}),
    onRemoveVorgabenBRow: mock(() => {}),
    onUpdateVorgabenBRow: mock(() => {}),
    onToggleAktivierterTab: mock(() => {}),
    onToggleZulage: mock(() => {}),
  };
  const container = document.createElement('div');
  document.body.append(container);
  render(
    <AdminProfileTemplateContentEditor
      templateId="t1"
      templateContent={leererInhalt()}
      isSaving={false}
      activeVorgabenBIndex={0}
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

  it('meldet das Umschalten einer Zulage', () => {
    const { container, spies } = zeichne();
    klickeCheckbox(abschnittsSchalter(container, 'Einstellungen'), true);

    // Die ersten vier Checkboxen sind die sichtbaren Bereiche (`tabOptions()`), danach die Zulagen.
    const alle = container.querySelectorAll<HTMLInputElement>('.db-checkbox input[type="checkbox"]');
    klickeCheckbox(alle[4], true);

    expect(spies.onToggleZulage).toHaveBeenCalled();
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
