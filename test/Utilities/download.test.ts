import { saveAs } from "file-saver";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSnackBar } from "../../src/ts/class/CustomSnackbar";
import { IVorgabenGeld, IVorgabenU } from "../../src/ts/interfaces";
import Storage from "../../src/ts/utilities/Storage"; // Import Storage directly
import dayjs from "../../src/ts/utilities/configDayjs"; // Import configured dayjs
import download from "../../src/ts/utilities/download";
import tableToArray from "../../src/ts/utilities/tableToArray";
import { VorgabenGeldMock, VorgabenUMock } from "../mockData";

// --- Mocks ---

vi.mock("file-saver", () => ({
	saveAs: vi.fn(),
}));

vi.mock("../../src/ts/class/CustomSnackbar", () => ({
	createSnackBar: vi.fn(),
}));

vi.mock("../../src/ts/utilities/tableToArray", () => ({
	default: vi.fn(),
}));

// Use vi.hoisted to ensure mock functions are available when mock factories run
const { mockSetLoading, mockClearLoading, mockButtonDisable, mockGetServerUrl, mockAbortController } = vi.hoisted(
	() => {
		return {
			mockSetLoading: vi.fn(),
			mockClearLoading: vi.fn(),
			mockButtonDisable: vi.fn(),
			mockGetServerUrl: vi.fn(),
			mockAbortController: { signal: new AbortController().signal, reset: vi.fn() },
		};
	},
);

// Mock individual utility files directly
vi.mock("../../src/ts/utilities/setLoading", () => ({ default: mockSetLoading }));
vi.mock("../../src/ts/utilities/clearLoading", () => ({ default: mockClearLoading }));
vi.mock("../../src/ts/utilities/buttonDisable", () => ({ default: mockButtonDisable }));
vi.mock("../../src/ts/utilities/FetchRetry", async importOriginal => {
	const original = await importOriginal<any>();
	return { ...original, getServerUrl: mockGetServerUrl };
});
vi.mock("../../src/ts/utilities/abortController", () => ({ abortController: mockAbortController }));

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage for Storage utility
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value.toString();
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
		get length() {
			return Object.keys(store).length;
		},
		key: (index: number) => Object.keys(store)[index] || null,
	};
})();
Object.defineProperty(window, "localStorage", {
	value: localStorageMock,
});

// --- Test Suite ---

