/**
 * Sichtbarkeit der Hauptnavigation (Phase K5). Ersetzt das bisherige `#navmenu`-`d-none`-Toggle
 * (`auth/index.ts`, `loadUserDaten.ts`, `logoutUser.ts`): `DBHeader` rendert seine `children`
 * selbst (Desktop-Kopfzeile + Drawer-Kopie), es gibt keinen `#navmenu`-Knoten mehr, an dem eine
 * Klasse haengen koennte. `AppHeader.tsx` haengt die `d-none`-Klasse stattdessen reaktiv an
 * `<DBNavigation>` selbst.
 *
 * WICHTIG: `<DBNavigation>` wird IMMER gerendert (nur die Klasse wechselt), NICHT bedingt
 * (`{sichtbar && <DBNavigation>}`). Erster Versuch war bedingtes Rendern -- brach `auth/index.ts`s
 * `updateTabVisibility()`/Admin-Toggle/Klick-Listener-Anmeldung, die alle per `querySelector`
 * auf Nav-Kinder (`#admin-tab`, `#bereitschaft-tab`, ...) zugreifen: die Elemente existierten zum
 * Zeitpunkt dieser Aufrufe noch gar nicht im DOM (Nav erst NACH `setNavigationSichtbar(true)`
 * gemountet), die Aufrufe liefen ins Leere, und niemand wiederholte sie danach. Mit permanentem
 * Rendern existieren die Elemente immer, exakt wie beim alten `#navmenu`-Div.
 *
 * Der Burger-Knopf selbst bleibt bewusst IMMER sichtbar -- `DBHeader` erzeugt ihn intern ohne
 * Sichtbarkeits-Prop, ein Verstecken ist ohne Eingriff in die Komponente nicht vorgesehen
 * (User-Entscheidung: vor Login oeffnet er eine fast leere Schublade statt zu verschwinden).
 */

type Listener = () => void;

let sichtbar = false;
const listeners = new Set<Listener>();

export function isNavigationSichtbar(): boolean {
  return sichtbar;
}

export function subscribeNavigationSichtbar(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setNavigationSichtbar(next: boolean): void {
  if (next === sichtbar) return;
  sichtbar = next;
  for (const listener of listeners) listener();
}
