import { beforeEach, describe, expect, it, vi } from 'bun:test';

const {
  taskRef,
  onEventMock,
  markStepMock,
  initBerechnungMonatsFensterNavMock,
  aktualisiereBerechnungMock,
  generateTableBerechnungMock,
  storageCheckMock,
  storageGetMock,
} = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  taskRef: { fn: null as (() => void | Promise<void>) | null },
  onEventMock: vi.fn(),
  markStepMock: vi.fn(),
  initBerechnungMonatsFensterNavMock: vi.fn(),
  aktualisiereBerechnungMock: vi.fn(),
  generateTableBerechnungMock: vi.fn(),
  storageCheckMock: vi.fn(),
  storageGetMock: vi.fn(),
}));

vi.mock('@/core', () => ({
  registerAppStartTask: (task: () => void | Promise<void>) => {
    taskRef.fn = task;
  },
}));

vi.mock('@/core/orchestration/initSequence', () => ({
  markStep: markStepMock,
}));

vi.mock('@/core/events/appEvents', () => ({
  onEvent: onEventMock,
}));

vi.mock('@/infrastructure/storage/Storage', () => ({
  default: { check: storageCheckMock, get: storageGetMock },
}));

vi.mock('@/features/Berechnung/aktualisiereBerechnung', () => ({
  default: aktualisiereBerechnungMock,
}));

vi.mock('@/features/Berechnung/generateTableBerechnung', () => ({
  default: generateTableBerechnungMock,
}));

vi.mock('@/features/Berechnung/berechnungMonatsFenster', () => ({
  initBerechnungMonatsFensterNav: initBerechnungMonatsFensterNavMock,
}));

let berechnungModuleLoaded = false;

describe('features/Berechnung index', () => {
  beforeEach(async () => {
    if (!berechnungModuleLoaded) {
      await import('@/features/Berechnung');
      berechnungModuleLoaded = true;
    }
    vi.clearAllMocks();
    storageCheckMock.mockReturnValue(false);
  });

  it('registriert einen App-Start-Task', () => {
    expect(taskRef.fn).not.toBeNull();
  });

  it('bindet data:changed an aktualisiereBerechnung und initialisiert die Monatsfenster-Navigation', async () => {
    await taskRef.fn?.();

    expect(onEventMock).toHaveBeenCalledWith('data:changed', expect.any(Function));
    onEventMock.mock.calls[0][1]();
    expect(aktualisiereBerechnungMock).toHaveBeenCalledTimes(1);

    expect(initBerechnungMonatsFensterNavMock).toHaveBeenCalledTimes(1);
    expect(markStepMock).toHaveBeenCalledWith('boot', 'boot:berechnung');
  });

  it('generiert die Tabelle initial, wenn alle nötigen Storage-Werte vorhanden sind', async () => {
    storageCheckMock.mockReturnValue(true);
    storageGetMock.mockImplementation((key: string) => ({ key }));

    await taskRef.fn?.();

    expect(generateTableBerechnungMock).toHaveBeenCalledWith({ key: 'datenBerechnung' }, { key: 'VorgabenGeld' });
  });

  it('generiert die Tabelle nicht, wenn Storage-Werte fehlen', async () => {
    storageCheckMock.mockReturnValue(false);

    await taskRef.fn?.();

    expect(generateTableBerechnungMock).not.toHaveBeenCalled();
  });
});
