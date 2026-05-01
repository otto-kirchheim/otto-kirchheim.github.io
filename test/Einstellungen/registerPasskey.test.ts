import { beforeEach, describe, expect, it, vi } from 'bun:test';

const { registerPasskeyWithResultMock } = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  registerPasskeyWithResultMock: vi.fn(),
}));

vi.mock('@/infrastructure/tokenManagement/passkeys', () => ({
  registerPasskeyWithResult: registerPasskeyWithResultMock,
}));

import registerPasskey from '@/features/Einstellungen/utils/registerPasskey';

describe('registerPasskey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gibt true zurück wenn registerPasskeyWithResult ok: true zurückgibt', async () => {
    registerPasskeyWithResultMock.mockResolvedValue({ ok: true, reason: 'success', message: '' });
    expect(await registerPasskey()).toBe(true);
  });

  it('gibt false zurück wenn registerPasskeyWithResult ok: false zurückgibt (cancelled)', async () => {
    registerPasskeyWithResultMock.mockResolvedValue({ ok: false, reason: 'cancelled', message: '' });
    expect(await registerPasskey()).toBe(false);
  });

  it('gibt false zurück wenn registerPasskeyWithResult ok: false zurückgibt (unsupported)', async () => {
    registerPasskeyWithResultMock.mockResolvedValue({ ok: false, reason: 'unsupported', message: '' });
    expect(await registerPasskey()).toBe(false);
  });

  it('gibt false zurück wenn registerPasskeyWithResult ok: false zurückgibt (error)', async () => {
    registerPasskeyWithResultMock.mockResolvedValue({ ok: false, reason: 'error', message: 'Fehler' });
    expect(await registerPasskey()).toBe(false);
  });
});
