import { useState } from 'react';
import type { IBerechnungMonatsErgebnis } from '@/types';
import { DBAccordion, DBAccordionItem } from '@db-ux/react-core-components';
import { formatCurrency } from '@/shared/lib/ressource/berechnungWerte';
import { GruppenTitel } from '@/shared/ui/berechnung/berechnungBausteine';
import { isGroupVisible } from '../berechnungGroupVisibility';
import type { IBerechnungGruppe } from '../ladeBerechnungsTeile';

const MONATSNAMEN = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'] as const;

interface IBerechnungMobileCardsProps {
  monatsErgebnisse: IBerechnungMonatsErgebnis[];
  aktivierteTabs?: string[];
  /** Gruppen der Features (Slot `berechnung` plus Hilfsdaten) in `meta.order`. */
  gruppen: IBerechnungGruppe[];
  /** Dieser Monat (1-12) ist beim Rendern aufgeklappt */
  offenerMonat?: number;
}

/**
 * Aufklappbare Karte eines Monats: Monatssumme im Kopf, darunter die Gruppen der Features (aus deren Slot `berechnung`)
 * und Gesamt.
 *
 * @param props - Monatsergebnis, aktivierte Tabs, Gruppen der Features, Offen-Zustand und Toggle-Callback.
 */
function MonatsKarte({
  ergebnis,
  aktivierteTabs,
  gruppen,
  offen = false,
  onToggle,
}: {
  ergebnis: IBerechnungMonatsErgebnis;
  aktivierteTabs?: string[];
  gruppen: IBerechnungGruppe[];
  offen?: boolean;
  onToggle: (istOffen: boolean) => void;
}) {
  const monatsName = MONATSNAMEN[ergebnis.monat - 1] ?? String(ergebnis.monat);
  const collapseId = `berechnungMonatCollapse${ergebnis.monat}`;

  /**
   * Mobil-Scope = einzelner Monat: deaktivierte Gruppen nur zeigen, wenn dieser Monat Daten hat.
   *
   * @param gruppe - Zu prüfende Gruppe eines Features.
   * @returns `true`, wenn die Gruppe in dieser Karte angezeigt wird.
   */
  const zeigeGruppe = (gruppe: IBerechnungGruppe): boolean =>
    isGroupVisible(
      gruppe.tabKey,
      aktivierteTabs,
      gruppe.part.hatDaten(ergebnis) || (gruppe.part.hatZusatzDaten?.(gruppe.extra, ergebnis.monat) ?? false),
    );

  return (
    // `MonatsKarte` wird nur von `BerechnungMobileCards` unterhalb des `DBAccordion` gerendert; die
    // statische Regel sieht die Komponentengrenze nicht.
    // eslint-disable-next-line db-ux/sub-component-required-parent
    <DBAccordionItem
      id={collapseId}
      open={offen}
      onToggle={onToggle}
      headline={
        <span className="d-flex justify-content-between w-100 me-2">
          <span>{monatsName}</span>
          <span>{ergebnis.summeGesamt === null ? '' : formatCurrency(ergebnis.summeGesamt)}</span>
        </span>
      }
    >
      <div className="py-2">
        {gruppen.filter(zeigeGruppe).map(gruppe => (
          <div key={gruppe.id}>{gruppe.part.karte(ergebnis, gruppe.extra)}</div>
        ))}
        <GruppenTitel titel="Gesamt" summe={ergebnis.summeGesamt} />
      </div>
    </DBAccordionItem>
  );
}

/**
 * Mobile Monatskarten der Berechnung; genau eine Karte ist offen. Der Zustand liegt hier (`open` +
 * `onToggle`) statt in `<DBAccordion behavior="single">`: dort braucht ein zuvor geoeffneter, dann nativ
 * geschlossener Eintrag zwei Klicks (DB UX 5.5.0, siehe `offenerAbschnittStore.ts`). Wechselt `offenerMonat`
 * von aussen, folgt die Auswahl -- per Vergleich mit dem Vorwert im Render statt im Effekt.
 *
 * @param props - Monatsergebnisse, aktivierte Tabs, Gruppen der Features und initial offener Monat.
 */
const BerechnungMobileCards = ({
  monatsErgebnisse,
  aktivierteTabs,
  gruppen,
  offenerMonat,
}: IBerechnungMobileCardsProps) => {
  const [vorherigerMonat, setVorherigerMonat] = useState(offenerMonat);
  const [offen, setOffen] = useState<number | null>(offenerMonat ?? null);
  if (offenerMonat !== vorherigerMonat) {
    setVorherigerMonat(offenerMonat);
    setOffen(offenerMonat ?? null);
  }

  return (
    <DBAccordion id="accordionBerechnung" variant="card">
      {monatsErgebnisse.map(ergebnis => (
        <MonatsKarte
          key={ergebnis.monat}
          ergebnis={ergebnis}
          aktivierteTabs={aktivierteTabs}
          gruppen={gruppen}
          offen={ergebnis.monat === offen}
          onToggle={istOffen => setOffen(istOffen ? ergebnis.monat : null)}
        />
      ))}
    </DBAccordion>
  );
};

export default BerechnungMobileCards;
