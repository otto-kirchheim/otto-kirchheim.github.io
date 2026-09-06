import { beforeEach, describe, expect, it, vi } from 'bun:test';

const clearMock = vi.fn();
const offMock = vi.fn();
const erstelleSignaturPadMock = vi.fn(() => ({ clear: clearMock, off: offMock }));
const holeSignaturPngMock = vi.fn();
const setzeSignaturPngMock = vi.fn();
vi.mock('@/infrastructure/pdf/signaturePad', () => ({
  erstelleSignaturPad: erstelleSignaturPadMock,
  holeSignaturPng: holeSignaturPngMock,
  setzeSignaturPng: setzeSignaturPngMock,
}));

const storageGetMock = vi.fn();
const storageSetMock = vi.fn();
const storageRemoveMock = vi.fn();
vi.mock('@/infrastructure/storage/Storage', () => ({
  default: { get: storageGetMock, set: storageSetMock, remove: storageRemoveMock },
}));

import { signaturDialog } from '@/infrastructure/pdf/signaturDialog';

// Beide Dialoge (Entscheidung UND Pad) sind echter, ungemockter Code aus `signaturDialog.ts` selbst
// und bauen je einen realen `<dialog class="db-drawer">` -- die beiden Helper unterscheiden daher
// per Inhalt (Canvas = Pad, `[data-wahl]`-Buttons = Entscheidung), nicht per Reihenfolge.
function getPadModalEl() {
  return [...document.body.querySelectorAll<HTMLElement>('dialog')].find(m => m.querySelector('canvas')) ?? null;
}

function getEntscheidungModalEl() {
  return [...document.body.querySelectorAll<HTMLElement>('dialog')].find(m => m.querySelector('[data-wahl]')) ?? null;
}

/** Schliessen ohne Auswahl -- entspricht dem Klick auf das X in der Kopfzeile. */
function schliesseUeberX(dialog: HTMLElement) {
  dialog.querySelector<HTMLButtonElement>('[data-bs-dismiss="modal"]')!.click();
}

/** Der native `<dialog>` ist sofort sichtbar; das Pad entsteht im naechsten Frame. */
function naechsterFrame() {
  return new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
}

/** Öffnet den Pad-Dialog über die Entscheidung "Ja" (kein Cache) bzw. "Ändern" (mit Cache). */
function oeffnePad(entscheidung: HTMLElement, wahl: 'neu' = 'neu') {
  entscheidung.querySelector<HTMLButtonElement>(`[data-wahl="${wahl}"]`)!.click();
}

