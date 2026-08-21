import Modal from 'bootstrap/js/dist/modal';
import { confirmDialog } from '../ui/confirmDialog';
import { erstelleSignaturPad, holeSignaturPng } from './signaturePad';

/**
 * Entscheidungsdialog vor dem PDF-Erzeugen (Kandidat E, siehe Plandatei Phase 4): fragt erst
 * "Jetzt unterschreiben?", zeigt bei "Ja" ein Canvas-Pad. Liefert das PNG, `undefined` bei "Nein"
 * oder einem leer gelassenen Pad. Kein Nachsignieren eines bereits heruntergeladenen PDFs
 * vorgesehen -- der Signatur-Schritt ist für diesen Download dann endgültig übersprungen.
 *
 * Vanilla DOM wie `confirmDialog` (eigenes `<div class="modal">`, nicht über `showModal()`/Preact) --
 * dieselbe einfache, promise-basierte Bedienung, kein Formular-State nötig. Das Pad wird erst nach
 * dem `shown.bs.modal`-Event erstellt, nicht beim Rendern: Phase 4 deckte auf, dass ein vorher
 * erstelltes Pad auf einem noch unsichtbaren Canvas (`offsetWidth`/`offsetHeight` 0) unbenutzbar
 * bleibt.
 */
export async function signaturDialog(): Promise<string | undefined> {
  const ja = await confirmDialog('Jetzt unterschreiben?', {
    title: 'Unterschrift',
    confirmLabel: 'Ja',
    cancelLabel: 'Nein',
    confirmClass: 'btn-primary',
  });
  if (!ja) return undefined;

  return new Promise<string | undefined>(resolve => {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.setAttribute('tabindex', '-1');
    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Unterschrift</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <canvas style="width:100%;height:200px;border:1px solid var(--bs-border-color);touch-action:none"></canvas>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-loeschen="true">Löschen</button>
            <button type="button" class="btn btn-primary" data-fertig="true">Fertig</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const canvas = modal.querySelector('canvas')!;
    const bsModal = new Modal(modal, { backdrop: 'static' });
    let pad: ReturnType<typeof erstelleSignaturPad> | undefined;
    let resolved = false;

    const finish = (png: string | undefined) => {
      if (resolved) return;
      resolved = true;
      bsModal.hide();
      resolve(png);
    };

    modal.addEventListener('shown.bs.modal', () => {
      pad = erstelleSignaturPad(canvas);
    });

    /**
     * Beim Drehen des Handys ändert sich die CSS-Breite des Canvas (`width:100%` im Modal), die
     * interne Pixelgröße aus `erstelleSignaturPad()` bleibt aber auf dem beim Öffnen gemessenen
     * Wert stehen -- die Anzeige verzerrt und die Touch-Koordinaten von `signature_pad` laufen
     * gegenüber der neuen Canvas-Größe aus dem Ruder. Pad bei jeder Größenänderung neu aufziehen;
     * `pad.off()` löst zuerst die alten Pointer-Listener (auch welche auf `window`), sonst
     * sammeln sich bei mehrfachem Drehen doppelte Listener an. Eine bereits begonnene Unterschrift
     * geht dabei verloren -- die Alternative (Punkte proportional zur neuen Größe umzurechnen) ist
     * fehleranfällig, die paar Striche sind schnell nachgezogen.
     */
    const aufResizeReagieren = () => {
      if (!pad) return;
      pad.off();
      pad = erstelleSignaturPad(canvas);
    };
    window.addEventListener('resize', aufResizeReagieren);

    modal.querySelector('[data-loeschen="true"]')?.addEventListener('click', () => pad?.clear());
    modal.querySelector('[data-fertig="true"]')?.addEventListener('click', () => finish(pad ? (holeSignaturPng(pad) ?? undefined) : undefined));
    modal.addEventListener('hidden.bs.modal', () => {
      window.removeEventListener('resize', aufResizeReagieren);
      finish(undefined);
      bsModal.dispose();
      modal.remove();
    });

    bsModal.show();
  });
}
