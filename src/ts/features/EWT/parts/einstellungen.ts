import { createElement } from 'react';
import type { FeatureParts } from '@/shared/lib/feature';
import FahrzeitenAbschnitt from '../components/FahrzeitenEinstellungenAbschnitt';
import type { IVorgabenUfZ } from '@/types';
import { createSnackBar } from '@/shared/ui/snackbar/CustomSnackbar';
import { mount } from '@/infrastructure/ui';
import { FahrzeitenPanel } from '@/features/Einstellungen/components/FahrzeitenPanel';
import { getFahrzeitPanelState } from '@/features/Einstellungen/components/fahrzeitPanelState';

// Zaehlt jeden Aufruf hoch, damit `key` sich aendert und React das Panel neu mountet statt den bestehenden
// Component-State (inkl. veralteter Fahrzeiten nach Act-as-Wechsel) zu behalten.
let fahrzeitPanelRenderCount = 0;

/**
 * Übernimmt die Fahrzeiten-Zeilen: leere Zeilen entfallen, unvollständige lösen einen Fehler aus.
 *
 * @param rows - Zeilen des Fahrzeiten-Panels.
 * @returns Nur die vollständigen Zeilen.
 * @throws {Error} Wenn Tätigkeitsstätte oder Fahrzeit einer nicht leeren Zeile fehlt (mit Snackbar-Hinweis).
 */
function collectFahrzeiten(rows: IVorgabenUfZ[]): IVorgabenUfZ[] {
  const liste: IVorgabenUfZ[] = [];
  for (const { key, text, value } of rows) {
    // Komplett leere Zeilen (z.B. gerade hinzugefügt) werden still verworfen.
    if (!key && !text && !value) continue;

    // Beschreibung (text) ist ein reines Notizfeld und darf leer bleiben.
    if (!key || !value) {
      const fehlend = [!key && 'Tätigkeitsstätte', !value && 'Fahrzeit'].filter(Boolean).join(' / ');
      createSnackBar({
        message: `Einstellungen > Fahrzeiten > "${key || text}": ${fehlend} fehlt`,
        status: 'error',
        timeout: 3000,
        fixed: true,
      });
      throw new Error(`${fehlend} fehlt`);
    }
    liste.push({ key, text, value });
  }

  return liste;
}

/** Einstellungen-Slot der EWT: Abschnitt "Fahrzeiten" (Tätigkeitsstätten mit Fahrzeit). */
const einstellungen: FeatureParts['einstellungen'] = {
  sections: [
    {
      id: 'collapseFour',
      titel: 'Fahrzeiten',
      order: 45,
      Component: FahrzeitenAbschnitt,
      onboarding: {
        titel: 'Fahrzeiten prüfen',
        beschreibung: 'Prüfe, ob alle deine Einsatzorte mit den passenden Fahrzeiten hinterlegt sind.',
      },
    },
  ],

  /**
   * Mountet das `FahrzeitenPanel` mit den gespeicherten Fahrzeiten.
   *
   * @param vorgabenU - Benutzer-Vorgaben; `Fahrzeit` liefert die Anfangszeilen.
   */
  read(vorgabenU) {
    const panel = document.querySelector<HTMLDivElement>('#fahrzeiten-panel');
    if (!panel) return;
    mount(
      panel,
      createElement(FahrzeitenPanel, { key: fahrzeitPanelRenderCount++, initialRows: vorgabenU.Fahrzeit ?? [] }),
    );
  },

  /**
   * Liest den Stand des Panels aus.
   *
   * @returns `Fahrzeit` mit den vollständigen Zeilen; leer, wenn das Panel keinen Stand gemeldet hat.
   * @throws {Error} Bei unvollständigen Zeilen (mit Snackbar-Hinweis).
   */
  collect() {
    const fahrzeitState = getFahrzeitPanelState();
    return fahrzeitState ? { Fahrzeit: collectFahrzeiten(fahrzeitState) } : {};
  },
};

export default einstellungen;
