import { render } from 'preact';
import { formatCurrency, type IBerechnungMonatsErgebnis } from '../calculateBerechnungRows';
import { gruppeHatDaten, isGroupVisible, type BerechnungGruppe } from '../berechnungGroupVisibility';
import { zulagenEinheitKurz, type IZulagenBreakdown } from '../calculateZulagenBreakdown';

const MONATSNAMEN = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'] as const;

interface IBerechnungMobileCardsProps {
  monatsErgebnisse: IBerechnungMonatsErgebnis[];
  aktivierteTabs?: string[];
  zulagenBreakdown?: IZulagenBreakdown;
}

const DetailZeile = ({ label, wert }: { label: string; wert: string }) => (
  <div class="d-flex justify-content-between gap-2 py-1 ps-3 berechnung-card-zeile">
    <span class="text-start">{label}</span>
    <span class="text-end text-nowrap">{wert}</span>
  </div>
);

const GruppenTitel = ({ titel, summe }: { titel: string; summe: number | null }) => (
  <div class="d-flex justify-content-between gap-2 fw-bold pt-2 pb-1 berechnung-card-gruppe">
    <span class="text-start">{titel}</span>
    <span class="text-end text-nowrap">{summe === null ? '' : formatCurrency(summe)}</span>
  </div>
);

function MonatsKarte({
  ergebnis,
  aktivierteTabs,
  zulagenBreakdown,
}: {
  ergebnis: IBerechnungMonatsErgebnis;
  aktivierteTabs?: string[];
  zulagenBreakdown?: IZulagenBreakdown;
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
    <div class="accordion-item">
      <h2 class="accordion-header">
        <button
          class="accordion-button collapsed"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target={`#${collapseId}`}
        >
          <span class="d-flex justify-content-between w-100 me-2">
            <span>{monatsName}</span>
            <span>{ergebnis.summeGesamt === null ? '' : formatCurrency(ergebnis.summeGesamt)}</span>
          </span>
        </button>
      </h2>
      <div id={collapseId} class="accordion-collapse collapse" data-bs-parent="#accordionBerechnung">
        <div class="accordion-body py-2">
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
              {ergebnis.lre1 !== null && <DetailZeile label="LRE 1" wert={formatCurrency(ergebnis.lre1)} />}
              {ergebnis.lre2 !== null && <DetailZeile label="LRE 2" wert={formatCurrency(ergebnis.lre2)} />}
              {ergebnis.lre3 !== null && <DetailZeile label="LRE 3" wert={formatCurrency(ergebnis.lre3)} />}
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
                schwellenZeilen('steuerfrei § 9 EStG', [
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
          <GruppenTitel titel="Gesamt" summe={ergebnis.summeGesamt} />
        </div>
      </div>
    </div>
  );
}

const BerechnungMobileCards = ({ monatsErgebnisse, aktivierteTabs, zulagenBreakdown }: IBerechnungMobileCardsProps) => (
  <div class="accordion" id="accordionBerechnung">
    {monatsErgebnisse.map(ergebnis => (
      <MonatsKarte
        key={ergebnis.monat}
        ergebnis={ergebnis}
        aktivierteTabs={aktivierteTabs}
        zulagenBreakdown={zulagenBreakdown}
      />
    ))}
  </div>
);

export function mountBerechnungMobileCards(
  monatsErgebnisse: IBerechnungMonatsErgebnis[],
  aktivierteTabs?: string[],
  zulagenBreakdown?: IZulagenBreakdown,
): void {
  const container = document.querySelector<HTMLDivElement>('#berechnungMobileCards');
  if (!container) return;

  render(
    <BerechnungMobileCards
      monatsErgebnisse={monatsErgebnisse}
      aktivierteTabs={aktivierteTabs}
      zulagenBreakdown={zulagenBreakdown}
    />,
    container,
  );
}

export default BerechnungMobileCards;
