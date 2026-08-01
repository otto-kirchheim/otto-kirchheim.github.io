import { PASSWORD_MIN_LENGTH } from './passwordValidation';

export type PasswordStrengthLevel = 'tooWeak' | 'weak' | 'medium' | 'strong';

export function getPasswordStrength(password: string): PasswordStrengthLevel {
  const rulesMatched = [
    password.length >= PASSWORD_MIN_LENGTH,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  if (rulesMatched <= 1) return 'tooWeak';
  if (rulesMatched === 2) return 'weak';
  if (rulesMatched === 3) return 'medium';
  return 'strong';
}
