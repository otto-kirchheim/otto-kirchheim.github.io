import { beforeEach, describe, expect, it, vi } from 'bun:test';

const { storageCheckMock, storageGetMock } = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(
  () => ({
    storageCheckMock: vi.fn(),
    storageGetMock: vi.fn(),
  }),
);

vi.mock('@/infrastructure/storage/Storage', () => ({
  default: { check: storageCheckMock, get: storageGetMock },
}));

import { createCustomTable, CustomTable } from '@/infrastructure/table/CustomTable';
import generateEingabeTabelleEinstellungenVorgabenB from '@/features/Einstellungen/utils/generateEingabeTabelleEinstellungenVorgabenB';

/**
 * Seit Achse B des `useReducer`-Umbaus konstruiert `VorgabenBTable.tsx` die `#tableVE`-Instanz
 * (siehe dort, inkl. Spalten/Editing-Callback-Tests) -- diese Funktion ist auf einen reinen
 * Daten-Nachlader geschrumpft: `document.querySelector('#tableVE')?.instance` nachschlagen und
 * `rows.load()` aufrufen.
 */
describe('generateEingabeTabelleEinstellungenVorgabenB', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    storageCheckMock.mockReturnValue(false);
  });

  it('ist ein No-Op, wenn #tableVE (noch) keine CustomTable-Instanz trägt', () => {
    document.body.innerHTML = '<table id="tableVE"></table>';
    expect(() => generateEingabeTabelleEinstellungenVorgabenB({ 1: { key: 'a', name: 'A' } } as never)).not.toThrow();
  });

  it('lädt die übergebenen VorgabenB-Zeilen in eine bestehende Instanz', () => {
    document.body.innerHTML = '<table id="tableVE"></table>';
    const table = createCustomTable('tableVE', { columns: [{ name: 'name', title: 'Name' }], rows: [] });

    generateEingabeTabelleEinstellungenVorgabenB({
      1: { key: 'a', name: 'A' },
      2: { key: 'b', name: 'B' },
    } as never);

    expect(table.getRows()).toHaveLength(2);
    expect(table.getRows().map(r => (r.cells as { name: string }).name)).toEqual(['A', 'B']);
  });

  it('fällt ohne Argument auf VorgabenB aus Storage zurück', () => {
    document.body.innerHTML = '<table id="tableVE"></table>';
    const table = createCustomTable('tableVE', { columns: [{ name: 'name', title: 'Name' }], rows: [] });
    storageCheckMock.mockReturnValue(true);
    storageGetMock.mockReturnValue({ VorgabenB: { 1: { key: 'a', name: 'A' } } });

    generateEingabeTabelleEinstellungenVorgabenB();

    expect(table.getRows()).toHaveLength(1);
    expect(table instanceof CustomTable).toBe(true);
  });

  it('lädt ein leeres Array, wenn Storage kein VorgabenU hat und kein Argument übergeben wird', () => {
    document.body.innerHTML = '<table id="tableVE"></table>';
    const table = createCustomTable('tableVE', {
      columns: [{ name: 'name', title: 'Name' }],
      rows: [{ name: 'Alt' }],
    });

    generateEingabeTabelleEinstellungenVorgabenB();

    expect(table.getRows()).toHaveLength(0);
  });
});
