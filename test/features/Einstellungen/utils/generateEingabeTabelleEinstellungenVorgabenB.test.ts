import { beforeEach, describe, expect, it, vi } from 'bun:test';

const {
  createCustomTableMock,
  createSnackBarMock,
  buttonDisableMock,
  editorModalVEMock,
  showModalVEMock,
  apiFetchMock,
  saveEinstellungenMock,
  storageCheckMock,
  storageGetMock,
  rowsLoadMock,
} = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  createCustomTableMock: vi.fn(),
  createSnackBarMock: vi.fn(),
  buttonDisableMock: vi.fn(),
  editorModalVEMock: vi.fn(),
  showModalVEMock: vi.fn(),
  apiFetchMock: vi.fn(),
  saveEinstellungenMock: vi.fn(),
  storageCheckMock: vi.fn(),
  storageGetMock: vi.fn(),
  rowsLoadMock: vi.fn(),
}));

vi.mock('@/infrastructure/table/CustomTable', () => ({
  createCustomTable: createCustomTableMock,
}));

vi.mock('@/infrastructure/ui/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

vi.mock('@/infrastructure/ui/buttonDisable', () => ({
  default: buttonDisableMock,
}));

vi.mock('@/infrastructure/storage/Storage', () => ({
  default: { check: storageCheckMock, get: storageGetMock },
}));

vi.mock('@/infrastructure/api/apiFetchHelper', () => ({
  apiFetch: apiFetchMock,
}));

vi.mock('@/features/Einstellungen/components', () => ({
  EditorModalVE: editorModalVEMock,
  ShowModalVE: showModalVEMock,
}));

vi.mock('@/features/Einstellungen/utils', () => ({
  saveEinstellungen: saveEinstellungenMock,
}));

vi.mock('@/features/Bereitschaft/utils/constants', () => ({
  BereitschaftsEinsatzZeiträume: {
    1: { key: 'std', name: 'Standard', standard: true, beginnB: { tag: 1, zeit: '06:00' } },
  },
}));

import generateEingabeTabelleEinstellungenVorgabenB from '@/features/Einstellungen/utils/generateEingabeTabelleEinstellungenVorgabenB';

type CapturedOptions = {
  columns: Array<{ name: string; parser?: (value: unknown, option?: unknown) => string }>;
  editing: {
    addRow: () => void;
    editRow: (row: unknown) => void;
    showRow: (row: unknown) => void;
    deleteRow: (row: { cells: { standard: boolean }; deleteRow: () => void }) => void;
    deleteAllRows: () => void;
    customButton: Array<{ function: () => Promise<void> }>;
  };
};

function capturedOptions(): CapturedOptions {
  return createCustomTableMock.mock.calls[0][1] as CapturedOptions;
}

function parserFor(name: string) {
  const column = capturedOptions().columns.find(c => c.name === name);
  if (!column?.parser) throw new Error(`Parser für ${name} nicht gefunden`);
  return column.parser;
}

describe('generateEingabeTabelleEinstellungenVorgabenB', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiFetchMock.mockReset();
    storageCheckMock.mockReturnValue(false);
    createCustomTableMock.mockImplementation(() => ({ rows: { load: rowsLoadMock } }));
  });

  it('baut die CustomTable mit VorgabenB aus Storage, wenn kein Argument übergeben wird', () => {
    storageCheckMock.mockReturnValue(true);
    storageGetMock.mockReturnValue({ VorgabenB: { 1: { key: 'a', name: 'A' } } });

    generateEingabeTabelleEinstellungenVorgabenB();

    expect(createCustomTableMock).toHaveBeenCalledTimes(1);
    expect(capturedOptions().editing.customButton).toBeDefined();
  });

  describe('Parser', () => {
    it('trueParser: gibt "Ja"/"Nein" zurück', () => {
      generateEingabeTabelleEinstellungenVorgabenB({});
      const trueParser = parserFor('standard');
      expect(trueParser(true)).toBe('Ja');
      expect(trueParser(false)).toBe('Nein');
    });

    it('weekdayParser: baut Wochentag + Woche + Zeit mit <br/> bei umbruch', () => {
      generateEingabeTabelleEinstellungenVorgabenB({});
      const weekdayParser = parserFor('beginnB');
      expect(weekdayParser({ tag: 3, zeit: '08:00', Nwoche: false })).toBe('Mi W1<br/>08:00');
      expect(weekdayParser({ tag: 0, zeit: '10:00', Nwoche: true })).toBe('So W2<br/>10:00');
    });

    it('weekdayParser: nutzt " | " statt <br/> wenn option=false', () => {
      generateEingabeTabelleEinstellungenVorgabenB({});
      const weekdayParser = parserFor('beginnB');
      expect(weekdayParser({ tag: 1, zeit: '06:00' }, false)).toBe('Mo W1 | 06:00');
    });

    it('weekdayParser: fällt auf "-" zurück, wenn Tag/Zeit unbekannt sind', () => {
      generateEingabeTabelleEinstellungenVorgabenB({});
      const weekdayParser = parserFor('beginnB');
      expect(weekdayParser({ tag: 99 })).toBe('- W1<br/>-');
    });

    it('nachtRangeParser: delegiert an weekdayParser', () => {
      generateEingabeTabelleEinstellungenVorgabenB({});
      const nachtParser = parserFor('beginnN');
      expect(nachtParser({ tag: 2, zeit: '22:00', Nwoche: true })).toBe('Di W2<br/>22:00');
    });
  });

  describe('editing-Callbacks', () => {
    it('addRow ruft EditorModalVE mit der Tabelle auf', () => {
      generateEingabeTabelleEinstellungenVorgabenB({});
      capturedOptions().editing.addRow();
      expect(editorModalVEMock).toHaveBeenCalledWith(expect.anything(), 'Voreinstellung hinzufügen');
    });

    it('editRow/showRow reichen die Zeile weiter', () => {
      generateEingabeTabelleEinstellungenVorgabenB({});
      const row = { id: 'row-1' };
      capturedOptions().editing.editRow(row);
      capturedOptions().editing.showRow(row);
      expect(editorModalVEMock).toHaveBeenCalledWith(row, 'Voreinstellung bearbeiten');
      expect(showModalVEMock).toHaveBeenCalledWith(row, 'Voreinstellung anzeigen');
    });

    it('deleteRow löscht Nicht-Standard-Zeilen direkt', () => {
      generateEingabeTabelleEinstellungenVorgabenB({});
      const deleteRowFn = vi.fn();
      capturedOptions().editing.deleteRow({ cells: { standard: false }, deleteRow: deleteRowFn });
      expect(deleteRowFn).toHaveBeenCalledTimes(1);
      expect(createSnackBarMock).not.toHaveBeenCalled();
    });

    it('deleteRow verhindert das Löschen der Standard-Zeile', () => {
      generateEingabeTabelleEinstellungenVorgabenB({});
      const deleteRowFn = vi.fn();
      capturedOptions().editing.deleteRow({ cells: { standard: true }, deleteRow: deleteRowFn });
      expect(deleteRowFn).not.toHaveBeenCalled();
      expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'info' }));
    });

    it('deleteAllRows zeigt eine Bestätigung mit Ja/Nein-Aktionen', () => {
      generateEingabeTabelleEinstellungenVorgabenB({});
      capturedOptions().editing.deleteAllRows();

      const snackbarArgs = createSnackBarMock.mock.calls[0][0] as {
        actions: Array<{ text: string; function?: () => void }>;
      };
      expect(snackbarArgs.actions.map(a => a.text)).toEqual(['Ja', 'Nein']);

      snackbarArgs.actions[0].function?.();
      expect(rowsLoadMock).toHaveBeenCalledWith([]);
      expect(buttonDisableMock).toHaveBeenCalledWith(false);
    });

    describe('customButton "Standardeinstellungen"', () => {
      it('lädt das Profil-Template für den Standort-Code und speichert', async () => {
        storageCheckMock.mockReturnValue(true);
        storageGetMock.mockReturnValue({ Pers: { ErsteTkgSt: 'MUC' } });
        apiFetchMock.mockResolvedValue({ template: { VorgabenB: [{ key: 'a', value: { key: 'a', name: 'A' } }] } });

        generateEingabeTabelleEinstellungenVorgabenB({});
        await capturedOptions().editing.customButton[0].function();

        expect(apiFetchMock).toHaveBeenCalledWith('profile-templates/code/muc');
        expect(rowsLoadMock).toHaveBeenCalledWith([{ key: 'a', name: 'A' }]);
        expect(saveEinstellungenMock).toHaveBeenCalledTimes(1);
      });

      it('fällt auf das "muster"-Template zurück, wenn das Code-Template leer ist', async () => {
        storageCheckMock.mockReturnValue(true);
        storageGetMock.mockReturnValue({ Pers: { ErsteTkgSt: 'XYZ' } });
        apiFetchMock.mockResolvedValueOnce({}).mockResolvedValueOnce({
          template: { VorgabenB: [{ key: 'm', value: { key: 'm', name: 'Muster' } }] },
        });

        generateEingabeTabelleEinstellungenVorgabenB({});
        await capturedOptions().editing.customButton[0].function();

        expect(apiFetchMock).toHaveBeenCalledTimes(2);
        expect(apiFetchMock).toHaveBeenNthCalledWith(1, 'profile-templates/code/xyz');
        expect(apiFetchMock).toHaveBeenNthCalledWith(2, 'profile-templates/code/muster');
        expect(rowsLoadMock).toHaveBeenCalledWith([{ key: 'm', name: 'Muster' }]);
      });

      it('fällt auf BereitschaftsEinsatzZeiträume zurück, wenn kein Template verfügbar ist', async () => {
        storageCheckMock.mockReturnValue(false);
        apiFetchMock.mockRejectedValue(new Error('offline'));

        generateEingabeTabelleEinstellungenVorgabenB({});
        await capturedOptions().editing.customButton[0].function();

        expect(rowsLoadMock).toHaveBeenCalledWith([
          { key: 'std', name: 'Standard', standard: true, beginnB: { tag: 1, zeit: '06:00' } },
        ]);
      });
    });
  });
});
