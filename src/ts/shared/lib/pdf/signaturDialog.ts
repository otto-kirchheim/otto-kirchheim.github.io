import { erzeugeDbDialog } from '@/shared/ui/dialog/dbDialog';
import Storage from '@/shared/lib/storage/Storage';
import { erstelleSignaturPad, holeSignaturPng, setzeSignaturPng } from './signaturePad';

/** Breite:Höhe der Unterschriftsfläche -- feste Proportion unabhängig von der Bildschirmgröße. */
const CANVAS_RATIO = 5 / 2;
/** Harte Obergrenze für die Canvas-Breite, auch auf sehr breiten Monitoren -- eine Unterschrift
 * braucht keine 1500px, das wirkt nur unnötig gestreckt. */
const MAX_BREITE = 900;
/** Fester Dialog-Außenrand -- klein und überall gleich, damit die Rechnung unten den tatsächlich
 * verfügbaren Platz trifft, ohne eigenen Sicherheitsabstand. Auf kleinen Screens nutzt das Feld so
 * fast die volle Breite.
 */
const DIALOG_RAND = 8;

/**
 * Größtmögliche Canvas-Größe im festen `CANVAS_RATIO`, die noch komplett in den Dialog passt, plus
 * ob dabei die Höhe die bindende Dimension war (dann lohnt sich randlos + kompakte Fußzeile, siehe
 * `aufGroesseAnpassen()`). Der Dialog hat keine Kopfzeile; die Fußzeile ist unabhängig von der
 * Canvas-Größe messbar.
 *
 * @param dialog - Der `<dialog>` (sein Rahmen geht ab).
 * @param inhalt - Inhaltsbereich mit dem Canvas (sein Padding geht ab).
 * @param fuss - Fußzeile des Dialogs (ihre Höhe geht vom verfügbaren Platz ab).
 * @param rand - Abstand des Dialogs zum Fensterrand in px, je Seite (Vollbild: 0).
 * @param maxBreiteVorgabe - Obergrenze der Canvas-Breite in px.
 * @returns Canvas-Größe in CSS-Pixeln und ob die Höhe bindend war.
 */
