/**
 * Phase L1: Start-Tab (ehemals `index.html:82-244`) als React-Komponente. Gemountet direkt in
 * die `#start`-Tab-Pane hinein (kein Wrapper-Div wie bei `AppHeader`/`AppFooter`): `styles.scss`s
 * `#start.active > .schwelle`-Kindselektor (Fusszeilen-buendige Platzierung per
 * `margin-block-start: auto`) verlangt die Schwelle als direktes Kind, ein Zwischen-Div bricht
 * den Selektor. `class="tab-pane fade show active"` bleibt unveraendert Sache von
 * `tabController.ts` -- React ruehrt nur die Kinder des Containers an.
 *
 * Rein praesentational -- die Verkabelung bleibt bewusst extern und unveraendert:
 * `#btnHelpStart`-Klick, `#startSchnellzugriff [data-jump-tab]`-Klicks und der
 * `#Willkommen`-Textinhalt in `core/orchestration/auth/index.ts`, `#quick-*-tab`-Sichtbarkeit in
 * `updateTabVisibility.ts`, `#startSchnellzugriff`-Sichtbarkeit in `auth/index.ts` /
 * `loadUserDaten.ts` / `logoutUser.ts`, `#ladeAnzeige` in `setLoading.ts`/`clearLoading.ts`.
 * Alle IDs/Klassen deshalb 1:1 uebernommen (analog K5s "Login-Button unveraendertes Markup").
 */
export default function StartTab() {
  return (
    <>
      <div className="mitte py-4 py-md-5">
        <div className="text-center mb-4 mb-md-5">
          <div className="d-inline-flex align-items-center justify-content-center gap-2">
            <h1 className="mt-2 mb-0" id="Willkommen">
              Willkommen
            </h1>
            <button
              type="button"
              className="db-button p-0"
              data-variant="ghost"
              data-size="small"
              id="btnHelpStart"
              aria-label="Hilfe anzeigen"
            >
              <span className="db-icon align-middle" data-icon="question_mark_circle" style={{ fontSize: '1.25rem' }} />
            </button>
          </div>
          <p className="text-body-secondary mb-0">Nebengeld digital erfassen, berechnen und als PDF erzeugen.</p>
        </div>

        <div className="raster-auto mb-4 abstand-3">
          <div>
            <div className="db-card h-100 text-start">
              <h5 className="d-flex align-items-center gap-2">
                <span className="db-icon text-primary" data-icon="sliders_horizontal" />
                1. Einstellungen prüfen
              </h5>
              <p className="mb-0">Persönliche Daten, Arbeitszeiten und Vorgaben aktuell halten.</p>
            </div>
          </div>
          <div>
            <div className="db-card h-100 text-start">
              <h5 className="d-flex align-items-center gap-2">
                <span className="db-icon text-primary" data-icon="pen" />
                2. Monate erfassen
              </h5>
              <p className="mb-0">Bereitschaft, EWT und Nebenbezüge eintragen und speichern.</p>
            </div>
          </div>
          <div>
            <div className="db-card h-100 text-start">
              <h5 className="d-flex align-items-center gap-2">
                <span className="db-icon text-primary" data-icon="document" />
                3. Ergebnis exportieren
              </h5>
              <p className="mb-0">Berechnung prüfen und die Formulare als PDF erzeugen.</p>
            </div>
          </div>
        </div>

        {/* d-md-none, nicht d-lg-none: DBHeader wechselt intern bei 64em/1024px (unser
             md-Breakpoint) von Mobile-Drawer auf Desktop-Inline-Navigation -- siehe K5-Begruendung
             in tasks/todo.md. */}
        <div className="raster-auto mb-4 d-md-none d-none abstand-3" id="startSchnellzugriff">
          <div className="d-none" id="quick-bereitschaft-tab">
            <button
              type="button"
              className="db-button d-flex flex-column align-items-center gap-1 py-3"
              data-variant="outlined"
              data-width="full"
              data-jump-tab="bereitschaft-tab"
            >
              <span className="db-icon" data-icon="calendar" />
              Bereitschaft
            </button>
          </div>
          <div className="d-none" id="quick-ewt-tab">
            <button
              type="button"
              className="db-button d-flex flex-column align-items-center gap-1 py-3"
              data-variant="outlined"
              data-width="full"
              data-jump-tab="ewt-tab"
            >
              <span className="db-icon" data-icon="changeover" />
              EWT
            </button>
          </div>
          <div className="d-none" id="quick-neben-tab">
            <button
              type="button"
              className="db-button d-flex flex-column align-items-center gap-1 py-3"
              data-variant="outlined"
              data-width="full"
              data-jump-tab="neben-tab"
            >
              <span className="db-icon" data-icon="cash" />
              Nebenbezüge
            </button>
          </div>
          <div className="d-none" id="quick-ea-tab">
            <button
              type="button"
              className="db-button d-flex flex-column align-items-center gap-1 py-3"
              data-variant="outlined"
              data-width="full"
              data-jump-tab="ea-tab"
            >
              <span className="db-icon" data-icon="euro_sign" />
              Entgeltausgleich
            </button>
          </div>
          <div>
            <button
              type="button"
              className="db-button d-flex flex-column align-items-center gap-1 py-3"
              data-variant="outlined"
              data-width="full"
              data-jump-tab="berechnung-tab"
            >
              <span className="db-icon" data-icon="bar_chart" />
              Berechnung
            </button>
          </div>
          <div>
            <button
              type="button"
              className="db-button d-flex flex-column align-items-center gap-1 py-3"
              data-variant="outlined"
              data-width="full"
              data-jump-tab="einstellungen-tab"
            >
              <span className="db-icon" data-icon="gear_wheel" />
              Einstellungen
            </button>
          </div>
        </div>

        <div className="d-flex flex-column align-items-center justify-content-center mt-4 d-none" id="ladeAnzeige">
          <strong role="status">Lädt...</strong>
          <span
            className="laedt text-primary"
            style={{ '--db-icon-font-size': '3rem' } as React.CSSProperties}
            role="status"
          />
        </div>
      </div>

      {/* DB-Schwelle: Markenstreifen am unteren Rand des Startbereichs, rechtsbuendig,
           diagonal gegenueber der Wortmarke oben links. */}
      <div className="schwelle" aria-hidden="true" />
    </>
  );
}
