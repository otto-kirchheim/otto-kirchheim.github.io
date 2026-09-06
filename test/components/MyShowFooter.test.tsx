import { describe, expect, it, vi } from 'bun:test';
import { render } from '../reactRender';

import type { CustomTableTypes, Row } from '@/infrastructure/table/CustomTable';

// MyShowFooter's Buttons tragen data-bs-dismiss="modal". Der reale Bootstrap-Modal-Import
// registriert einen document-weiten Click-Handler, der ohne echtes .modal-Element crasht.
// Für diesen isolierten Komponententest wird das Modul daher wie in
// Login.createModalResetPassword.test.tsx gemockt.

const { default: MyShowFooter } = await import('@/components/MyShowFooter');

type TRow = CustomTableTypes;

function createRow(
  editRow = vi.fn(),
  deleteRow = vi.fn(),
): { row: Row<TRow>; editRow: typeof editRow; deleteRow: typeof deleteRow } {
  const row = {
    CustomTable: {
      options: {
        editing: {
          editRow,
          deleteRow,
        },
      },
    },
  } as unknown as Row<TRow>;

  return { row, editRow, deleteRow };
}

function renderMyShowFooter(row: Row<TRow>): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(<MyShowFooter row={row} />, container);
  return container;
}

describe('MyShowFooter', () => {
  it('should render Bearbeiten-, Löschen- and Schließen-Buttons', () => {
    const { row } = createRow();
    const container = renderMyShowFooter(row);

    const buttons = Array.from(container.querySelectorAll('button'));
    expect(buttons.map(b => b.textContent)).toEqual(['Bearbeiten', 'Löschen', 'Schließen']);
    expect(buttons.every(b => b.getAttribute('data-bs-dismiss') === 'modal')).toBe(true);
    // Seit Phase C rendert MyButton einen DBButton: die Bootstrap-Klasse ist zu
    // `data-variant`/`data-color` geworden.
    expect(buttons[1]?.getAttribute('data-variant')).toBe('filled');
    expect(buttons[1]?.getAttribute('data-color')).toBe('critical');
    expect(buttons[2]?.getAttribute('data-variant')).toBe('filled');
    expect(buttons[2]?.getAttribute('data-color')).toBeNull();
  });

  it('should call editRow with the row when the Bearbeiten button is clicked', () => {
    const { row, editRow, deleteRow } = createRow();
    const container = renderMyShowFooter(row);

    container.querySelectorAll('button')[0]?.dispatchEvent(new Event('click', { bubbles: true }));

    expect(editRow).toHaveBeenCalledTimes(1);
    expect(editRow).toHaveBeenCalledWith(row);
    expect(deleteRow).not.toHaveBeenCalled();
  });

  it('should call deleteRow with the row when the Löschen button is clicked', () => {
    const { row, editRow, deleteRow } = createRow();
    const container = renderMyShowFooter(row);

    container.querySelectorAll('button')[1]?.dispatchEvent(new Event('click', { bubbles: true }));

    expect(deleteRow).toHaveBeenCalledTimes(1);
    expect(deleteRow).toHaveBeenCalledWith(row);
    expect(editRow).not.toHaveBeenCalled();
  });

  it('should not call editRow or deleteRow when the Schließen button is clicked', () => {
    const { row, editRow, deleteRow } = createRow();
    const container = renderMyShowFooter(row);

    container.querySelectorAll('button')[2]?.dispatchEvent(new Event('click', { bubbles: true }));

    expect(editRow).not.toHaveBeenCalled();
    expect(deleteRow).not.toHaveBeenCalled();
  });
});
