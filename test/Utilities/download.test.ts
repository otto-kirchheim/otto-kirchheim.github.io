import { saveAs } from 'file-saver';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSnackBar } from '../../src/ts/class/CustomSnackbar';
import type { IVorgabenGeld, IVorgabenU } from '../../src/ts/interfaces';
import Storage from '../../src/ts/utilities/Storage'; // Import Storage directly
import dayjs from '../../src/ts/utilities/configDayjs'; // Import configured dayjs
import download from '../../src/ts/utilities/download';
import { userProfileToBackend } from '../../src/ts/utilities/fieldMapper';
import tableToArray from '../../src/ts/utilities/tableToArray';
import { VorgabenGeldMock, VorgabenUMock } from '../mockData';

// --- Mocks ---

vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

vi.mock('../../src/ts/class/CustomSnackbar', () => ({
  createSnackBar: vi.fn(),
}));

vi.mock('../../src/ts/utilities/tableToArray', () => ({
  default: vi.fn(),
}));

// Use vi.hoisted to ensure mock functions are available when mock factories run
const { mockSetLoading, mockClearLoading, mockButtonDisable, mockDownloadPdf } = vi.hoisted(() => {
  return {
    mockSetLoading: vi.fn(),
    mockClearLoading: vi.fn(),
    mockButtonDisable: vi.fn(),
    mockDownloadPdf: vi.fn(),
  };
});

// Mock individual utility files directly
vi.mock('../../src/ts/utilities/setLoading', () => ({ default: mockSetLoading }));
vi.mock('../../src/ts/utilities/clearLoading', () => ({ default: mockClearLoading }));
vi.mock('../../src/ts/utilities/buttonDisable', () => ({ default: mockButtonDisable }));
vi.mock('../../src/ts/utilities/apiService', () => ({
  downloadPdf: mockDownloadPdf,
}));

// --- Test Suite ---

