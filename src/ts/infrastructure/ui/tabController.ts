/**
 * Tab-Navigation der SPA ohne Router (Ersatz fuer Bootstraps `Tab`-Plugin).
 *
 * `#tabContent` enthaelt alle `.tab-pane`s; Schalter sind alle Elemente mit `data-tab-target="<Panel-Id>"`.
 * Sie werden per Delegation bedient, damit die Navigation zwischen Kopfzeile und Schublade umziehen darf.
 * Der Controller wechselt das Panel, schreibt den Hash und meldet den Wechsel als `tab:shown`-CustomEvent,
 * auf das der Feature-Lifecycle hoert.
 *
 * Der aktive Tab jeder Gruppe liegt in einem Store (`activeTabStore` fuer `#tabContent`,
 * `activeAdminTabStore` fuer `#admin-tab-content`; Zuordnung ueber `TAB_GRUPPEN_STORES`). `App.tsx`,
 * `AppHeader.tsx` und `features/Admin/index.tsx` lesen ihn per Hook und berechnen Klassen und
 * `aria-selected`/`tabindex` selbst; `zeigeTab()` schreibt keine DOM-Klassen.
 *
 * Der Store-Wechsel der Hauptgruppe laeuft durch `flushExtern()` (`reactRoot.ts`): der `tab:shown`-Handler in
 * `berechnungMonatsFenster.ts` misst `#Berechnung`s `clientWidth` und braucht das sichtbare Pane VOR dem Event.
 * Nur die Hauptgruppe schreibt den Hash (`istHauptgruppe()`), Admin-Wechsel bewusst nicht.
 */

import { flushExtern } from './reactRoot';
import { getAktivenTab, setAktivenTab } from '../../shared/model/navigation/activeTabStore';
import { getAktivenAdminTab, setAktivenAdminTab } from '../../shared/model/navigation/activeAdminTabStore';

// Standard: alles erlaubt -- der Controller bleibt auth-agnostisch. `auth/index.ts` ersetzt diese
// Pruefung einmal beim Modulladen durch die Login-Pruefung. `zeigeTab()` ist die einzige
// Konvergenzstelle (Hash, Klick, Tastatur, Deep-Link); ein zweiter `hashchange`-Listener in der
// Auth-Schicht waere reihenfolgeabhaengig.
/** Aktuelle Erlaubnis-Pruefung fuer Hauptgruppen-Tabs; per `setzeHauptTabErlaubtPruefung()` austauschbar. */
let istHauptTabErlaubt: (id: string) => boolean = () => true;

/**
 * Ersetzt die Erlaubnis-Pruefung fuer Hauptgruppen-Tabs (z. B. Login-Gate).
 *
 * @param pruefung - Liefert fuer eine Panel-Id, ob der Tab gezeigt werden darf; sonst faellt `zeigeTab()` auf `start` zurueck.
 */
export function setzeHauptTabErlaubtPruefung(pruefung: (id: string) => boolean): void {
  istHauptTabErlaubt = pruefung;
}

export type TabWechsel = { id: string; schalter: HTMLElement | null };

/** Wird auf dem Schalter (bubbelnd) und auf `document` ausgeloest. */
export const TAB_SHOWN_EVENT = 'tab:shown';

const ZIEL_ATTRIBUT = 'data-tab-target';

/**
 * Schreibt den Hash per `history.pushState` statt `location.hash = ...`: Letzteres loest nativ einen
 * Scroll zum gleichnamigen Element aus (die `.tab-pane`s tragen exakt diese Ids) und landet hinter dem
 * `position: sticky`-Header. `pushState` legt denselben History-Eintrag an, ohne zu scrollen;
 * `hashchange` feuert bei Back/Forward weiterhin.
 *
 * @param id - Panel-Id ohne `#`.
 */
function schreibeHash(id: string): void {
  history.pushState(null, '', `#${id}`);
}

/**
 * Sammelt Tab-Schalter (`data-tab-target`).
 *
 * @param id - Panel-Id; ohne Angabe werden alle Schalter geliefert.
 * @returns Passende Schalter (leer, wenn keiner existiert).
 */
function schalter(id?: string): HTMLElement[] {
  const selektor = id ? `[${ZIEL_ATTRIBUT}="${CSS.escape(id)}"]` : `[${ZIEL_ATTRIBUT}]`;
  return Array.from(document.querySelectorAll<HTMLElement>(selektor));
}

/**
 * Sichtbare Tab-Schalter (`role="tab"`, nicht `display:none`) in DOM-Reihenfolge -- Grundlage der Tastatursteuerung.
 *
 * @returns Sichtbare Schalter.
 */
function sichtbareSchalter(): HTMLElement[] {
  return schalter().filter(el => el.getAttribute('role') === 'tab' && el.offsetParent !== null);
}

