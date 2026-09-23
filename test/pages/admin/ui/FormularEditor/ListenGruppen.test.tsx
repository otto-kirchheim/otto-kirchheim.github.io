import { describe, expect, it, mock } from 'bun:test';
import { klickeCheckbox, render, setzeWert } from '@test/reactRender';

import type { ListenGruppe, TabellenDef } from '@otto-kirchheim/nebengeld-shared';
import { ListenGruppen } from '@/pages/admin/ui/FormularEditor/ListenGruppen';

function baseTabelle(overrides: Partial<TabellenDef> = {}): TabellenDef {
  return { quelle: 'zeilen', hoehe: 16, spalten: [], ...overrides } as TabellenDef;
}

function renderGruppen(props: Partial<Parameters<typeof ListenGruppen>[0]> = {}): HTMLDivElement {
  const container = document.createElement('div');
  render(
    <ListenGruppen
      tabelle={props.tabelle ?? baseTabelle()}
      formular={props.formular ?? 'ez'}
      onChange={props.onChange ?? mock()}
      onVorlage={props.onVorlage ?? mock()}
    />,
    container,
  );
  return container;
}

/**
 * Der Loeschknopf ist ein `DBButton` mit `noText`; seine Bezeichnung steht seit J2 in einem
 * `DBTooltip`-Kind statt in `title` (DB-Vorgabe `db-ux/button-no-text-requires-tooltip`).
 */
function loeschKnoepfe(container: Element): HTMLButtonElement[] {
  return [...container.querySelectorAll<HTMLButtonElement>('button')].filter(b =>
    b.textContent?.includes('Gruppe löschen'),
  );
}

