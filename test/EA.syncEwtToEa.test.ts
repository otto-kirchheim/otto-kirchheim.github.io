import { beforeEach, describe, expect, it, vi } from 'bun:test';
import type { IDatenEA, IDatenEWT } from '@/core/types';
import Storage from '@/infrastructure/storage/Storage';

const { mockPublishEvent } = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  mockPublishEvent: vi.fn(),
}));

vi.mock('@/core', () => ({
  publishEvent: mockPublishEvent,
}));

import syncEaDurationFromEwtRows from '@/features/EA/utils/syncEwtToEa';

function makeEwt(overrides: Partial<IDatenEWT> & { _id: string }): IDatenEWT {
  const { _id, ...rest } = overrides;
  return {
    _id,
    Tag: '2026-03-01',
    Einsatzort: '',
    Schicht: 'T',
    abWE: '06:00',
    ab1E: '06:00',
    anEE: '14:00',
    beginE: overrides.beginE ?? '06:00',
    endeE: overrides.endeE ?? '14:00',
    abEE: '14:00',
    an1E: '14:00',
    anWE: '14:00',
    berechnen: false,
    ...rest,
  };
}

function makeEA(overrides: Partial<IDatenEA>): IDatenEA {
  return {
    Tag: '2026-03-01',
    Dauer: '07:30',
    Taetigkeit: '',
    Entgeltgruppe: '',
    ...overrides,
  };
}

function mountTableEA(rows: (IDatenEA & { _state?: string })[]) {
  const el = document.createElement('table');
  el.id = 'tableEA';
  const tableRows = rows.map(r => ({
    _state: r._state ?? 'unchanged',
    cells: { ...r } as IDatenEA,
    _originalCells: { ...r } as IDatenEA,
  }));
  const instance = { rows: { array: tableRows }, drawRows: vi.fn() };
  (el as HTMLTableElement & { instance: typeof instance }).instance = instance;
  document.body.appendChild(el);
  return instance;
}

describe('syncEaDurationFromEwtRows', () => {
  beforeEach(() => {
    localStorage.clear();
    mockPublishEvent.mockReset();
  });

  it('does nothing when updatedEwtRows is empty', () => {
    const setSpied = vi.spyOn(Storage, 'set');
    syncEaDurationFromEwtRows([]);
    expect(setSpied).not.toHaveBeenCalled();
    expect(mockPublishEvent).not.toHaveBeenCalled();
  });

  it('does nothing when no EA items have an EWT', () => {
    Storage.set('dataEA', [makeEA({ Tag: '2026-03-01' })]);
    const setSpied = vi.spyOn(Storage, 'set');

    syncEaDurationFromEwtRows([makeEwt({ _id: 'ewt-1', beginE: '08:00', endeE: '16:00' })]);

    expect(setSpied).not.toHaveBeenCalled();
    expect(mockPublishEvent).not.toHaveBeenCalled();
  });

  it('does nothing when Dauer already matches the computed value from the EWT row', () => {
    // 08:00 -> 16:00 = 8h roh, 30 Minuten Pause -> 07:30 Dauer
    Storage.set('dataEA', [makeEA({ EWT: 'ewt-1', Dauer: '07:30' })]);
    const setSpied = vi.spyOn(Storage, 'set');

    syncEaDurationFromEwtRows([makeEwt({ _id: 'ewt-1', beginE: '08:00', endeE: '16:00' })]);

    expect(setSpied).not.toHaveBeenCalled();
  });

  it('updates Storage when the linked EWT times change the computed Dauer, and #tableEA is absent', () => {
    const eaItem = makeEA({ _id: 'ea-1', EWT: 'ewt-1', Dauer: '07:30' });
    Storage.set('dataEA', [eaItem]);

    // 08:00 -> 18:00 = 10h roh, 45 Minuten Pause -> 09:15 Dauer
    syncEaDurationFromEwtRows([makeEwt({ _id: 'ewt-1', beginE: '08:00', endeE: '18:00' })]);

    const stored = Storage.get<IDatenEA[]>('dataEA', { default: [] });
    expect(stored[0].Dauer).toBe('09:15');
    expect(mockPublishEvent).not.toHaveBeenCalled(); // no table → no event
  });

  it('updates Storage AND live table rows, calls drawRows and publishes event', () => {
    const eaItem = makeEA({ _id: 'ea-1', EWT: 'ewt-1', Dauer: '07:30' });
    Storage.set('dataEA', [eaItem]);
    const instance = mountTableEA([{ ...eaItem, _state: 'unchanged' } as IDatenEA & { _state: string }]);

    syncEaDurationFromEwtRows([makeEwt({ _id: 'ewt-1', beginE: '08:00', endeE: '18:00' })]);

    const stored = Storage.get<IDatenEA[]>('dataEA', { default: [] });
    expect(stored[0].Dauer).toBe('09:15');

    expect(instance.rows.array[0].cells.Dauer).toBe('09:15');
    expect(instance.rows.array[0]._state).toBe('modified');
    expect(instance.drawRows).toHaveBeenCalled();
    expect(mockPublishEvent).toHaveBeenCalledWith('data:changed', { resource: 'EA', action: 'update' });
  });

  it('skips deleted table rows', () => {
    const eaItem = makeEA({ _id: 'ea-1', EWT: 'ewt-1', Dauer: '07:30' });
    Storage.set('dataEA', [eaItem]);
    const instance = mountTableEA([{ ...eaItem, _state: 'deleted' } as IDatenEA & { _state: string }]);

    syncEaDurationFromEwtRows([makeEwt({ _id: 'ewt-1', beginE: '08:00', endeE: '18:00' })]);

    expect(instance.rows.array[0]._state).toBe('deleted');
    expect(instance.drawRows).not.toHaveBeenCalled();
    expect(mockPublishEvent).not.toHaveBeenCalled();
  });

  it('ignores EWT rows without _id', () => {
    const eaItem = makeEA({ EWT: 'ewt-1', Dauer: '07:30' });
    Storage.set('dataEA', [eaItem]);
    const setSpied = vi.spyOn(Storage, 'set');

    const ewtNoId: IDatenEWT = makeEwt({ _id: '' as unknown as string, beginE: '08:00', endeE: '18:00' });
    delete (ewtNoId as Partial<IDatenEWT>)._id;
    syncEaDurationFromEwtRows([ewtNoId]);

    expect(setSpied).not.toHaveBeenCalled();
  });
});
