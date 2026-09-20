import { registerPasskeyWithResult } from '@/infrastructure/tokenManagement/passkeys';

/**
 * Richtet einen Passkey für den angemeldeten Benutzer ein.
 *
 * @returns `true` bei erfolgreicher Registrierung.
 */
export default async function registerPasskey(): Promise<boolean> {
  const result = await registerPasskeyWithResult();
  return result.ok;
}
