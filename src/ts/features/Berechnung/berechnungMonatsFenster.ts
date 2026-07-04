import { default as Storage } from '@/infrastructure/storage/Storage';
import dayjs from '@/infrastructure/date/configDayjs';

/**
 * Monats-Fenster für die Berechnungstabelle unterhalb xl (<1200px):
 * Die Anzahl sichtbarer Monatsspalten wird dynamisch aus der verfügbaren
 * Breite berechnet (Containerbreite − erste Spalte − Reserve, geteilt durch
 * die Monatsspaltenbreite); per Prev/Next-Buttons verschiebbar.
 * Ab xl zeigt `d-xl-table-cell` immer alle Spalten — kein JS-Media-Query nötig.
 */
const MONAT_MIN_PX = 80; // Mindestbreite je Monatsspalte (Währungsbeträge) — unterschritten → eine Spalte weniger
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
  const container = document.querySelector<HTMLElement>('#Berechnung .table-responsive');
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
    zelle.classList.toggle('d-xl-table-cell', !sichtbar(monat));
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
  document.querySelector('#berechnung-tab')?.addEventListener('shown.bs.tab', () => wendeMonatsFensterAn());
}
