import dayjs from "dayjs";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createAddModalBereitschaftsZeit } from "../src/ts/Bereitschaft/components";
import { BereitschaftEingabe, DataBE, DataBZ, bereitschaftEingabeWeb } from "../src/ts/Bereitschaft/utils";
import { CustomHTMLDivElement } from "../src/ts/interfaces/CustomHTMLElements";
import { IDaten } from "../src/ts/interfaces/IDaten";
import { Storage } from "../src/ts/utilities";
import { VorgabenUMock, datenBEMock, datenBZMock, mockBereitschaft } from "./mockData";

describe("#Bereitschaftseingabe", () => {
	beforeAll(() => {
		Storage.set("VorgabenU", VorgabenUMock);
	});
	it("Berechnet normale Bereitschaft", () => {
		const bereitschaftsAnfang = dayjs("2023-04-12T15:45:00"),
			bereitschaftsEnde = dayjs("2023-04-19T07:00:00"),
			nacht = false,
			nachtAnfang = bereitschaftsEnde,
			nachtEnde = bereitschaftsEnde,
			daten = [],
			result = BereitschaftEingabe(bereitschaftsAnfang, bereitschaftsEnde, nachtAnfang, nachtEnde, nacht, daten);
		expect(result).not.toBeFalsy;
		if (result === false) return;
		expect(result.length === 7);
		expect(result).toMatchSnapshot();
	});
	it("Berechnet normale Bereitschaft über Feiertag", () => {
		const bereitschaftsAnfang = dayjs("2023-04-05T15:45:00"),
			bereitschaftsEnde = dayjs("2023-04-12T07:00:00"),
			nacht = false,
			nachtAnfang = bereitschaftsEnde,
			nachtEnde = bereitschaftsEnde,
			daten = [],
			result = BereitschaftEingabe(bereitschaftsAnfang, bereitschaftsEnde, nachtAnfang, nachtEnde, nacht, daten);
		if (result === false) return;
		expect(result.length === 7);
		expect(result).toMatchSnapshot();
	});
	it("Berechnet Bereitschaft mit Nacht", () => {
		const bereitschaftsAnfang = dayjs("2023-04-12T15:45:00"),
			bereitschaftsEnde = dayjs("2023-04-19T07:00:00"),
			nacht = true,
			nachtAnfang = dayjs("2023-04-15T19:45:00"),
			nachtEnde = dayjs("2023-04-19T06:15:00"),
			daten = [],
			result = BereitschaftEingabe(bereitschaftsAnfang, bereitschaftsEnde, nachtAnfang, nachtEnde, nacht, daten);
		if (result === false) return;
		expect(result.length === 10);
		expect(result).toMatchSnapshot();
	});
	it("Berechnet Bereitschaft mit Nacht über Feiertag", () => {
		const bereitschaftsAnfang = dayjs("2023-04-05T15:45:00"),
			bereitschaftsEnde = dayjs("2023-04-12T12:00:00"),
			nacht = true,
			nachtAnfang = dayjs("2023-04-10T19:30:00"),
			nachtEnde = dayjs("2023-04-12T06:15:00"),
			daten = [],
			result = BereitschaftEingabe(bereitschaftsAnfang, bereitschaftsEnde, nachtAnfang, nachtEnde, nacht, daten);
		if (result === false) return;
		expect(result.length === 10);
		expect(result).toMatchSnapshot();
	});
	it("Berechnet Monatsübergang (anfang) korrekt", () => {
		const bereitschaftsAnfang = dayjs("2023-04-01T00:00:00"),
			bereitschaftsEnde = dayjs("2023-04-05T07:00:00"),
			nacht = false,
			nachtAnfang = bereitschaftsEnde,
			nachtEnde = bereitschaftsEnde,
			daten = [],
			result = BereitschaftEingabe(bereitschaftsAnfang, bereitschaftsEnde, nachtAnfang, nachtEnde, nacht, daten);
		if (result === false) return;
		expect(result.length === 5);
		expect(result).toMatchSnapshot();
	});
	it("Berechnet Monatsübergang (ende) korrekt", () => {
		const bereitschaftsAnfang = dayjs("2023-04-26T15:45:00"),
			bereitschaftsEnde = dayjs("2023-05-01T00:00:00"),
			nacht = false,
			nachtAnfang = bereitschaftsEnde,
			nachtEnde = bereitschaftsEnde,
			daten = [],
			result = BereitschaftEingabe(bereitschaftsAnfang, bereitschaftsEnde, nachtAnfang, nachtEnde, nacht, daten);
		if (result === false) return;
		expect(result.length === 5);
		expect(result).toMatchSnapshot();
	});
	it("Return undefined, wenn Bereitschaftszeit bereits vorhanden", () => {
		const bereitschaftsAnfang = dayjs("2023-04-12T15:45:00"),
			bereitschaftsEnde = dayjs("2023-04-19T07:00:00"),
			nacht = false,
			nachtAnfang = bereitschaftsEnde,
			nachtEnde = bereitschaftsEnde,
			daten = [
				{
					beginB: "2023-04-12T13:45:00.000Z",
					endeB: "2023-04-13T05:00:00.000Z",
					pauseB: 30,
				},
				{
					beginB: "2023-04-13T13:45:00.000Z",
					endeB: "2023-04-14T05:00:00.000Z",
					pauseB: 30,
				},
				{
					beginB: "2023-04-14T11:00:00.000Z",
					endeB: "2023-04-15T06:00:00.000Z",
					pauseB: 0,
				},
				{
					beginB: "2023-04-15T06:00:00.000Z",
					endeB: "2023-04-16T06:00:00.000Z",
					pauseB: 0,
				},
				{
					beginB: "2023-04-16T06:00:00.000Z",
					endeB: "2023-04-17T05:00:00.000Z",
					pauseB: 0,
				},
				{
					beginB: "2023-04-17T13:45:00.000Z",
					endeB: "2023-04-18T05:00:00.000Z",
					pauseB: 30,
				},
				{
					beginB: "2023-04-18T13:45:00.000Z",
					endeB: "2023-04-19T05:00:00.000Z",
					pauseB: 30,
				},
			],
			result = BereitschaftEingabe(bereitschaftsAnfang, bereitschaftsEnde, nachtAnfang, nachtEnde, nacht, daten);
		expect(result).toBeFalsy();
	});
});

