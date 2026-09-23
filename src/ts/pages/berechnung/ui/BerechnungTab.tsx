import { DBButton, DBHeadingH1, DBSection, DBTooltip } from '@db-ux/react-core-components';
import { useEffect } from 'react';
import { openHelpModal } from '@/core';
import { bindClickHandlers } from '@/shared/lib/dom/bindClickHandlers';
import MonatUeberschrift from '@/shared/ui/monat-ueberschrift/MonatUeberschrift';

/**
 * Huelle des Berechnung-Tabs (Titel, Hilfe, Monats-Navigation, `db-table`-Geruest), von `App.tsx` direkt in
 * die `#Berechnung`-Tab-Pane gesetzt.
 *
 * Bis auf den Hilfe-Knopf rein praesentational, die uebrige Verkabelung liegt extern: `#MonatBerechnung`-Text aus
 * `monatJahrStore` (gesetzt von `setMonatJahr.ts`), `#berechnungMonatsNav`/`#btnBerechnungMonate*`/`#berechnungMonatsFensterLabel`
 * in `berechnungMonatsFenster.ts`. `#berechnungMobileCards` und `#tbodyBerechnung` bleiben leere
 * Container: `BerechnungMobileCards`/`BerechnungTableRows` mounten dort als eigene React-Roots bei
 * jeder Datenaenderung (`generateTableBerechnung.ts`).
 */
export default function BerechnungTab() {
  useEffect(() => bindClickHandlers([['btnHelpBerechnung', () => openHelpModal('tab.berechnung')]]), []);

  return (
    <DBSection width="large" spacing="none" className="text-center mb-3">
      <div>
        <DBHeadingH1 id="titelBerechnung" className="d-inline-flex align-items-center justify-content-center gap-2">
          Berechnung
          <DBButton
            type="button"
            className="p-0"
            variant="ghost"
            size="small"
            id="btnHelpBerechnung"
            icon="question_mark_circle"
            noText
            aria-label="Hilfe anzeigen"
          >
            <DBTooltip>Hilfe anzeigen</DBTooltip>
          </DBButton>
        </DBHeadingH1>
        <MonatUeberschrift id="MonatBerechnung" art="jahr" />
      </div>

      <div id="berechnungMobileCards" className="d-sm-none text-start" aria-describedby="titelBerechnung"></div>

      <div className="d-none d-sm-flex justify-content-center align-items-center gap-3 mb-2" id="berechnungMonatsNav">
        <DBButton
          variant="outlined"
          size="small"
          icon="chevron_left"
          noText
          id="btnBerechnungMonatePrev"
          type="button"
          aria-label="Frühere Monate anzeigen"
        >
          <DBTooltip>Frühere Monate anzeigen</DBTooltip>
        </DBButton>
        <span id="berechnungMonatsFensterLabel" className="small"></span>
        <DBButton
          variant="outlined"
          size="small"
          icon="chevron_right"
          noText
          id="btnBerechnungMonateNext"
          type="button"
          aria-label="Spätere Monate anzeigen"
        >
          <DBTooltip>Spätere Monate anzeigen</DBTooltip>
        </DBButton>
      </div>

      <div
        className="db-table d-none d-sm-block"
        data-width="full"
        data-variant="zebra"
        data-divider="both"
        data-size="small"
      >
        <table className="align-middle table-Berechnung" aria-describedby="titelBerechnung">
          <thead className="align-middle">
            <tr className="align-middle" data-sub-header-emphasis="weak">
              <th></th>
              <th className="sp-1" data-monat="1">
                Jan
              </th>
              <th className="sp-1" data-monat="2">
                Feb
              </th>
              <th className="sp-1" data-monat="3">
                Mär
              </th>
              <th className="sp-1" data-monat="4">
                Apr
              </th>
              <th className="sp-1" data-monat="5">
                Mai
              </th>
              <th className="sp-1" data-monat="6">
                Jun
              </th>
              <th className="sp-1" data-monat="7">
                Jul
              </th>
              <th className="sp-1" data-monat="8">
                Aug
              </th>
              <th className="sp-1" data-monat="9">
                Sep
              </th>
              <th className="sp-1" data-monat="10">
                Okt
              </th>
              <th className="sp-1" data-monat="11">
                Nov
              </th>
              <th className="sp-1" data-monat="12">
                Dez
              </th>
            </tr>
          </thead>
          <tbody id="tbodyBerechnung"></tbody>
        </table>
      </div>
    </DBSection>
  );
}
