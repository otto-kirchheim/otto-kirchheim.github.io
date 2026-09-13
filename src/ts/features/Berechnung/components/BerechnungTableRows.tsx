import { Fragment, type ReactNode } from 'react';
import { LreType } from '@otto-kirchheim/nebengeld-shared';
import { mount } from '@/infrastructure/ui';
import { formatCurrency, timeConvert, type IBerechnungMonatsErgebnis } from '../calculateBerechnungRows';
import { gruppeHatDaten, isGroupVisible, type BerechnungGruppe } from '../berechnungGroupVisibility';
import { zulagenEinheitKurz, type IZulagenBreakdown } from '../calculateZulagenBreakdown';

/**
 * Phase L2: `#tbodyBerechnung` (bisher per `innerHTML`-Strings befuellt) als React-Komponente.
 * Eigener Root direkt auf dem `<tbody id="tbodyBerechnung">`-Element (analog
 * `BerechnungMobileCards`/`#berechnungMobileCards`) -- `BerechnungTab.tsx` rendert das `<tbody>`
 * nur als leeres Blatt, ruehrt seine Kinder nie an.
 *
 * `wendeMonatsFensterAn()` liest direkt nach dem Mount `td[data-monat]`-Zellen aus dem DOM
 * (Spalten-Fenster) -- `mount()` ist per `flushSync` synchron, die Aufrufreihenfolge in
 * `generateTableBerechnung.ts` bleibt deshalb unveraendert gueltig.
 */

const NBSP = ' ';
const anzeige = (wert: number | null): ReactNode => (wert === null ? NBSP : wert);
const currency = (wert: number | null): string => (wert === null ? '' : formatCurrency(wert));

interface IZeile {
  id: string;
  /** null = immer sichtbar (z. B. Summe Gesamt) */
  gruppe: BerechnungGruppe | null;
  /** undefined = keine eigene Kopfzelle (Fortsetzungszeile unter einem `rowSpan`) */
  label: ReactNode | undefined;
  rowSpan?: number;
  inhalt: (m: IBerechnungMonatsErgebnis) => ReactNode;
}

