import { render } from 'preact';
import { formatCurrency, type IBerechnungMonatsErgebnis } from '../calculateBerechnungRows';
import { gruppeHatDaten, isGroupVisible, type BerechnungGruppe } from '../berechnungGroupVisibility';

const MONATSNAMEN = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'] as const;

interface IBerechnungMobileCardsProps {
  monatsErgebnisse: IBerechnungMonatsErgebnis[];
  aktivierteTabs?: string[];
}

const DetailZeile = ({ label, wert }: { label: string; wert: string }) => (
  <div class="d-flex justify-content-between gap-2 py-1 border-bottom berechnung-card-zeile">
    <span class="text-start">{label}</span>
    <span class="text-end text-nowrap">{wert}</span>
  </div>
);

const GruppenTitel = ({ titel }: { titel: string }) => (
  <div class="fw-bold text-start pt-2 pb-1 berechnung-card-gruppe">{titel}</div>
);

function MonatsKarte({ ergebnis, aktivierteTabs }: { ergebnis: IBerechnungMonatsErgebnis; aktivierteTabs?: string[] }) {
  const monatsName = MONATSNAMEN[ergebnis.monat - 1] ?? String(ergebnis.monat);
  const collapseId = `berechnungMonatCollapse${ergebnis.monat}`;

  // Mobil-Scope = einzelner Monat: deaktivierte Gruppen nur zeigen, wenn dieser Monat Daten hat
  const zeigeGruppe = (gruppe: BerechnungGruppe): boolean =>
    isGroupVisible(gruppe, aktivierteTabs, gruppeHatDaten(gruppe, ergebnis));

  const schwellenWerte = (werte: Array<[string, number | null]>): string =>
    werte.map(([schwelle, wert]) => `${schwelle}: ${wert ?? '–'}`).join(' · ');

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
              <GruppenTitel titel="Bereitschaft" />
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
              {ergebnis.summeBereitschaft !== null && (
                <DetailZeile label="Summe Bereitschaft" wert={formatCurrency(ergebnis.summeBereitschaft)} />
              )}
            </>
          )}
          {zeigeGruppe('ewt') && (
            <>
              <GruppenTitel titel="EWT" />
              {ergebnis.abwesenheiten !== null && (
                <DetailZeile
                  label="Abwesenheiten FGr-TV / LfTV / RVB"
                  wert={schwellenWerte([
                    ['>8', ergebnis.abwesenheiten.a8],
                    ['>14', ergebnis.abwesenheiten.a14],
                    ['>24', ergebnis.abwesenheiten.a24],
                  ])}
                />
              )}
              {ergebnis.steuerfreieAbwesenheiten !== null && (
                <DetailZeile
                  label="steuerfreie Abwesenheiten § 9 EStG"
                  wert={schwellenWerte([
                    ['>8', ergebnis.steuerfreieAbwesenheiten.s8],
                    ['>14', ergebnis.steuerfreieAbwesenheiten.s14],
                  ])}
                />
              )}
              {ergebnis.summeEwt !== null && <DetailZeile label="Summe EWT" wert={formatCurrency(ergebnis.summeEwt)} />}
            </>
          )}
          {zeigeGruppe('neben') && (
            <>
              <GruppenTitel titel="Nebenbezüge" />
              {ergebnis.summeNebenbezuege !== null && (
                <DetailZeile label="Summe Nebenbezüge" wert={formatCurrency(ergebnis.summeNebenbezuege)} />
              )}
            </>
          )}
          <GruppenTitel titel="Gesamt" />
          <DetailZeile
            label="Summe Gesamt"
            wert={ergebnis.summeGesamt === null ? '–' : formatCurrency(ergebnis.summeGesamt)}
          />
        </div>
      </div>
    </div>
  );
}

const BerechnungMobileCards = ({ monatsErgebnisse, aktivierteTabs }: IBerechnungMobileCardsProps) => (
  <div class="accordion" id="accordionBerechnung">
    {monatsErgebnisse.map(ergebnis => (
      <MonatsKarte key={ergebnis.monat} ergebnis={ergebnis} aktivierteTabs={aktivierteTabs} />
    ))}
  </div>
);

export function mountBerechnungMobileCards(
  monatsErgebnisse: IBerechnungMonatsErgebnis[],
  aktivierteTabs?: string[],
): void {
  const container = document.querySelector<HTMLDivElement>('#berechnungMobileCards');
  if (!container) return;

  render(<BerechnungMobileCards monatsErgebnisse={monatsErgebnisse} aktivierteTabs={aktivierteTabs} />, container);
}

export default BerechnungMobileCards;