/**
 * Sucht das Panel zu einer Id.
 *
 * @param id - Panel-Id.
 * @returns Das Element, sofern es die Klasse `tab-pane` traegt; sonst `null`.
 */
function panel(id: string): HTMLElement | null {
  const el = document.getElementById(id);
  return el?.classList.contains('tab-pane') ? el : null;
}

/**
 * Nur der Wechsel in der Hauptnavigation gehoert in den Hash.
 *
 * @param ziel - Zielpanel.
 * @returns `true`, wenn das Panel direkt in `#tabContent` liegt.
 */
function istHauptgruppe(ziel: HTMLElement): boolean {
  return ziel.parentElement?.id === 'tabContent';
}

type GruppenStore = { get: () => string | null; set: (id: string) => void };

/** Bildet den Eltern-Container einer Tab-Gruppe auf ihren `useSyncExternalStore`-Store ab. */
const TAB_GRUPPEN_STORES: Record<string, GruppenStore> = {
  tabContent: { get: getAktivenTab, set: setAktivenTab },
  'admin-tab-content': { get: getAktivenAdminTab, set: setAktivenAdminTab },
};

/**
 * Ermittelt den Store der Tab-Gruppe, zu der ein Panel gehoert.
 *
 * @param ziel - Zielpanel.
 * @returns Store des Eltern-Containers oder `undefined`, wenn dessen Gruppe keinen Store hat.
 */
function gruppenStoreFuer(ziel: HTMLElement): GruppenStore | undefined {
  const containerId = ziel.parentElement?.id;
  return containerId ? TAB_GRUPPEN_STORES[containerId] : undefined;
}

/**
 * Id des aktuell aktiven Hauptgruppen-Panels, gelesen aus `activeTabStore` (nicht aus dem DOM).
 *
 * @returns Panel-Id; `start` (Default-Pane), solange der Store noch `null` (vor dem ersten Wechsel) ist.
 */
export function aktiverTab(): string | null {
  return getAktivenTab() ?? 'start';
}

/**
 * Schaltet auf das Panel `id` um, meldet `tab:shown` und faellt fuer nicht erlaubte Hauptgruppen-Tabs auf `start` zurueck.
 *
 * @param id - Panel-Id.
 * @param options - `hashSchreiben` (Default `true`): `false`, wenn der Aufruf aus dem `hashchange`-Handler
 *   kommt, sonst erzeugte jeder Zurueck-Schritt einen neuen History-Eintrag. `fokus` (Default `false`):
 *   `true` setzt den Fokus auf den Schalter (Tastatursteuerung).
 * @returns `false`, wenn kein Panel zur Id existiert; sonst `true`.
 */
export function zeigeTab(id: string, { hashSchreiben = true, fokus = false } = {}): boolean {
  const ziel = panel(id);
  if (!ziel) return false;

  const hauptgruppe = istHauptgruppe(ziel);
  const gruppenStore = gruppenStoreFuer(ziel);

  // Die Nav-/Einstellungen-Schalter sind per `d-none` versteckt (`AppHeader.tsx`), ein direkt
  // gesetzter Hash (Adressleiste, alter Link, Zurueck-Button) umgeht das aber. Admin hat
  // zusaetzlich den eigenen Rollen-Redirect in `auth/index.ts`.
  if (hauptgruppe && !istHauptTabErlaubt(id)) {
    // `hashSchreiben: true` erzwungen (nicht durchgereicht): sonst zeigt die Adressleiste weiter den
    // urspruenglichen Hash `id`, obwohl `start` sichtbar ist (z. B. `zeigeTabAusHash()` ruft mit `false`).
    return zeigeTab('start', { hashSchreiben: true, fokus });
  }

  const imHash = hashSchreiben && hauptgruppe;
  // "Schon aktiv" kommt aus dem Gruppen-Store; die DOM-Klasse ist nur Fallback fuer Panes ohne Store.
  const bereitsAktiv = gruppenStore ? gruppenStore.get() === id : ziel.classList.contains('active');
  if (bereitsAktiv) {
    if (imHash && document.location.hash.slice(1) !== id) schreibeHash(id);
    gruppenStore?.set(id);
    return true;
  }

  if (gruppenStore) {
    if (hauptgruppe) {
      // `flushExtern`: die Panes muessen VOR dem `tab:shown`-Dispatch unten sichtbar sein (siehe
      // Dateikopf). Admin hat keinen vergleichbaren synchronen Leser.
      flushExtern(() => gruppenStore.set(id));
    } else {
      gruppenStore.set(id);
    }
  }

  if (imHash && document.location.hash.slice(1) !== id) schreibeHash(id);

  // Jeder Schalter existiert potenziell zweimal (Desktop-Kopfzeile + Drawer-Kopie von `DBHeader`):
  // die sichtbare Kopie bevorzugen, sonst laeuft `.focus()` ins Leere (`display:none`) und
  // `tab:shown` haengt am unsichtbaren Element.
  const tabSchalter = schalter(id).filter(el => el.getAttribute('role') === 'tab');
  const ausloeser = tabSchalter.find(el => el.offsetParent !== null) ?? tabSchalter[0] ?? null;
  if (fokus) ausloeser?.focus();

  const detail: TabWechsel = { id, schalter: ausloeser };
  ausloeser?.dispatchEvent(new CustomEvent<TabWechsel>(TAB_SHOWN_EVENT, { detail, bubbles: true }));
  document.dispatchEvent(new CustomEvent<TabWechsel>(TAB_SHOWN_EVENT, { detail }));
  return true;
}

