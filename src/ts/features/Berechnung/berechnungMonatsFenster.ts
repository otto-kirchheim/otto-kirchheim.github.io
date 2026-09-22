import { default as Storage } from '@/shared/lib/storage/Storage';
import dayjs from '@/shared/lib/date/configDayjs';
import { TAB_SHOWN_EVENT } from '@/infrastructure/ui/tabController';

/*
 * Monats-Fenster der Berechnungstabelle: Wie viele Monatsspalten sichtbar sind, folgt allein aus der
 * Breite des Tabellen-Containers (nicht aus dem Viewport); per Prev/Next-Buttons verschiebbar.
 * Passen alle 12 Monate, blendet sich die Navigation aus.
 */
// Mindestbreite je Monatsspalte in px (Währungsbeträge); bewusst ein fester Wert statt eines
// Live-`getComputedStyle`-Reads.
const MONAT_MIN_PX = 70;
const RESERVE_PX = 24; // Container-Margin/-Padding
const ERSTE_SPALTE_PX = 184; // feste 11.5rem der Label-Spalte, siehe styles.scss
const MONATSNAMEN = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'] as const;

let startMonat: number | null = null;

/**
 * Berechnet die Anzahl sichtbarer Monatsspalten aus der Containerbreite und festen Werten
 * (bewusst keine Messung gerenderter Zellen: deren Breite hängt von der Spaltenanzahl ab, das wäre
 * ein Rückkopplungs-Kreis). Die Spalten teilen sich den Platz rechts der festen Label-Spalte gleichmäßig
 * (`table-layout: fixed`); es passen so viele hinein, dass jede mindestens `MONAT_MIN_PX` breit bleibt.
 *
 * @returns Anzahl Monatsspalten, begrenzt auf 1 bis 12.
 */
export function ermittleFensterGroesse(): number {
  const container = document.querySelector<HTMLElement>('#Berechnung .db-table');
  const basisBreite = container?.clientWidth || window.innerWidth - RESERVE_PX;
  const verfuegbar = basisBreite - ERSTE_SPALTE_PX;

  return Math.min(Math.max(Math.floor(verfuegbar / MONAT_MIN_PX), 1), 12);
}

/**
 * Startmonat des Fensters beim ersten Anzeigen: der gespeicherte bzw. aktuelle Monat mittig im Fenster.
 *
 * @param fensterGroesse - Anzahl sichtbarer Monatsspalten (1-12).
 * @returns Startmonat (1-12), so begrenzt, dass das Fenster nicht über Dezember hinausragt.
 */
function initialerStart(fensterGroesse: number): number {
  const aktuellerMonat = Storage.get<number>('Monat', { default: dayjs().month() + 1 });
  const start = aktuellerMonat - Math.floor(fensterGroesse / 2) + 1;
  return Math.min(Math.max(start, 1), Math.max(1, 12 - fensterGroesse + 1));
}

/**
 * Wendet das Monats-Fenster auf die Tabelle an: blendet Monatsspalten außerhalb aus, setzt die
 * Spaltenanzahl als CSS-Variable, aktualisiert Beschriftung und Prev/Next-Buttons und blendet die
 * Navigation aus, wenn alle 12 Monate passen. Klemmt den Startmonat in den gültigen Bereich.
 */
export function wendeMonatsFensterAn(): void {
  const fensterGroesse = ermittleFensterGroesse();
  const maxStart = Math.max(1, 12 - fensterGroesse + 1);

  startMonat = startMonat === null ? initialerStart(fensterGroesse) : Math.min(Math.max(startMonat, 1), maxStart);
  const start = startMonat;
  /**
   * Prüft, ob ein Monat im aktuellen Fenster liegt.
   *
   * @param monat - Monat (1-12).
   * @returns `true`, wenn der Monat im aktuellen Fenster liegt.
   */
  const sichtbar = (monat: number): boolean => monat >= start && monat < start + fensterGroesse;

  const zellen = document.querySelectorAll<HTMLTableCellElement>(
    '.table-Berechnung > thead [data-monat], #tbodyBerechnung td[data-monat]',
  );
  for (const zelle of Array.from(zellen)) {
    const monat = Number(zelle.dataset.monat);
    zelle.classList.toggle('d-none', !sichtbar(monat));
  }

  // Spaltenanzahl als CSS-Variable; die zugehörige width-Regel in styles.scss greift nur unter 1200px
  document
    .querySelector<HTMLTableElement>('table.table-Berechnung')
    ?.style.setProperty('--berechnung-monatsspalten', String(fensterGroesse));

  const label = document.querySelector<HTMLSpanElement>('#berechnungMonatsFensterLabel');
  if (label) {
    const ende = Math.min(start + fensterGroesse - 1, 12);
    label.textContent = `${MONATSNAMEN[start - 1]} – ${MONATSNAMEN[ende - 1]}`;
  }

  const prev = document.querySelector<HTMLButtonElement>('#btnBerechnungMonatePrev');
  const next = document.querySelector<HTMLButtonElement>('#btnBerechnungMonateNext');
  if (prev) prev.disabled = start <= 1;
  if (next) next.disabled = start >= maxStart;

  // Passen alle 12 Monate, ist nichts zu verschieben — Navigation ausblenden
  // (inline display, damit die Breakpoint-Klassen der Leiste unangetastet bleiben)
  const nav = document.querySelector<HTMLDivElement>('#berechnungMonatsNav');
  if (nav) {
    if (fensterGroesse >= 12) nav.style.setProperty('display', 'none', 'important');
    else nav.style.removeProperty('display');
  }
}

/**
 * Verdrahtet Prev/Next-Buttons, Fenster-Resize (entprellt, 150 ms) und das Öffnen des Berechnung-Tabs
 * mit `wendeMonatsFensterAn`. Einmalig beim App-Start aufrufen.
 */
export function initBerechnungMonatsFensterNav(): void {
  /**
   * Verschiebt das Fenster um `delta` Monate und rendert neu (Begrenzung übernimmt `wendeMonatsFensterAn`).
   *
   * @param delta - Verschiebung in Monaten (-1 = zurück, 1 = vor).
   */
  const verschiebe = (delta: number): void => {
    if (startMonat !== null) startMonat += delta;
    wendeMonatsFensterAn();
  };

  document.querySelector('#btnBerechnungMonatePrev')?.addEventListener('click', () => verschiebe(-1));
  document.querySelector('#btnBerechnungMonateNext')?.addEventListener('click', () => verschiebe(1));

  // Bei Resize und beim Öffnen des Tabs (vorher ist der Container nicht messbar) neu berechnen
  let resizeTimeout: ReturnType<typeof setTimeout> | undefined;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => wendeMonatsFensterAn(), 150);
  });
  document.querySelector('#berechnung-tab')?.addEventListener(TAB_SHOWN_EVENT, () => wendeMonatsFensterAn());
}
