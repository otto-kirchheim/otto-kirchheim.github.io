import * as FileSaver from "file-saver";
import { SpyInstance, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Storage, convertToBlob, download } from "../src/ts/utilities";
import * as exportFetch from "../src/ts/utilities/FetchRetry";
import { VorgabenGeldMock, VorgabenUMock, datenBerechungMock, mockBereitschaft, mockEWT, mockNeben } from "./mockData";
import { base64StringData } from "./mockPDFString";

describe("#download", () => {
	debugger;
	const mockResponseData = {
		data: {
			data: base64StringData,
			name: "test.pdf",
		},
		message: "Daten verarbeitet und PDF erfolgreich erstellt.",
		status: true,
		statusCode: 200,
	};
	let mockFetchRetry: SpyInstance;

	it("should do nothing if button is null", async () => {
		await expect(download(null, "B")).resolves.toBeUndefined();
	});

	beforeAll(() => {
		Storage.set("VorgabenU", VorgabenUMock);
		Storage.set("VorgabenGeld", VorgabenGeldMock);
		Storage.set("datenBerechnung", datenBerechungMock);
		const accessToken =
			"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
		Storage.set("accessToken", accessToken);
		sessionStorage.setItem("lastServerContact", Date.now().toString());

		vi.mock("./FetchRetry");
		vi.mock("file-saver", async () => {
			const actual = await vi.importActual<typeof import("file-saver")>("file-saver");
			const saveAs = vi.fn();
			return { ...actual, saveAs };
		});

		document.body.innerHTML = `
		  	<input id="Monat" value="3" />
		  	<input id="Jahr" value="2023" />
		`;
	});

	const mockResponseDataBlob = convertToBlob(mockResponseData.data.data);

	let spy: SpyInstance;
	beforeEach(() => {
		mockFetchRetry = vi.spyOn(exportFetch, "FetchRetry").mockResolvedValue(mockResponseData);
		spy = vi.spyOn(FileSaver, "saveAs");
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should make a POST request to download/B", async () => {
		mockBereitschaft();

		const button = document.createElement("button");
		button.id = "downloadButton";
		document.body.appendChild(button);

		const downloadPromise = download(button, "B");
		expect(button.disabled).toBe(true);
		await expect(downloadPromise).resolves.toBe(undefined);
		expect(button.disabled).toBe(false);

		expect(mockFetchRetry).toHaveBeenCalledWith(
			"download/B",
			{
				VorgabenU: VorgabenUMock,
				VorgabenGeld: VorgabenGeldMock[1],
				Daten: {
					BZ: [],
					BE: [],
				},
				Monat: 3,
				Jahr: 2023,
			},
			"POST",
		);
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith(mockResponseDataBlob, mockResponseData.data.name);
	});
	it("should make a POST request to download/E", async () => {
		mockEWT();

		const button = document.createElement("button");
		button.id = "downloadButtonE";
		document.body.appendChild(button);

		const downloadPromise = download(button, "E");
		expect(button.disabled).toBe(true);
		await expect(downloadPromise).resolves.toBe(undefined);
		expect(button.disabled).toBe(false);

		expect(mockFetchRetry).toHaveBeenCalledWith(
			"download/E",
			{
				VorgabenU: VorgabenUMock,
				VorgabenGeld: VorgabenGeldMock[1],
				Daten: {
					EWT: [],
				},
				Monat: 3,
				Jahr: 2023,
			},
			"POST",
		);
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith(mockResponseDataBlob, mockResponseData.data.name);
	});
	it("should make a POST request to download/N", async () => {
		mockNeben();

		const button = document.createElement("button");
		button.id = "downloadButtonN";
		document.body.appendChild(button);

		const downloadPromise = download(button, "N");
		expect(button.disabled).toBe(true);
		await expect(downloadPromise).resolves.toBe(undefined);
		expect(button.disabled).toBe(false);

		expect(mockFetchRetry).toHaveBeenCalledWith(
			"download/N",
			{
				VorgabenU: VorgabenUMock,
				VorgabenGeld: VorgabenGeldMock[1],
				Daten: {
					N: [],
				},
				Monat: 3,
				Jahr: 2023,
			},
			"POST",
		);
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith(mockResponseDataBlob, mockResponseData.data.name);
	});
});
