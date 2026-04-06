export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export function getPasswordValidationMessage(password: string, subject = 'Das Passwort'): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `${subject} muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen lang sein`;
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return `${subject} darf maximal ${PASSWORD_MAX_LENGTH} Zeichen lang sein`;
  }

  return null;
}
