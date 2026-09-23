import type { ReactNode } from 'react';
import { formatCurrency } from '@/shared/lib/ressource/berechnungWerte';

/*
 * Gemeinsame Darstellungs-Bausteine der Berechnung (Desktop-Tabelle und mobile Monatskarten). Die Features
 * setzen daraus ihre Gruppe im Slot `berechnung` zusammen; Formatter liegen in `shared/lib/ressource/berechnungWerte`.
 */

/**
 * Verschachtelte zweispaltige Zeilenkopf-Tabelle für mehrzeilige Labels (EWT-Schwellen, Zulagen-Codes);
 * ihre Zeilen entsprechen den per `<br />` getrennten Werten in den Monatszellen.
 *
 * @param props - `zeilen`: Paare aus linker und rechter Zelle.
 */
export function LabelTabelle({ zeilen }: { zeilen: Array<[ReactNode, ReactNode]> }) {
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

/**
 * Einzelne Detailzeile einer Monatskarte (Label links, Wert rechts).
 *
 * @param props - `label` und `wert` als bereits formatierte Texte.
 */
export const DetailZeile = ({ label, wert }: { label: string; wert: string }) => (
  <div className="d-flex justify-content-between gap-2 py-1 ps-3 berechnung-card-zeile">
    <span className="text-start">{label}</span>
    <span className="text-end text-nowrap">{wert}</span>
  </div>
);

/**
 * Fette Gruppenzeile einer Monatskarte mit Summe rechts.
 *
 * @param props - `titel` und `summe` (Euro; `null` = keine Anzeige).
 */
export const GruppenTitel = ({ titel, summe }: { titel: string; summe: number | null }) => (
  <div className="d-flex justify-content-between gap-2 fw-bold pt-2 pb-1 berechnung-card-gruppe">
    <span className="text-start">{titel}</span>
    <span className="text-end text-nowrap">{summe === null ? '' : formatCurrency(summe)}</span>
  </div>
);

/**
 * Kompakt: pro Schwelle eine eigene Zeile, Nullwerte werden weggelassen.
 *
 * @param props - `praefix`: Zeilenpräfix (z. B. "Abwesenheiten"); `eintraege`: Paare aus Schwellen-Text (z. B. ">8") und Anzahl.
 */
export function SchwellenZeilen({
  praefix,
  eintraege,
}: {
  praefix: string;
  eintraege: Array<[string, number | null]>;
}) {
  return (
    <>
      {eintraege
        .filter(([, wert]) => (wert ?? 0) > 0)
        .map(([schwelle, wert]) => (
          <DetailZeile key={`${praefix}${schwelle}`} label={`${praefix} ${schwelle} Std.`} wert={String(wert)} />
        ))}
    </>
  );
}
