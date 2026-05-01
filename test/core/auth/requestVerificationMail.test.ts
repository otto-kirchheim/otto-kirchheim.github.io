import { beforeEach, describe, expect, it, vi } from 'bun:test';

const { resendVerificationEmailMock, createSnackBarMock, storageGetMock } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  resendVerificationEmailMock: vi.fn().mockResolvedValue(undefined),
  createSnackBarMock: vi.fn(),
  storageGetMock: vi.fn(),
}));

vi.mock('@/infrastructure/api/apiService', () => ({
  authApi: { resendVerificationEmail: resendVerificationEmailMock },
}));

vi.mock('@/infrastructure/ui/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

vi.mock('@/infrastructure/storage/Storage', () => ({
  default: { get: storageGetMock },
}));

import requestVerificationMail from '@/core/orchestration/auth/utils/requestVerificationMail';

describe('requestVerificationMail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageGetMock.mockReturnValue('');
  });

  it('übergibt explizite E-Mail direkt an die API', async () => {
    await requestVerificationMail('user@example.com');

    expect(resendVerificationEmailMock).toHaveBeenCalledWith('user@example.com');
    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'info' }));
  });

  it('nutzt gespeicherte E-Mail als Fallback wenn keine übergeben wird', async () => {
    storageGetMock.mockReturnValue('stored@example.com');

    await requestVerificationMail();

    expect(resendVerificationEmailMock).toHaveBeenCalledWith('stored@example.com');
  });

  it('übergibt undefined wenn weder E-Mail übergeben noch gespeichert ist', async () => {
    storageGetMock.mockReturnValue('');

    await requestVerificationMail();

    expect(resendVerificationEmailMock).toHaveBeenCalledWith(undefined);
  });
});
