import Modal from 'bootstrap/js/dist/modal';
import Storage from '../storage/Storage';
import { erstelleSignaturPad, holeSignaturPng, setzeSignaturPng } from './signaturePad';

/** Breite:Höhe der Unterschriftsfläche -- feste Proportion unabhängig von der Bildschirmgröße. */
const CANVAS_RATIO = 5 / 2;
/** Harte Obergrenze für die Canvas-Breite, auch auf sehr breiten Monitoren -- eine Unterschrift
 * braucht keine 1500px, das wirkt nur unnötig gestreckt. */
const MAX_BREITE = 900;
/** Fester Dialog-Außenrand (ersetzt Bootstraps eigenen, je nach Breakpoint unterschiedlichen
 * `.modal-dialog`-Margin) -- klein und überall gleich, damit die Rechnung unten den tatsächlich
 * verfügbaren Platz trifft, statt zusätzlich zu Bootstraps Rand noch einen eigenen Sicherheits-
 * Faktor draufzuschlagen (führte zu einem spürbar kleineren Feld als vorher mit
 * `modal-fullscreen-*-down`, siehe Git-Historie dieser Datei -- User-Fund: "zu klein, da das
 * Fullscreen fehlt"). Auf kleinen Screens nutzt das Feld dadurch wieder fast die volle Breite.
 */
const DIALOG_RAND = 8;

/**
 * Größtmögliche Canvas-Größe im festen `CANVAS_RATIO`, die noch komplett ins Modal passt, plus ob
 * dabei die Höhe die bindende Dimension war (dann lohnt sich randloses Fullscreen + kompakte
 * Kopf-/Fußzeile, siehe `aufGroesseAnpassen()`). Kopf-/Fußzeile sind unabhängig von der Canvas-
 * Größe messbar, kein Henne-Ei-Problem.
 */
function berechneCanvasGroesse(
  header: HTMLElement,
  footer: HTMLElement,
  body: HTMLElement,
  content: HTMLElement,
  rand: number,
  maxBreiteVorgabe: number,
): { breite: number; hoehe: number; hoehengebunden: boolean } {
  const bodyStil = getComputedStyle(body);
  const paddingX = parseFloat(bodyStil.paddingLeft) + parseFloat(bodyStil.paddingRight);
  const paddingY = parseFloat(bodyStil.paddingTop) + parseFloat(bodyStil.paddingBottom);
  // `.modal-content` trägt selbst einen Rahmen (Bootstrap-Default) außerhalb von Kopf-/Body-/
  // Fußzeile -- ohne den lief die Höhen-Rechnung im Fullscreen-Fall um genau diesen Rahmen über
  // den Viewport hinaus (per Puppeteer gemessen: 2px Überlauf in jedem Querformat-Testfall).
  const contentStil = getComputedStyle(content);
  const contentRahmenY = parseFloat(contentStil.borderTopWidth) + parseFloat(contentStil.borderBottomWidth);

  const maxBreite = Math.min(window.innerWidth - rand * 2, maxBreiteVorgabe) - paddingX;
  const maxHoehe =
    window.innerHeight - rand * 2 - header.offsetHeight - footer.offsetHeight - paddingY - contentRahmenY;

  let breite = Math.max(maxBreite, 0);
  let hoehe = breite / CANVAS_RATIO;
  const hoehengebunden = hoehe > maxHoehe;
  if (hoehengebunden) {
    hoehe = Math.max(maxHoehe, 0);
    breite = hoehe * CANVAS_RATIO;
  }
  return { breite, hoehe, hoehengebunden };
}

export interface SignaturErgebnis {
  png?: string;
  /**
   * true, wenn explizit "Digital" gewählt wurde. Eine spätere externe Signatur (z.B. Adobe Reader
   * Ad-hoc) passiert zu einem noch unbekannten Zeitpunkt -- ein jetzt gedrucktes Unterschriftsdatum
   * wäre dann falsch, deshalb unterdrückt (siehe `Feld.nurBeiSignatur`). Bei "Ohne Unterschrift"
   * (z.B. für eine Unterschrift auf Papier) bleibt das Datum dagegen sinnvoll und sichtbar -- NUR
   * "Digital" schließt es aus, nicht jedes Fehlen einer gezeichneten Unterschrift.
   */
  digital: boolean;
}