function labelTabelle(zeilen: Array<[ReactNode, ReactNode]>): ReactNode {
  return (
    <table className="berechnung-label-tabelle">
      <tbody>
        {zeilen.map(([a, b], i) => (
          <tr key={i}>
            <td className="py-0">{a}</td>
            <td className="py-0">{b}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const ZEILEN: IZeile[] = [
  {
    id: 'bereitschaftMinuten',
    gruppe: 'bereitschaft',
    label: 'Bereitschaftszeiten',
    rowSpan: 2,
    inhalt: m => (m.bereitschaftMinuten === null ? '' : m.bereitschaftMinuten.toString()),
  },
  { id: 'bereitschaftAnzeige', gruppe: 'bereitschaft', label: undefined, inhalt: m => m.bereitschaftAnzeige ?? '' },
  {
    id: 'bereitschaftszulage',
    gruppe: 'bereitschaft',
    label: 'Bereitschaftszulage',
    inhalt: m => currency(m.bereitschaftszulage),
  },
  { id: 'lre1', gruppe: 'bereitschaft', label: LreType.LRE_1, inhalt: m => currency(m.lre1) },
  { id: 'lre2', gruppe: 'bereitschaft', label: LreType.LRE_2, inhalt: m => currency(m.lre2) },
  { id: 'lre3', gruppe: 'bereitschaft', label: LreType.LRE_3, inhalt: m => currency(m.lre3) },
  { id: 'privatPkw', gruppe: 'bereitschaft', label: 'Privat-PKW', inhalt: m => currency(m.privatPkw) },
  {
    id: 'summeBereitschaft',
    gruppe: 'bereitschaft',
    label: 'Summe Bereitschaft',
    inhalt: m => currency(m.summeBereitschaft),
  },
  {
    id: 'abwesenheiten',
    gruppe: 'ewt',
    label: labelTabelle([
      ['Anzahl der', '>8'],
      ['Abwesenheiten', '>14'],
      ['', '>24'],
    ]),
    inhalt: m =>
      m.abwesenheiten === null ? (
        ''
      ) : (
        <>
          {anzeige(m.abwesenheiten.a8)} <br />
          {anzeige(m.abwesenheiten.a14)} <br />
          {anzeige(m.abwesenheiten.a24)}
        </>
      ),
  },
  {
    id: 'steuerfreieAbwesenheiten',
    gruppe: 'ewt',
    label: labelTabelle([
      ['steuerfreie', '>8'],
      ['Abwesenheiten', '>14'],
    ]),
    inhalt: m =>
      m.steuerfreieAbwesenheiten === null ? (
        ''
      ) : (
        <>
          {anzeige(m.steuerfreieAbwesenheiten.s8)} <br /> {anzeige(m.steuerfreieAbwesenheiten.s14)}
        </>
      ),
  },
  { id: 'summeEwt', gruppe: 'ewt', label: 'Summe EWT', inhalt: m => currency(m.summeEwt) },
  {
    id: 'summeNebenbezuege',
    gruppe: 'neben',
    label: 'Summe Nebenbezüge',
    inhalt: m => currency(m.summeNebenbezuege),
  },
  {
    id: 'entgeltausgleich',
    gruppe: 'ea',
    label: 'Entgeltausgleich',
    inhalt: m => (m.eaMinuten === null ? '' : timeConvert(m.eaMinuten)),
  },
  { id: 'summeGesamt', gruppe: null, label: 'Summe Gesamt', inhalt: m => currency(m.summeGesamt) },
];

function buildZulagenBreakdownZeile(breakdown: IZulagenBreakdown): IZeile {
  return {
    id: 'zulagenBreakdown',
    gruppe: 'neben',
    label: labelTabelle(breakdown.codes.map(c => [c.label, zulagenEinheitKurz(c.unit)] as [ReactNode, ReactNode])),
    inhalt: m =>
      breakdown.codes.some(c => breakdown.values[c.code][m.monat - 1] > 0) ? (
        <>
          {breakdown.codes.map((c, i) => (
            <Fragment key={c.code}>
              {i > 0 && <br />}
              {breakdown.values[c.code][m.monat - 1]}
            </Fragment>
          ))}
        </>
      ) : (
        ''
      ),
  };
}

function BerechnungTableRows({
  monatsErgebnisse,
  aktivierteTabs,
  zulagenBreakdown,
}: {
  monatsErgebnisse: IBerechnungMonatsErgebnis[];
  aktivierteTabs?: string[];
  zulagenBreakdown: IZulagenBreakdown;
}) {
  const zeilen = [...ZEILEN];
  if (zulagenBreakdown.codes.length > 0) {
    const nebenIndex = zeilen.findIndex(z => z.id === 'summeNebenbezuege');
    zeilen.splice(nebenIndex, 0, buildZulagenBreakdownZeile(zulagenBreakdown));
  }

  // Desktop-Scope = ganzes Jahr: Gruppe nur ausblenden, wenn deaktiviert und in keinem Monat Daten.
  // Roh-Zulagen zaehlen fuer 'neben' auch dann als Daten, wenn keine Euro-Summe berechnet wurde.
  const hatGruppenDaten = (gruppe: BerechnungGruppe): boolean =>
    monatsErgebnisse.some(m => gruppeHatDaten(gruppe, m)) || (gruppe === 'neben' && zulagenBreakdown.codes.length > 0);

  const sichtbareZeilen = zeilen.filter(
    z => z.gruppe === null || isGroupVisible(z.gruppe, aktivierteTabs, hatGruppenDaten(z.gruppe)),
  );

  return (
    <>
      {sichtbareZeilen.map((zeile, i) => (
        <tr
          key={zeile.id}
          // Gruppenwechsel (Bereitschaft/EWT/Nebenbezüge/Gesamt) mit kräftiger Trennlinie markieren
          className={i > 0 && zeile.gruppe !== sichtbareZeilen[i - 1].gruppe ? 'berechnung-gruppen-start' : undefined}
        >
          {zeile.label !== undefined && <th rowSpan={zeile.rowSpan}>{zeile.label}</th>}
          {monatsErgebnisse.map(m => (
            <td key={m.monat} data-monat={m.monat}>
              {zeile.inhalt(m)}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function mountBerechnungTableRows(
  monatsErgebnisse: IBerechnungMonatsErgebnis[],
  zulagenBreakdown: IZulagenBreakdown,
  aktivierteTabs?: string[],
): void {
  const tbody = document.querySelector<HTMLTableSectionElement>('#tbodyBerechnung');
  if (!tbody) return;

  mount(
    tbody,
    <BerechnungTableRows
      monatsErgebnisse={monatsErgebnisse}
      aktivierteTabs={aktivierteTabs}
      zulagenBreakdown={zulagenBreakdown}
    />,
  );
}

export default BerechnungTableRows;