function berechneCanvasGroesse(
  dialog: HTMLElement,
  inhalt: HTMLElement,
  fuss: HTMLElement,
  rand: number,
  maxBreiteVorgabe: number,
): { breite: number; hoehe: number; hoehengebunden: boolean } {
  const inhaltStil = getComputedStyle(inhalt);
  const paddingX = parseFloat(inhaltStil.paddingLeft) + parseFloat(inhaltStil.paddingRight);
  const paddingY = parseFloat(inhaltStil.paddingTop) + parseFloat(inhaltStil.paddingBottom);
  // Ein Rahmen am Dialog liegt außerhalb von Inhalt und Fußzeile -- ohne ihn liefe die Höhen-Rechnung
  // im Vollbild um genau diesen Rahmen über den Viewport hinaus.
  const dialogStil = getComputedStyle(dialog);
  const dialogRahmenY = parseFloat(dialogStil.borderTopWidth) + parseFloat(dialogStil.borderBottomWidth);

  const maxBreite = Math.min(window.innerWidth - rand * 2, maxBreiteVorgabe) - paddingX;
  const maxHoehe = window.innerHeight - rand * 2 - fuss.offsetHeight - paddingY - dialogRahmenY;

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
 * zusätzlich "Verwenden" / "Ändern" statt nur "Ja". Eigener Dialog statt `confirmDialog` (das nur zwei
 * Buttons kennt), da drei bis vier Ausgänge nötig sind: Unterschrift zeichnen/übernehmen, GAR KEINE
 * Unterschrift (Papier-Fall, Datum bleibt) oder "Digital" (Datum verschwindet, siehe
 * `SignaturErgebnis.digital`). Promise-basiert wie `confirmDialog`.
 *
 * Hintergrundklick und Escape schließen NICHT (`hintergrundSchliesst`/`escapeSchliesst` aus), nur der
 * X-Button -- keine versehentlich verworfene Entscheidung. X zählt wie "Ohne Unterschrift", NICHT wie
 * "Digital": ein Wegklicken soll nicht überraschend das Unterschriftsdatum verschlucken.
 *
 * @param cachedPng - Gespeicherte Unterschrift (PNG-Data-URL) oder `null`; steuert Texte und Buttons.
 * @returns Die gewählte Aktion.
 */
function signaturEntscheidung(cachedPng: string | null): Promise<SignaturWahl> {
  return new Promise<SignaturWahl>(resolve => {
    let wahl: SignaturWahl = 'ohne';
    // Hintergrundklick und Escape schliessen NICHT, nur der X-Button (siehe oben).
    const { inhalt, fuss, schliessen } = erzeugeDbDialog(() => resolve(wahl), {
      titel: 'Unterschrift',
      containerSize: 'medium',
      hintergrundSchliesst: false,
      escapeSchliesst: false,
    });

    inhalt.innerHTML = `
      ${
        cachedPng
          ? `<p>Es liegt eine gespeicherte Unterschrift vor. Wie möchten Sie fortfahren?</p>
           <ul>
             <li><strong>Verwenden:</strong> direkt für dieses PDF übernehmen.</li>
             <li><strong>Ändern:</strong> Pad öffnet mit der gespeicherten Unterschrift, zum Anpassen oder Neuzeichnen.</li>
             <li><strong>Ohne Unterschrift:</strong> PDF ohne Unterschrift, Unterschriftsdatum bleibt (z.B. für eine Unterschrift auf Papier).</li>
             <li><strong>Digital:</strong> PDF ohne Unterschrift UND ohne Datum (für eine spätere digitale Signatur).</li>
             </ul>`
          : `<p>Jetzt unterschreiben?</p>
           <ul>
             <li><strong>Ja:</strong> Unterschrift wird ins PDF eingefügt.</li>
             <li><strong>Ohne Unterschrift:</strong> PDF ohne Unterschrift, Unterschriftsdatum bleibt (z.B. für eine Unterschrift auf Papier).</li>
             <li><strong>Digital:</strong> PDF ohne Unterschrift UND ohne Datum (für eine spätere digitale Signatur).</li>
             </ul>`
      }
      <span class="db-infotext">Die Unterschrift wird nur auf diesem Gerät verarbeitet und zwischengespeichert.</span>
    `;
    fuss.innerHTML = `
      <button type="button" class="db-button" data-variant="outlined" data-wahl="digital">Digital</button>
      <button type="button" class="db-button" data-variant="outlined" data-wahl="ohne">Ohne Unterschrift</button>
      ${cachedPng ? '<button type="button" class="db-button" data-variant="outlined" data-wahl="neu">Ändern</button>' : ''}
      <button type="button" class="db-button" data-variant="brand" data-wahl="${cachedPng ? 'verwenden' : 'neu'}">${cachedPng ? 'Verwenden' : 'Ja'}</button>
    `;

    fuss.querySelectorAll<HTMLButtonElement>('[data-wahl]').forEach(btn => {
      btn.addEventListener('click', () => {
        wahl = btn.dataset['wahl'] as SignaturWahl;
        schliessen();
      });
    });
  });
}

/**
 * Entscheidungsdialog vor dem PDF-Erzeugen: fragt erst "Jetzt unterschreiben?" (bei vorhandenem Cache:
 * "verwenden/ändern/ohne/digital") und zeigt bei Bedarf ein Canvas-Pad. Kein Nachsignieren eines
 * bereits heruntergeladenen PDFs vorgesehen -- der Signatur-Schritt ist dann für diesen Download
 * endgültig übersprungen.
 *
 * Vanilla DOM über `erzeugeDbDialog()`, promise-basiert wie `confirmDialog`. Das Pad entsteht erst
 * im nächsten Frame nach dem Öffnen, nicht beim Rendern: auf einem noch unsichtbaren Canvas
 * (`offsetWidth`/`offsetHeight` 0) bliebe es unbenutzbar.
 *
 * @returns `{ png, digital }` -- `png` fehlt bei "Ohne Unterschrift"/"Digital" oder leerem Pad,
 *   `digital` ist NUR bei explizitem "Digital" true (siehe `SignaturErgebnis`).
 */
export async function signaturDialog(): Promise<SignaturErgebnis> {
  const cachedPng = Storage.get<string>('signaturCache');
  const wahl = await signaturEntscheidung(cachedPng);

  if (wahl === 'verwenden') return { png: cachedPng!, digital: false }; // Pad wird komplett übersprungen
  if (wahl === 'ohne') return { digital: false };
  if (wahl === 'digital') return { digital: true };
  // wahl === 'neu' -- weiter zum Pad, ggf. vorbefüllt mit der bisherigen Unterschrift

  return new Promise<SignaturErgebnis>(resolve => {
    let pad: ReturnType<typeof erstelleSignaturPad> | undefined;
    let ergebnis: string | undefined;

    // Ohne Kopfzeile: jeder Pixel gehoert der Schreibflaeche; "Abbrechen" liegt in der Fusszeile.
    const { dialog, inhalt, fuss, vollbild, schliessen } = erzeugeDbDialog(
      () => {
        window.removeEventListener('resize', aufResizeReagieren);
        resolve({ png: ergebnis, digital: false });
      },
      {
        containerSize: 'large',
        hintergrundSchliesst: false,
        escapeSchliesst: false,
        dialogKlassen: ['signatur-dialog'],
      },
    );
    inhalt.innerHTML = '<canvas class="signatur-canvas"></canvas>';
    fuss.classList.add('signatur-fusszeile');
    fuss.innerHTML = `
      <div class="db-checkbox" data-size="small">
        <label for="signatur-speichern">
          <input type="checkbox" id="signatur-speichern" data-speichern="true" ${cachedPng ? 'checked' : ''}>
          Merken
        </label>
      </div>
      <button type="button" class="db-button" data-variant="outlined" data-size="small" data-dialog-dismiss="modal">Abbrechen</button>
      <button type="button" class="db-button" data-variant="outlined" data-size="small" data-loeschen="true">Löschen</button>
      <button type="button" class="db-button" data-variant="brand" data-size="small" data-fertig="true">Fertig</button>
    `;
    const canvas = inhalt.querySelector('canvas')!;
    const rand = vollbild ? 0 : DIALOG_RAND;

    /**
     * Setzt Canvas-CSS-Größe und Dialog-Breite passend zueinander (siehe `berechneCanvasGroesse()`)
     * -- reine Breiten-Klassen steuern nie die Höhe, größere Screens bekamen dadurch trotz mehr
     * Platz nur einen dünnen Streifen statt einer proportional größeren Fläche.
     *
     * Erster Durchlauf mit normalem Rand prüft, ob die Höhe bindet (typisch: Querformat-Handy, wenig
     * Vertikalraum). Falls ja, zweiter Durchlauf mit kompakter Fußzeile und kompaktem Inhaltsrand
     * (`.signatur-kompakt`) -- die Fußzeile wird dafür neu gemessen, ihre Höhe ändert sich durch die
     * kompaktere Klasse. Im breitengebundenen Fall (meist Hochformat/große Screens) bleibt es bei der
     * zentrierten Box.
     */
    const aufGroesseAnpassen = () => {
      dialog.classList.remove('signatur-kompakt');
      const erster = berechneCanvasGroesse(dialog, inhalt, fuss, rand, MAX_BREITE);
      let { breite, hoehe } = erster;

      if (erster.hoehengebunden) {
        dialog.classList.add('signatur-kompakt');
        ({ breite, hoehe } = berechneCanvasGroesse(dialog, inhalt, fuss, rand, MAX_BREITE));
      }

      canvas.style.width = `${breite}px`;
      canvas.style.height = `${hoehe}px`;
      if (!vollbild) {
        // Der zentrierte Dialog ist so breit wie das Feld samt Innenabstand (kein Streifen links und rechts davon).
        const inhaltStil = getComputedStyle(inhalt);
        const paddingX = parseFloat(inhaltStil.paddingLeft) + parseFloat(inhaltStil.paddingRight);
        dialog.style.inlineSize = `${breite + paddingX}px`;
      }
    };

    // Der native `<dialog>` ist nach `showModal()` sofort sichtbar. Die Messung laeuft trotzdem
    // erst im naechsten Frame, damit Layout und Schriften stehen.
    requestAnimationFrame(() => {
      if (!canvas.isConnected) return; // Dialog war schneller wieder zu als der naechste Frame
      aufGroesseAnpassen();
      pad = erstelleSignaturPad(canvas);
      if (cachedPng) void setzeSignaturPng(pad, cachedPng);
    });

    /**
     * Beim Drehen des Handys (oder Verschieben auf einen anderen Monitor) ändert sich der verfügbare
     * Platz -- Canvas-CSS-Größe neu berechnen UND die interne Pixelgröße per `erstelleSignaturPad()`
     * neu setzen, sonst verzerrt die Anzeige und die Touch-Koordinaten von `signature_pad` laufen
     * aus dem Ruder. `pad.off()` löst vorher die alten Pointer-Listener (auch die auf `window`),
     * sonst sammeln sich Duplikate an. Eine begonnene Unterschrift geht dabei verloren (proportionale
     * Umrechnung der Punkte wäre fehleranfällig).
     */
    const aufResizeReagieren = () => {
      // `isConnected` faengt den Fall ab, dass der Dialog schon aus dem Dokument ist, der
      // Listener aber noch haengt (Abbau ueber einen anderen Weg als `schliessen()`).
      if (!pad || !canvas.isConnected) return;
      aufGroesseAnpassen();
      pad.off();
      pad = erstelleSignaturPad(canvas);
    };
    window.addEventListener('resize', aufResizeReagieren);

    fuss.querySelector('[data-loeschen="true"]')?.addEventListener('click', () => pad?.clear());
    fuss.querySelector('[data-fertig="true"]')?.addEventListener('click', () => {
      const png = pad ? (holeSignaturPng(pad) ?? undefined) : undefined;
      const merken = fuss.querySelector<HTMLInputElement>('[data-speichern="true"]')?.checked ?? false;
      if (merken && png) {
        try {
          Storage.set('signaturCache', png);
        } catch {
          /* Storage voll/gesperrt -- Download soll trotzdem klappen */
        }
      } else {
        Storage.remove('signaturCache');
      }
      ergebnis = png;
      schliessen();
    });
  });
}
