import { describe, expect, it } from 'bun:test';
import { CustomTable } from '@/infrastructure/table/CustomTable';

type Row = { _id: string; Einsatzort: string };

function renderTable(rows: Row[], html = false): HTMLTableElement {
  const table = document.createElement('table');
  table.id = `xssTable${Math.random().toString(36).slice(2)}`;
  document.body.appendChild(table);

  new CustomTable<Row>(table as never, {
    columns: [{ name: 'Einsatzort', title: 'Einsatzort', html }],
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

  it('rendert Markup nur bei Spalten mit html: true (z.B. der Berechnen-Schalter)', () => {
    const table = renderTable([{ _id: 'r1', Einsatzort: '<input type="checkbox" class="row-checkbox">' }], true);

    expect(table.querySelector('tbody td span input.row-checkbox')).not.toBeNull();
  });
});
