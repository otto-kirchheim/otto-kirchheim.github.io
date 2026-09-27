import { describe, expect, it } from 'bun:test';
import { act, useState } from 'react';
import { render } from '@test/reactRender';

import { vorgabenBAbschnitt } from '@/pages/admin/features/ber/profilVorlage';
import type { VorgabenBRow } from '@/pages/admin/features/ber/vorgabenB';

/** Rendert den Editor kontrolliert (wie der Manager) und gibt den jeweils letzten Entwurf zurueck. */
function zeichne() {
  const stand: { rows: VorgabenBRow[] } = { rows: [] };
  const Editor = vorgabenBAbschnitt.Editor;
  function Huelle() {
    const [rows, setRows] = useState<VorgabenBRow[]>([]);
    stand.rows = rows;
    return <Editor templateId="t1" value={rows} onChange={next => setRows(next as VorgabenBRow[])} disabled={false} />;
  }
  const container = document.createElement('div');
  document.body.append(container);
  render(<Huelle />, container);
  const knopf = (text: string) => {
    const treffer = [...container.querySelectorAll('button')].find(b => b.textContent?.trim() === text);
    if (!treffer) throw new Error(`Knopf "${text}" nicht gefunden`);
    act(() => treffer.click());
  };
  return { container, stand, knopf };
}

describe('VorgabenB-Abschnitt (Admin-Anteil ber)', () => {
  it('neuer Eintrag: nummeriert, als einziger Standard, nur Fruehschicht, und ausgewaehlt', () => {
    const { stand, knopf, container } = zeichne();

    knopf('Vorgabe hinzufügen');
    knopf('Vorgabe hinzufügen');

    expect(stand.rows.map(row => row.key)).toEqual(['1', '2']);
    expect(stand.rows.map(row => row.value.standard)).toEqual([true, false]);
    expect(stand.rows[1].value.schichten).toEqual(['frueh']);
    expect(container.textContent).toContain('Vorgabe 2 von 2');
  });

  it('Standard bleibt beim Verschieben am selben Eintrag, die Auswahl folgt', () => {
    const { stand, knopf, container } = zeichne();
    knopf('Vorgabe hinzufügen');
    knopf('Vorgabe hinzufügen');

    knopf('Als Standard');
    knopf('↑');

    expect(stand.rows.map(row => row.value.standard)).toEqual([true, false]);
    expect(container.textContent).toContain('Vorgabe 1 von 2');
  });

  it('Entfernen haelt die Auswahl im gueltigen Bereich', () => {
    const { stand, knopf, container } = zeichne();
    knopf('Vorgabe hinzufügen');
    knopf('Vorgabe hinzufügen');

    knopf('Entfernen');

    expect(stand.rows).toHaveLength(1);
    expect(container.textContent).toContain('Vorgabe 1 von 1');
  });
});
