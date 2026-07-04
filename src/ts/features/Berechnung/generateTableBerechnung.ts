import type { IVorgabenBerechnung, IVorgabenGeld, IVorgabenU } from '@/types';
import { default as Storage } from '@/infrastructure/storage/Storage';
import { default as clearLoading } from '@/infrastructure/ui/clearLoading';
import calculateBerechnungRows, {
  formatCurrency,
  nullParser,
  type IBerechnungMonatsErgebnis,
} from './calculateBerechnungRows';

export default function generateTableBerechnung(
  datenBerechnung: true | IVorgabenBerechnung,
  datenGeldVorgabe: IVorgabenGeld = Storage.get<IVorgabenGeld>('VorgabenGeld', { check: true }),
): void {
  if (datenBerechnung === true) return clearLoading('btnNeuBerech');

  const tarifKraft = Storage.get<IVorgabenU>('VorgabenU', { check: true }).pers.TB;

  const tbody = document.querySelector<HTMLTableSectionElement>('#tbodyBerechnung');
  if (!tbody) return;

  tbody.innerHTML = `
		<tr><th rowspan="2">Bereitschaftszeiten</th></tr>
		<tr></tr>
		<tr><th>Bereitschaftszulage</th></tr>
		<tr><th>LRE 1</th></tr>
		<tr><th>LRE 2</th></tr>
		<tr><th>LRE 3</th></tr>
		<tr><th>Privat-PKW</th></tr>
		<tr><th>Summe Bereitschaft</th></tr>
		<tr><th><table class="table table-borderless m-0"><tbody>
			<tr><td class="py-0">Anzahl der</td><td class="py-0">>8</td></tr>
			<tr><td class="py-0">Abwesenheiten nach</td><td class="py-0">>14</td></tr>
			<tr><td class="py-0">FGr-TV / LfTV / RVB</td><td class="py-0">>24</td></tr>
		</tbody></table></th></tr>
		<tr><th><table class="table table-borderless m-0"><tbody>
			<tr><td class="py-0">steuerfreie Abwesen-</td><td class="py-0">>8</td></tr>
			<tr><td class="py-0">heiten § 9 EStG</td><td class="py-0">>14</td></tr>
		</tbody></table></th></tr>
		<tr><th>Summe EWT</th></tr>
		<tr><th>Summe Nebenbezüge</th></tr>
		<tr><th>Summe Gesamt</th></tr>
		`;

  const monatsErgebnisse = calculateBerechnungRows(datenBerechnung, datenGeldVorgabe, tarifKraft);

  const currency = (wert: number | null): string => (wert === null ? '' : formatCurrency(wert));

  // Zellinhalt pro Zeilenindex (0-12); [text, html] — html nur für die Abwesenheiten-Zeilen
  const zellInhalte = (m: IBerechnungMonatsErgebnis): Array<string | { html: string }> => [
    m.bereitschaftMinuten === null ? '' : m.bereitschaftMinuten.toString(),
    m.bereitschaftAnzeige ?? '',
    currency(m.bereitschaftszulage),
    currency(m.lre1),
    currency(m.lre2),
    currency(m.lre3),
    currency(m.privatPkw),
    currency(m.summeBereitschaft),
    m.abwesenheiten === null
      ? ''
      : {
          html:
            `${nullParser(m.abwesenheiten.a8)} <br />` +
            `${nullParser(m.abwesenheiten.a14)} <br />` +
            `${nullParser(m.abwesenheiten.a24)}`,
        },
    m.steuerfreieAbwesenheiten === null
      ? ''
      : {
          html: `${nullParser(m.steuerfreieAbwesenheiten.s8)} <br /> ${nullParser(m.steuerfreieAbwesenheiten.s14)}`,
        },
    currency(m.summeEwt),
    currency(m.summeNebenbezuege),
    currency(m.summeGesamt),
  ];

  const inhalteProMonat = monatsErgebnisse.map(zellInhalte);

  Array.from(tbody.children).forEach((row, index) => {
    for (const monatsInhalte of inhalteProMonat) {
      const td = document.createElement('td');
      const inhalt = monatsInhalte[index];
      if (typeof inhalt === 'string') {
        if (inhalt !== '') td.textContent = inhalt;
      } else {
        td.innerHTML = inhalt.html;
      }
      row.appendChild(td);
    }
  });
}
