import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { default as Storage } from '@/infrastructure/storage/Storage';
import { authApi } from '@/infrastructure/api/apiService';

export default async function requestVerificationMail(email?: string): Promise<void> {
  const fallbackEmail = Storage.get<string>('BenutzerEmail', { default: '' });
  await authApi.resendVerificationEmail(email ?? (fallbackEmail || undefined));
  createSnackBar({
    message: 'Falls erforderlich, wurde eine neue Verifizierungs-E-Mail versendet.',
    status: 'info',
    timeout: 4000,
    fixed: true,
  });
}
