import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as exports from "../src/ts/utilities";
import {
	Storage,
	convertToBlob,
	decodeAccessToken,
	getValidAccesstoken,
	buttonDisable,
	checkMaxTag,
	setLoading,
	clearLoading,
	DatenSortieren,
	saveDaten,
} from "../src/ts/utilities";
import * as exportBerechnung from "../src/ts/Berechnung";
import * as exportSnackbar from "../src/ts/class/CustomSnackbar";
import * as exportEinstelllungen from "../src/ts/Einstellungen/utils";
import { base64StringData } from "./mockPDFString";
import { VorgabenUMock, mockBereitschaft, mockEWT, mockNeben } from "./mockData";

describe("#Storage", () => {
	afterEach(() => {
		localStorage.clear(); // reset localStorage after each test
	});

	it("should set and get a value", () => {
		Storage.set("key", "value");
		expect(Storage.get<string>("key")).toBe("value");
	});

	it("should throw Error when key does not exist", () => {
		expect(() => Storage.get("non-existing-key", { check: true })).toThrowError('"non-existing-key" nicht gefunden');
	});

	it("should remove a value", () => {
		Storage.set("key", "value");
		Storage.remove("key");
		expect(Storage.check("key")).toBeFalsy();
	});

	it("should clear all values", () => {
		Storage.set("key1", "value1");
		Storage.set("key2", "value2");
		Storage.clear();
		expect(Storage.size()).toBe(0);
	});

	it("should check if key exists", () => {
		Storage.set("key", "value");
		expect(Storage.check("key")).toBeTruthy();
		expect(Storage.check("non-existing-key")).toBeFalsy();
	});

	it("should compare a value with the stored value", () => {
		Storage.set("key", "value");
		expect(Storage.compare("key", "value")).toBe(true);
		expect(Storage.compare("key", "other-value")).toBe(false);
	});
});

describe("#decodeAccessToken", () => {
	afterAll(() => {
		Storage.remove("accessToken");
	});

	it("should throw an error if no accessToken is provided", () => {
		Storage.remove("accessToken");
		expect(() => {
			decodeAccessToken();
		}).toThrowError('"Server Zugriffscode" nicht gefunden');
	});

	it("should return a JSON object if a valid accessToken is provided", () => {
		const accessToken =
			"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
		Storage.set("accessToken", accessToken);
		const expected = {
			sub: "1234567890",
			name: "John Doe",
			iat: 1516239022,
		};
		const decoded = decodeAccessToken(accessToken);
		expect(decoded).toEqual(expect.objectContaining(expected));
	});
});

