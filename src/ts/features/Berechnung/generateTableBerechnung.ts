import type { IVorgabenBerechnung, IVorgabenGeld, IVorgabenU } from '@/types';
import { default as Storage } from '@/infrastructure/storage/Storage';
import { default as clearLoading } from '@/infrastructure/ui/clearLoading';
import calculateBerechnungRows, {
  formatCurrency,
  nullParser,
  type IBerechnungMonatsErgebnis,
} from './calculateBerechnungRows';
import { gruppeHatDaten, isGroupVisible, type BerechnungGruppe } from './berechnungGroupVisibility';
import { mountBerechnungMobileCards } from './components/BerechnungMobileCards';

type ZellInhalt = string | { html: string };

interface IZeilenDefinition {
  /** null = immer sichtbar (z. B. Summe Gesamt) */
  gruppe: BerechnungGruppe | null;
  rowHtml: string;
  inhalt: (m: IBerechnungMonatsErgebnis) => ZellInhalt;
}

const currency = (wert: number | null): string => (wert === null ? '' : formatCurrency(wert));

const ZEILEN: IZeilenDefinition[] = [
  {
    gruppe: 'bereitschaft',
    rowHtml: '<tr><th rowspan="2">Bereitschaftszeiten</th></tr>',
    inhalt: m => (m.bereitschaftMinuten === null ? '' : m.bereitschaftMinuten.toString()),
  },
  { gruppe: 'bereitschaft', rowHtml: '<tr></tr>', inhalt: m => m.bereitschaftAnzeige ?? '' },
  {
    gruppe: 'bereitschaft',
    rowHtml: '<tr><th>Bereitschaftszulage</th></tr>',
    inhalt: m => currency(m.bereitschaftszulage),
  },
  { gruppe: 'bereitschaft', rowHtml: '<tr><th>LRE 1</th></tr>', inhalt: m => currency(m.lre1) },
  { gruppe: 'bereitschaft', rowHtml: '<tr><th>LRE 2</th></tr>', inhalt: m => currency(m.lre2) },
  { gruppe: 'bereitschaft', rowHtml: '<tr><th>LRE 3</th></tr>', inhalt: m => currency(m.lre3) },
  { gruppe: 'bereitschaft', rowHtml: '<tr><th>Privat-PKW</th></tr>', inhalt: m => currency(m.privatPkw) },
  {
    gruppe: 'bereitschaft',
    rowHtml: '<tr><th>Summe Bereitschaft</th></tr>',
    inhalt: m => currency(m.summeBereitschaft),
  },
  {
    gruppe: 'ewt',
    rowHtml:
      '<tr><th><table class="table table-borderless m-0"><tbody>' +
      '<tr><td class="py-0">Anzahl der</td><td class="py-0">>8</td></tr>' +
      '<tr><td class="py-0">Abwesenheiten nach</td><td class="py-0">>14</td></tr>' +
      '<tr><td class="py-0">FGr-TV / LfTV / RVB</td><td class="py-0">>24</td></tr>' +
      '</tbody></table></th></tr>',
    inhalt: m =>
      m.abwesenheiten === null
        ? ''
        : {
            html:
              `${nullParser(m.abwesenheiten.a8)} <br />` +
              `${nullParser(m.abwesenheiten.a14)} <br />` +
              `${nullParser(m.abwesenheiten.a24)}`,
          },
  },
  {
    gruppe: 'ewt',
    rowHtml:
      '<tr><th><table class="table table-borderless m-0"><tbody>' +
      '<tr><td class="py-0">steuerfreie Abwesen-</td><td class="py-0">>8</td></tr>' +
      '<tr><td class="py-0">heiten § 9 EStG</td><td class="py-0">>14</td></tr>' +
      '</tbody></table></th></tr>',
    inhalt: m =>
      m.steuerfreieAbwesenheiten === null
        ? ''
        : {
            html: `${nullParser(m.steuerfreieAbwesenheiten.s8)} <br /> ${nullParser(m.steuerfreieAbwesenheiten.s14)}`,
          },
  },
  { gruppe: 'ewt', rowHtml: '<tr><th>Summe EWT</th></tr>', inhalt: m => currency(m.summeEwt) },
  { gruppe: 'neben', rowHtml: '<tr><th>Summe Nebenbezüge</th></tr>', inhalt: m => currency(m.summeNebenbezuege) },
  { gruppe: null, rowHtml: '<tr><th>Summe Gesamt</th></tr>', inhalt: m => currency(m.summeGesamt) },
];

export default function generateTableBerechnung(
  datenBerechnung: true | IVorgabenBerechnung,
  datenGeldVorgabe: IVorgabenGeld = Storage.get<IVorgabenGeld>('VorgabenGeld', { check: true }),
): void {
  if (datenBerechnung === true) return clearLoading('btnNeuBerech');

  const vorgabenU = Storage.get<IVorgabenU>('VorgabenU', { check: true });
  const tarifKraft = vorgabenU.pers.TB;
  const aktivierteTabs = vorgabenU.Einstellungen?.aktivierteTabs;

  const monatsErgebnisse = calculateBerechnungRows(datenBerechnung, datenGeldVorgabe, tarifKraft);
  mountBerechnungMobileCards(monatsErgebnisse, aktivierteTabs);

  const tbody = document.querySelector<HTMLTableSectionElement>('#tbodyBerechnung');
  if (!tbody) return;

  // Desktop-Scope = ganzes Jahr: Gruppe nur ausblenden, wenn deaktiviert und in keinem Monat Daten
  const sichtbareZeilen = ZEILEN.filter(
    zeile =>
      zeile.gruppe === null ||
      isGroupVisible(
        zeile.gruppe,
        aktivierteTabs,
        monatsErgebnisse.some(m => gruppeHatDaten(zeile.gruppe as BerechnungGruppe, m)),
      ),
  );

  tbody.innerHTML = sichtbareZeilen.map(zeile => zeile.rowHtml).join('\n');

  Array.from(tbody.children).forEach((row, index) => {
    for (const monatsErgebnis of monatsErgebnisse) {
      const td = document.createElement('td');
      const inhalt = sichtbareZeilen[index].inhalt(monatsErgebnis);
      if (typeof inhalt === 'string') {
        if (inhalt !== '') td.textContent = inhalt;
      } else {
        td.innerHTML = inhalt.html;
      }
      row.appendChild(td);
    }
  });
}