type SignaturWahl = 'verwenden' | 'neu' | 'ohne' | 'digital';

/**
 * Erste Nachfrage vor dem PDF-Erzeugen: ohne Cache "Ja" / "Ohne Unterschrift" / "Digital", mit Cache
 * zusätzlich "Verwenden" / "Ändern" statt nur "Ja" -- eigener Dialog statt `confirmDialog` (das nur
 * zwei Buttons kennt), da echte drei/vier Ausgänge gebraucht werden: Unterschrift jetzt zeichnen/
 * übernehmen, GAR KEINE Unterschrift (Papier-Fall, Datum bleibt) oder explizit "Digital" (Datum
 * verschwindet, siehe `SignaturErgebnis.digital`). Gleiches Vanilla-DOM-Muster wie `confirmDialog`
 * (eigenes `<div class="modal">`, promise-basiert). `backdrop: 'static', keyboard: false` -- Backdrop-
 * Klick/Escape schließen NICHT, nur der explizite X-Button oben rechts (gleicher Grund wie beim
 * Pad-Dialog: keine versehentlich verworfene Entscheidung). Schließen über X zählt wie
 * "Ohne Unterschrift", NICHT wie "Digital" -- ein Wegklicken soll nicht überraschend das
 * Unterschriftsdatum verschlucken.
 */
function signaturEntscheidung(cachedPng: string | null): Promise<SignaturWahl> {
  return new Promise<SignaturWahl>(resolve => {
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
            ${
              cachedPng
                ? `<p class="mb-2">Es liegt eine gespeicherte Unterschrift vor. Wie möchten Sie fortfahren?</p>
                   <ul class="mb-0 ps-3">
                     <li><strong>Verwenden:</strong> direkt für dieses PDF übernehmen.</li>
                     <li><strong>Ändern:</strong> Pad öffnet mit der gespeicherten Unterschrift, zum Anpassen oder Neuzeichnen.</li>
                     <li><strong>Ohne Unterschrift:</strong> PDF ohne Unterschrift, Unterschriftsdatum bleibt (z.B. für eine Unterschrift auf Papier).</li>
                     <li><strong>Digital:</strong> PDF ohne Unterschrift UND ohne Datum (für eine spätere digitale Signatur).</li>
                   </ul>`
                : `<p class="mb-2">Jetzt unterschreiben?</p>
                   <ul class="mb-0 ps-3">
                     <li><strong>Ja:</strong> Unterschrift wird ins PDF eingefügt.</li>
                     <li><strong>Ohne Unterschrift:</strong> PDF ohne Unterschrift, Unterschriftsdatum bleibt (z.B. für eine Unterschrift auf Papier).</li>
                     <li><strong>Digital:</strong> PDF ohne Unterschrift UND ohne Datum (für eine spätere digitale Signatur).</li>
                   </ul>`
            }
            <p class="small text-body-secondary mt-2 mb-0">Die Unterschrift wird nur auf diesem Gerät verarbeitet und zwischengespeichert.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-wahl="digital">Digital</button>
            <button type="button" class="btn btn-outline-secondary" data-wahl="ohne">Ohne Unterschrift</button>
            ${cachedPng ? '<button type="button" class="btn btn-outline-secondary" data-wahl="neu">Ändern</button>' : ''}
            <button type="button" class="btn btn-primary" data-wahl="${cachedPng ? 'verwenden' : 'neu'}">${cachedPng ? 'Verwenden' : 'Ja'}</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    const bsModal = new Modal(modal, { backdrop: 'static', keyboard: false });
    let resolved = false;

    const finish = (wahl: SignaturWahl) => {
      if (resolved) return;
      resolved = true;
      bsModal.hide();
      resolve(wahl);
    };

    modal.querySelectorAll<HTMLButtonElement>('[data-wahl]').forEach(btn => {
      btn.addEventListener('click', () => finish(btn.dataset['wahl'] as SignaturWahl));
    });
    modal.addEventListener('hidden.bs.modal', () => {
      finish('ohne');
      bsModal.dispose();
      modal.remove();
    });

    bsModal.show();
  });
}

