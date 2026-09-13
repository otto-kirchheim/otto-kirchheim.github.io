/**
 * Leichter Ersatz fuer Bootstraps `Tab`-Plugin.
 *
 * Die App ist eine Tab-SPA ohne Router: `#tabContent` enthaelt alle `.tab-pane`s, die
 * Navigation im DB-Header schaltet sie um. Bootstrap brachte dafuer sein `Tab`-Plugin plus
 * `data-bs-toggle="pill"` mit; beides faellt mit dem DB-Header weg. Der Controller uebernimmt
 * exakt dessen Aufgaben -- Panel wechseln, `aria-selected` pflegen, Hash schreiben -- und
 * meldet den Wechsel als `tab:shown`-CustomEvent, auf das der Feature-Lifecycle hoert.
 *
 * Schalter sind alle Elemente mit `data-tab-target="<Panel-Id>"`; sie werden ueber
 * Delegation bedient, damit die Navigation zwischen Kopfzeile und Schublade umziehen darf.
 *
 * Phase K6: der aktive Tab der Hauptnavigation (`#tabContent`-Gruppe) wird zusaetzlich in
 * `activeTabStore` gespiegelt (`setAktivenTab`) -- `AppHeader.tsx` liest ihn per `useActiveTab()`
 * und berechnet `aria-selected`/`tabindex`/`data-active` selbst, der DOM-Handschrieb auf die
 * Hauptnav-Schalter entfaellt deshalb unten. Admins Unternavigation (`admin-pane-*`, eigene
 * Tab-Gruppe) ist NICHT die Hauptgruppe und bleibt am alten, DOM-schreibenden Mechanismus.
 *
 * Phase N Slice 2: auch das Pane-Klassen-Toggle (`active`/`show`) der Hauptgruppe entfaellt hier
 * -- `App.tsx`s Panes lesen `activeTabStore` per `useActiveTab()` und berechnen ihre Klassen
 * selbst (React-eigen statt DOM-Handschrieb). `setAktivenTab()` laeuft dafuer durch
 * `flushExtern()` (`reactRoot.ts`): `berechnungMonatsFenster.ts`s `tab:shown`-Handler misst
 * `#Berechnung`s `clientWidth` und braucht das sichtbare Pane VOR dem Event -- ohne den
 * synchronen Flush waere die React-Reaktion auf die Store-Aenderung erst nach dem Event fertig.
 */

import { flushExtern } from './reactRoot';
import { getAktivenTab, setAktivenTab } from './activeTabStore';

export type TabWechsel = { id: string; schalter: HTMLElement | null };

/** Wird auf dem Schalter (bubbelnd) und auf `document` ausgeloest. */
export const TAB_SHOWN_EVENT = 'tab:shown';

const ZIEL_ATTRIBUT = 'data-tab-target';

function schalter(id?: string): HTMLElement[] {
  const selektor = id ? `[${ZIEL_ATTRIBUT}="${CSS.escape(id)}"]` : `[${ZIEL_ATTRIBUT}]`;
  return Array.from(document.querySelectorAll<HTMLElement>(selektor));
}

function sichtbareSchalter(): HTMLElement[] {
  return schalter().filter(el => el.getAttribute('role') === 'tab' && el.offsetParent !== null);
}

function panel(id: string): HTMLElement | null {
  const el = document.getElementById(id);
  return el?.classList.contains('tab-pane') ? el : null;
}

/**
 * Geschwister-Panels einer Gruppe. Es gibt mehr als eine: die Hauptnavigation schaltet
 * `#tabContent`, das Admin-Panel seine eigene `.tab-content` -- ein Wechsel darf immer nur
 * die eigene Gruppe umschalten.
 */
function gruppe(ziel: HTMLElement): HTMLElement[] {
  const eltern = ziel.parentElement;
  if (!eltern) return [ziel];
  return [...eltern.children].filter(
    (el): el is HTMLElement => el instanceof HTMLElement && el.classList.contains('tab-pane'),
  );
}

/** Nur der Wechsel in der Hauptnavigation gehoert in den Hash. */
function istHauptgruppe(ziel: HTMLElement): boolean {
  return ziel.parentElement?.id === 'tabContent';
}

