import { registerPasskeyWithResult } from '../../../infrastructure/tokenManagement/passkeys';

export default async function registerPasskey(): Promise<boolean> {
  const result = await registerPasskeyWithResult();
  return result.ok;
}
