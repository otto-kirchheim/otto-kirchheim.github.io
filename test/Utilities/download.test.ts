import { saveAs } from 'file-saver';
import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import type { IVorgabenGeld, IVorgabenU } from '@/core/types';
import Storage from '@/infrastructure/storage/Storage'; // Import Storage directly
import download from '@/infrastructure/data/download';
import { userProfileToBackend } from '@/infrastructure/data/fieldMapper';
import tableToArray from '@/infrastructure/data/tableToArray';
import { VorgabenGeldMock, VorgabenUMock } from '../mockData';

// --- Mocks ---

vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

vi.mock('@/infrastructure/ui/CustomSnackbar', () => ({
  createSnackBar: vi.fn(),
}));

vi.mock('@/infrastructure/data/tableToArray', () => ({
  default: vi.fn(),
}));

// Use vi.hoisted to ensure mock functions are available when mock factories run
const { mockSetLoading, mockClearLoading, mockButtonDisable, mockDownloadPdf, mockLadeUndErzeugePdf, mockSignaturDialog } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => {
  return {
    mockSetLoading: vi.fn(),
    mockClearLoading: vi.fn(),
    mockButtonDisable: vi.fn(),
    mockDownloadPdf: vi.fn(),
    mockLadeUndErzeugePdf: vi.fn(),
    mockSignaturDialog: vi.fn(),
  };
});

// Mock individual utility files directly
vi.mock('@/infrastructure/ui/setLoading', () => ({ default: mockSetLoading }));
vi.mock('@/infrastructure/ui/clearLoading', () => ({ default: mockClearLoading }));
vi.mock('@/infrastructure/ui/buttonDisable', () => ({ default: mockButtonDisable }));
vi.mock('@/infrastructure/api/apiService', () => ({
  downloadPdf: mockDownloadPdf,
}));
// Phase 9: EA läuft über den neuen client-seitigen Pfad statt über `downloadPdf()`.
vi.mock('@/infrastructure/pdf/ladeFormular', () => ({
  ladeUndErzeugePdf: mockLadeUndErzeugePdf,
}));
vi.mock('@/infrastructure/pdf/signaturDialog', () => ({
  signaturDialog: mockSignaturDialog,
}));

// --- Test Suite ---