describe('ListenGruppen', () => {
  it('rendert nichts, wenn weder Gruppen noch Vorlagen existieren (nicht-EZ-Formular)', () => {
    const container = renderGruppen({ formular: 'ewt', tabelle: baseTabelle() });
    expect(container.innerHTML).toBe('');
  });

  it('zeigt Vorlagen-Buttons für EZ, wenn noch keine Gruppe existiert', () => {
    const container = renderGruppen({ formular: 'ez' });
    const buttons = Array.from(container.querySelectorAll('button')).filter(b => b.textContent?.startsWith('+'));
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('ruft onVorlage mit Name/Gruppe/Plätze auf, wenn eine Vorlage geklickt wird', () => {
    const onVorlage = mock();
    const container = renderGruppen({ formular: 'ez', onVorlage });

    const button = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('Erschwernis'));
    button?.click();

    expect(onVorlage).toHaveBeenCalledTimes(1);
    const [name, gruppe, plaetze] = onVorlage.mock.calls[0] as [string, ListenGruppe, number];
    expect(name).toBe('erschwernis');
    expect(typeof plaetze).toBe('number');
    expect(gruppe.quelle).toBeDefined();
  });

  it('blendet eine bereits angelegte Vorlage aus der Auswahl aus', () => {
    const tabelle = baseTabelle({
      listen: { erschwernis: { quelle: 'Zulagen', schluessel: 'Typ', wert: 'Wert', auswahl: ['A'] } },
    });
    const container = renderGruppen({ formular: 'ez', tabelle });

    const button = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('Erschwernis'));
    expect(button).toBeUndefined();
  });

  it('rendert eine bestehende Gruppe mit Schlüsselanzahl', () => {
    const tabelle = baseTabelle({
      listen: { erschwernis: { quelle: 'Zulagen', schluessel: 'Typ', wert: 'Wert', auswahl: ['A', 'B'] } },
    });
    const container = renderGruppen({ formular: 'ez', tabelle });

    expect(container.textContent).toContain('erschwernis');
    expect(container.textContent).toContain('2 mögliche Schlüssel');
  });

  it('löscht eine Gruppe und setzt listen auf undefined, wenn es die letzte war', () => {
    const onChange = mock();
    const tabelle = baseTabelle({
      listen: { erschwernis: { quelle: 'Zulagen', schluessel: 'Typ', wert: 'Wert' } },
    });
    const container = renderGruppen({ formular: 'ez', tabelle, onChange });

    loeschKnoepfe(container)[0]!.click();

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ listen: undefined }));
  });

  it('behält andere Gruppen, wenn nur eine von mehreren gelöscht wird', () => {
    const onChange = mock();
    const tabelle = baseTabelle({
      listen: {
        erschwernis: { quelle: 'Zulagen', schluessel: 'Typ', wert: 'Wert' },
        leistung: { quelle: 'Zulagen', schluessel: 'Typ', wert: 'Wert' },
      },
    });
    const container = renderGruppen({ formular: 'ez', tabelle, onChange });

    loeschKnoepfe(container)[0]!.click();

    const updated = onChange.mock.calls[0][0] as TabellenDef;
    expect(Object.keys(updated.listen ?? {})).toEqual(['leistung']);
  });

  it('aktualisiert schluessel/wert-Felder per Eingabe', () => {
    const onChange = mock();
    const tabelle = baseTabelle({
      listen: { erschwernis: { quelle: 'Zulagen', schluessel: 'Typ', wert: 'Wert' } },
    });
    const container = renderGruppen({ formular: 'ez', tabelle, onChange });

    const schluesselInput = container.querySelectorAll('input.font-monospace')[0] as HTMLInputElement;
    setzeWert(schluesselInput, 'NeuerSchluessel');

    const updated = onChange.mock.calls[0][0] as TabellenDef;
    expect(updated.listen?.erschwernis.schluessel).toBe('NeuerSchluessel');
  });

  it('trimmt und filtert die Auswahl-Liste bei Komma-Eingabe', () => {
    const onChange = mock();
    const tabelle = baseTabelle({
      listen: { erschwernis: { quelle: 'Zulagen', schluessel: 'Typ', wert: 'Wert' } },
    });
    const container = renderGruppen({ formular: 'ez', tabelle, onChange });

    const auswahlInput = container.querySelector(
      'input[placeholder="Schlüssel, durch Komma getrennt"]',
    ) as HTMLInputElement;
    setzeWert(auswahlInput, ' A , B ,, C ');

    const updated = onChange.mock.calls[0][0] as TabellenDef;
    expect(updated.listen?.erschwernis.auswahl).toEqual(['A', 'B', 'C']);
  });

  it('setzt auswahl auf undefined, wenn die Eingabe komplett leer wird', () => {
    const onChange = mock();
    const tabelle = baseTabelle({
      listen: { erschwernis: { quelle: 'Zulagen', schluessel: 'Typ', wert: 'Wert', auswahl: ['A'] } },
    });
    const container = renderGruppen({ formular: 'ez', tabelle, onChange });

    const auswahlInput = container.querySelector(
      'input[placeholder="Schlüssel, durch Komma getrennt"]',
    ) as HTMLInputElement;
    setzeWert(auswahlInput, '   ');

    const updated = onChange.mock.calls[0][0] as TabellenDef;
    expect(updated.listen?.erschwernis.auswahl).toBeUndefined();
  });

  it('zeigt die Kurztext-Checkbox nur für Gruppen mit bekannter Kategorie', () => {
    const tabelle = baseTabelle({
      listen: {
        erschwernis: { quelle: 'Zulagen', schluessel: 'Typ', wert: 'Wert' },
        unbekannt: { quelle: 'Zulagen', schluessel: 'Typ', wert: 'Wert' },
      },
    });
    const container = renderGruppen({ formular: 'ez', tabelle });

    expect(container.querySelectorAll('.db-checkbox input').length).toBe(1);
  });

  it('setzt beschriftungen (Kurztexte) beim Aktivieren der Checkbox', () => {
    const onChange = mock();
    const tabelle = baseTabelle({
      listen: { erschwernis: { quelle: 'Zulagen', schluessel: 'Typ', wert: 'Wert' } },
    });
    const container = renderGruppen({ formular: 'ez', tabelle, onChange });

    const checkbox = container.querySelector('.db-checkbox input') as HTMLInputElement;
    klickeCheckbox(checkbox, true);

    const updated = onChange.mock.calls[0][0] as TabellenDef;
    expect(updated.listen?.erschwernis.beschriftungen).toBeDefined();
  });

  it('entfernt beschriftungen beim Deaktivieren der Checkbox', () => {
    const onChange = mock();
    const tabelle = baseTabelle({
      listen: {
        erschwernis: { quelle: 'Zulagen', schluessel: 'Typ', wert: 'Wert', beschriftungen: { A: 'Alpha' } },
      },
    });
    const container = renderGruppen({ formular: 'ez', tabelle, onChange });

    const checkbox = container.querySelector('.db-checkbox input') as HTMLInputElement;
    klickeCheckbox(checkbox, false);

    const updated = onChange.mock.calls[0][0] as TabellenDef;
    expect(updated.listen?.erschwernis.beschriftungen).toBeUndefined();
  });
});