/**
 * Entscheidungsdialog vor dem PDF-Erzeugen (Kandidat E, siehe Plandatei Phase 4): fragt erst
 * "Jetzt unterschreiben?" (oder bei vorhandenem Cache: "verwenden/ändern/ohne/digital"), zeigt bei
 * Bedarf ein Canvas-Pad. Liefert `{ png, digital }` -- `png` fehlt bei "Ohne Unterschrift"/"Digital"
 * oder einem leer gelassenen Pad, `digital` ist NUR bei explizitem "Digital" true (siehe
 * `SignaturErgebnis`). Kein Nachsignieren eines bereits heruntergeladenen PDFs vorgesehen -- der
 * Signatur-Schritt ist für diesen Download dann endgültig übersprungen.
 *
 * Vanilla DOM wie `confirmDialog` (eigenes `<div class="modal">`, nicht über `showModal()`/Preact) --
 * dieselbe einfache, promise-basierte Bedienung, kein Formular-State nötig. Das Pad wird erst nach
 * dem `shown.bs.modal`-Event erstellt, nicht beim Rendern: Phase 4 deckte auf, dass ein vorher
 * erstelltes Pad auf einem noch unsichtbaren Canvas (`offsetWidth`/`offsetHeight` 0) unbenutzbar
 * bleibt.
 */
