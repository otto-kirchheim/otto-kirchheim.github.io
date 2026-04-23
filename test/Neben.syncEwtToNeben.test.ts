import { beforeEach, describe, expect, it, vi } from 'bun:test';
import type { IDatenEWT, IDatenN } from '../src/ts/interfaces';
import Storage from '../src/ts/infrastructure/storage/Storage';

const { mockPublishEvent } = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  mockPublishEvent: vi.fn(),
}));

vi.mock('../src/ts/core', () => ({
  publishEvent: mockPublishEvent,
}));

import syncNebengeldTimesFromEwtRows from '../src/ts/features/Neben/utils/syncEwtToNeben';

function makeEwt(overrides: Partial<IDatenEWT> & { _id: string }): IDatenEWT {
  return {
    _id: overrides._id,
    tagE: '2026-03-01',
    eOrtE: '',
    schichtE: 'T',
    abWE: '06:00',
    ab1E: '06:00',
    anEE: '14:00',
    beginE: overrides.beginE ?? '06:00',
    endeE: overrides.endeE ?? '14:00',
    abEE: '14:00',
    an1E: '14:00',
    anWE: '14:00',
    berechnen: false,
    ...overrides,
  };
}

function makeN(overrides: Partial<IDatenN>): IDatenN {
  return {
    tagN: '2026-03-01',
    beginN: '06:00',
    endeN: '14:00',
    anzahl040N: 0,
    auftragN: '',
    ...overrides,
  };
}

function mountTableN(rows: (IDatenN & { _state?: string })[]) {
  const el = document.createElement('table');
  el.id = 'tableN';
  const tableRows = rows.map(r => ({
    _state: r._state ?? 'unchanged',
    cells: { ...r } as IDatenN,
    _originalCells: { ...r } as IDatenN,
  }));
  const instance = { rows: { array: tableRows }, drawRows: vi.fn() };
  (el as HTMLTableElement & { instance: typeof instance }).instance = instance;
  document.body.appendChild(el);
  return instance;
}

describe('syncNebengeldTimesFromEwtRows', () => {
  beforeEach(() => {
    localStorage.clear();
    mockPublishEvent.mockReset();
  });

  it('does nothing when updatedEwtRows is empty', () => {
    const setSpied = vi.spyOn(Storage, 'set');
    syncNebengeldTimesFromEwtRows([]);
    expect(setSpied).not.toHaveBeenCalled();
    expect(mockPublishEvent).not.toHaveBeenCalled();
  });

  it('does nothing when no N items have an ewtRef', () => {
    Storage.set('dataN', [makeN({ tagN: '2026-03-01' })]);
    const setSpied = vi.spyOn(Storage, 'set');

    syncNebengeldTimesFromEwtRows([makeEwt({ _id: 'ewt-1', beginE: '08:00', endeE: '16:00' })]);

    expect(setSpied).not.toHaveBeenCalled();
    expect(mockPublishEvent).not.toHaveBeenCalled();
  });

  it('does nothing when begin/endeN already match the EWT values', () => {
    Storage.set('dataN', [makeN({ ewtRef: 'ewt-1', beginN: '08:00', endeN: '16:00' })]);
    const setSpied = vi.spyOn(Storage, 'set');

    syncNebengeldTimesFromEwtRows([makeEwt({ _id: 'ewt-1', beginE: '08:00', endeE: '16:00' })]);

    expect(setSpied).not.toHaveBeenCalled();
  });

  it('updates Storage when EWT times changed and #tableN is absent', () => {
    const nItem = makeN({ _id: 'n-1', ewtRef: 'ewt-1', beginN: '06:00', endeN: '14:00' });
    Storage.set('dataN', [nItem]);

    syncNebengeldTimesFromEwtRows([makeEwt({ _id: 'ewt-1', beginE: '08:00', endeE: '16:00' })]);

    const stored = Storage.get<IDatenN[]>('dataN', { default: [] });
    expect(stored[0].beginN).toBe('08:00');
    expect(stored[0].endeN).toBe('16:00');
    expect(mockPublishEvent).not.toHaveBeenCalled(); // no table → no event
  });

  it('updates Storage AND live table rows, calls drawRows and publishes event', () => {
    const nItem = makeN({ _id: 'n-1', ewtRef: 'ewt-1', beginN: '06:00', endeN: '14:00' });
    Storage.set('dataN', [nItem]);
    const instance = mountTableN([{ ...nItem, _state: 'unchanged' } as IDatenN & { _state: string }]);

    syncNebengeldTimesFromEwtRows([makeEwt({ _id: 'ewt-1', beginE: '08:00', endeE: '16:00' })]);

    const stored = Storage.get<IDatenN[]>('dataN', { default: [] });
    expect(stored[0].beginN).toBe('08:00');
    expect(stored[0].endeN).toBe('16:00');

    expect(instance.rows.array[0].cells.beginN).toBe('08:00');
    expect(instance.rows.array[0].cells.endeN).toBe('16:00');
    expect(instance.rows.array[0]._state).toBe('modified');
    expect(instance.drawRows).toHaveBeenCalled();
    expect(mockPublishEvent).toHaveBeenCalledWith('data:changed', { resource: 'N', action: 'update' });
  });

  it('skips deleted table rows', () => {
    const nItem = makeN({ _id: 'n-1', ewtRef: 'ewt-1', beginN: '06:00', endeN: '14:00' });
    Storage.set('dataN', [nItem]);
    const instance = mountTableN([{ ...nItem, _state: 'deleted' } as IDatenN & { _state: string }]);

    syncNebengeldTimesFromEwtRows([makeEwt({ _id: 'ewt-1', beginE: '08:00', endeE: '16:00' })]);

    // Storage updated, but live row stays unchanged (deleted)
    expect(instance.rows.array[0]._state).toBe('deleted');
    expect(instance.drawRows).not.toHaveBeenCalled();
    // Storage was updated; event NOT fired (tableChanged = false)
    expect(mockPublishEvent).not.toHaveBeenCalled();
  });

  it('ignores EWT rows without _id', () => {
    const nItem = makeN({ ewtRef: 'ewt-1', beginN: '06:00', endeN: '14:00' });
    Storage.set('dataN', [nItem]);
    const setSpied = vi.spyOn(Storage, 'set');

    const ewtNoId: IDatenEWT = makeEwt({ _id: '' as unknown as string, beginE: '08:00', endeE: '16:00' });
    delete (ewtNoId as Partial<IDatenEWT>)._id;
    syncNebengeldTimesFromEwtRows([ewtNoId]);

    expect(setSpied).not.toHaveBeenCalled();
  });
});
