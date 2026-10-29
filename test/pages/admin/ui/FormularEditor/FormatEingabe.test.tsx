import { describe, expect, it } from 'bun:test';
import { useState } from 'react';
import { render, setzeWert } from '@test/reactRender';

import { FormatEingabe } from '@/pages/admin/ui/FormularEditor/FormatEingabe';

function Huelle({ start, beiAenderung }: { start?: string; beiAenderung: (f: string | undefined) => void }) {
  const [wert, setWert] = useState(start);
  return (
    <FormatEingabe
      wert={wert}
      onChange={f => {
        setWert(f);
        beiAenderung(f);
      }}
    />
  );
}

function renderEingabe(start?: string) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const aenderungen: (string | undefined)[] = [];
  render(<Huelle start={start} beiAenderung={f => aenderungen.push(f)} />, container);
  return { container, input: container.querySelector('input')!, aenderungen };
}

/** DBInput übernimmt `invalidMessage` per Effekt -- einen Takt abwarten. */
const takt = () => new Promise(resolve => setTimeout(resolve, 50));

describe('FormatEingabe', () => {
  it('bietet die Vorschläge als datalist an', () => {
    const { container } = renderEingabe();
    const optionen = [...container.querySelectorAll('datalist option')].map(o => o.getAttribute('value'));
    expect(optionen).toContain('DD.MM.YYYY');
    expect(optionen).toContain('#.##0,00 €');
    expect(optionen).toContain('@oe');
  });

  it('zeigt einen Fehler sofort beim Tippen und übernimmt den Wert trotzdem', async () => {
    const { container, input, aenderungen } = renderEingabe();
    setzeWert(input, 'DD.MM.YYYY Uhr');
    await takt();
    expect(aenderungen).toEqual(['DD.MM.YYYY Uhr']);
    expect(container.textContent).toContain('"U" ist kein Datums-Token');
    expect(
      container.querySelector('.db-input')?.getAttribute('data-custom-validity') ?? input.getAttribute('aria-invalid'),
    ).toBeTruthy();
  });

  it('meldet bei altem Formatnamen den Ersatz', async () => {
    const { container } = renderEingabe('datum');
    await takt();
    expect(container.textContent).toContain('Altes Format "datum" – neu: DD.MM.YYYY');
  });

  it('gültiges Muster ohne Fehler; leeres Feld wird zu undefined', () => {
    const { container, input, aenderungen } = renderEingabe('DD.MM.');
    expect(container.textContent).not.toContain('Datums-Token');
    expect(input.getAttribute('aria-invalid')).not.toBe('true');
    setzeWert(input, '');
    expect(aenderungen).toEqual([undefined]);
  });
});
