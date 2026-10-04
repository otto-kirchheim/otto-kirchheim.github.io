import { describe, expect, it, spyOn, vi } from 'bun:test';
import { aktualisiereApp } from '@/app/shell/setVersionOutdated';

describe('aktualisiereApp', () => {
  it('laedt auch ohne wartenden Service Worker neu (vorher blieb der Knopf wirkungslos)', async () => {
    const neuLaden = spyOn(location, 'reload').mockImplementation(() => undefined);
    const updateSW = vi.fn(async () => undefined);

    await aktualisiereApp(updateSW);

    expect(updateSW).toHaveBeenCalledWith(true);
    expect(neuLaden).toHaveBeenCalledTimes(1);
    neuLaden.mockRestore();
  });

  it('laedt neu, auch wenn das Service-Worker-Update scheitert', async () => {
    const neuLaden = spyOn(location, 'reload').mockImplementation(() => undefined);

    await aktualisiereApp(async () => {
      throw new Error('kein Worker');
    });

    expect(neuLaden).toHaveBeenCalledTimes(1);
    neuLaden.mockRestore();
  });
});
