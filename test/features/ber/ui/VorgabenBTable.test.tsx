import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { render } from '@test/reactRender';

const {
  createSnackBarMock,
  buttonDisableMock,
  editorModalVEMock,
  showModalVEMock,
  apiFetchMock,
  saveEinstellungenMock,
  storageCheckMock,
  storageGetMock,
} = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  createSnackBarMock: vi.fn(),
  buttonDisableMock: vi.fn(),
  editorModalVEMock: vi.fn(),
  showModalVEMock: vi.fn(),
  apiFetchMock: vi.fn(),
  saveEinstellungenMock: vi.fn(),
  storageCheckMock: vi.fn(),
  storageGetMock: vi.fn(),
}));

vi.mock('@/shared/ui/snackbar/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

vi.mock('@/shared/ui/button-loading/buttonDisable', () => ({
  default: buttonDisableMock,
}));

vi.mock('@/shared/lib/storage/Storage', () => ({
  default: { check: storageCheckMock, get: storageGetMock },
}));

vi.mock('@/shared/api/apiFetchHelper', () => ({
  apiFetch: apiFetchMock,
}));

vi.mock('@/features/ber/ui/createEditorModalVE', () => ({
  default: editorModalVEMock,
}));
vi.mock('@/features/ber/ui/createShowModalVE', () => ({
  default: showModalVEMock,
}));

vi.mock('@/pages/einstellungen/model', () => ({
  saveEinstellungen: saveEinstellungenMock,
}));

vi.mock('@/features/ber/model/constants', () => ({
  BereitschaftsEinsatzZeiträume: {
    1: {
      Name: 'Standard',
      standard: true,
      nacht: false,
      beginnB: { tag: 1, zeit: '06:00' },
      endeB: { tag: 1, zeit: '18:00', Nwoche: false },
      beginnN: { tag: 1, zeit: '22:00' },
      endeN: { tag: 2, zeit: '06:00', Nwoche: false },
    },
  },
}));

import VorgabenBTable from '@/features/ber/ui/VorgabenBTable';

/**
 * Rendert `VorgabenBTable` gegen die ECHTE `useCustomTableState()`/`CustomTable`-Maschinerie
 * (Achse B des `useReducer`-Umbaus) statt eines `createCustomTable`-Mocks -- alle Interaktionen
 * laufen ueber echte DOM-Klicks auf die von `CustomTableView.tsx` gerenderten Knoepfe, analog
 * `test/class/CustomTable.test.ts`.
 */
function container(): HTMLDivElement {
  const el = document.createElement('div');
  document.body.append(el);
  return el;
}

function editButton(row: Element): HTMLButtonElement | null {
  return row.querySelector('.db-button[data-variant="outlined"]:not([data-color])');
}
function deleteButton(row: Element): HTMLButtonElement | null {
  return row.querySelector('.db-button[data-variant="outlined"][data-color="critical"]');
}
function click(el: Element | null): void {
  el?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

/** Vollstaendiger `IVorgabenUvorgabenB`-Datensatz mit sinnvollen Defaults für alle
 * Pflichtfelder -- jede Zeile rendert ALLE Spalten, ein unvollstaendiges Objekt laesst
 * `weekdayParser` auf `beginnB`/`beginnN` sonst mit `undefined.tag` crashen. */
function baseRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    Name: 'A',
    standard: false,
    nacht: false,
    beginnB: { tag: 1, zeit: '06:00' },
    endeB: { tag: 1, zeit: '18:00', Nwoche: false },
    beginnN: { tag: 1, zeit: '22:00' },
    endeN: { tag: 2, zeit: '06:00', Nwoche: false },
    ...overrides,
  };
}

