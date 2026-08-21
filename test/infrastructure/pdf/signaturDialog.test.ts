import { beforeEach, describe, expect, it, vi } from 'bun:test';

const showMock = vi.fn();
const hideMock = vi.fn();
const disposeMock = vi.fn();
const ModalConstructor = vi.fn(() => ({ show: showMock, hide: hideMock, dispose: disposeMock }));
vi.mock('bootstrap/js/dist/modal', () => ({ default: ModalConstructor }));

const confirmDialogMock = vi.fn();
vi.mock('@/infrastructure/ui/confirmDialog', () => ({ confirmDialog: confirmDialogMock }));

const clearMock = vi.fn();
const erstelleSignaturPadMock = vi.fn(() => ({ clear: clearMock }));
const holeSignaturPngMock = vi.fn();
vi.mock('@/infrastructure/pdf/signaturePad', () => ({
  erstelleSignaturPad: erstelleSignaturPadMock,
  holeSignaturPng: holeSignaturPngMock,
}));

import { signaturDialog } from '@/infrastructure/pdf/signaturDialog';

function getPadModalEl() {
  // Zweites `.modal`-Element -- das erste ist `confirmDialog`s eigenes (hier gemockt, erzeugt aber
  // im echten Code kein DOM, da `confirmDialog` selbst gemockt ist).
  return document.body.querySelector<HTMLElement>('.modal');
}

describe('signaturDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('fragt zuerst per confirmDialog -- bei "Nein" kein Pad, resolved undefined', async () => {
    confirmDialogMock.mockResolvedValueOnce(false);

    const ergebnis = await signaturDialog();

    expect(ergebnis).toBeUndefined();
    expect(confirmDialogMock).toHaveBeenCalledWith(
      'Jetzt unterschreiben?',
      expect.objectContaining({ confirmLabel: 'Ja', cancelLabel: 'Nein' }),
    );
    expect(getPadModalEl()).toBeNull();
    expect(erstelleSignaturPadMock).not.toHaveBeenCalled();
  });

  it('erstellt das Pad erst nach shown.bs.modal, nicht schon beim Rendern (Phase-4-Lehre)', async () => {
    confirmDialogMock.mockResolvedValueOnce(true);
    holeSignaturPngMock.mockReturnValue('data:image/png;base64,abc');

    const promise = signaturDialog();
    await Promise.resolve(); // confirmDialog-Promise abwarten, bis das Pad-Modal gerendert ist

    expect(erstelleSignaturPadMock).not.toHaveBeenCalled();

    const modal = getPadModalEl()!;
    modal.dispatchEvent(new Event('shown.bs.modal'));
    expect(erstelleSignaturPadMock).toHaveBeenCalledTimes(1);

    modal.querySelector<HTMLButtonElement>('[data-fertig="true"]')!.click();
    expect(await promise).toBe('data:image/png;base64,abc');
    expect(hideMock).toHaveBeenCalled();
  });

  it('ein leer gelassenes Pad (holeSignaturPng liefert null) resolved undefined', async () => {
    confirmDialogMock.mockResolvedValueOnce(true);
    holeSignaturPngMock.mockReturnValue(null);

    const promise = signaturDialog();
    await Promise.resolve();

    const modal = getPadModalEl()!;
    modal.dispatchEvent(new Event('shown.bs.modal'));
    modal.querySelector<HTMLButtonElement>('[data-fertig="true"]')!.click();

    expect(await promise).toBeUndefined();
  });

  it('"Löschen" ruft pad.clear() auf', async () => {
    confirmDialogMock.mockResolvedValueOnce(true);

    const promise = signaturDialog();
    await Promise.resolve();

    const modal = getPadModalEl()!;
    modal.dispatchEvent(new Event('shown.bs.modal'));
    modal.querySelector<HTMLButtonElement>('[data-loeschen="true"]')!.click();
    expect(clearMock).toHaveBeenCalledTimes(1);

    modal.dispatchEvent(new Event('hidden.bs.modal'));
    await promise;
  });

  it('Schließen ohne "Fertig" (hidden.bs.modal) resolved undefined', async () => {
    confirmDialogMock.mockResolvedValueOnce(true);

    const promise = signaturDialog();
    await Promise.resolve();

    const modal = getPadModalEl()!;
    modal.dispatchEvent(new Event('hidden.bs.modal'));

    expect(await promise).toBeUndefined();
    expect(document.body.querySelector('.modal')).toBeNull();
  });
});
