import { describe, expect, it, mock } from 'bun:test';
import { render } from '../../../reactRender';

import { ScharfButton, Zellkoordinaten } from '@/features/Admin/components/FormularEditor/feldPanelGemeinsam';
import { FeldListe } from '@/features/Admin/components/FormularEditor/FeldZeile';
import { TabellenBlock } from '@/features/Admin/components/FormularEditor/TabellenBlock';
import { SchriftartDialog } from '@/features/Admin/components/FormularEditor/SchriftartDialog';
import { erzeugeVorschau } from '@/features/Admin/components/FormularEditor/dummyDaten';
import type { SeitenDef, TabellenDef, Feld } from '@otto-kirchheim/nebengeld-shared';

/**
 * Schmale Render-Tests für den Rest von J2 (native Controls -> @db-ux/react-core-components).
 * AdminProfileTemplateContentEditor hat seinen eigenen Test aus J1; die vier hier fehlten laut Plan
 * (`plan-react-umbau.md`, Verifikation-Abschnitt). Fokus liegt auf den DB-UX-Umstellungen selbst
 * (Icon-Knopf + Tooltip statt title, Modus-Knopfgruppen, Checkbox-Callbacks), nicht auf der
 * fachlichen Logik -- die decken die bestehenden Tests (vorschau.test.ts, klappzeile.test.tsx, ...).
 */

function container(): HTMLDivElement {
  const el = document.createElement('div');
  document.body.append(el);
  return el;
}

/** Klicks, die nur internen State setzen (kein `onChange`-Callback), brauchen einen Tick, bis der
 * Re-Render im DOM steht -- `mount()` rendert die erste Ausgabe synchron per `flushSync`, aber
 * Klick-ausgeloeste State-Updates laufen ueber den normalen Scheduler. */
async function flush(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
}

describe('feldPanelGemeinsam: ScharfButton (J-Icon-Knopf mit DBTooltip)', () => {
  it('wechselt Icon und Farbe zwischen inaktiv und aktiv', () => {
    const onClick = mock(() => {});
    const el = container();
    render(<ScharfButton aktiv={false} onClick={onClick} />, el);
    expect(el.querySelector('button')?.getAttribute('data-icon')).toBe('resize');

    render(<ScharfButton aktiv onClick={onClick} />, el);
    expect(el.querySelector('button')?.getAttribute('data-icon')).toBe('location_crosshairs');
    expect(el.querySelector('button')?.getAttribute('data-color')).toBe('critical');

    el.querySelector('button')?.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('traegt die Bezeichnung als DBTooltip-Kind, nicht als title', () => {
    const el = container();
    render(<ScharfButton aktiv={false} onClick={() => {}} titel="Eigener Hinweis" />, el);
    expect(el.querySelector('button')?.getAttribute('title')).toBeNull();
    expect(el.textContent).toContain('Eigener Hinweis');
  });
});

describe('feldPanelGemeinsam: Zellkoordinaten (DBButton mit iconTrailing)', () => {
  it('klappt die Koordinatenfelder per Klick auf den Knopf auf', async () => {
    const el = container();
    render(<Zellkoordinaten wert={{ x: 10, y: 20 }} onChange={() => {}} />, el);
    expect(el.textContent).toContain('x=10');
    expect(el.querySelector('button')?.getAttribute('data-icon-trailing')).toBe('chevron_down');
    expect(el.querySelectorAll('input').length).toBe(0);

    el.querySelector('button')?.click();
    await flush();
    expect(el.querySelectorAll('input').length).toBeGreaterThan(0);
    expect(el.querySelector('button')?.getAttribute('data-icon-trailing')).toBe('chevron_up');
  });
});

const tabelle: TabellenDef = {
  quelle: 'Daten.N',
  startY: 700,
  maxZeilen: 10,
  hoehe: 14,
  spalten: [{ key: 'Tag', x: 50, size: 10, format: 'datum' }],
};
const seite: SeitenDef = { quelle: 0, bereiche: [{ tabelle: 'haupt', startY: 700, maxZeilen: 10 }], felder: {} };
const vorschau = erzeugeVorschau({ haupt: tabelle }, [seite], 0, 'ez');

describe('TabellenBlock (DBButton/DBCheckbox)', () => {
  function zeichne(onDelete = mock(() => {}), onChange = mock(() => {})) {
    const el = container();
    render(
      <TabellenBlock
        name="haupt"
        tabelle={tabelle}
        seite={seite}
        onSeiteChange={() => {}}
        formular="ez"
        armed={null}
        onArm={() => {}}
        onChange={onChange}
        onDelete={onDelete}
        onVonSeiteEntfernen={() => {}}
        vorschau={vorschau}
        onSonderzeileUmbenannt={() => {}}
      />,
      el,
    );
    return el;
  }

  it('loescht die Tabelle ueber den Icon-Knopf mit Tooltip-Text', () => {
    const onDelete = mock(() => {});
    const el = zeichne(onDelete);
    expect(el.textContent).toContain('Tabelle löschen (aus dem ganzen Dokument)');
    const loeschen = [...el.querySelectorAll('button')].find(b => b.textContent?.includes('Tabelle löschen'));
    loeschen?.click();
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('schaltet den Zeilenfilter per DBCheckbox', () => {
    const onChange = mock(() => {});
    const el = zeichne(undefined, onChange);
    const filterCheckbox = [...el.querySelectorAll('.db-checkbox label')]
      .find(l => l.textContent?.includes('Nur bestimmte Zeilen'))
      ?.querySelector('input') as HTMLInputElement;
    expect(filterCheckbox).toBeDefined();
    filterCheckbox.click();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ filter: expect.anything() }));
  });
});

describe('FeldListe (FeldZeile: Modus-Knopfgruppe + Loeschen)', () => {
  const felder: Record<string, Feld> = { betrag: { x: 50, y: 60, size: 10, format: 'waehrung' } };

  it('zeigt Datenfeld-Modus als aktiven Knopf und wechselt auf Klick', () => {
    const onChange = mock(() => {});
    const el = container();
    render(
      <FeldListe
        felder={felder}
        formular="ez"
        tabellen={{}}
        armed={{ bereich: 'feld', key: 'betrag' }}
        onArm={() => {}}
        onChange={onChange}
        vorschau={vorschau}
      />,
      el,
    );
    const text = [...el.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Text');
    text?.click();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ betrag: expect.objectContaining({ text: '' }) }));
  });

  it('loescht ein Feld ueber den Icon-Knopf', () => {
    const el = container();
    render(
      <FeldListe
        felder={felder}
        formular="ez"
        tabellen={{}}
        armed={null}
        onArm={() => {}}
        onChange={() => {}}
        vorschau={vorschau}
      />,
      el,
    );
    expect(el.textContent).toContain('Feld löschen');
  });
});

describe('SchriftartDialog (DBButton "Fertig")', () => {
  it('rendert den Fertig-Knopf und ruft onClose auf', () => {
    const onClose = mock(() => {});
    const el = container();
    render(
      <SchriftartDialog
        value={undefined}
        vorlageFonts={[]}
        unbrauchbareFonts={[]}
        onChange={() => {}}
        onClose={onClose}
      />,
      el,
    );
    const fertig = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Fertig');
    expect(fertig).toBeDefined();
    fertig?.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
