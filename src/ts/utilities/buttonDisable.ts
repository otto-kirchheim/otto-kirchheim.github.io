/**
 * Deaktiviert oder aktiviert alle Buttons mit [data-disabler] im gesamten DOM.
 * Wird z.B. bei Offline-Wechsel oder globalen Sperren verwendet.
 */
export function setDisableButton(disabled: boolean): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>('button[data-disabler]');
  buttons.forEach(btn => {
    btn.disabled = disabled;
  });
}

// Legacy-Kompatibilität: default-Export für buttonDisable
const buttonDisable = setDisableButton;
export default buttonDisable;
