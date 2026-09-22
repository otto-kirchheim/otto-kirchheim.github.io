/**
 * Globaler Sperrzustand fuer `[data-disabler]`-Buttons, abonnierbar fuer React-verwaltete Buttons
 * (`DBLoadingButton`). `buttonDisable.ts` setzt `disabled` per DOM-Sweep; bei einem `DBButton`,
 * dessen `disabled`-Prop React selbst steuert, ueberschreibt der naechste Re-Render diesen Sweep
 * (beobachtet: `clearLoading('btnESE')` setzte `btnESE.disabled` auf `false`, obwohl ein globales
 * `buttonDisable(true)` noch aktiv war). `DBLoadingButton` verrechnet deshalb diesen Store mit
 * seinem eigenen Ladezustand.
 */

type Listener = () => void;

let disabled = false;
const listeners = new Set<Listener>();

/**
 * Liefert den globalen Sperrzustand.
 *
 * @returns `true`, wenn `[data-disabler]`-Buttons global gesperrt sind.
 */
export function isGloballyDisabled(): boolean {
  return disabled;
}

/**
 * Registriert einen Listener fuer Aenderungen des globalen Sperrzustands.
 *
 * @param listener - Callback ohne Argumente.
 * @returns Funktion, die den Listener wieder abmeldet.
 */
export function subscribeGlobalDisable(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Setzt den globalen Sperrzustand und benachrichtigt die Listener; bei unveraendertem Wert passiert nichts.
 *
 * @param next - Neuer Zustand.
 */
export function setGloballyDisabled(next: boolean): void {
  if (next === disabled) return;
  disabled = next;
  for (const listener of listeners) listener();
}
