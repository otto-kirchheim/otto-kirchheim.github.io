import { setGloballyDisabled } from './globalDisableStore';

/**
 * Deaktiviert oder aktiviert alle Buttons mit `[data-disabler]` im gesamten DOM, z.B. bei
 * Offline-Wechsel oder globalen Sperren.
 *
 * Der DOM-Sweep erfasst native `<button data-disabler>`-Elemente; `setGloballyDisabled` zusaetzlich,
 * damit `DBLoadingButton`s React-verwalteter `disabled`-Zustand dieses globale Disable nicht beim
 * naechsten Re-Render ueberschreibt (siehe `globalDisableStore.ts`).
 *
 * @param disabled - `true` sperrt alle Buttons, `false` gibt sie frei.
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
