/**
 * Phase L2: Berechnung-Tab-Huelle (ehemals `index.html`: Titel, Monats-Navigation,
 * `db-table`-Geruest) als React-Komponente, gemountet direkt in die `#Berechnung`-Tab-Pane
 * (analog `StartTab`/L1 -- kein Wrapper-Div, `class="tab-pane fade"` bleibt Sache von
 * `tabController.ts`).
 *
 * Rein praesentational -- die Verkabelung bleibt bewusst extern und unveraendert:
 * `#MonatBerechnung`-Text in `setMonatJahr.ts`, `#berechnungMonatsNav`/`#btnBerechnungMonate*`/
 * `#berechnungMonatsFensterLabel` in `berechnungMonatsFenster.ts`. `#berechnungMobileCards` und
 * `#tbodyBerechnung` bleiben leere Container -- eigene, unabhaengige React-Roots
 * (`BerechnungMobileCards`/`BerechnungTableRows`) werden bei jeder Datenaenderung separat per
 * `mount()` aus `generateTableBerechnung.ts` hineingerendert, exakt wie zuvor per `innerHTML`.
 */
export default function BerechnungTab() {
  return (
    <div className="mitte text-center mb-3">
      <div>
        <h1 id="titelBerechnung">Berechnung</h1>
        <h4 id="MonatBerechnung"></h4>
      </div>

      <div id="berechnungMobileCards" className="d-sm-none text-start" aria-describedby="titelBerechnung"></div>

      <div className="d-none d-sm-flex justify-content-center align-items-center gap-3 mb-2" id="berechnungMonatsNav">
        <button
          className="db-button"
          data-variant="outlined"
          data-size="small"
          data-icon="chevron_left"
          data-no-text="true"
          id="btnBerechnungMonatePrev"
          type="button"
        >
          Frühere Monate anzeigen
        </button>
        <span id="berechnungMonatsFensterLabel" className="small"></span>
        <button
          className="db-button"
          data-variant="outlined"
          data-size="small"
          data-icon="chevron_right"
          data-no-text="true"
          id="btnBerechnungMonateNext"
          type="button"
        >
          Spätere Monate anzeigen
        </button>
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
    </div>
  );
}
