import { default as Storage } from '@/infrastructure/storage/Storage';
import dayjs from '@/infrastructure/date/configDayjs';
import { TAB_SHOWN_EVENT } from '@/infrastructure/ui/tabController';

/**
 * Monats-Fenster für die Berechnungstabelle: die Anzahl sichtbarer Monatsspalten wird
 * rein aus der verfügbaren Containerbreite berechnet (Containerbreite − erste Spalte −
 * Reserve, geteilt durch die Monatsspaltenbreite); per Prev/Next-Buttons verschiebbar.
 * Erreichen alle 12 Monate das Fenster, blendet sich die Navigation selbst aus (unten) —
 * das ist die "komplette Tabelle".
 *
 * Bis 2026-09 gab es dafür zusätzlich einen `d-xl-table-cell`-Viewport-Breakpoint, der ALLE
 * Spalten erzwang, sobald der Viewport (nicht der tatsächliche Tabellen-Container!) eine
 * bestimmte Breite erreichte. Der Container ist durch die Seiten-`DBSection` (`width="large"`)
 * ab 1440px Viewport auf 1408px gedeckelt, unabhängig vom Viewport darüber — nach
 * der Breakpoint-Vereinheitlichung auf die DB-UX-Skala (`_breakpoints.scss`, `xl` 1200px ->
 * 1920px) lag dieser Breakpoint jenseits jeder real erreichbaren Containerbreite, die
 * komplette Tabelle war dadurch nie mehr erreichbar. Entfernt zugunsten von reinem
 * Breiten-JS -- kein Viewport-Container-Mismatch mehr möglich.
 */
// Mindestbreite je Monatsspalte (Währungsbeträge). `--db-sizing-xl` statt Handwert: bei
// Functional-Density/14px-Root real 70px (Puppeteer gemessen) -- die einzige DB-UX-Sizing-Stufe,
// die alle 12 Spalten noch in den gedeckelten ~1029px-Container passen laesst (12 x 70 = 840px
// von 845px nutzbarer Breite, ~5px Reserve). Wie `infrastructure/ui/breakpoints.ts` ist dies ein
// TS-Spiegel eines CSS-Tokens, kein Live-`getComputedStyle`-Read.
const MONAT_MIN_PX = 70;
const RESERVE_PX = 24; // Container-Margin/-Padding
const ERSTE_SPALTE_PX = 184; // feste 11.5rem der Label-Spalte, siehe styles.scss
const MONATSNAMEN = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'] as const;

let startMonat: number | null = null;

/**
 * Berechnet die Monatsanzahl rein aus der Containerbreite und festen Werten
 * (bewusst KEINE Messung gerenderter Zellen — deren Breite hängt von der
 * Spaltenanzahl ab und ergäbe einen Rückkopplungs-Kreis).
 *
 * Die sichtbaren Monatsspalten teilen sich den Platz rechts der festen
 * Label-Spalte gleichmäßig (table-layout: fixed). Es passen so viele Monate
 * hinein, dass jede Spalte mindestens MONAT_MIN_PX breit ist; würde eine
 * Spalte doppelt so breit (max), kommt durch das floor() automatisch die
 * nächste hinzu.
 */
export function ermittleFensterGroesse(): number {
  const container = document.querySelector<HTMLElement>('#Berechnung .db-table');
  const basisBreite = container?.clientWidth || window.innerWidth - RESERVE_PX;
  const verfuegbar = basisBreite - ERSTE_SPALTE_PX;

  return Math.min(Math.max(Math.floor(verfuegbar / MONAT_MIN_PX), 1), 12);
}

function initialerStart(fensterGroesse: number): number {
  const aktuellerMonat = Storage.get<number>('Monat', { default: dayjs().month() + 1 });
  // Aktuellen Monat mittig im Fenster platzieren
  const start = aktuellerMonat - Math.floor(fensterGroesse / 2) + 1;
  return Math.min(Math.max(start, 1), Math.max(1, 12 - fensterGroesse + 1));
}

export function wendeMonatsFensterAn(): void {
  const fensterGroesse = ermittleFensterGroesse();
  const maxStart = Math.max(1, 12 - fensterGroesse + 1);

  startMonat = startMonat === null ? initialerStart(fensterGroesse) : Math.min(Math.max(startMonat, 1), maxStart);
  const start = startMonat;
  const sichtbar = (monat: number): boolean => monat >= start && monat < start + fensterGroesse;

  const zellen = document.querySelectorAll<HTMLTableCellElement>(
    '.table-Berechnung > thead [data-monat], #tbodyBerechnung td[data-monat]',
  );
  for (const zelle of Array.from(zellen)) {
    const monat = Number(zelle.dataset.monat);
    zelle.classList.toggle('d-none', !sichtbar(monat));
  }

  // Spaltenanzahl als CSS-Variable — die zugehörige width-Regel greift nur
  // unterhalb xl (styles.scss); Desktop behält die col-1-Gleichverteilung
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

export function initBerechnungMonatsFensterNav(): void {
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
