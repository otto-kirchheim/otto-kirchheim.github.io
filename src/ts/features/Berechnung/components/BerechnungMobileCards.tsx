import { useState } from 'react';
import { formatCurrency, timeConvert, type IBerechnungMonatsErgebnis } from '../calculateBerechnungRows';
import { gruppeHatDaten, isGroupVisible, type BerechnungGruppe } from '../berechnungGroupVisibility';
import { zulagenEinheitKurz, type IZulagenBreakdown } from '../calculateZulagenBreakdown';
import { LreType } from '@otto-kirchheim/nebengeld-shared';
import { DBAccordion, DBAccordionItem } from '@db-ux/react-core-components';

const MONATSNAMEN = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'] as const;

interface IBerechnungMobileCardsProps {
  monatsErgebnisse: IBerechnungMonatsErgebnis[];
  aktivierteTabs?: string[];
  zulagenBreakdown?: IZulagenBreakdown;
  /** Dieser Monat (1-12) ist beim Rendern aufgeklappt */
  offenerMonat?: number;
}

const DetailZeile = ({ label, wert }: { label: string; wert: string }) => (
  <div className="d-flex justify-content-between gap-2 py-1 ps-3 berechnung-card-zeile">
    <span className="text-start">{label}</span>
    <span className="text-end text-nowrap">{wert}</span>
  </div>
);

const GruppenTitel = ({ titel, summe }: { titel: string; summe: number | null }) => (
  <div className="d-flex justify-content-between gap-2 fw-bold pt-2 pb-1 berechnung-card-gruppe">
    <span className="text-start">{titel}</span>
    <span className="text-end text-nowrap">{summe === null ? '' : formatCurrency(summe)}</span>
  </div>
);

function MonatsKarte({
  ergebnis,
  aktivierteTabs,
  zulagenBreakdown,
  offen = false,
  onToggle,
}: {
  ergebnis: IBerechnungMonatsErgebnis;
  aktivierteTabs?: string[];
  zulagenBreakdown?: IZulagenBreakdown;
  offen?: boolean;
  onToggle: (istOffen: boolean) => void;
}) {
  const monatsName = MONATSNAMEN[ergebnis.monat - 1] ?? String(ergebnis.monat);
  const collapseId = `berechnungMonatCollapse${ergebnis.monat}`;

  const monatHatZulagen =
    zulagenBreakdown?.codes.some(c => zulagenBreakdown.values[c.code][ergebnis.monat - 1] > 0) ?? false;

  // Mobil-Scope = einzelner Monat: deaktivierte Gruppen nur zeigen, wenn dieser Monat Daten hat
  const zeigeGruppe = (gruppe: BerechnungGruppe): boolean =>
    isGroupVisible(gruppe, aktivierteTabs, gruppeHatDaten(gruppe, ergebnis) || (gruppe === 'neben' && monatHatZulagen));

  // Kompakt: pro Schwelle eine eigene Zeile, Nullwerte werden weggelassen
  const schwellenZeilen = (praefix: string, eintraege: Array<[string, number | null]>) =>
    eintraege
      .filter(([, wert]) => (wert ?? 0) > 0)
      .map(([schwelle, wert]) => (
        <DetailZeile key={`${praefix}${schwelle}`} label={`${praefix} ${schwelle} Std.`} wert={String(wert)} />
      ));

  // Zulagen des Monats: nur Codes mit Wert > 0 im jeweiligen Monat
  const zulagenZeilen =
    zulagenBreakdown?.codes
      .filter(c => zulagenBreakdown.values[c.code][ergebnis.monat - 1] > 0)
      .map(c => (
        <DetailZeile
          key={c.code}
          label={c.label}
          wert={`${zulagenBreakdown.values[c.code][ergebnis.monat - 1]} ${zulagenEinheitKurz(c.unit)}`}
        />
      )) ?? [];

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
        {zeigeGruppe('bereitschaft') && (
          <>
            <GruppenTitel titel="Bereitschaft" summe={ergebnis.summeBereitschaft} />
            {ergebnis.bereitschaftMinuten !== null && (
              <DetailZeile
                label="Bereitschaftszeiten"
                wert={`${ergebnis.bereitschaftMinuten} / ${ergebnis.bereitschaftAnzeige ?? ''}`}
              />
            )}
            {ergebnis.bereitschaftszulage !== null && (
              <DetailZeile label="Bereitschaftszulage" wert={formatCurrency(ergebnis.bereitschaftszulage)} />
            )}
            {ergebnis.lre1 !== null && <DetailZeile label={LreType.LRE_1} wert={formatCurrency(ergebnis.lre1)} />}
            {ergebnis.lre2 !== null && <DetailZeile label={LreType.LRE_2} wert={formatCurrency(ergebnis.lre2)} />}
            {ergebnis.lre3 !== null && <DetailZeile label={LreType.LRE_3} wert={formatCurrency(ergebnis.lre3)} />}
            {ergebnis.privatPkw !== null && (
              <DetailZeile label="Privat-PKW" wert={formatCurrency(ergebnis.privatPkw)} />
            )}
          </>
        )}
        {zeigeGruppe('ewt') && (
          <>
            <GruppenTitel titel="EWT" summe={ergebnis.summeEwt} />
            {ergebnis.abwesenheiten !== null &&
              schwellenZeilen('Abwesenheiten', [
                ['>8', ergebnis.abwesenheiten.a8],
                ['>14', ergebnis.abwesenheiten.a14],
                ['>24', ergebnis.abwesenheiten.a24],
              ])}
            {ergebnis.steuerfreieAbwesenheiten !== null &&
              schwellenZeilen('steuerfrei', [
                ['>8', ergebnis.steuerfreieAbwesenheiten.s8],
                ['>14', ergebnis.steuerfreieAbwesenheiten.s14],
              ])}
          </>
        )}
        {zeigeGruppe('neben') && (
          <>
            <GruppenTitel titel="Nebenbezüge" summe={ergebnis.summeNebenbezuege} />
            {zulagenZeilen}
          </>
        )}
        {zeigeGruppe('ea') && ergebnis.eaMinuten !== null && (
          <div className="d-flex justify-content-between gap-2 fw-bold pt-2 pb-1 berechnung-card-gruppe">
            <span className="text-start">Entgeltausgleich</span>
            <span className="text-end text-nowrap">{timeConvert(ergebnis.eaMinuten)}</span>
          </div>
        )}
        <GruppenTitel titel="Gesamt" summe={ergebnis.summeGesamt} />
      </div>
    </DBAccordionItem>
  );
}

/**
 * Genau eine Monatskarte ist offen. Der Zustand liegt hier (`open` + `onToggle`) statt in
 * `<DBAccordion behavior="single">`: dort braucht ein zuvor geoeffneter, dann nativ geschlossener
 * Eintrag zwei Klicks (DB UX 5.5.0, siehe `offenerAbschnittStore.ts`). Wechselt `offenerMonat`
 * von aussen (anderer Monat gewaehlt), folgt die Auswahl -- per Vergleich mit dem Vorwert im
 * Render statt im Effekt.
 */
const BerechnungMobileCards = ({
  monatsErgebnisse,
  aktivierteTabs,
  zulagenBreakdown,
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
          zulagenBreakdown={zulagenBreakdown}
          offen={ergebnis.monat === offen}
          onToggle={istOffen => setOffen(istOffen ? ergebnis.monat : null)}
        />
      ))}
    </DBAccordion>
  );
};

export default BerechnungMobileCards;