describe('VorgabenBTable', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    apiFetchMock.mockReset();
    storageCheckMock.mockReturnValue(false);
    storageGetMock.mockReturnValue({});
  });

  it('rendert eine Zeile pro VorgabenB-Eintrag aus Storage', () => {
    storageCheckMock.mockReturnValue(true);
    storageGetMock.mockReturnValue({
      VorgabenB: { 1: baseRow({ Name: 'A', standard: true }), 2: baseRow({ Name: 'B', standard: false }) },
    });

    const el = container();
    render(<VorgabenBTable />, el);

    expect(el.querySelectorAll('#tableVE tbody tr').length).toBe(2);
  });

  describe('Parser', () => {
    function renderRow(row: Record<string, unknown>): HTMLTableRowElement {
      const el = container();
      render(<VorgabenBTable />, el);
      const table = document.querySelector<
        { instance: { rows: { add: (v: unknown, state?: string) => void } } } & Element
      >('#tableVE');
      (table as unknown as { instance: { rows: { add: (v: unknown, state?: string) => void } } }).instance.rows.add(
        row,
        'unchanged',
      );
      return el.querySelector('#tableVE tbody tr') as HTMLTableRowElement;
    }

    it('trueParser: rendert "Ja"/"Nein" für standard', () => {
      const tr = renderRow(baseRow({ standard: true }));
      expect(tr.textContent).toContain('Ja');
    });

    it('trueParser: rendert "Nein" für standard=false', () => {
      const tr = renderRow(baseRow({ standard: false }));
      expect(tr.textContent).toContain('Nein');
    });

    it('weekdayParser: baut Wochentag + Woche + Zeit', () => {
      const tr = renderRow(baseRow({ beginnB: { tag: 3, zeit: '08:00', Nwoche: false } }));
      expect(tr.textContent).toContain('Mi W1');
      expect(tr.textContent).toContain('08:00');
    });

    it('weekdayParser: fällt auf "-" zurück, wenn Tag/Zeit unbekannt sind', () => {
      const tr = renderRow(baseRow({ beginnB: { tag: 99 } }));
      expect(tr.textContent).toContain('- W1');
    });

    it('nachtRangeParser (beginnN): liefert dasselbe Format wie weekdayParser', () => {
      const tr = renderRow(baseRow({ beginnN: { tag: 2, zeit: '22:00', Nwoche: true } }));
      expect(tr.textContent).toContain('Di W2');
      expect(tr.textContent).toContain('22:00');
    });
  });

  describe('editing-Callbacks', () => {
    it('addRow (Fußzeile) ruft EditorModalVE auf', () => {
      const el = container();
      render(<VorgabenBTable />, el);
      click(el.querySelector('tfoot [data-variant="brand"]'));
      expect(editorModalVEMock).toHaveBeenCalledWith(expect.anything(), 'Voreinstellung hinzufügen');
    });

    it('editRow/showRow (Zeilen-Knöpfe) reichen die angeklickte Zeile weiter', () => {
      storageCheckMock.mockReturnValue(true);
      storageGetMock.mockReturnValue({ VorgabenB: { 1: baseRow({ Name: 'A', standard: false }) } });
      const el = container();
      render(<VorgabenBTable />, el);

      const row = el.querySelector('#tableVE tbody tr') as HTMLTableRowElement;
      click(editButton(row));
      expect(editorModalVEMock).toHaveBeenCalledTimes(1);
      const passedRow = editorModalVEMock.mock.calls[0][0] as { cells: { Name: string } };
      expect(passedRow.cells.Name).toBe('A');
      expect(editorModalVEMock).toHaveBeenCalledWith(expect.anything(), 'Voreinstellung bearbeiten');
    });

    it('deleteRow löscht Nicht-Standard-Zeilen direkt', () => {
      storageCheckMock.mockReturnValue(true);
      storageGetMock.mockReturnValue({ VorgabenB: { 1: baseRow({ Name: 'A', standard: false }) } });
      const el = container();
      render(<VorgabenBTable />, el);

      const row = el.querySelector('#tableVE tbody tr') as HTMLTableRowElement;
      click(deleteButton(row));
      expect(createSnackBarMock).not.toHaveBeenCalled();
      // Zeile kam aus Storage (State 'unchanged') -- `deleteRow()` markiert sie deshalb nur als
      // 'deleted' (Soft-Delete), entfernt sie aber nicht aus dem DOM (siehe `Row.ts`).
      expect(el.querySelector('#tableVE tbody tr')?.classList.contains('customtable-deleted')).toBe(true);
    });

    it('deleteRow verhindert das Löschen der Standard-Zeile', () => {
      storageCheckMock.mockReturnValue(true);
      storageGetMock.mockReturnValue({ VorgabenB: { 1: baseRow({ Name: 'A', standard: true }) } });
      const el = container();
      render(<VorgabenBTable />, el);

      const row = el.querySelector('#tableVE tbody tr') as HTMLTableRowElement;
      click(deleteButton(row));
      expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'info' }));
      expect(el.querySelectorAll('#tableVE tbody tr').length).toBe(1);
    });

    it('deleteAllRows zeigt eine Bestätigung mit Ja/Nein-Aktionen', () => {
      storageCheckMock.mockReturnValue(true);
      storageGetMock.mockReturnValue({ VorgabenB: { 1: baseRow({ Name: 'A', standard: false }) } });
      const el = container();
      render(<VorgabenBTable />, el);

      click(el.querySelector('.customtable-delete-all'));

      const snackbarArgs = createSnackBarMock.mock.calls[0][0] as {
        actions: Array<{ text: string; function?: () => void }>;
      };
      expect(snackbarArgs.actions.map(a => a.text)).toEqual(['Ja', 'Nein']);

      snackbarArgs.actions[0].function?.();
      // `load([])` leert die Tabelle vollstaendig -- `CustomTableView.tsx` rendert dafuer die
      // `customtable-empty`-Platzhalterzeile, die vom generischen `tbody tr`-Selektor mit
      // erfasst wird.
      expect(el.querySelectorAll('#tableVE tbody tr:not(.customtable-empty)').length).toBe(0);
      expect(el.querySelector('#tableVE tbody tr.customtable-empty')).not.toBeNull();
      expect(buttonDisableMock).toHaveBeenCalledWith(false);
    });

    describe('customButton "Standardeinstellungen"', () => {
      function customButton(el: HTMLElement): HTMLButtonElement | null {
        return [...el.querySelectorAll('tfoot button')].find(b =>
          b.textContent?.includes('Standardeinstellungen'),
        ) as HTMLButtonElement | null;
      }

      it('lädt das Profil-Template für den Standort-Code und speichert', async () => {
        storageCheckMock.mockReturnValue(true);
        storageGetMock.mockReturnValue({ Pers: { ErsteTkgSt: 'MUC' } });
        apiFetchMock.mockResolvedValue({ template: { VorgabenB: [{ key: 'a', value: baseRow({ Name: 'A' }) }] } });

        const el = container();
        render(<VorgabenBTable />, el);
        click(customButton(el));
        await new Promise(r => setTimeout(r, 0));
        await new Promise(r => setTimeout(r, 0));

        expect(apiFetchMock).toHaveBeenCalledWith('profile-templates/code/muc');
        expect(el.querySelectorAll('#tableVE tbody tr').length).toBe(1);
        expect(el.querySelector('#tableVE tbody tr')?.textContent).toContain('A');
        expect(saveEinstellungenMock).toHaveBeenCalledTimes(1);
      });

      it('fällt auf das "muster"-Template zurück, wenn das Code-Template leer ist', async () => {
        storageCheckMock.mockReturnValue(true);
        storageGetMock.mockReturnValue({ Pers: { ErsteTkgSt: 'XYZ' } });
        apiFetchMock.mockResolvedValueOnce({}).mockResolvedValueOnce({
          template: { VorgabenB: [{ key: 'm', value: baseRow({ Name: 'Muster' }) }] },
        });

        const el = container();
        render(<VorgabenBTable />, el);
        click(customButton(el));
        await new Promise(r => setTimeout(r, 0));
        await new Promise(r => setTimeout(r, 0));
        await new Promise(r => setTimeout(r, 0));

        expect(apiFetchMock).toHaveBeenCalledTimes(2);
        expect(apiFetchMock).toHaveBeenNthCalledWith(1, 'profile-templates/code/xyz');
        expect(apiFetchMock).toHaveBeenNthCalledWith(2, 'profile-templates/code/muster');
        expect(el.querySelector('#tableVE tbody tr')?.textContent).toContain('Muster');
      });

      it('fällt auf BereitschaftsEinsatzZeiträume zurück, wenn kein Template verfügbar ist', async () => {
        storageCheckMock.mockReturnValue(false);
        apiFetchMock.mockRejectedValue(new Error('offline'));

        const el = container();
        render(<VorgabenBTable />, el);
        click(customButton(el));
        await new Promise(r => setTimeout(r, 0));
        await new Promise(r => setTimeout(r, 0));

        expect(el.querySelector('#tableVE tbody tr')?.textContent).toContain('Standard');
      });
    });
  });
});
