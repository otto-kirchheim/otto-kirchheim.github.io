import { describe, expect, it } from 'bun:test';
import { createElement } from 'react';
import { createCustomTable } from '@/infrastructure/table/CustomTable';

type Row = { _id: string; Einsatzort: string };

function renderTable(rows: Row[], html = false, parser?: (value: unknown) => string): HTMLTableElement {
  const table = document.createElement('table');
  table.id = `xssTable${Math.random().toString(36).slice(2)}`;
  document.body.appendChild(table);

  createCustomTable<Row>(table as never, {
    columns: [{ name: 'Einsatzort', title: 'Einsatzort', html, ...(parser ? { parser } : {}) }],
    rows,
  });

  return table;
}

describe('CustomTable - Zellinhalte', () => {
  it('rendert Freitext aus Benutzereingaben als Text, nicht als HTML', () => {
    const table = renderTable([{ _id: 'r1', Einsatzort: '<img src=x onerror="window.__xss=1">Kassel' }]);

    const cell = table.querySelector('tbody td span');
    expect(cell).not.toBeNull();
    expect(cell!.querySelector('img')).toBeNull();
    expect(cell!.textContent).toBe('<img src=x onerror="window.__xss=1">Kassel');
  });

  it('behandelt auch Anfuehrungszeichen und schliessende Tags als Text', () => {
    const table = renderTable([{ _id: 'r1', Einsatzort: '</span><script>alert(1)</script>' }]);

    const cell = table.querySelector('tbody td span');
    expect(cell!.querySelector('script')).toBeNull();
    expect(cell!.textContent).toBe('</span><script>alert(1)</script>');
  });

  it('rendert JSX nur bei Spalten mit html: true (z.B. der Berechnen-Schalter)', () => {
    // Seit dem React-Umbau (Phase M) gibt ein `html: true`-Parser JSX direkt zurueck statt
    // eines rohen HTML-Strings (kein `dangerouslySetInnerHTML` mehr, siehe `EwtTab.tsx`s
    // `berechnenParser`/`schichtParser` und `customTableTypes.ts`s `html`-Doku).
    const table = renderTable(
      [{ _id: 'r1', Einsatzort: 'x' }],
      true,
      () => createElement('input', { type: 'checkbox', className: 'row-checkbox' }) as unknown as string,
    );

    expect(table.querySelector('tbody td span input.row-checkbox')).not.toBeNull();
  });
});
