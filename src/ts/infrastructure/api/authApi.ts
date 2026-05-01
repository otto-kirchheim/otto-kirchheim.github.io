import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/browser';
import Storage from '../storage/Storage';
import { getServerUrl } from './FetchRetry';
import { apiFetch } from './apiFetchHelper';

interface PasskeyLoginStartResponse {
  options: PublicKeyCredentialRequestOptionsJSON;
  challengeToken: string;
  userName?: string;
}

export const authApi = {
  async login(userName: string, password: string): Promise<void> {
    const result = await apiFetch<
      { userName: string; password: string },
      { user: unknown; accessToken: string; refreshToken: string }
    >('auth/login', { userName, password }, 'POST');
    Storage.set('AccessToken', result.accessToken);
    Storage.set('RefreshToken', result.refreshToken);
  },

  async beginPasskeyLogin(userName?: string): Promise<PasskeyLoginStartResponse> {
    return apiFetch<{ userName?: string }, PasskeyLoginStartResponse>(
      'auth/passkeys/login/options',
      userName ? { userName } : undefined,
      'POST',
    );
  },

  async finishPasskeyLogin(
    credential: AuthenticationResponseJSON,
    challengeToken: string,
    userName?: string,
  ): Promise<{ user: unknown; accessToken: string; refreshToken: string }> {
    const result = await apiFetch<
      { userName?: string; challengeToken: string; credential: AuthenticationResponseJSON },
      { user: unknown; accessToken: string; refreshToken: string }
    >('auth/passkeys/login/verify', { userName, challengeToken, credential }, 'POST');
    Storage.set('AccessToken', result.accessToken);
    Storage.set('RefreshToken', result.refreshToken);
    return result;
  },

  async register(userName: string, email: string, password: string, accessCode: string): Promise<void> {
    const result = await apiFetch<
      { userName: string; email: string; password: string; accessCode: string },
      { user: unknown; accessToken: string; refreshToken: string }
    >('auth/register', { userName, email, password, accessCode }, 'POST');
    Storage.set('AccessToken', result.accessToken);
    Storage.set('RefreshToken', result.refreshToken);
  },

  async refreshToken(): Promise<{ userName: string; role: string } | null> {
    const refreshToken = Storage.check('RefreshToken') ? Storage.get<string>('RefreshToken', true) : null;
    if (!refreshToken) throw new Error('Kein Refresh-Token vorhanden');

    type RefreshResponseData = {
      userName: string;
      role: string;
      accessToken: string;
      refreshToken: string;
    };

    try {
      const refreshData = await apiFetch<{ refreshToken: string }, RefreshResponseData>(
        'auth/refresh-token',
        { refreshToken },
        'POST',
      );

      if (!refreshData.accessToken || !refreshData.refreshToken) {
        throw new Error('Token-Refresh fehlgeschlagen');
      }

      Storage.set('AccessToken', refreshData.accessToken);
      Storage.set('RefreshToken', refreshData.refreshToken);

      return { userName: refreshData.userName, role: refreshData.role };
    } catch (error) {
      Storage.remove('AccessToken');
      Storage.remove('RefreshToken');
      throw new Error(error instanceof Error ? error.message : 'Token-Refresh fehlgeschlagen', { cause: error });
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    await apiFetch<{ currentPassword: string; newPassword: string }, unknown>(
      'auth/change-password',
      { currentPassword, newPassword },
      'POST',
    );
    return true;
  },

  async forgotPassword(email: string): Promise<void> {
    await apiFetch<{ email: string }, unknown>('auth/forgot-password', { email }, 'POST');
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiFetch<{ newPassword: string }, unknown>(
      `auth/reset-password/${encodeURIComponent(token)}`,
      { newPassword },
      'POST',
    );
  },

  async resendVerificationEmail(email?: string): Promise<void> {
    await apiFetch<{ email?: string }, unknown>('auth/resend-verification-email', { email }, 'POST');
  },

  async me(): Promise<{ id: string; userName: string; role: string; email: string; emailVerified?: boolean }> {
    return apiFetch('auth/me');
  },

  async getPasskeys(): Promise<
    Array<{
      credentialId: string;
      name: string;
      deviceType: string;
      backedUp: boolean;
      createdAt: string;
      lastUsedAt?: string;
    }>
  > {
    return apiFetch('auth/passkeys');
  },

  async beginPasskeyRegistration(): Promise<PublicKeyCredentialCreationOptionsJSON> {
    return apiFetch<undefined, PublicKeyCredentialCreationOptionsJSON>(
      'auth/passkeys/register/options',
      undefined,
      'POST',
    );
  },

  async finishPasskeyRegistration(
    credential: RegistrationResponseJSON,
    deviceName?: string,
  ): Promise<{ credentialId: string; name: string }> {
    return apiFetch<
      { credential: RegistrationResponseJSON; deviceName?: string },
      { credentialId: string; name: string }
    >('auth/passkeys/register/verify', { credential, deviceName }, 'POST');
  },

  async deletePasskey(credentialId: string): Promise<void> {
    await apiFetch<undefined, unknown>(`auth/passkeys/${encodeURIComponent(credentialId)}`, undefined, 'DELETE');
  },

  async logout(): Promise<void> {
    try {
      const accessToken = Storage.check('AccessToken') ? Storage.get<string>('AccessToken', true) : null;
      if (!accessToken) return;

      const serverUrl = await getServerUrl();
      const response = await fetch(`${serverUrl}/auth/logout`, {
        method: 'POST',
        mode: 'cors',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok && response.status !== 401) {
        throw new Error(`Logout fehlgeschlagen (${response.status})`);
      }
    } catch {
      // logoutUser-Fehler ignorieren – lokale Daten werden sowieso gelöscht
    }
  },
};
