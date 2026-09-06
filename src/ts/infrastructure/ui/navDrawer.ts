/**
 * Mobile Navigations-Schublade des DB-Headers.
 *
 * `DBHeader` rendert die Navigation zweimal (einmal in der Kopfzeile, einmal in der
 * Schublade). Das ginge hier nicht: Die App spricht ihre Tabs ueber feste Ids an
 * (`#bereitschaft-tab`, `#admin`, ...), doppelte Ids waeren ein Fehler. Deshalb gibt es die
 * Navigation nur einmal -- sie zieht beim Oeffnen in die Schublade und danach zurueck.
 */

const NAV_ID = 'navmenu';
const DRAWER_ID = 'navdrawer';

function nav(): HTMLElement | null {
  return document.getElementById(NAV_ID);
}

function drawer(): HTMLDialogElement | null {
  return document.querySelector<HTMLDialogElement>(`#${DRAWER_ID}`);
}

function schubladenPlatz(): HTMLElement | null {
  return drawer()?.querySelector<HTMLElement>('.db-header-drawer-navigation') ?? null;
}

function kopfPlatz(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.db-header-navigation-container');
}

export function oeffneNavSchublade(): void {
  const dialog = drawer();
  const navigation = nav();
  const platz = schubladenPlatz();
  if (!dialog || !navigation || !platz) return;

  platz.prepend(navigation);
  if (!dialog.open) dialog.showModal();
  document.querySelector<HTMLButtonElement>('#btn-navmenu')?.setAttribute('aria-expanded', 'true');
}

export function schliesseNavSchublade(): void {
  const dialog = drawer();
  const navigation = nav();
  const platz = kopfPlatz();
  if (!dialog) return;

  if (dialog.open) dialog.close();
  if (navigation && platz) platz.prepend(navigation);
  document.querySelector<HTMLButtonElement>('#btn-navmenu')?.setAttribute('aria-expanded', 'false');
}

/** Haengt Oeffnen/Schliessen an und gibt den Abbau zurueck. */
export function initNavSchublade(): () => void {
  const dialog = drawer();

  const beiKlick = (event: MouseEvent) => {
    const el = event.target as HTMLElement | null;
    if (el?.closest('#btn-navmenu')) {
      oeffneNavSchublade();
      return;
    }
    if (!dialog?.open) return;
    // Schliessen bei Aktion in der Schublade: Nav-Eintrag, Schliessen-Knopf oder Hintergrund.
    if (el?.closest('[data-tab-target]') ?? el?.closest('[data-action="close"]') ?? el === dialog) {
      schliesseNavSchublade();
    }
  };

  // `close` deckt Escape und `dialog.close()` gleichermassen ab -- danach muss die
  // Navigation zurueck in die Kopfzeile, sonst ist sie auf dem Desktop verschwunden.
  const beiSchliessen = () => {
    const navigation = nav();
    const platz = kopfPlatz();
    if (navigation && platz) platz.prepend(navigation);
    document.querySelector<HTMLButtonElement>('#btn-navmenu')?.setAttribute('aria-expanded', 'false');
  };

  document.addEventListener('click', beiKlick);
  dialog?.addEventListener('close', beiSchliessen);

  return () => {
    document.removeEventListener('click', beiKlick);
    dialog?.removeEventListener('close', beiSchliessen);
  };
}
