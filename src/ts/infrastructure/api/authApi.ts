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
  /**
   * Meldet mit Benutzername und Passwort an; speichert Access- und Refresh-Token im Storage.
   *
   * @param userName - Benutzername.
   * @param password - Passwort.
   */
  async login(userName: string, password: string): Promise<void> {
    const result = await apiFetch<
      { userName: string; password: string },
      { user: unknown; accessToken: string; refreshToken: string }
    >('auth/login', { userName, password }, 'POST');
    Storage.set('AccessToken', result.accessToken);
    Storage.set('RefreshToken', result.refreshToken);
  },

  /**
   * Fordert Passkey-Login-Optionen (Challenge) an.
   *
   * @param userName - Optionaler Benutzername zur Eingrenzung der Passkeys.
   * @returns WebAuthn-Optionen, `challengeToken` und ggf. der Benutzername.
   */
  async beginPasskeyLogin(userName?: string): Promise<PasskeyLoginStartResponse> {
    return apiFetch<{ userName?: string }, PasskeyLoginStartResponse>(
      'auth/passkeys/login/options',
      userName ? { userName } : undefined,
      'POST',
    );
  },

  /**
   * Schließt den Passkey-Login mit der Assertion ab; speichert Access- und Refresh-Token im Storage.
   *
   * @param credential - Antwort des Authenticators.
   * @param challengeToken - Token aus `beginPasskeyLogin`.
   * @param userName - Optionaler Benutzername.
   * @returns Antwort mit Benutzer und beiden Token.
   */
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

  /**
   * Setzt nach frischer Passkey-Assertion ein neues Passwort (ohne altes Passwort).
   *
   * @param credential - Frische Passkey-Assertion.
   * @param challengeToken - Token aus `beginPasskeyLogin`.
   * @param newPassword - Neues Passwort.
   */
  async setPasswordWithPasskey(
    credential: AuthenticationResponseJSON,
    challengeToken: string,
    newPassword: string,
  ): Promise<void> {
    const result = await apiFetch<
      { credential: AuthenticationResponseJSON; challengeToken: string; newPassword: string },
      { accessToken: string; refreshToken: string }
    >('auth/passkeys/set-password', { credential, challengeToken, newPassword }, 'POST');
    Storage.set('AccessToken', result.accessToken);
    Storage.set('RefreshToken', result.refreshToken);
  },

  /**
   * Registriert einen Benutzer mit Zugangscode; speichert Access- und Refresh-Token im Storage.
   *
   * @param userName - Benutzername.
   * @param email - E-Mail-Adresse.
   * @param password - Passwort.
   * @param accessCode - Zugangscode zur Registrierung.
   */
  async register(userName: string, email: string, password: string, accessCode: string): Promise<void> {
    const result = await apiFetch<
      { userName: string; email: string; password: string; accessCode: string },
      { user: unknown; accessToken: string; refreshToken: string }
    >('auth/register', { userName, email, password, accessCode }, 'POST');
    Storage.set('AccessToken', result.accessToken);
    Storage.set('RefreshToken', result.refreshToken);
  },

  /**
   * Tauscht das gespeicherte Refresh-Token gegen neue Token und speichert sie. Bei Fehler werden beide Token aus dem Storage entfernt.
   *
   * @returns Benutzername und Rolle aus der Antwort.
   * @throws {Error} Ohne Refresh-Token, bei fehlgeschlagenem Refresh oder unvollständiger Antwort.
   */
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

  /**
   * Ändert das Passwort des angemeldeten Benutzers.
   *
   * @param currentPassword - Aktuelles Passwort.
   * @param newPassword - Neues Passwort.
   * @returns Immer `true`; Fehler kommen als Exception.
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    await apiFetch<{ currentPassword: string; newPassword: string }, unknown>(
      'auth/change-password',
      { currentPassword, newPassword },
      'POST',
    );
    return true;
  },

  /**
   * Fordert eine Mail zum Zurücksetzen des Passworts an.
   *
   * @param email - E-Mail-Adresse des Kontos.
   */
  async forgotPassword(email: string): Promise<void> {
    await apiFetch<{ email: string }, unknown>('auth/forgot-password', { email }, 'POST');
  },

  /**
   * Setzt das Passwort über den Link-Token aus der Reset-Mail zurück.
   *
   * @param token - Token aus dem Reset-Link.
   * @param newPassword - Neues Passwort.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiFetch<{ newPassword: string }, unknown>(
      `auth/reset-password/${encodeURIComponent(token)}`,
      { newPassword },
      'POST',
    );
  },

  /**
   * Sendet die Verifizierungs-Mail erneut.
   *
   * @param email - Optionale E-Mail-Adresse; ohne Angabe gilt das angemeldete Konto.
   */
  async resendVerificationEmail(email?: string): Promise<void> {
    await apiFetch<{ email?: string }, unknown>('auth/resend-verification-email', { email }, 'POST');
  },

  /**
   * Liefert das Profil des angemeldeten Benutzers.
   *
   * @returns Id, Benutzername, Rolle, E-Mail und ggf. Verifizierungsstatus.
   */
  async me(): Promise<{ id: string; userName: string; role: string; email: string; emailVerified?: boolean }> {
    return apiFetch('auth/me');
  },

  /**
   * Liefert die registrierten Passkeys des angemeldeten Benutzers.
   *
   * @returns Liste mit Credential-Id, Name, Gerätetyp, Backup-Status und Zeitstempeln.
   */
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

  /**
   * Fordert die WebAuthn-Optionen zum Registrieren eines neuen Passkeys an.
   *
   * @returns Registrierungsoptionen.
   */
  async beginPasskeyRegistration(): Promise<PublicKeyCredentialCreationOptionsJSON> {
    return apiFetch<undefined, PublicKeyCredentialCreationOptionsJSON>(
      'auth/passkeys/register/options',
      undefined,
      'POST',
    );
  },

  /**
   * Schließt die Passkey-Registrierung mit der Antwort des Authenticators ab.
   *
   * @param credential - Antwort des Authenticators.
   * @param deviceName - Optionaler Anzeigename des Geräts.
   * @returns Credential-Id und Name des neuen Passkeys.
   */
  async finishPasskeyRegistration(
    credential: RegistrationResponseJSON,
    deviceName?: string,
  ): Promise<{ credentialId: string; name: string }> {
    return apiFetch<
      { credential: RegistrationResponseJSON; deviceName?: string },
      { credentialId: string; name: string }
    >('auth/passkeys/register/verify', { credential, deviceName }, 'POST');
  },

  /**
   * Löscht einen Passkey.
   *
   * @param credentialId - Credential-Id des Passkeys.
   */
  async deletePasskey(credentialId: string): Promise<void> {
    await apiFetch<undefined, unknown>(`auth/passkeys/${encodeURIComponent(credentialId)}`, undefined, 'DELETE');
  },

  /**
   * Meldet die Sitzung am Server ab; ohne Access-Token passiert nichts. Fehler werden ignoriert.
   */
  async logout(): Promise<void> {
    try {
      const accessToken = Storage.check('AccessToken') ? Storage.get<string>('AccessToken', true) : null;
      if (!accessToken) return;

      const serverUrl = await getServerUrl();
      const response = await fetch(`${serverUrl}/auth/logout`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'x-client-version': import.meta.env.APP_VERSION,
        },
      });

      if (!response.ok && response.status !== 401) {
        throw new Error(`Logout fehlgeschlagen (${response.status})`);
      }
    } catch {
      // logoutUser-Fehler ignorieren – lokale Daten werden sowieso gelöscht
    }
  },
};
