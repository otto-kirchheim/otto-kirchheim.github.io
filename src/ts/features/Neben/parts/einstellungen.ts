import { createElement } from 'react';
import type { FeatureParts } from '@/core/hooks';
import ZulagenAbschnitt from '../components/ZulagenEinstellungenAbschnitt';
import { mount } from '@/infrastructure/ui';
import ZulagenCheckboxList from '@/features/Einstellungen/components/ZulagenCheckboxList';

// Zaehlt jeden Aufruf hoch, damit `key` sich aendert und React die Liste neu mountet (siehe EWT-Slot).
let zulagenPanelRenderCount = 0;

/** Einstellungen-Slot der Erschwerniszulagen (EZ/Neben): Abschnitt "Zulagen" (benötigte Zulagen-Codes). */
const einstellungen: FeatureParts['einstellungen'] = {
  sections: [{ id: 'collapseSix', titel: 'Zulagen', order: 60, Component: ZulagenAbschnitt }],

  /**
   * Mountet die `ZulagenCheckboxList` mit den gespeicherten Zulagen.
   *
   * @param vorgabenU - Benutzer-Vorgaben; `Einstellungen.benoetigteZulagen` liefert die Anfangsauswahl.
   */
  read(vorgabenU) {
    const host = document.querySelector<HTMLDivElement>('#settings-zulagen-list');
    if (!host) return;
    mount(
      host,
      createElement(ZulagenCheckboxList, {
        key: zulagenPanelRenderCount++,
        benoetigteZulagen: vorgabenU.Einstellungen?.benoetigteZulagen,
      }),
    );
  },

  /**
   * Liest die angehakten Zulagen aus.
   *
   * @returns `Einstellungen.benoetigteZulagen`; leer, wenn die Liste fehlt oder nichts angehakt ist.
   */
  collect() {
    if (!document.querySelector('#settings-zulagen-list')) return {};

    const benoetigteZulagen: string[] = [];
    for (const cb of Array.from(
      document.querySelectorAll<HTMLInputElement>('#settings-zulagen-list input[data-zulage-code]'),
    )) {
      if (cb.checked) benoetigteZulagen.push(cb.dataset.zulageCode!);
    }
    return benoetigteZulagen.length > 0 ? { Einstellungen: { benoetigteZulagen } } : {};
  },
};

export default einstellungen;
