import * as FileSaver from "file-saver";
import { MockInstance, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Storage, download } from "../src/ts/utilities";
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
	let mockFetchRetry: MockInstance<any, any>;

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

	const mockResponseDataBlob = mockResponseData.data.data;

	let spy: MockInstance<any, any>;
	beforeEach(() => {
		fetchMock.resetMocks();

		spy = vi.spyOn(FileSaver, "saveAs");
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	//it("should make a POST request to download/B", async () => {
	//	mockBereitschaft();
	//	fetchMock.mockResponseOnce(JSON.stringify(mockResponseDataBlob));
	//
	//	const button = document.createElement("button");
	//	button.id = "downloadButton";
	//	document.body.appendChild(button);
	//
	//	const downloadPromise = download(button, "B");
	//	expect(button.disabled).toBe(true);
	//	await expect(downloadPromise).resolves.toBe(undefined);
	//	expect(button.disabled).toBe(false);
	//
	//	expect(spy).toHaveBeenCalledTimes(1);
	//	expect(spy).toHaveBeenCalledWith(mockResponseDataBlob, mockResponseData.data.name);
	//});
	//	it("should make a POST request to download/E", async () => {
	//		mockEWT();
	//		fetchMock.mockResponseOnce(JSON.stringify(mockResponseDataBlob));
	//
	//		const button = document.createElement("button");
	//		button.id = "downloadButtonE";
	//		document.body.appendChild(button);
	//
	//		const downloadPromise = download(button, "E");
	//		expect(button.disabled).toBe(true);
	//		await expect(downloadPromise).resolves.toBe(undefined);
	//		expect(button.disabled).toBe(false);
	//
	//		expect(spy).toHaveBeenCalledTimes(1);
	//		expect(spy).toHaveBeenCalledWith(mockResponseDataBlob, mockResponseData.data.name);
	//	});
	//	it("should make a POST request to download/N", async () => {
	//		mockNeben();
	//		fetchMock.mockResponseOnce(JSON.stringify(mockResponseDataBlob));
	//
	//		const button = document.createElement("button");
	//		button.id = "downloadButtonN";
	//		document.body.appendChild(button);
	//
	//		const downloadPromise = download(button, "N");
	//		expect(button.disabled).toBe(true);
	//		await expect(downloadPromise).resolves.toBe(undefined);
	//		expect(button.disabled).toBe(false);
	//
	//		expect(spy).toHaveBeenCalledTimes(1);
	//		expect(spy).toHaveBeenCalledWith(mockResponseDataBlob, mockResponseData.data.name);
	//	});
});