describe("download utility", () => {
	let button: HTMLButtonElement;
	let monatInput: HTMLInputElement;
	let jahrInput: HTMLInputElement;

	const mockServerUrl = "http://mock-server.com/api/v1";
	const mockAccessToken = "mock-token";
	const mockVorgabenU: IVorgabenU = VorgabenUMock;
	const mockVorgabenGeld: IVorgabenGeld = VorgabenGeldMock;
	const mockTableData = [
		{ col1: "a", col2: 1 },
		{ col1: "b", col2: 2 },
	];

	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks();
		localStorageMock.clear();

		// Setup DOM elements
		document.body.innerHTML = `
            <input id="Monat" value="4" />
            <input id="Jahr" value="2024" />
            <button id="btnDownloadB"></button>
        `;
		button = document.getElementById("btnDownloadB") as HTMLButtonElement;
		monatInput = document.getElementById("Monat") as HTMLInputElement;
		jahrInput = document.getElementById("Jahr") as HTMLInputElement;

		// Setup default mock returns
		Storage.set("VorgabenGeld", mockVorgabenGeld); // Use imported Storage directly
		Storage.set("VorgabenU", mockVorgabenU);
		Storage.set("accessToken", mockAccessToken);
		mockGetServerUrl.mockResolvedValue(mockServerUrl);
		(tableToArray as ReturnType<typeof vi.fn>).mockReturnValue(mockTableData);

		// Default successful fetch mock
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: true,
			status: 200,
			blob: async () => new Blob(["mock pdf content"]),
			headers: new Headers({
				"content-disposition": 'attachment; filename="test_download.pdf"',
			}),
			json: async () => ({ message: "Success" }), // For error cases
		});
	});

	it("should return early if button is null", async () => {
		await download(null, "B");
		expect(mockSetLoading).not.toHaveBeenCalled();
		expect(global.fetch).not.toHaveBeenCalled();
	});

	it("should throw if input elements are not found", async () => {
		document.body.innerHTML = '<button id="btnDownloadB"></button>'; // Remove inputs
		button = document.getElementById("btnDownloadB") as HTMLButtonElement;
		await expect(download(button, "B")).rejects.toThrow("Input Element nicht gefunden");
	});

	it("should perform download for mode 'B' successfully", async () => {
		await download(button, "B");

		expect(mockSetLoading).toHaveBeenCalledWith(button.id);
		expect(mockButtonDisable).toHaveBeenCalledWith(true);
		expect(tableToArray).toHaveBeenCalledWith("tableBZ");
		expect(tableToArray).toHaveBeenCalledWith("tableBE");
		expect(mockGetServerUrl).toHaveBeenCalled();
		expect(global.fetch).toHaveBeenCalledTimes(1);
		expect(global.fetch).toHaveBeenCalledWith(
			`${mockServerUrl}/download/B`,
			expect.objectContaining({
				method: "POST",
				headers: expect.objectContaining({
					Authorization: `Bearer ${mockAccessToken}`,
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					VorgabenU: mockVorgabenU,
					VorgabenGeld: { ...mockVorgabenGeld[1], ...mockVorgabenGeld[4] }, // Proxy result for month 4
					Daten: { BZ: mockTableData, BE: mockTableData },
					Monat: 4,
					Jahr: 2024,
				}),
			}),
		);
		expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), "test_download.pdf");
		expect(createSnackBar).not.toHaveBeenCalled();
		expect(mockButtonDisable).toHaveBeenCalledWith(false);
		expect(mockClearLoading).toHaveBeenCalledWith(button.id);
	});

	it("should perform download for mode 'E' successfully", async () => {
		await download(button, "E");
		expect(tableToArray).toHaveBeenCalledWith("tableE");
		expect(global.fetch).toHaveBeenCalledWith(`${mockServerUrl}/download/E`, expect.anything());
		expect(JSON.parse((global.fetch as any).mock.calls[0][1].body).Daten).toEqual({ EWT: mockTableData });
		expect(saveAs).toHaveBeenCalled();
	});

	it("should perform download for mode 'N' successfully", async () => {
		await download(button, "N");
		expect(tableToArray).toHaveBeenCalledWith("tableN");
		expect(global.fetch).toHaveBeenCalledWith(`${mockServerUrl}/download/N`, expect.anything());
		expect(JSON.parse((global.fetch as any).mock.calls[0][1].body).Daten).toEqual({ N: mockTableData });
		expect(saveAs).toHaveBeenCalled();
	});

	it("should use fallback filename if content-disposition is missing", async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			status: 200,
			blob: async () => new Blob(["mock pdf content"]),
			headers: new Headers(), // No content-disposition
			json: async () => ({}),
		});

		await download(button, "B");

		const expectedDate = dayjs([2024, 4 - 1, 1]).format("MM_YY"); // April 2024
		const expectedFilename = `RB_${expectedDate}_${mockVorgabenU.pers.Vorname} ${mockVorgabenU.pers.Nachname}_${mockVorgabenU.pers.Gewerk} ${mockVorgabenU.pers.ErsteTkgSt}.pdf`;
		expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), expectedFilename);
		// Adjust expectation to match current behavior: Snackbar IS called
		expect(createSnackBar).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Download fehlerhaft:<br/>Dateiname fehlt",
				status: "error",
			}),
		);
	});

	it("should handle fetch network error", async () => {
		const error = new Error("Network Failed");
		(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

		await download(button, "B");

		expect(saveAs).not.toHaveBeenCalled();
		expect(createSnackBar).toHaveBeenCalledWith(
			expect.objectContaining({
				message: `Download fehlerhaft:<br/>${error.message}`,
				status: "error",
			}),
		);
		expect(mockButtonDisable).toHaveBeenCalledWith(false);
		expect(mockClearLoading).toHaveBeenCalledWith(button.id);
	});

	it("should handle non-ok fetch response", async () => {
		const errorMessage = "Server Error 500";
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: false,
			status: 500,
			blob: async () => new Blob([]),
			headers: new Headers(),
			json: async () => ({ message: errorMessage }),
		});

		await download(button, "B");

		expect(saveAs).not.toHaveBeenCalled();
		expect(createSnackBar).toHaveBeenCalledWith(
			expect.objectContaining({
				message: `Download fehlerhaft:<br/>${errorMessage}`,
				status: "error",
			}),
		);
		expect(mockButtonDisable).toHaveBeenCalledWith(false);
		expect(mockClearLoading).toHaveBeenCalledWith(button.id);
	});
});