describe('signaturDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    storageGetMock.mockReturnValue(null);
  });

  describe('ohne Cache -- Nachfrage mit "Ja" / "Ohne Unterschrift" / "Digital"', () => {
    it('"Ohne Unterschrift" resolved ohne png, digital=false (Datum bleibt sichtbar)', async () => {
      const promise = signaturDialog();
      const entscheidung = getEntscheidungModalEl()!;
      entscheidung.querySelector<HTMLButtonElement>('[data-wahl="ohne"]')!.click();

      expect(await promise).toEqual({ png: undefined, digital: false });
      expect(getPadModalEl()).toBeNull();
      expect(erstelleSignaturPadMock).not.toHaveBeenCalled();
    });

    it('"Digital" resolved ohne png, digital=true (Datum wird unterdrückt)', async () => {
      const promise = signaturDialog();
      const entscheidung = getEntscheidungModalEl()!;
      entscheidung.querySelector<HTMLButtonElement>('[data-wahl="digital"]')!.click();

      expect(await promise).toEqual({ png: undefined, digital: true });
      expect(getPadModalEl()).toBeNull();
    });

    it('Schließen ohne Wahl (Schließen über X) zählt wie "Ohne Unterschrift", NICHT wie "Digital"', async () => {
      const promise = signaturDialog();
      const entscheidung = getEntscheidungModalEl()!;
      schliesseUeberX(entscheidung);

      expect(await promise).toEqual({ png: undefined, digital: false });
    });

    it('"Ja" öffnet das Pad', async () => {
      const promise = signaturDialog();
      const entscheidung = getEntscheidungModalEl()!;
      oeffnePad(entscheidung);
      await Promise.resolve();

      expect(getPadModalEl()).not.toBeNull();
      expect(erstelleSignaturPadMock).not.toHaveBeenCalled(); // erst nach dem ersten Frame, siehe unten

      schliesseUeberX(getPadModalEl()!);
      await promise;
    });
  });

  describe('Pad-Dialog (erreicht über "Ja" ohne Cache)', () => {
    it('erstellt das Pad erst nach dem ersten Frame, nicht schon beim Rendern (Phase-4-Lehre)', async () => {
      holeSignaturPngMock.mockReturnValue('data:image/png;base64,abc');

      const promise = signaturDialog();
      const entscheidung = getEntscheidungModalEl()!;
      oeffnePad(entscheidung);
      await Promise.resolve();

      expect(erstelleSignaturPadMock).not.toHaveBeenCalled();

      const modal = getPadModalEl()!;
      await naechsterFrame();
      expect(erstelleSignaturPadMock).toHaveBeenCalledTimes(1);

      modal.querySelector<HTMLButtonElement>('[data-fertig="true"]')!.click();
      expect(await promise).toEqual({ png: 'data:image/png;base64,abc', digital: false });

      // `bsModal.hide()` ist hier gemockt und löst kein echtes `Schließen über X` aus (das würde
      // Bootstrap nach der Ausblend-Animation selbst tun) -- ohne diesen Event bliebe der
      // window-resize-Listener aus dem Dialog über das Testende hinaus registriert und würde in
      // späteren Tests unerwartet mitfeuern.
      schliesseUeberX(modal);
    });

    it('ein leer gelassenes Pad (holeSignaturPng liefert null) resolved ohne png, digital=false', async () => {
      holeSignaturPngMock.mockReturnValue(null);

      const promise = signaturDialog();
      const entscheidung = getEntscheidungModalEl()!;
      oeffnePad(entscheidung);
      await Promise.resolve();

      const modal = getPadModalEl()!;
      await naechsterFrame();
      modal.querySelector<HTMLButtonElement>('[data-fertig="true"]')!.click();

      expect(await promise).toEqual({ png: undefined, digital: false });
      schliesseUeberX(modal); // Aufräumen, siehe Kommentar im Test darüber
    });

    it('"Löschen" ruft pad.clear() auf', async () => {
      const promise = signaturDialog();
      const entscheidung = getEntscheidungModalEl()!;
      oeffnePad(entscheidung);
      await Promise.resolve();

      const modal = getPadModalEl()!;
      await naechsterFrame();
      modal.querySelector<HTMLButtonElement>('[data-loeschen="true"]')!.click();
      expect(clearMock).toHaveBeenCalledTimes(1);

      schliesseUeberX(modal);
      await promise;
    });

    it('window-resize (z.B. Handydrehung) baut das Pad neu auf statt verzerrt weiterlaufen zu lassen', async () => {
      const promise = signaturDialog();
      const entscheidung = getEntscheidungModalEl()!;
      oeffnePad(entscheidung);
      await Promise.resolve();

      const modal = getPadModalEl()!;
      await naechsterFrame();
      expect(erstelleSignaturPadMock).toHaveBeenCalledTimes(1);

      window.dispatchEvent(new Event('resize'));
      expect(offMock).toHaveBeenCalledTimes(1); // alte Pointer-Listener zuerst lösen
      expect(erstelleSignaturPadMock).toHaveBeenCalledTimes(2); // Pad neu mit aktueller Canvas-Größe

      schliesseUeberX(modal);
      await promise;
    });

    it('resize vor dem ersten Frame (Pad existiert noch nicht) tut nichts', async () => {
      const promise = signaturDialog();
      const entscheidung = getEntscheidungModalEl()!;
      oeffnePad(entscheidung);
      await Promise.resolve();

      window.dispatchEvent(new Event('resize'));
      expect(erstelleSignaturPadMock).not.toHaveBeenCalled();
      expect(offMock).not.toHaveBeenCalled();

      schliesseUeberX(getPadModalEl()!);
      await promise;
    });

    it('entfernt den resize-Listener beim Schließen -- kein Leak/Zugriff auf ein entsorgtes Pad', async () => {
      const promise = signaturDialog();
      const entscheidung = getEntscheidungModalEl()!;
      oeffnePad(entscheidung);
      await Promise.resolve();

      const modal = getPadModalEl()!;
      await naechsterFrame();
      schliesseUeberX(modal);
      await promise;

      erstelleSignaturPadMock.mockClear();
      window.dispatchEvent(new Event('resize'));
      expect(erstelleSignaturPadMock).not.toHaveBeenCalled();
    });

    it('Schließen ohne "Fertig" (Schließen über X) resolved ohne png, digital=false', async () => {
      const promise = signaturDialog();
      const entscheidung = getEntscheidungModalEl()!;
      oeffnePad(entscheidung);
      schliesseUeberX(entscheidung); // Aufräumen der Entscheidung, siehe Kommentar oben
      await Promise.resolve();

      const modal = getPadModalEl()!;
      schliesseUeberX(modal);

      expect(await promise).toEqual({ png: undefined, digital: false });
      expect(document.body.querySelector('.modal')).toBeNull();
    });

    it('kein Cache -- Checkbox unangehakt, keine Vorbefüllung', async () => {
      storageGetMock.mockReturnValue(null);

      const promise = signaturDialog();
      const entscheidung = getEntscheidungModalEl()!;
      oeffnePad(entscheidung);
      await Promise.resolve();

      const modal = getPadModalEl()!;
      await naechsterFrame();

      expect(setzeSignaturPngMock).not.toHaveBeenCalled();
      expect(modal.querySelector<HTMLInputElement>('[data-speichern="true"]')!.checked).toBe(false);

      schliesseUeberX(modal);
      await promise;
    });

    it('"Fertig" mit angehakter Checkbox speichert die Unterschrift im Cache', async () => {
      holeSignaturPngMock.mockReturnValue('data:image/png;base64,neu');
      storageGetMock.mockReturnValue(null);

      const promise = signaturDialog();
      const entscheidung = getEntscheidungModalEl()!;
      oeffnePad(entscheidung);
      await Promise.resolve();

      const modal = getPadModalEl()!;
      await naechsterFrame();
      modal.querySelector<HTMLInputElement>('[data-speichern="true"]')!.checked = true;
      modal.querySelector<HTMLButtonElement>('[data-fertig="true"]')!.click();

      expect(await promise).toEqual({ png: 'data:image/png;base64,neu', digital: false });
      expect(storageSetMock).toHaveBeenCalledWith('signaturCache', 'data:image/png;base64,neu');
      expect(storageRemoveMock).not.toHaveBeenCalled();

      schliesseUeberX(modal);
    });
  });

  describe('vorhandener Cache -- Nachfrage mit "Verwenden" / "Ändern" / "Ohne Unterschrift" / "Digital"', () => {
    it('"Verwenden" -- gibt Cache direkt zurück, kein Pad', async () => {
      storageGetMock.mockReturnValue('data:image/png;base64,cached');

      const promise = signaturDialog();
      const entscheidung = getEntscheidungModalEl()!;
      entscheidung.querySelector<HTMLButtonElement>('[data-wahl="verwenden"]')!.click();

      expect(await promise).toEqual({ png: 'data:image/png;base64,cached', digital: false });
      expect(getPadModalEl()).toBeNull();
      expect(erstelleSignaturPadMock).not.toHaveBeenCalled();

      schliesseUeberX(entscheidung);
    });

    it('"Digital" -- resolved ohne png, digital=true, kein Pad', async () => {
      storageGetMock.mockReturnValue('data:image/png;base64,cached');

      const promise = signaturDialog();
      const entscheidung = getEntscheidungModalEl()!;
      entscheidung.querySelector<HTMLButtonElement>('[data-wahl="digital"]')!.click();

      expect(await promise).toEqual({ png: undefined, digital: true });
      expect(getPadModalEl()).toBeNull();
      expect(erstelleSignaturPadMock).not.toHaveBeenCalled();

      schliesseUeberX(entscheidung);
    });

    it('"Ohne Unterschrift" -- resolved ohne png, digital=false, kein Pad (Datum bleibt sichtbar trotz Cache)', async () => {
      storageGetMock.mockReturnValue('data:image/png;base64,cached');

      const promise = signaturDialog();
      const entscheidung = getEntscheidungModalEl()!;
      entscheidung.querySelector<HTMLButtonElement>('[data-wahl="ohne"]')!.click();

      expect(await promise).toEqual({ png: undefined, digital: false });
      expect(getPadModalEl()).toBeNull();

      schliesseUeberX(entscheidung);
    });

    it('Schließen ohne Wahl (Schließen über X) zählt wie "Ohne Unterschrift"', async () => {
      storageGetMock.mockReturnValue('data:image/png;base64,cached');

      const promise = signaturDialog();
      const entscheidung = getEntscheidungModalEl()!;
      schliesseUeberX(entscheidung);

      expect(await promise).toEqual({ png: undefined, digital: false });
      expect(getPadModalEl()).toBeNull();
    });

    it('"Ändern" -- Pad öffnet, vorbefüllt, Checkbox vorangehakt', async () => {
      storageGetMock.mockReturnValue('data:image/png;base64,cached');

      const promise = signaturDialog();
      const entscheidung = getEntscheidungModalEl()!;
      oeffnePad(entscheidung);
      schliesseUeberX(entscheidung);
      await Promise.resolve();

      const modal = getPadModalEl()!;
      expect(modal.querySelector<HTMLInputElement>('[data-speichern="true"]')!.checked).toBe(true);
      await naechsterFrame();
      expect(setzeSignaturPngMock).toHaveBeenCalledWith(expect.anything(), 'data:image/png;base64,cached');

      schliesseUeberX(modal);
      await promise;
    });

    it('"Fertig" ohne angehakte Checkbox löscht einen evtl. vorhandenen Cache-Eintrag', async () => {
      holeSignaturPngMock.mockReturnValue('data:image/png;base64,neu');
      storageGetMock.mockReturnValue('data:image/png;base64,alt');

      const promise = signaturDialog();
      const entscheidung = getEntscheidungModalEl()!;
      oeffnePad(entscheidung); // "Ändern" -- Cache vorhanden, Pad öffnet
      schliesseUeberX(entscheidung);
      await Promise.resolve();

      const modal = getPadModalEl()!;
      await naechsterFrame();
      modal.querySelector<HTMLInputElement>('[data-speichern="true"]')!.checked = false;
      modal.querySelector<HTMLButtonElement>('[data-fertig="true"]')!.click();

      expect(await promise).toEqual({ png: 'data:image/png;base64,neu', digital: false });
      expect(storageRemoveMock).toHaveBeenCalledWith('signaturCache');
      expect(storageSetMock).not.toHaveBeenCalled();

      schliesseUeberX(modal);
    });
  });
});
