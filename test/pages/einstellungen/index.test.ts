import { describe, expect, it, vi } from 'bun:test';

const { taskRef, changeMonatJahrMock } = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  taskRef: { fn: null as (() => void | Promise<void>) | null },
  changeMonatJahrMock: vi.fn(),
}));

vi.mock('@/shared/lib/lifecycle/bootstrap', () => ({
  registerAppStartTask: (task: () => void | Promise<void>) => {
    taskRef.fn ??= task;
  },
}));

vi.mock('@/shared/model/period/changeMonatJahr', () => ({ default: changeMonatJahrMock }));

describe('pages/einstellungen: Monats-/Jahreswechsel', () => {
  it('reagiert auf `#Monat`/`#Jahr`, die erst nach dem Start-Task ihre `id` bekommen (DBSelect/DBInput)', async () => {
    await import('@/pages/einstellungen');
    expect(taskRef.fn).not.toBeNull();
    document.body.innerHTML = '';
    await taskRef.fn?.();

    // Erst jetzt im DOM, wie bei DB-UX-Komponenten, die die `id` nach dem Mount setzen.
    document.body.innerHTML =
      '<select id="Monat"><option value="9">9</option></select><input id="Jahr"><input id="Anderes">';
    for (const id of ['Monat', 'Jahr', 'Anderes'])
      document.getElementById(id)?.dispatchEvent(new Event('change', { bubbles: true }));

    expect(changeMonatJahrMock).toHaveBeenCalledTimes(2);
    expect((changeMonatJahrMock.mock.calls[0][0] as Event).target).toBe(document.getElementById('Monat'));
  });
});