describe("#bereitschaftEingabeWeb", async () => {
	beforeAll(() => {
		Storage.set("VorgabenU", VorgabenUMock);
		mockBereitschaft();

		globalThis.createSnackBar = vi.fn();
		globalThis.FetchRetry = vi.fn();
	});

	it("Should calculate the correct Bereitschaft if month is the same", async () => {
		const $modal = document.createElement("div") as CustomHTMLDivElement;
		$modal.innerHTML = `
    <input id="bA" value="2023-04-12"/>
    <input id="bAT" value="15:45"/>
    <input id="bE" value="2023-04-19"/>
    <input id="bET" value="07:00"/>
    <input id="nacht" type="checkbox"/>
    <input id="nA" value="2023-04-19"/>
    <input id="nAT" value="07:00"/>
    <input id="nE" value="2023-04-19"/>
    <input id="nET" value="07:00"/>
    <input id="Monat" value="4"/>
    <input id="Jahr" value="2023"/>
  `;
		document.body.appendChild($modal);
		const StorageSpy = vi.spyOn(Storage, "set");

		await bereitschaftEingabeWeb($modal, "mockAccessToken");

		expect(StorageSpy).toMatchSnapshot();
	});
});

describe("#DataBZ", () => {
	beforeEach(() => {
		Storage.clear();
	});

	it("should return an empty array when no data is provided and nothing is in storage", () => {
		const result = DataBZ();
		expect(result).toEqual([]);
	});

	it("should return data from storage when no data is provided but storage has data", () => {
		const storageData: IDaten["BZ"] = datenBZMock;
		Storage.set("dataBZ", storageData);
		const result = DataBZ();
		expect(result).toEqual(storageData);
	});

	it("should return the provided data when data is provided", () => {
		const inputData: IDaten["BZ"] = datenBZMock;
		const result = DataBZ(inputData);
		expect(result).toEqual(inputData);
	});
});

describe("#DataBE", () => {
	beforeEach(() => {
		Storage.clear();
	});

	it("should return an empty array when no data is provided and nothing is in storage", () => {
		const result = DataBE();
		expect(result).toEqual([]);
	});

	it("should return data from storage when no data is provided but storage has data", () => {
		const storageData: IDaten["BE"] = datenBEMock;
		Storage.set("dataBE", storageData);
		const result = DataBE();
		expect(result).toEqual(storageData);
	});

	it("should return the provided data when data is provided", () => {
		const inputData: IDaten["BE"] = datenBEMock;
		const result = DataBE(inputData);
		expect(result).toEqual(inputData);
	});
});

describe("#createAddModalBereitschaftsZeit", () => {
	beforeAll(() => {
		Storage.clear();
		Storage.set("VorgabenU", VorgabenUMock);
		Storage.set("Monat", 4);
		Storage.set("Jahr", 2023);
		document.body.innerHTML = '<div class="modal" id="modal" tabindex="-1"></div>';
	});

	it("should create a modal with the correct structure and elements", () => {
		createAddModalBereitschaftsZeit();

		const modal = document.querySelector<HTMLDivElement>(".modal");
		expect(modal).toBeTruthy();

		const form = document.querySelector<HTMLFormElement>("form");
		expect(form).toBeTruthy();

		const modalBody = document.querySelector<HTMLDivElement>(".modal-body");
		expect(modalBody).toBeTruthy();

		const vorgabeBSelect = document.querySelector<HTMLSelectElement>("#vorgabeB");
		expect(vorgabeBSelect).toBeTruthy();
		expect((<HTMLSelectElement>vorgabeBSelect).selectedIndex).toBe(0);
	});

	// Add more test cases to check event listeners, attribute values, and other aspects of the function
});
