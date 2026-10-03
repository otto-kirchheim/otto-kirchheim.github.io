import type { ReactNode } from 'react';
import { DBStack } from '@db-ux/react-core-components';
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
            <td>{a}</td>
            <td>{b}</td>
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
  <DBStack direction="row" justifyContent="space-between" gap="x-small" className="berechnung-card-zeile">
    <span>{label}</span>
    <span>{wert}</span>
  </DBStack>
);

/**
 * Fette Gruppenzeile einer Monatskarte mit Summe rechts.
 *
 * @param props - `titel` und `summe` (Euro; `null` = keine Anzeige).
 */
export const GruppenTitel = ({ titel, summe }: { titel: string; summe: number | null }) => (
  <DBStack direction="row" justifyContent="space-between" gap="x-small" className="berechnung-card-gruppe">
    <strong>{titel}</strong>
    <strong>{summe === null ? '' : formatCurrency(summe)}</strong>
  </DBStack>
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