describe('download utility', () => {
  let button: HTMLButtonElement;

  const mockVorgabenU: IVorgabenU = VorgabenUMock;
  const mockVorgabenGeld: IVorgabenGeld = VorgabenGeldMock;
  const backendVorgabenU = userProfileToBackend(mockVorgabenU);
  // `Name` gibt es in IPers nicht, download.ts setzt es nur fürs PDF-VorgabenU zusammen.
  const erwartetePers = { ...backendVorgabenU.Pers, Name: `${backendVorgabenU.Pers.Nachname}, ${backendVorgabenU.Pers.Vorname}` };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    localStorage.clear();

    // Setup DOM elements
    document.body.innerHTML = `
            <input id="Monat" value="4" />
            <input id="Jahr" value="2026" />
            <button id="btnDownloadB"></button>
        `;
    button = document.getElementById('btnDownloadB') as HTMLButtonElement;

    // Setup default mock returns
    Storage.set('VorgabenGeld', mockVorgabenGeld);
    Storage.set('VorgabenU', mockVorgabenU);
    (tableToArray as ReturnType<typeof vi.fn>).mockReturnValue([]);

    // Default successful downloadPdf mock
    mockDownloadPdf.mockResolvedValue({
      blob: new Blob(['mock pdf content']),
      filename: 'test_download.pdf',
    });
    // Phase 9 (EA): kein Signatur-Dialog standardmäßig, `build()`-Ergebnis als Dummy-Bytes.
    mockSignaturDialog.mockResolvedValue(undefined);
    mockLadeUndErzeugePdf.mockResolvedValue(new Uint8Array([1, 2, 3]));
  });

  it('should return early if button is null', async () => {
    await download(null, 'B');
    expect(mockSetLoading).not.toHaveBeenCalled();
    expect(mockDownloadPdf).not.toHaveBeenCalled();
  });

  it('should show error snackbar when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
    await download(button, 'B');
    expect(createSnackBar).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('keine Internetverbindung'),
        status: 'error',
      }),
    );
    expect(mockSetLoading).not.toHaveBeenCalled();
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  it('should use fallback filename if downloadPdf returns empty filename', async () => {
    mockDownloadPdf.mockResolvedValueOnce({
      blob: new Blob(['mock pdf content']),
      filename: '',
    });

    await download(button, 'N');

    const { Nachname, Vorname, Gewerk, ErsteTkgSt } = mockVorgabenU.Pers;
    const expectedFilename = `EZ ${Nachname} ${Vorname.charAt(0)}. ${Gewerk} ${ErsteTkgSt} 04.2026.pdf`;
    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), expectedFilename);
  });

  it('should use N prefix in fallback filename for modus N', async () => {
    mockDownloadPdf.mockResolvedValueOnce({
      blob: new Blob(['pdf']),
      filename: 'download.pdf',
    });

    await download(button, 'N');

    const { Nachname, Vorname, Gewerk, ErsteTkgSt } = mockVorgabenU.Pers;
    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), `EZ ${Nachname} ${Vorname.charAt(0)}. ${Gewerk} ${ErsteTkgSt} 04.2026.pdf`);
  });

  it('should handle download error with non-Error object', async () => {
    mockDownloadPdf.mockRejectedValueOnce('string-error');

    await download(button, 'N');

    expect(createSnackBar).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('string-error'),
        status: 'error',
      }),
    );
  });

  it('should throw if input elements are not found', async () => {
    document.body.innerHTML = '<button id="btnDownloadB"></button>'; // Remove inputs
    button = document.getElementById('btnDownloadB') as HTMLButtonElement;
    await expect(download(button, 'B')).rejects.toThrow('Input Element nicht gefunden');
  });

  describe("modus 'B' (Phase 11 -- neuer client-seitiger Pfad statt downloadPdf())", () => {
    beforeEach(() => {
      (tableToArray as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce([{ Beginn: '2026-04-19T08:00:00.000Z', Ende: '2026-04-19T16:00:00.000Z', Pause: 30 }])
        .mockReturnValueOnce([{ Tag: '19.04.2026', Auftragsnummer: 'A-1', Beginn: '10:00', Ende: '12:00', LRE: 'LRE2', PrivatKm: 12 }]);
    });

    it('fragt den Signatur-Dialog und erzeugt das PDF über ladeUndErzeugePdf statt downloadPdf, inkl. vorberechneter Dauer', async () => {
      await download(button, 'B');

      expect(mockSetLoading).toHaveBeenCalledWith(button.id);
      expect(mockButtonDisable).toHaveBeenCalledWith(true);
      expect(tableToArray).toHaveBeenCalledWith('tableBZ');
      expect(tableToArray).toHaveBeenCalledWith('tableBE');
      expect(mockDownloadPdf).not.toHaveBeenCalled();
      expect(mockSignaturDialog).toHaveBeenCalledTimes(1);
      expect(mockLadeUndErzeugePdf).toHaveBeenCalledWith(
        'bereitschaft',
        '2026-04-01',
        expect.objectContaining({
          VorgabenU: {
            Pers: erwartetePers,
            Fahrzeit: backendVorgabenU.Fahrzeit,
          },
          VorgabenGeld: { ...mockVorgabenGeld[1], ...mockVorgabenGeld[4] },
          Daten: {
            // Minuten, nicht HH:mm: Pause 30 von 8h (08:00 -> 16:00) Zeitspanne PLUS Pause = 510
            // (Pause zaehlt als Dienstzeit, wie aktualisiereBerechnung.ts); Einsatz 10:00 -> 12:00
            // = 120. PrivatKmBetrag: TB 'Tarifkraft' -> PrivatPKWTarif 0.27 * 12 = 3.24.
            BZ: [{ Beginn: '2026-04-19T08:00:00.000Z', Ende: '2026-04-19T16:00:00.000Z', Pause: 30, Dauer: 510 }],
            BE: [
              { Tag: '19.04.2026', Auftragsnummer: 'A-1', Beginn: '10:00', Ende: '12:00', LRE: 'LRE2', PrivatKm: 12, Dauer: 120, PrivatKmBetrag: 3.24 },
            ],
          },
          // Bereitschaftszulage: bereitschaftMinuten = 510 - 120 = 390. Tarifkraft (Mock-TB):
          // SummeTarif = round(390/60) = 7, keine Beamter-Felder.
          Bereitschaftszulage: { BereitschaftsMinuten: 390, SummeTarif: 7 },
          Monat: 4,
          Jahr: 2026,
        }),
        undefined,
      );
      const { Nachname, Vorname, Gewerk, ErsteTkgSt } = mockVorgabenU.Pers;
      expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), `RB ${Nachname} ${Vorname.charAt(0)}. ${Gewerk} ${ErsteTkgSt} 04.2026.pdf`);
      expect(createSnackBar).not.toHaveBeenCalled();
      expect(mockButtonDisable).toHaveBeenCalledWith(false);
      expect(mockClearLoading).toHaveBeenCalledWith(button.id);
    });

    it('reicht die Signatur aus dem Dialog an ladeUndErzeugePdf weiter', async () => {
      mockSignaturDialog.mockResolvedValueOnce('data:image/png;base64,xyz');

      await download(button, 'B');

      expect(mockLadeUndErzeugePdf).toHaveBeenCalledWith('bereitschaft', '2026-04-01', expect.anything(), 'data:image/png;base64,xyz');
    });

    it('rechnet PrivatKmBetrag und Bereitschaftszulage mit dem Beamter-Satz, wenn TB nicht Tarifkraft ist', async () => {
      Storage.set('VorgabenU', { ...mockVorgabenU, Pers: { ...mockVorgabenU.Pers, TB: 'Besoldungsgruppe A 8' } });
      // Groesserer BZ-Zeitraum als im beforeEach (26h statt 8h), damit bereitschaftMinuten ueber
      // der 600-Minuten-Schwelle liegt -- sonst wuerde SummeBeamter1/2 negativ bzw. -0 statt eines
      // aussagekraeftigen Werts.
      (tableToArray as ReturnType<typeof vi.fn>).mockReset();
      (tableToArray as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce([{ Beginn: '2026-04-19T00:00:00.000Z', Ende: '2026-04-20T02:00:00.000Z', Pause: 0 }])
        .mockReturnValueOnce([{ Tag: '19.04.2026', Auftragsnummer: 'A-1', Beginn: '10:00', Ende: '12:00', LRE: 'LRE2', PrivatKm: 12 }]);

      await download(button, 'B');

      expect(mockLadeUndErzeugePdf).toHaveBeenCalledWith(
        'bereitschaft',
        '2026-04-01',
        expect.objectContaining({
          // PrivatPKWBeamter 0.2 * 12 = 2.4 statt PrivatPKWTarif 0.27 * 12 = 3.24.
          Daten: expect.objectContaining({
            BE: [expect.objectContaining({ PrivatKm: 12, PrivatKmBetrag: 2.4 })],
          }),
          // bereitschaftMinuten = 1560 (BZ, 26h) - 120 (BE) = 1440. SummeBeamter1 = 1440-600 = 840;
          // SummeBeamter2 = round(840/8/60) = 2; Satz 'Besoldungsgruppe A 8' = 16,37 (VorgabenGeldMock);
          // SummeBeamter3 = 2 * 16,37 = 32,74.
          Bereitschaftszulage: {
            BereitschaftsMinuten: 1440,
            SummeBeamter1: 840,
            SummeBeamter2: 2,
            SummeBeamter3: 32.74,
            GeldwertBeamter: 16.37,
          },
        }),
        undefined,
      );
    });

    it('zeigt einen Fehler-Snackbar, wenn keine gültige Version aufgelöst werden kann', async () => {
      mockLadeUndErzeugePdf.mockRejectedValueOnce(new Error('Keine gültige Version für bereitschaft am 2026-04-01'));

      await download(button, 'B');

      expect(saveAs).not.toHaveBeenCalled();
      expect(createSnackBar).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Keine gültige Version für bereitschaft am 2026-04-01'),
          status: 'error',
        }),
      );
    });
  });

  it("should perform download for mode 'E' successfully (Phase 10 -- neuer client-seitiger Pfad statt downloadPdf())", async () => {
    (tableToArray as ReturnType<typeof vi.fn>).mockReturnValueOnce([
      {
        Tag: '2026-04-19',
        Buchungstag: '2026-04-20',
        Einsatzort: 'Fulda',
        Schicht: 'Nacht',
        abWE: '07:00',
        ab1E: '08:00',
        anEE: '09:00',
        beginE: '10:00',
        endeE: '11:00',
        abEE: '12:00',
        an1E: '13:00',
        anWE: '14:00',
        berechnen: true,
      },
    ]);

    await download(button, 'E');
    expect(tableToArray).toHaveBeenCalledWith('tableE');
    expect(mockDownloadPdf).not.toHaveBeenCalled();
    expect(mockLadeUndErzeugePdf).toHaveBeenCalledWith(
      'ewt',
      '2026-04-01',
      expect.objectContaining({
        Daten: {
          EWT: [
            {
              Buchungstag: '20',
              Einsatzort: 'Fulda',
              Schicht: 'Nacht',
              abWE: '07:00',
              ab1E: '08:00',
              anEE: '09:00',
              beginE: '10:00',
              endeE: '11:00',
              abEE: '12:00',
              an1E: '13:00',
              anWE: '14:00',
              berechnen: true,
              // abWE 07:00 -> anWE 14:00 = 7h, ab1E 08:00 -> an1E 13:00 = 5h -- beide unter der
              // 8h-Schwelle, also alle Zeitband-Booleans false (mockVorgabenU.Pers.TB = 'Tarifkraft').
              DauerWohnung: '7:00',
              DauerErsteTkgSt: '5:00',
              Wohnung8bis14: false,
              Wohnung14bis24: false,
              WohnungUeber24: false,
              BeamterUeber8Wohnung: false,
              TkgSt8bis24: false,
              TkgStUeber24: false,
            },
          ],
        },
        Jahr: 2026,
        Monat: 4,
        VorgabenGeld: expect.objectContaining({
          ...mockVorgabenGeld[1],
          ...mockVorgabenGeld[4],
        }),
        VorgabenU: {
          Pers: erwartetePers,
          Fahrzeit: backendVorgabenU.Fahrzeit,
        },
      }),
      undefined,
    );
    expect(saveAs).toHaveBeenCalled();
  });

  it("should perform download for mode 'N' successfully", async () => {
    (tableToArray as ReturnType<typeof vi.fn>).mockReturnValueOnce([
      {
        Tag: '19.04.2026',
        Beginn: '21:00',
        Ende: '23:00',
        Zulagen: [{ Typ: '040', Wert: 2 }],
        Auftragsnummer: 'N-77',
      },
    ]);

    await download(button, 'N');
    expect(tableToArray).toHaveBeenCalledWith('tableN');
    expect(mockDownloadPdf).toHaveBeenCalledWith(
      'N',
      expect.objectContaining({
        Daten: {
          N: [
            {
              Tag: '19.04.2026',
              Beginn: '21:00',
              Ende: '23:00',
              Auftragsnummer: 'N-77',
              Zulagen: [{ Typ: '040', Wert: 2 }],
            },
          ],
        },
        Jahr: 2026,
        Monat: 4,
        VorgabenGeld: expect.objectContaining({
          ...mockVorgabenGeld[1],
          ...mockVorgabenGeld[4],
        }),
        VorgabenU: {
          Pers: erwartetePers,
          Fahrzeit: backendVorgabenU.Fahrzeit,
        },
      }),
    );
    expect(saveAs).toHaveBeenCalled();
  });

  describe("modus 'EA' (Phase 9 -- neuer client-seitiger Pfad statt downloadPdf())", () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <input id="Monat" value="4" />
        <input id="Jahr" value="2026" />
        <button id="btnDownloadEA"></button>
      `;
      button = document.getElementById('btnDownloadEA') as HTMLButtonElement;
      (tableToArray as ReturnType<typeof vi.fn>).mockReturnValueOnce([
        { Tag: '19.04.2026', Dauer: '08:15', Taetigkeit: 'Teamleiter', Entgeltgruppe: '104' },
      ]);
    });

    it('fragt den Signatur-Dialog und erzeugt das PDF über ladeUndErzeugePdf statt downloadPdf', async () => {
      await download(button, 'EA');

      expect(mockDownloadPdf).not.toHaveBeenCalled();
      expect(mockSignaturDialog).toHaveBeenCalledTimes(1);
      expect(mockLadeUndErzeugePdf).toHaveBeenCalledWith(
        'ea',
        '2026-04-01',
        expect.objectContaining({
          Jahr: 2026,
          Monat: 4,
          Daten: { EA: [{ Tag: '19.04.2026', Dauer: '08:15', Taetigkeit: 'Teamleiter', Entgeltgruppe: '104' }] },
        }),
        undefined,
      );
      const { Nachname, Vorname, Gewerk, ErsteTkgSt } = mockVorgabenU.Pers;
      expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), `Entgeltausgleich ${Nachname} ${Vorname.charAt(0)}. ${Gewerk} ${ErsteTkgSt} 04.2026.pdf`);
    });

    it('reicht die Signatur aus dem Dialog an ladeUndErzeugePdf weiter', async () => {
      mockSignaturDialog.mockResolvedValueOnce('data:image/png;base64,xyz');

      await download(button, 'EA');

      expect(mockLadeUndErzeugePdf).toHaveBeenCalledWith('ea', '2026-04-01', expect.anything(), 'data:image/png;base64,xyz');
    });

    it('zeigt einen Fehler-Snackbar, wenn keine gültige Version aufgelöst werden kann', async () => {
      mockLadeUndErzeugePdf.mockRejectedValueOnce(new Error('Keine gültige Version für ea am 2026-04-01'));

      await download(button, 'EA');

      expect(saveAs).not.toHaveBeenCalled();
      expect(createSnackBar).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Keine gültige Version für ea am 2026-04-01'),
          status: 'error',
        }),
      );
    });
  });

  it('should handle downloadPdf error', async () => {
    const error = new Error('Network Failed');
    mockDownloadPdf.mockRejectedValueOnce(error);

    await download(button, 'N');

    expect(saveAs).not.toHaveBeenCalled();
    expect(createSnackBar).toHaveBeenCalledWith(
      expect.objectContaining({
        message: `Download fehlerhaft:<br/>${error.message}`,
        status: 'error',
      }),
    );
    expect(mockButtonDisable).toHaveBeenCalledWith(false);
    expect(mockClearLoading).toHaveBeenCalledWith(button.id);
  });

  it('should use VorgabenGeld for Monat 1 (single key)', async () => {
    const singleKeyGeld: IVorgabenGeld = { 1: mockVorgabenGeld[1] };
    Storage.set('VorgabenGeld', singleKeyGeld);

    document.querySelector<HTMLInputElement>('#Monat')!.value = '1';
    await download(button, 'N');

    expect(mockDownloadPdf).toHaveBeenCalledWith(
      'N',
      expect.objectContaining({
        VorgabenGeld: singleKeyGeld[1],
        Monat: 1,
      }),
    );
  });

  it('should merge multiple VorgabenGeld monat entries when Monat spans several keys', async () => {
    const multiKeyGeld: IVorgabenGeld = {
      1: mockVorgabenGeld[1],
      2: { ...mockVorgabenGeld[1], LRE1: 99 },
      3: { ...mockVorgabenGeld[1], LRE2: 77 },
    };
    Storage.set('VorgabenGeld', multiKeyGeld);

    document.querySelector<HTMLInputElement>('#Monat')!.value = '3';
    await download(button, 'N');

    expect(mockDownloadPdf).toHaveBeenCalledWith(
      'N',
      expect.objectContaining({
        VorgabenGeld: { ...multiKeyGeld[1], ...multiKeyGeld[2], ...multiKeyGeld[3] },
        Monat: 3,
      }),
    );
  });

  it('should handle non-ok server response error', async () => {
    const errorMessage = 'Server Error 500';
    mockDownloadPdf.mockRejectedValueOnce(new Error(errorMessage));

    await download(button, 'N');

    expect(saveAs).not.toHaveBeenCalled();
    expect(createSnackBar).toHaveBeenCalledWith(
      expect.objectContaining({
        message: `Download fehlerhaft:<br/>${errorMessage}`,
        status: 'error',
      }),
    );
    expect(mockButtonDisable).toHaveBeenCalledWith(false);
    expect(mockClearLoading).toHaveBeenCalledWith(button.id);
  });
});