/**
 * Id des aktuell aktiven Hauptgruppen-Panels. Liest seit Slice 2 `activeTabStore` statt des DOM
 * (`App.tsx` schreibt die `active`/`show`-Klassen React-eigen, nicht mehr `zeigeTab()`) --
 * `null` (Store-Anfangswert vor jedem Wechsel) bedeutet "start", die Default-Pane.
 */
export function aktiverTab(): string | null {
  return getAktivenTab() ?? 'start';
}

/**
 * Schaltet auf das Panel `id` um.
 *
 * @param hashSchreiben `false`, wenn der Aufruf aus dem `hashchange`-Handler kommt --
 *   sonst wuerde jeder Zurueck-Schritt einen neuen History-Eintrag erzeugen.
 */
export function zeigeTab(id: string, { hashSchreiben = true, fokus = false } = {}): boolean {
  const ziel = panel(id);
  if (!ziel) return false;

  const hauptgruppe = istHauptgruppe(ziel);
  const imHash = hashSchreiben && hauptgruppe;
  // Hauptgruppe: "schon aktiv" kommt aus dem Store (die DOM-Klasse wird hier nicht mehr
  // geschrieben). Admin-Subnav: weiterhin aus dem DOM, dort unveraendert.
  const bereitsAktiv = hauptgruppe ? getAktivenTab() === id : ziel.classList.contains('active');
  if (bereitsAktiv) {
    if (imHash && document.location.hash.slice(1) !== id) document.location.hash = `#${id}`;
    if (hauptgruppe) setAktivenTab(id);
    return true;
  }

  if (hauptgruppe) {
    // `flushExtern`: `App.tsx`s Panes muessen VOR dem `tab:shown`-Dispatch unten sichtbar sein
    // (siehe Kommentar am Dateikopf) -- `berechnungMonatsFenster.ts` misst sonst `clientWidth`
    // eines noch unsichtbaren Containers.
    flushExtern(() => setAktivenTab(id));
  } else {
    for (const pane of gruppe(ziel)) {
      const aktiv = pane === ziel;
      pane.classList.toggle('active', aktiv);
      pane.classList.toggle('show', aktiv);
    }
    const gruppenIds = new Set(gruppe(ziel).map(pane => pane.id));
    for (const el of schalter()) {
      const elZiel = el.getAttribute(ZIEL_ATTRIBUT);
      if (!elZiel || !gruppenIds.has(elZiel)) continue;
      const aktiv = elZiel === id;
      el.classList.toggle('active', aktiv);
      // `.db-navigation-item` traegt die Aktiv-Markierung im DB-System am Listenelement.
      el.closest('.db-navigation-item')?.setAttribute('data-active', String(aktiv));
      if (el.getAttribute('role') === 'tab') {
        el.setAttribute('aria-selected', String(aktiv));
        el.setAttribute('tabindex', aktiv ? '0' : '-1');
      }
    }
  }

  if (imHash && document.location.hash.slice(1) !== id) document.location.hash = `#${id}`;

  // Seit Phase K5 (`DBHeader`) existiert jeder Schalter potenziell zweimal gleichzeitig im DOM
  // (Desktop-Kopfzeile + Drawer-Kopie) -- die sichtbare Kopie bevorzugen, sonst kann `.focus()`
  // ins Leere laufen (ein `display:none`-Element laesst sich nicht fokussieren) und das
  // `tab:shown`-Event haengt am falschen (unsichtbaren) Element.
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
 * damit alte Deep-Links wie `/#ewt` weiter funktionieren.
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

/** Blendet einen Nav-Eintrag samt Panel aus (z. B. Admin ohne Adminrechte). */
export function setzeTabSichtbar(id: string, sichtbar: boolean): void {
  for (const el of schalter(id)) el.closest('li')?.classList.toggle('d-none', !sichtbar);
  panel(id)?.classList.toggle('d-none', !sichtbar);
}

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

function klick(event: MouseEvent): void {
  const el = (event.target as HTMLElement | null)?.closest<HTMLElement>(`[${ZIEL_ATTRIBUT}]`);
  const ziel = el?.getAttribute(ZIEL_ATTRIBUT);
  if (!el || !ziel) return;
  event.preventDefault();
  zeigeTab(ziel);
}

function hashWechsel(): void {
  zeigeTabAusHash();
}

/** Haengt Delegation, Tastatursteuerung und Hash-Synchronisation an. Gibt den Abbau zurueck. */
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
