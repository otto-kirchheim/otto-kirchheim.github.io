import { setGloballyDisabled } from './globalDisableStore';

/**
 * Deaktiviert oder aktiviert alle Buttons mit [data-disabler] im gesamten DOM.
 * Wird z.B. bei Offline-Wechsel oder globalen Sperren verwendet.
 *
 * Der DOM-Sweep bleibt fuer noch-native `<button data-disabler>`-Elemente bestehen;
 * `setGloballyDisabled` zusaetzlich, damit `DBLoadingButton`s eigener (React-verwalteter)
 * `disabled`-Zustand dieses globale Disable nicht durch einen eigenen Re-Render ueberschreibt
 * (siehe `globalDisableStore.ts`).
 */
export function setDisableButton(disabled: boolean): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>('button[data-disabler]');
  buttons.forEach(btn => {
    btn.disabled = disabled;
  });
  setGloballyDisabled(disabled);
}

// Legacy-Kompatibilität: default-Export für buttonDisable
const buttonDisable = setDisableButton;
export default buttonDisable;
