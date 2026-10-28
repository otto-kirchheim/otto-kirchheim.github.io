import { beforeEach, describe, expect, it, vi } from 'bun:test';
import '@/app/features';
import { createCustomTable } from '@/shared/ui/custom-table/CustomTable';
import dayjs from '@/shared/lib/date/configDayjs';

const { mockEwtBulk } = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  mockEwtBulk: vi.fn(),
}));
vi.mock('@/shared/ui/snackbar/CustomSnackbar', () => ({ createSnackBar: vi.fn() }));

import { ewtApi } from '@/features/ewt/model/backend';
Object.assign(ewtApi, { bulk: mockEwtBulk });

import Storage from '@/shared/lib/storage/Storage';
import { flushAll } from '@/shared/lib/autosave/autoSave';

type Ewt = { _id?: string; Tag: string; Schicht: string; beginE: string; endeE: string };

/**
 * EWT-Tabelle, deren Anzeige-Reihenfolge (nach Tag sortiert, wie `CustomTableView` per
 * `table.rows.array.sort(...)`) von der Einfüge-Reihenfolge im Reducer-State abweicht.
 */
function sortierteTabelle(tage: string[]) {
  document.body.innerHTML = '';
  const el = document.createElement('table');
  el.id = 'tableE';
  document.body.appendChild(el);
  const table = createCustomTable<Ewt>('tableE', { columns: [{ name: 'Tag', title: 'Tag' }], rows: [] });
  for (const Tag of tage) table.rows.add({ Tag, Schicht: 'T', beginE: '07:00', endeE: '15:45' });
  table.rows.array.sort((a, b) => a.cells.Tag.localeCompare(b.cells.Tag));
  return table;
}

/** Antwortet wie das Backend: `_id` enthält den Tag; Creates für Tage in `ablehnen` scheitern. */
function backendAntwort(ablehnen: string[] = []) {
  mockEwtBulk.mockImplementation(async (bulk: { create: (Record<string, unknown> & { clientRequestId: string })[] }) => {
    const created: Record<string, unknown>[] = [];
    const createdReferences: { _id: string; clientRequestId: string }[] = [];
    const errors: { operation: 'create'; clientRequestId: string; message: string }[] = [];
    for (const item of bulk.create) {
      const tag = dayjs(String(item.Tag)).format('YYYY-MM-DD');
      if (ablehnen.includes(tag)) {
        errors.push({ operation: 'create', clientRequestId: item.clientRequestId, message: 'abgelehnt' });
        continue;
      }
      const _id = `id-${tag}`;
      created.push({ ...item, _id, User: 'u' });
      createdReferences.push({ _id, clientRequestId: item.clientRequestId });
    }
    return { created, updated: [], deleted: [], createdReferences, errors };
  });
}

describe('Commit nach Bulk-Save bei sortierter Tabelle', () => {
  beforeEach(() => {
    Storage.set('Benutzer', 'x');
    Storage.set('Monat', 10);
    Storage.set('Jahr', 2026);
    Storage.set('dataE', []);
    mockEwtBulk.mockReset();
  });

  it('ordnet jeder neuen Zeile ihre eigene _id zu, auch wenn Anzeige- und State-Reihenfolge abweichen', async () => {
    const table = sortierteTabelle(['2026-10-23', '2026-10-19', '2026-10-21']);
    backendAntwort();

    await flushAll();

    for (const row of table.rows.array) {
      expect(row._state).toBe('unchanged');
      expect(row._id).toBe(`id-${row.cells.Tag}`);
    }
  });

  it('lässt keine neue Zeile ohne _id als gespeichert zurück, wenn ein Create abgelehnt wird', async () => {
    const table = sortierteTabelle(['2026-10-23', '2026-10-19', '2026-10-21']);
    backendAntwort(['2026-10-21']);

    await flushAll();

    for (const row of table.rows.array) {
      if (row.cells.Tag === '2026-10-21') {
        expect(row._state).toBe('error');
        expect(row._id).toBeUndefined();
      } else {
        expect(row._state).toBe('unchanged');
        expect(row._id).toBe(`id-${row.cells.Tag}`);
      }
    }
    expect(table.rows.array.some(row => row._state === 'unchanged' && !row._id)).toBe(false);
  });

  it('behält eine neue Zeile als neu, wenn das Backend für sie keine _id liefert', async () => {
    const table = sortierteTabelle(['2026-10-19']);
    mockEwtBulk.mockImplementation(async () => ({
      created: [],
      updated: [],
      deleted: [],
      createdReferences: [],
      errors: [],
    }));

    await flushAll();

    const row = table.rows.array[0];
    expect(row._id).toBeUndefined();
    expect(row._state).toBe('new');
    expect(table.rows.getChanges(false).create).toHaveLength(1);
  });
});