export async function signaturDialog(): Promise<SignaturErgebnis> {
  const cachedPng = Storage.get<string>('signaturCache');
  const wahl = await signaturEntscheidung(cachedPng);

  if (wahl === 'verwenden') return { png: cachedPng!, digital: false }; // Pad wird komplett übersprungen
  if (wahl === 'ohne') return { digital: false };
  if (wahl === 'digital') return { digital: true };
  // wahl === 'neu' -- weiter zum Pad, ggf. vorbefüllt mit der bisherigen Unterschrift

  return new Promise<SignaturErgebnis>(resolve => {
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
            <canvas class="signatur-canvas"></canvas>
          </div>
          <div class="modal-footer">
            <div class="form-check me-auto">
              <input type="checkbox" class="form-check-input" id="signatur-speichern" data-speichern="true" ${cachedPng ? 'checked' : ''}>
              <label class="form-check-label" for="signatur-speichern">Für nächstes Mal merken (nur auf diesem Gerät)</label>
            </div>
            <button type="button" class="btn btn-outline-secondary" data-loeschen="true">Löschen</button>
            <button type="button" class="btn btn-primary" data-fertig="true">Fertig</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const canvas = modal.querySelector('canvas')!;
    const header = modal.querySelector<HTMLElement>('.modal-header')!;
    const body = modal.querySelector<HTMLElement>('.modal-body')!;
    const footer = modal.querySelector<HTMLElement>('.modal-footer')!;
    const dialog = modal.querySelector<HTMLElement>('.modal-dialog')!;
    const content = modal.querySelector<HTMLElement>('.modal-content')!;
    const bsModal = new Modal(modal, { backdrop: 'static', keyboard: false });
    let pad: ReturnType<typeof erstelleSignaturPad> | undefined;
    let resolved = false;

    const finish = (png: string | undefined) => {
      if (resolved) return;
      resolved = true;
      bsModal.hide();
      resolve({ png, digital: false });
    };

    /**
     * Setzt Canvas-CSS-Größe und Dialog-Breite passend zueinander (siehe `berechneCanvasGroesse()`)
     * -- Bootstraps eigene `max-width`-Größenklassen (`modal-lg` etc.) steuern nur die Breite, nie
     * die Höhe, und größere Screens bekamen dadurch trotz mehr Platz nur einen dünnen Streifen statt
     * einer proportional größeren Fläche.
     *
     * Erster Durchlauf mit normalem Rand/Kopf-/Fußzeile prüft, ob die Höhe bindet (typisch:
     * Querformat-Handy, wenig Vertikalraum -- User-Fund: "im Querformat wird definitiv Fullscreen
     * benötigt"). Falls ja, zweiter Durchlauf randlos (`rand=0`, volle Breite) MIT kompakter
     * Kopf-/Fußzeile (`.signatur-modal-kompakt`, kleineres Padding) -- Kopf-/Fußzeile werden dafür
     * neu gemessen, ihre Höhe ändert sich durch die kompaktere Klasse. Im Breiten-gebundenen Fall
     * (meist Hochformat/große Screens) bleibt die bisherige, ruhigere zentrierte Box-Darstellung.
     */
    const aufGroesseAnpassen = () => {
      content.classList.remove('signatur-modal-kompakt');
      dialog.style.margin = `${DIALOG_RAND}px auto`;
      const erster = berechneCanvasGroesse(header, footer, body, content, DIALOG_RAND, MAX_BREITE);
      let { breite, hoehe } = erster;
      const hoehengebunden = erster.hoehengebunden;

      if (hoehengebunden) {
        content.classList.add('signatur-modal-kompakt');
        dialog.style.margin = '0';
        ({ breite, hoehe } = berechneCanvasGroesse(header, footer, body, content, 0, MAX_BREITE));
      }

      canvas.style.width = `${breite}px`;
      canvas.style.height = `${hoehe}px`;
      const bodyStil = getComputedStyle(body);
      const paddingX = parseFloat(bodyStil.paddingLeft) + parseFloat(bodyStil.paddingRight);
      dialog.style.maxWidth = hoehengebunden ? '100vw' : `${breite + paddingX}px`;
    };

    modal.addEventListener('shown.bs.modal', () => {
      aufGroesseAnpassen();
      pad = erstelleSignaturPad(canvas);
      if (cachedPng) void setzeSignaturPng(pad, cachedPng);
    });

    /**
     * Beim Drehen des Handys (oder Verschieben auf einen anderen Monitor) ändert sich der
     * verfügbare Platz -- Canvas-CSS-Größe neu berechnen UND die interne Pixelgröße aus
     * `erstelleSignaturPad()` neu setzen, sonst verzerrt die Anzeige und die Touch-Koordinaten von
     * `signature_pad` laufen gegenüber der neuen Canvas-Größe aus dem Ruder. Pad bei jeder
     * Größenänderung neu aufziehen; `pad.off()` löst zuerst die alten Pointer-Listener (auch welche
     * auf `window`), sonst sammeln sich bei mehrfachem Drehen doppelte Listener an. Eine bereits
     * begonnene Unterschrift geht dabei verloren -- die Alternative (Punkte proportional zur neuen
     * Größe umzurechnen) ist fehleranfällig, die paar Striche sind schnell nachgezogen.
     */
    const aufResizeReagieren = () => {
      if (!pad) return;
      aufGroesseAnpassen();
      pad.off();
      pad = erstelleSignaturPad(canvas);
    };
    window.addEventListener('resize', aufResizeReagieren);

    modal.querySelector('[data-loeschen="true"]')?.addEventListener('click', () => pad?.clear());
    modal.querySelector('[data-fertig="true"]')?.addEventListener('click', () => {
      const png = pad ? (holeSignaturPng(pad) ?? undefined) : undefined;
      const merken = modal.querySelector<HTMLInputElement>('[data-speichern="true"]')?.checked ?? false;
      if (merken && png) {
        try {
          Storage.set('signaturCache', png);
        } catch {
          /* Storage voll/gesperrt -- Download soll trotzdem klappen */
        }
      } else {
        Storage.remove('signaturCache');
      }
      finish(png);
    });
    modal.addEventListener('hidden.bs.modal', () => {
      window.removeEventListener('resize', aufResizeReagieren);
      finish(undefined);
      bsModal.dispose();
      modal.remove();
    });

    bsModal.show();
  });
}
