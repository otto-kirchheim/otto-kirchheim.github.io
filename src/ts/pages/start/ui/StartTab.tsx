import type { ComponentProps } from 'react';
import {
  DBButton,
  DBCard,
  DBHeadingH1,
  DBHeadingH5,
  DBInfotext,
  DBSection,
  DBStack,
  DBTooltip,
} from '@db-ux/react-core-components';
import { featureRegistry } from '@/shared/lib/feature';
import useFeatureTabsVisible from '@/shared/model/navigation/useFeatureTabsVisible';

/**
 * Start-Tab: Willkommenstext, drei Einstiegskarten, Schnellzugriff (nur Mobil) und Ladeanzeige.
 * Wird direkt in die `#start`-Pane von `App.tsx` gemountet (ohne Wrapper-Div); die Pane-Klassen
 * (`active`/`show`) setzt `App.tsx`.
 *
 * Rein praesentational: Die Verkabelung liegt ausserhalb und haengt an den IDs/Klassen hier
 * (`#btnHelpStart`, `#Willkommen`, `#startSchnellzugriff [data-jump-tab]` in
 * `app/session/index.ts`; `#quick-*-tab` in `updateTabVisibility.ts`; `#ladeAnzeige`
 * in `setLoading.ts`/`clearLoading.ts`) -- diese Bezeichner nicht ohne die Gegenstellen aendern.
 */
export default function StartTab() {
  const featureTabs = useFeatureTabsVisible();
  // Startsatz: die Features, die bei Neu-/Bestandsnutzern standardmaessig an sind (EA erst nach expliziter Aktivierung).
  const standardFeatures = featureRegistry
    .metas()
    .filter(meta => meta.legacyDefaultOn)
    .map(meta => meta.label);
  const featureListe = `${standardFeatures.slice(0, -1).join(', ')} und ${standardFeatures.at(-1)}`;

  return (
    <DBSection width="medium" spacing="small">
      <div className="start-kopf">
        <div className="titel-mit-hilfe">
          <DBHeadingH1 className="start-titel" id="Willkommen">
            Willkommen
          </DBHeadingH1>
          <DBButton
            type="button"
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
        <DBInfotext showIcon={false} className="infotext-block start-untertitel">
          Nebengeld digital erfassen, berechnen und als PDF erzeugen.
        </DBInfotext>
      </div>

      <DBStack direction="row" wrap gap="medium" className="start-karten karten-gleich">
        {/* `.karten-titel` (`min-block-size: 3.5rem`) reserviert zwei Titelzeilen, damit der
            Fliesstext in allen Karten auf gleicher Hoehe beginnt, auch wenn ein Titel umbricht. */}
        <DBCard className="start-karte">
          <DBHeadingH5 paragraphSpacing className="karten-titel">
            <span className="db-icon start-icon" data-icon="sliders_horizontal" />
            1. Einstellungen prüfen
          </DBHeadingH5>
          <p>Persönliche Daten, Arbeitszeiten und Vorgaben aktuell halten.</p>
        </DBCard>
        <DBCard className="start-karte">
          <DBHeadingH5 paragraphSpacing className="karten-titel">
            <span className="db-icon start-icon" data-icon="pen" />
            2. Monate erfassen
          </DBHeadingH5>
          <p>{featureListe} eintragen und speichern.</p>
        </DBCard>
        <DBCard className="start-karte">
          <DBHeadingH5 paragraphSpacing className="karten-titel">
            <span className="db-icon start-icon" data-icon="document" />
            3. Ergebnis exportieren
          </DBHeadingH5>
          <p>Berechnung prüfen und die Formulare als PDF erzeugen.</p>
        </DBCard>
      </DBStack>

      {/* Nur mobil (`.start-schnellzugriff`, bis 64em: dort wechselt DBHeader von Mobile-Drawer auf
          Desktop-Navigation) und erst nach dem Login (`hidden`, `app/session`). */}
      <div className="raster-auto abstand-3 start-schnellzugriff" id="startSchnellzugriff" hidden>
        {featureRegistry.metas().map(({ label, icon, legacy }) => (
          <div hidden={!featureTabs.quick(legacy.navId)} id={`quick-${legacy.navId}`} key={legacy.navId}>
            <DBButton
              type="button"
              className="start-schnell-knopf"
              variant="outlined"
              width="full"
              data-jump-tab={legacy.navId}
              icon={icon as ComponentProps<typeof DBButton>['icon']}
            >
              {label}
            </DBButton>
          </div>
        ))}
        <div>
          <DBButton
            type="button"
            className="start-schnell-knopf"
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
            className="start-schnell-knopf"
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
        className="start-ladeanzeige"
        id="ladeAnzeige"
        hidden
      >
        <strong role="status">Lädt...</strong>
        <span
          className="laedt start-icon"
          style={{ '--db-icon-font-size': '3rem' } as React.CSSProperties}
          role="status"
        />
      </DBStack>
    </DBSection>
  );
}
