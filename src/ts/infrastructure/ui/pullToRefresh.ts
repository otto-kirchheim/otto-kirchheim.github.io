/**
 * Zum-Aktualisieren-Ziehen fuer den Inhaltsbereich.
 *
 * Chromes eingebautes Pull-to-Refresh ist eine Geste des WURZEL-Scrollers. In dieser App scrollt
 * das Dokument aber nie: `DBShell` rechnet sein Raster exakt auf `100dvh`, gescrollt wird
 * ausschliesslich in `.db-shell-content` (`overflow-y: auto`, Shells Vorgabe). Sobald ein
 * Tab-Inhalt laenger als der Viewport ist, verschluckt dieser innere Container die Geste -- die
 * Browser-Aktualisierung bleibt aus (User-Fund am Geraet: "geht nicht, wenn #-Tags genutzt
 * werden", denn genau dann scrollt der Inhalt). `overscroll-behavior` ist unbeteiligt (`auto`;
 * DB UX setzt `contain` nur am Drawer).
 *
 * Ersatz deshalb hier, bewusst im Container statt per Umbau auf einen Dokument-Scroller:
 * Letzteres hatte in der Shell-Architektur schon einmal zwei gestapelte Scrollbalken zur Folge
 * (siehe `styles.scss`s Begruendung zur Fusszeilen-Reservierung).
 */

/** Container, der tatsaechlich scrollt (siehe Kopfkommentar). */
const SCROLL_CONTAINER = '.db-shell-content';

/** Ab dieser gezogenen Strecke loest das Loslassen ein Neuladen aus. */
const AUSLOESE_DISTANZ_PX = 80;

/** Deckel fuer die sichtbare Mitbewegung -- danach zieht der Inhalt nicht weiter mit. */
const MAX_ZUG_PX = 120;

/** Finger-Weg zu Inhalts-Weg: 0.5 = der Inhalt folgt halb so weit (gummiartig statt 1:1). */
const DAEMPFUNG = 0.5;

/**
 * Wie klar die Bewegung senkrecht sein muss (senkrecht zu waagerecht). Ohne das kapert die Geste
 * das Querscrollen breiter Tabellen.
 */
const MIN_VERTIKAL_VERHAELTNIS = 1.5;

/** Dauer des Zurueckschnappens, wenn unterhalb der Ausloese-Distanz losgelassen wird. */
const ZURUECK_DAUER_MS = 200;

/** Volle Umdrehungen des Symbols auf dem Weg bis zur Ausloese-Distanz. */
const INDIKATOR_UMDREHUNGEN = 1;

export default function initPullToRefresh(): void {
  const container = document.querySelector<HTMLElement>(SCROLL_CONTAINER);
  if (!container) return;

  // Der Indikator haengt an `<body>`, nicht am Container: der Container scrollt (`overflow-y:
  // auto`) und bewegt sich beim Ziehen selbst mit -- als Kind wuerde der Kreis doppelt wandern
  // und an der oberen Kante abgeschnitten.
  const indikator = document.createElement('div');
  indikator.className = 'ptr-indikator';
  indikator.setAttribute('aria-hidden', 'true');
  const symbol = document.createElement('span');
  symbol.className = 'ptr-indikator__symbol';
  indikator.append(symbol);
  document.body.append(indikator);

  let startY = 0;
  let startX = 0;
  let zieht = false;
  let distanz = 0;

  function zeigeIndikator(animiert: boolean): void {
    const fortschritt = Math.min(distanz / AUSLOESE_DISTANZ_PX, 1);
    indikator.style.transition = animiert
      ? `transform ${ZURUECK_DAUER_MS}ms ease-out, opacity ${ZURUECK_DAUER_MS}ms ease-out`
      : '';
    indikator.style.transform = `translate(-50%, calc(-100% + ${distanz}px))`;
    indikator.style.opacity = String(fortschritt);
    symbol.style.transform = `rotate(${fortschritt * INDIKATOR_UMDREHUNGEN}turn)`;
    indikator.classList.toggle('ptr-indikator--bereit', distanz >= AUSLOESE_DISTANZ_PX);
  }

  function zuruecksetzen(animiert: boolean): void {
    if (!container) return;
    container.style.transition = animiert ? `transform ${ZURUECK_DAUER_MS}ms ease-out` : '';
    container.style.transform = '';
    distanz = 0;
    zeigeIndikator(animiert);
    symbol.classList.remove('laedt');
    zieht = false;
  }

  container.addEventListener(
    'touchstart',
    event => {
      // Nur aus der Ruhelage am oberen Rand und nur einfingrig -- sonst ist es ein normales
      // Scrollen oder eine Zoom-/Mehrfingergeste.
      if (event.touches.length !== 1 || container.scrollTop > 0) return;
      const beruehrung = event.touches[0]!;
      startY = beruehrung.clientY;
      startX = beruehrung.clientX;
      zieht = true;
      distanz = 0;
      container.style.transition = '';
      // Ruhelage des Kreises ist die obere Kante des Inhaltsbereichs (unter der Kopfzeile) --
      // erst hier messen, die Kopfzeilenhoehe wechselt mit Breakpoint und Schublade.
      indikator.style.setProperty('--ptr-oben', `${container.getBoundingClientRect().top}px`);
      zeigeIndikator(false);
    },
    { passive: true },
  );

  container.addEventListener(
    'touchmove',
    event => {
      if (!zieht || event.touches.length !== 1) return;
      const beruehrung = event.touches[0]!;
      const dy = beruehrung.clientY - startY;
      const dx = beruehrung.clientX - startX;

      // Nach oben gewischt oder ueberwiegend quer: das ist Scrollen, nicht Ziehen.
      if (dy <= 0 || Math.abs(dy) < Math.abs(dx) * MIN_VERTIKAL_VERHAELTNIS) {
        if (distanz > 0) zuruecksetzen(true);
        else zieht = false;
        return;
      }

      // Geste selbst behalten: ohne `preventDefault` uebernimmt der Browser sie (natives
      // Zum-Aktualisieren-Ziehen bzw. Overscroll) und bricht unsere per `touchcancel` ab.
      if (event.cancelable) event.preventDefault();

      distanz = Math.min(dy * DAEMPFUNG, MAX_ZUG_PX);
      container.style.transform = `translateY(${distanz}px)`;
      zeigeIndikator(false);
    },
    // Nicht passiv, sonst ist `preventDefault` wirkungslos (siehe oben).
    { passive: false },
  );

  for (const typ of ['touchend', 'touchcancel'] as const) {
    container.addEventListener(
      typ,
      () => {
        if (!zieht) return;
        if (typ === 'touchend' && distanz >= AUSLOESE_DISTANZ_PX) {
          // Transform stehen lassen: die Seite laedt ohnehin gleich neu, ein Zurueckschnappen
          // kurz vor dem Neuaufbau flackert nur. Das Symbol dreht ab jetzt von selbst weiter --
          // die CSS-Animation schlaegt die inline gesetzte Drehung.
          zieht = false;
          symbol.classList.add('laedt');
          location.reload();
          return;
        }
        zuruecksetzen(true);
      },
      { passive: true },
    );
  }
}