describe("#getValidAccesstoken", async () => {
	let accessToken: string;
	let expiredAccessToken: string;
	let decodedToken: {
		id: string;
		Name: string;
		Berechtigung: number;
		iat: number;
		exp: number;
	};

	beforeAll(() => {
		vi.mock("./decodeAccessToken");
		vi.mock("./tokenErneuern");
		accessToken = "validAccessToken";
		expiredAccessToken = "expiredAccessToken";
		decodedToken = {
			id: "TEST",
			Name: "Max",
			Berechtigung: 1,
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor(Date.now() / 1000) + 60,
		};
	});
	beforeEach(() => {
		Storage.set("accessToken", accessToken);
	});

	it("should throw an error if no accessToken is provided", async () => {
		Storage.remove("accessToken");
		await expect(getValidAccesstoken()).rejects.toThrowError('"Server Zugriffscode" nicht gefunden');
	});

	it("should return the accessToken if it is valid", async () => {
		const mockdecodeAccessToken = vi.spyOn(exports, "decodeAccessToken").mockReturnValue(decodedToken);
		const result = await getValidAccesstoken(accessToken);
		expect(mockdecodeAccessToken).toBeCalledWith(accessToken);
		expect(result).toBe(accessToken);
	});

	it("should renew the accessToken if it is expired", async () => {
		const newAccessToken = "newAccessToken";
		const expiredToken = {
			id: "TEST",
			Name: "Max",
			Berechtigung: 1,
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor(Date.now() / 1000) - 60,
		};
		vi.spyOn(exports, "decodeAccessToken").mockReturnValue(expiredToken);
		vi.spyOn(exports, "tokenErneuern").mockResolvedValue(newAccessToken);
		const result = await getValidAccesstoken(expiredAccessToken);
		expect(result).toBe(newAccessToken);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	afterAll(() => {
		vi.clearAllMocks();
	});
});

describe("#convertToBlob", () => {
	it("should convert a base64 string to a Blob", () => {
		const base64String = base64StringData;
		const expectedType = "application/pdf";
		const blob = convertToBlob(base64String, expectedType);

		expect(blob).toBeInstanceOf(Blob);
		expect(blob.type).toBe(expectedType);

		const reader = new FileReader();
		reader.readAsArrayBuffer(blob);
		reader.onload = () => {
			const arrayBuffer = reader.result as ArrayBuffer;
			const uint8Array = new Uint8Array(arrayBuffer);
			const binaryData = uint8Array.reduce((acc, value) => acc + String.fromCharCode(value), "");
			expect(binaryData).toBe(atob(base64String));
		};
	});
});

describe("#buttonDisable", () => {
	let buttons: HTMLButtonElement[];

	beforeAll(() => {
		buttons = [document.createElement("button"), document.createElement("button"), document.createElement("button")];
		buttons[0].setAttribute("data-disabler", "true");
		buttons[1].setAttribute("data-disabler", "true");
		buttons[2].setAttribute("data-enabler", "true");
		document.body.appendChild(buttons[0]);
		document.body.appendChild(buttons[1]);
		document.body.appendChild(buttons[2]);
	});

	it("should disable all buttons with data-disabler attribute when status is true", () => {
		buttonDisable(true);
		expect(buttons[0].disabled).toBe(true);
		expect(buttons[1].disabled).toBe(true);
		expect(buttons[2].disabled).toBe(false);
	});

	it("should enable all buttons with data-disabler attribute when status is false", () => {
		buttonDisable(false);
		expect(buttons[0].disabled).toBe(false);
		expect(buttons[1].disabled).toBe(false);
		expect(buttons[2].disabled).toBe(false);
	});

	afterAll(() => {
		buttons.forEach(button => button.remove());
	});
});

describe("#checkMaxTag", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("should return the current day of the month, if the current date is in the month", () => {
		const mockDate = new Date(2023, 2, 20);
		vi.setSystemTime(mockDate);

		const result = checkMaxTag(2023, 2);
		expect(result).toBe(20);
	});

	it("should return 1 if the current date is not in the month", () => {
		const mockDate = new Date(2023, 2, 31);
		vi.setSystemTime(mockDate);

		const result = checkMaxTag(2023, 3);
		expect(result).toBe(1);
	});
});

describe("#setLoading + #clearLoading", () => {
	let button: HTMLButtonElement;

	beforeAll(() => {
		button = document.createElement("button");
		button.id = "test-button";
		button.innerHTML = "Submit";
		button.disabled = false;
		document.body.appendChild(button);
	});

	it("should set the button to loading state", () => {
		setLoading("test-button");
		expect(button.innerHTML).toBe('<span class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>');
		expect(button.disabled).toBe(true);
	});

	it("should restore the button to its normal state", () => {
		clearLoading("test-button");
		expect(button.innerHTML).toBe("Submit");
		expect(button.disabled).toBe(false);
	});

	afterAll(() => {
		button.remove();
	});
});

describe("#DatenSortieren", () => {
	it("should sort the data array in ascending order", () => {
		const data = [
			{ tag: "2", name: "Foo" },
			{ tag: "1", name: "Bar" },
			{ tag: "3", name: "Baz" },
		];
		const expectedData = [
			{ tag: "1", name: "Bar" },
			{ tag: "2", name: "Foo" },
			{ tag: "3", name: "Baz" },
		];
		DatenSortieren(data, "tag");
		expect(data).toEqual(expectedData);
	});

	it("should not change the data array if it is already sorted", () => {
		const data = [
			{ tag: "1", name: "Bar" },
			{ tag: "2", name: "Foo" },
			{ tag: "3", name: "Baz" },
		];
		const expectedData = [
			{ tag: "1", name: "Bar" },
			{ tag: "2", name: "Foo" },
			{ tag: "3", name: "Baz" },
		];
		DatenSortieren(data, "tag");
		expect(data).toEqual(expectedData);
	});
});

// describe("saveDaten", async () => {
// 	let button: HTMLButtonElement;

// 	beforeAll(() => {
// 		mockBereitschaft();
// 		mockEWT();
// 		mockNeben();
// 		Storage.set("VorgabenU", VorgabenUMock);
// 		Storage.set("Monat", 3);
// 		button = document.createElement("button");
// 		button.id = "test-button";
// 		button.disabled = false;
// 		button.innerHTML = "Save";
// 		document.body.appendChild(button);
// 	});

// 	it("should save the data and update the UI", async () => {
// 		// Simulate the click on the button
// 		vi.spyOn(console, "log").mockImplementation(() => {
// 			return null;
// 		});
// 		const mockFetchRetry = vi.spyOn(exports, "FetchRetry").mockResolvedValueOnce({
// 			status: true,
// 			statusCode: 200,
// 			message: "Test",
// 			data: {
// 				datenBerechnung: false,
// 				daten: {
// 					BZ: [],
// 					BE: [],
// 					E: [],
// 					N: [],
// 				},
// 				user: {},
// 			},
// 		});
// 		const setLoadingSpy = vi.spyOn(exports, "setLoading");
// 		const buttonDisableSpy = vi.spyOn(exports, "buttonDisable");
// 		const saveTableDataSpy = vi.spyOn(exports, "saveTableData");
// 		const generateTableBerechnungSpy = vi.spyOn(exportBerechnung, "generateTableBerechnung");
// 		const createSnackBarSpy = vi.spyOn(exportSnackbar, "createSnackBar");
// 		const generateEingabeMaskeEinstellungenSpy = vi.spyOn(exportEinstelllungen, "generateEingabeMaskeEinstellungen");
// 		const StorageSetSpy = vi.spyOn(exports.Storage, "set");

// 		await saveDaten(button);

// 		expect(setLoadingSpy).toHaveBeenCalledWith(button.id);
// 		expect(buttonDisableSpy).toHaveBeenCalledWith(true);
// 		console.log(mockFetchRetry);
// 		expect(mockFetchRetry).toHaveBeenCalledWith("saveData", expect.any(Object), "POST");
// 		expect(saveTableDataSpy).toHaveBeenCalledWith("tableBZ", expect.any(Object));
// 		expect(saveTableDataSpy).toHaveBeenCalledWith("tableBE", expect.any(Object));
// 		expect(saveTableDataSpy).toHaveBeenCalledWith("tableE", expect.any(Object));
// 		expect(saveTableDataSpy).toHaveBeenCalledWith("tableN", expect.any(Object));
// 		expect(generateTableBerechnungSpy).toHaveBeenCalledWith({});
// 		expect(createSnackBarSpy).toHaveBeenCalledWith({
// 			message: "Speichern<br/>Daten gespeichert",
// 			status: "success",
// 			timeout: 3000,

// 			fixed: true,
// 		});
// 		expect(generateEingabeMaskeEinstellungenSpy).toHaveBeenCalledWith({});
// 		expect(StorageSetSpy).toHaveBeenCalledWith("VorgabenU", {});
// 		expect(StorageSetSpy).toHaveBeenCalledWith("datenBerechnung", {});
// 		expect(console.log).toHaveBeenCalledWith("Erfolgreich gespeichert");
// 		expect(setLoadingSpy).toHaveBeenCalledWith(button.id);
// 		expect(buttonDisableSpy).toHaveBeenCalledWith(false);
// 	});

// 	afterAll(() => {
// 		button.remove();
// 	});
// });
