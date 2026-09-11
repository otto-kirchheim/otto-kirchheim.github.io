/**
 * Globaler An-/Aus-Zustand fuer `[data-disabler]`-Buttons, fuer React-verwaltete Buttons
 * (`DBLoadingButton`). `buttonDisable.ts` setzt `disabled` bisher per DOM-Sweep direkt am
 * `HTMLButtonElement` -- fuer einen `DBButton`, dessen `disabled`-Prop React selbst steuert
 * (z.B. `DBLoadingButton` waehrend eines EIGENEN Ladezyklus), ueberschreibt der naechste
 * React-Re-Render diesen Sweep wieder (beobachtet: `clearLoading('btnESE')` setzte
 * `btnESE.disabled` faelschlich auf `false` zurueck, obwohl ein GLOBALES `buttonDisable(true)`
 * fuer einen ANDEREN Button noch aktiv war). Dieser Store macht den globalen Zustand
 * zusaetzlich deklarativ abonnierbar, `DBLoadingButton` verrechnet ihn mit seinem eigenen
 * Ladezustand.
 */

type Listener = () => void;

let disabled = false;
const listeners = new Set<Listener>();

export function isGloballyDisabled(): boolean {
  return disabled;
}

export function subscribeGlobalDisable(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setGloballyDisabled(next: boolean): void {
  if (next === disabled) return;
  disabled = next;
  for (const listener of listeners) listener();
}
