import type { ReactNode } from 'react';
import type { IBerechnungMonatsErgebnis, IBerechnungTabellenZeile } from '@/types';
import { currency } from '@/infrastructure/data/berechnungWerte';
import { isGroupVisible } from '../berechnungGroupVisibility';
import type { IBerechnungGruppe } from '../ladeBerechnungsTeile';

/*
 * `#tbodyBerechnung` ist ein eigener React-Root direkt auf dem `<tbody>` (analog `BerechnungMobileCards`);
 * `BerechnungTab.tsx` rendert das `<tbody>` nur leer und ruehrt seine Kinder nie an.
 *
 * `wendeMonatsFensterAn()` liest direkt nach dem Mount `td[data-monat]`-Zellen aus dem DOM. `mount()` ist
 * per `flushSync` synchron, daher muss `generateTableBerechnung.ts` es erst nach dem Mount aufrufen.
 */

interface IZeile extends IBerechnungTabellenZeile {
  /** `tabKey` des Features; null = immer sichtbar (z. B. Summe Gesamt) */
  gruppe: string | null;
}

const SUMME_GESAMT: IZeile = {
  id: 'summeGesamt',
  gruppe: null,
  label: 'Summe Gesamt',
  inhalt: (m: IBerechnungMonatsErgebnis): ReactNode => currency(m.summeGesamt),
};

/**
 * Zeilen des Berechnungs-`<tbody>`: die sichtbaren Zeilen jedes Features (aus dessen Slot `berechnung`) in `meta.order`,
 * darunter "Summe Gesamt", mit je einer Zelle pro Monat.
 *
 * @param props - Monatsergebnisse, aktivierte Tabs und die Gruppen der Features (Slot plus Hilfsdaten).
 */
function BerechnungTableRows({
  monatsErgebnisse,
  aktivierteTabs,
  gruppen,
}: {
  monatsErgebnisse: IBerechnungMonatsErgebnis[];
  aktivierteTabs?: string[];
  gruppen: IBerechnungGruppe[];
}) {
  /**
   * Desktop-Scope = ganzes Jahr: Gruppe nur ausblenden, wenn deaktiviert und in keinem Monat Daten.
   * Zusatzdaten des Features (z. B. Roh-Zulagen) zaehlen auch dann als Daten, wenn keine Euro-Summe berechnet wurde.
   *
   * @param gruppe - Zu prüfende Gruppe eines Features.
   * @returns `true`, wenn irgendein Monat Daten für die Gruppe hat.
   */
  const hatGruppenDaten = (gruppe: IBerechnungGruppe): boolean =>
    monatsErgebnisse.some(m => gruppe.part.hatDaten(m)) || (gruppe.part.hatZusatzDaten?.(gruppe.extra) ?? false);

  const sichtbareZeilen: IZeile[] = [
    ...gruppen
      .filter(gruppe => isGroupVisible(gruppe.tabKey, aktivierteTabs, hatGruppenDaten(gruppe)))
      .flatMap(gruppe =>
        gruppe.part.tabelle(gruppe.extra).map((zeile): IZeile => ({ ...zeile, gruppe: gruppe.tabKey })),
      ),
    SUMME_GESAMT,
  ];

  return (
    <>
      {sichtbareZeilen.map((zeile, i) => (
        <tr
          key={zeile.id}
          // Gruppenwechsel (Bereitschaft/EWT/Zulagen/Gesamt) mit kräftiger Trennlinie markieren
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

export default BerechnungTableRows;
