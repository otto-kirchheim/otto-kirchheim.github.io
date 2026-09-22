/**
 * Sichtbarkeit der Feature-Tabs (Nav-Eintrag + Start-Schnellzugriff), geschrieben von `updateTabVisibility.ts`.
 * `AppHeader.tsx` und `StartTab.tsx` lesen reaktiv (`useFeatureTabsVisible.ts`); vorher schaltete `updateTabVisibility`
 * `d-none` per `querySelector` direkt im DOM.
 *
 * Zustand `null` = noch nicht gesetzt (vor dem ersten Login): Nav-Eintraege erscheinen, Schnellzugriffe nicht --
 * wie das bisherige Markup (Nav ohne, Schnellzugriff mit `d-none`). Die gesamte Hauptnavigation blendet
 * `navigationVisibleStore` davon unabhaengig aus.
 */

type Listener = () => void;

let sichtbar: ReadonlySet<string> | null = null;
const listeners = new Set<Listener>();

/**
 * Liefert die sichtbaren Nav-Ids (`meta.legacy.navId`).
 *
 * @returns Menge der sichtbaren Ids oder `null`, solange nichts gesetzt wurde. Die Referenz aendert sich nur bei Aenderung.
 */
export function getFeatureTabsVisible(): ReadonlySet<string> | null {
  return sichtbar;
}

/**
 * Registriert einen Listener fuer Aenderungen der Feature-Tab-Sichtbarkeit.
 *
 * @param listener - Callback ohne Argumente.
 * @returns Funktion, die den Listener wieder abmeldet.
 */
export function subscribeFeatureTabsVisible(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Setzt die sichtbaren Feature-Tabs und benachrichtigt die Listener; bei gleichem Inhalt passiert nichts.
 *
 * @param navIds - Nav-Ids der sichtbaren Tabs; alle anderen sind ausgeblendet.
 */
export function setFeatureTabsVisible(navIds: readonly string[]): void {
  const next = new Set(navIds);
  if (sichtbar && sichtbar.size === next.size && [...next].every(id => sichtbar!.has(id))) return;
  sichtbar = next;
  for (const listener of listeners) listener();
}

/** Setzt den Zustand auf "nicht gesetzt" zurueck (nur fuer Tests). */
export function resetFeatureTabsVisible(): void {
  sichtbar = null;
  for (const listener of listeners) listener();
}