/**
 * Schaltet auf das Panel aus `location.hash`. Der Hash wird case-insensitiv aufgeloest,
 * damit alte Deep-Links wie `/#ewt` weiter funktionieren; der Hash selbst bleibt unveraendert.
 *
 * @returns `true`, wenn ein Hauptgruppen-Panel zum Hash gefunden und geschaltet wurde; sonst `false`.
 */
export function zeigeTabAusHash(): boolean {
  const roh = decodeURIComponent(document.location.hash.replace(/^#/, ''));
  if (!roh) return false;
  const treffer = Array.from(document.querySelectorAll<HTMLElement>('#tabContent > .tab-pane')).find(
    pane => pane.id.toLowerCase() === roh.toLowerCase(),
  );
  if (!treffer) return false;
  return zeigeTab(treffer.id, { hashSchreiben: false });
}

/**
 * Blendet einen Nav-Eintrag samt Panel ein oder aus (z. B. Admin ohne Adminrechte).
 *
 * @param id - Panel-Id.
 * @param sichtbar - `false` setzt `d-none` auf Listeneintrag der Schalter und Panel.
 */
export function setzeTabSichtbar(id: string, sichtbar: boolean): void {
  for (const el of schalter(id)) el.closest('li')?.classList.toggle('d-none', !sichtbar);
  panel(id)?.classList.toggle('d-none', !sichtbar);
}

/**
 * Pfeiltasten/Home/End wechseln zwischen den sichtbaren Tab-Schaltern (zirkulaer bei Pfeil) und fokussieren den neuen.
 *
 * @param event - `keydown` auf `document`; nur Ereignisse auf einem `role="tab"`-Schalter zaehlen.
 */
function tastaturWechsel(event: KeyboardEvent): void {
  const aktuell = (event.target as HTMLElement | null)?.closest<HTMLElement>(`[${ZIEL_ATTRIBUT}][role="tab"]`);
  if (!aktuell) return;

  const liste = sichtbareSchalter();
  const index = liste.indexOf(aktuell);
  if (index === -1) return;

  let neu: number;
  switch (event.key) {
    case 'ArrowRight':
      neu = (index + 1) % liste.length;
      break;
    case 'ArrowLeft':
      neu = (index - 1 + liste.length) % liste.length;
      break;
    case 'Home':
      neu = 0;
      break;
    case 'End':
      neu = liste.length - 1;
      break;
    default:
      return;
  }

  event.preventDefault();
  const ziel = liste[neu]?.getAttribute(ZIEL_ATTRIBUT);
  if (ziel) zeigeTab(ziel, { fokus: true });
}

/**
 * Delegierter Klick-Handler: schaltet auf das Panel des angeklickten `data-tab-target`-Schalters.
 *
 * @param event - `click` auf `document`.
 */
function klick(event: MouseEvent): void {
  const el = (event.target as HTMLElement | null)?.closest<HTMLElement>(`[${ZIEL_ATTRIBUT}]`);
  const ziel = el?.getAttribute(ZIEL_ATTRIBUT);
  if (!el || !ziel) return;
  event.preventDefault();
  zeigeTab(ziel);
}

/** `hashchange`-Handler: uebernimmt den neuen Hash, ohne ihn erneut zu schreiben. */
function hashWechsel(): void {
  zeigeTabAusHash();
}

/**
 * Haengt Delegation, Tastatursteuerung und Hash-Synchronisation an.
 *
 * @returns Abbau-Funktion, die alle drei Listener wieder entfernt.
 */
export function initTabController(): () => void {
  document.addEventListener('click', klick);
  document.addEventListener('keydown', tastaturWechsel);
  window.addEventListener('hashchange', hashWechsel);

  return () => {
    document.removeEventListener('click', klick);
    document.removeEventListener('keydown', tastaturWechsel);
    window.removeEventListener('hashchange', hashWechsel);
  };
}