describe('download utility', () => {
  let button: HTMLButtonElement;

  const mockVorgabenU: IVorgabenU = VorgabenUMock;
  const mockVorgabenGeld: IVorgabenGeld = VorgabenGeldMock;
  const backendVorgabenU = userProfileToBackend(mockVorgabenU);

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    localStorage.clear();

    // Setup DOM elements
    document.body.innerHTML = `
            <input id="Monat" value="4" />
            <input id="Jahr" value="2024" />
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

    await download(button, 'E');

    const expectedDate = dayjs([2024, 4 - 1, 1]).format('MM_YY');
    const expectedFilename = `Verpfl_${expectedDate}_${mockVorgabenU.pers.Vorname} ${mockVorgabenU.pers.Nachname}_${mockVorgabenU.pers.Gewerk} ${mockVorgabenU.pers.ErsteTkgSt}.pdf`;
    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), expectedFilename);
  });

  it('should use N prefix in fallback filename for modus N', async () => {
    mockDownloadPdf.mockResolvedValueOnce({
      blob: new Blob(['pdf']),
      filename: 'download.pdf',
    });

    await download(button, 'N');

    const expectedDate = dayjs([2024, 4 - 1, 1]).format('MM_YY');
    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), expect.stringContaining(`EZ_${expectedDate}`));
  });

  it('should handle download error with non-Error object', async () => {
    mockDownloadPdf.mockRejectedValueOnce('string-error');

    await download(button, 'B');

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

  it("should perform download for mode 'B' successfully", async () => {
    (tableToArray as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce([
        { beginB: '08:00', endeB: '16:00', pauseB: 30 },
        { beginB: '17:00', endeB: '22:00' },
      ])
      .mockReturnValueOnce([
        {
          tagBE: '19',
          auftragsnummerBE: 'A-1',
          beginBE: '10:00',
          endeBE: '12:00',
          lreBE: 'LRE2',
          privatkmBE: 12,
        },
      ]);

    await download(button, 'B');

    expect(mockSetLoading).toHaveBeenCalledWith(button.id);
    expect(mockButtonDisable).toHaveBeenCalledWith(true);
    expect(tableToArray).toHaveBeenCalledWith('tableBZ');
    expect(tableToArray).toHaveBeenCalledWith('tableBE');
    expect(mockDownloadPdf).toHaveBeenCalledTimes(1);
    expect(mockDownloadPdf).toHaveBeenCalledWith(
      'B',
      expect.objectContaining({
        VorgabenU: {
          Pers: backendVorgabenU.Pers,
          Fahrzeit: backendVorgabenU.Fahrzeit,
        },
        VorgabenGeld: { ...mockVorgabenGeld[1], ...mockVorgabenGeld[4] },
        Daten: {
          BZ: [
            { Beginn: '08:00', Ende: '16:00', Pause: 30 },
            { Beginn: '17:00', Ende: '22:00', Pause: 0 },
          ],
          BE: [
            {
              Tag: '19',
              Auftragsnummer: 'A-1',
              Beginn: '10:00',
              Ende: '12:00',
              LRE: 'LRE2',
              PrivatKm: 12,
            },
          ],
        },
        Monat: 4,
        Jahr: 2024,
      }),
    );
    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'test_download.pdf');
    expect(createSnackBar).not.toHaveBeenCalled();
    expect(mockButtonDisable).toHaveBeenCalledWith(false);
    expect(mockClearLoading).toHaveBeenCalledWith(button.id);
  });

  it("should perform download for mode 'E' successfully", async () => {
    (tableToArray as ReturnType<typeof vi.fn>).mockReturnValueOnce([
      {
        tagE: '2024-04-19',
        eOrtE: 'Fulda',
        schichtE: 'Nacht',
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
    expect(mockDownloadPdf).toHaveBeenCalledWith(
      'E',
      expect.objectContaining({
        Daten: {
          EWT: [
            {
              Tag: '19',
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
          ],
        },
      }),
    );
    expect(saveAs).toHaveBeenCalled();
  });

  it("should perform download for mode 'N' successfully", async () => {
    (tableToArray as ReturnType<typeof vi.fn>).mockReturnValueOnce([
      {
        tagN: '19.04.2024',
        beginN: '21:00',
        endeN: '23:00',
        anzahl040N: 2,
        auftragN: 'N-77',
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
              Tag: '19',
              Beginn: '21:00',
              Ende: '23:00',
              Anzahl040: '2',
              Auftragsnummer: 'N-77',
            },
          ],
        },
      }),
    );
    expect(saveAs).toHaveBeenCalled();
  });

  it("should use fallback filename if downloadPdf returns 'download.pdf'", async () => {
    mockDownloadPdf.mockResolvedValueOnce({
      blob: new Blob(['mock pdf content']),
      filename: 'download.pdf',
    });

    await download(button, 'B');

    const expectedDate = dayjs([2024, 4 - 1, 1]).format('MM_YY'); // April 2024
    const expectedFilename = `RB_${expectedDate}_${mockVorgabenU.pers.Vorname} ${mockVorgabenU.pers.Nachname}_${mockVorgabenU.pers.Gewerk} ${mockVorgabenU.pers.ErsteTkgSt}.pdf`;
    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), expectedFilename);
    expect(createSnackBar).not.toHaveBeenCalled();
  });

  it('should handle downloadPdf error', async () => {
    const error = new Error('Network Failed');
    mockDownloadPdf.mockRejectedValueOnce(error);

    await download(button, 'B');

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
    await download(button, 'B');

    expect(mockDownloadPdf).toHaveBeenCalledWith(
      'B',
      expect.objectContaining({
        VorgabenGeld: singleKeyGeld[1],
        Monat: 1,
      }),
    );
  });

  it('should handle non-ok server response error', async () => {
    const errorMessage = 'Server Error 500';
    mockDownloadPdf.mockRejectedValueOnce(new Error(errorMessage));

    await download(button, 'B');

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
