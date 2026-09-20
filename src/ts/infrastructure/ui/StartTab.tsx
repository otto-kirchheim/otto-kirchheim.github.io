import {
  DBButton,
  DBCard,
  DBHeadingH1,
  DBHeadingH5,
  DBSection,
  DBStack,
  DBTooltip,
} from '@db-ux/react-core-components';

/**
 * Start-Tab: Willkommenstext, drei Einstiegskarten, Schnellzugriff (nur Mobil) und Ladeanzeige.
 * Wird direkt in die `#start`-Pane von `App.tsx` gemountet (ohne Wrapper-Div); die Pane-Klassen
 * (`active`/`show`) setzt `App.tsx`.
 *
 * Rein praesentational: Die Verkabelung liegt ausserhalb und haengt an den IDs/Klassen hier
 * (`#btnHelpStart`, `#Willkommen`, `#startSchnellzugriff [data-jump-tab]` in
 * `core/orchestration/auth/index.ts`; `#quick-*-tab` in `updateTabVisibility.ts`; `#ladeAnzeige`
 * in `setLoading.ts`/`clearLoading.ts`) -- diese Bezeichner nicht ohne die Gegenstellen aendern.
 */
export default function StartTab() {
  return (
    <DBSection width="medium" spacing="small">
      <div className="text-center mb-4 mb-md-5">
        <div className="d-inline-flex align-items-center justify-content-center gap-2">
          <DBHeadingH1 className="mt-2 mb-0" id="Willkommen">
            Willkommen
          </DBHeadingH1>
          <DBButton
            type="button"
            className="p-0"
            variant="ghost"
            size="small"
            id="btnHelpStart"
            icon="question_mark_circle"
            noText
            aria-label="Hilfe anzeigen"
          >
            <DBTooltip>Hilfe anzeigen</DBTooltip>
          </DBButton>
        </div>
        <p className="text-body-secondary mb-0">Nebengeld digital erfassen, berechnen und als PDF erzeugen.</p>
      </div>

      <DBStack direction="row" wrap gap="medium" className="mb-4 karten-gleich">
        {/* `.karten-titel` (`min-block-size: 3.5rem`) reserviert zwei Titelzeilen, damit der
            Fliesstext in allen Karten auf gleicher Hoehe beginnt, auch wenn ein Titel umbricht. */}
        <DBCard className="h-100 text-start">
          <DBHeadingH5 paragraphSpacing className="d-flex align-items-center gap-2 karten-titel">
            <span className="db-icon text-primary" data-icon="sliders_horizontal" />
            1. Einstellungen prüfen
          </DBHeadingH5>
          <p className="mb-0">Persönliche Daten, Arbeitszeiten und Vorgaben aktuell halten.</p>
        </DBCard>
        <DBCard className="h-100 text-start">
          <DBHeadingH5 paragraphSpacing className="d-flex align-items-center gap-2 karten-titel">
            <span className="db-icon text-primary" data-icon="pen" />
            2. Monate erfassen
          </DBHeadingH5>
          <p className="mb-0">Bereitschaft, EWT und Zulagen eintragen und speichern.</p>
        </DBCard>
        <DBCard className="h-100 text-start">
          <DBHeadingH5 paragraphSpacing className="d-flex align-items-center gap-2 karten-titel">
            <span className="db-icon text-primary" data-icon="document" />
            3. Ergebnis exportieren
          </DBHeadingH5>
          <p className="mb-0">Berechnung prüfen und die Formulare als PDF erzeugen.</p>
        </DBCard>
      </DBStack>

      {/* d-md-none, nicht d-lg-none: DBHeader wechselt intern bei 64em/1024px (unser
             md-Breakpoint) von Mobile-Drawer auf Desktop-Inline-Navigation. */}
      <div className="raster-auto mb-4 d-md-none d-none abstand-3" id="startSchnellzugriff">
        <div className="d-none" id="quick-bereitschaft-tab">
          <DBButton
            type="button"
            className="d-flex flex-column align-items-center gap-1 py-3"
            variant="outlined"
            width="full"
            data-jump-tab="bereitschaft-tab"
            icon="calendar"
          >
            Bereitschaft
          </DBButton>
        </div>
        <div className="d-none" id="quick-ewt-tab">
          <DBButton
            type="button"
            className="d-flex flex-column align-items-center gap-1 py-3"
            variant="outlined"
            width="full"
            data-jump-tab="ewt-tab"
            icon="changeover"
          >
            EWT
          </DBButton>
        </div>
        <div className="d-none" id="quick-neben-tab">
          <DBButton
            type="button"
            className="d-flex flex-column align-items-center gap-1 py-3"
            variant="outlined"
            width="full"
            data-jump-tab="neben-tab"
            icon="cash"
          >
            Zulagen
          </DBButton>
        </div>
        <div className="d-none" id="quick-ea-tab">
          <DBButton
            type="button"
            className="d-flex flex-column align-items-center gap-1 py-3"
            variant="outlined"
            width="full"
            data-jump-tab="ea-tab"
            icon="euro_sign"
          >
            Entgeltausgleich
          </DBButton>
        </div>
        <div>
          <DBButton
            type="button"
            className="d-flex flex-column align-items-center gap-1 py-3"
            variant="outlined"
            width="full"
            data-jump-tab="berechnung-tab"
            icon="bar_chart"
          >
            Berechnung
          </DBButton>
        </div>
        <div>
          <DBButton
            type="button"
            className="d-flex flex-column align-items-center gap-1 py-3"
            variant="outlined"
            width="full"
            data-jump-tab="einstellungen-tab"
            icon="gear_wheel"
          >
            Einstellungen
          </DBButton>
        </div>
      </div>

      <DBStack
        direction="column"
        alignment="center"
        justifyContent="center"
        gap="none"
        className="mt-4 d-none"
        id="ladeAnzeige"
      >
        <strong role="status">Lädt...</strong>
        <span
          className="laedt text-primary"
          style={{ '--db-icon-font-size': '3rem' } as React.CSSProperties}
          role="status"
        />
      </DBStack>
    </DBSection>
  );
}
