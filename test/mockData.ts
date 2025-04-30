import dayjs from "dayjs";
import { createCustomTable } from "../src/ts/class/CustomTable";
import { IDaten } from "../src/ts/interfaces/IDaten";
import { IVorgabenBerechnung } from "../src/ts/interfaces/IVorgabenBerechnungMonat";
import { IVorgabenGeld } from "../src/ts/interfaces/IVorgabenGeldType";
import { IVorgabenU } from "../src/ts/interfaces/IVorgabenU";

export const VorgabenGeldMock: IVorgabenGeld = {
	1: {
		BE14: 24,
		BE8: 9,
		"Besoldungsgruppe A 8": 16.37,
		"Besoldungsgruppe A 9": 22.49,
		Fahrentsch: 6.65,
		LRE1: 70.94,
		LRE2: 46.43,
		LRE3: 26.57,
		PrivatPKWTarif: 0.27,
		PrivatPKWBeamter: 0.2,
		Tarifkraft: 2.58,
		TE14: 6.14,
		TE24: 9.71,
		TE8: 4.09,
	},
};

export const VorgabenUMock: IVorgabenU = {
	pers: {
		Vorname: "Jan",
		Nachname: "Otto",
		PNummer: "05211456",
		Telefon: "016097473667",
		Adress1: "Weingarten 7, 36272 Niederaula",
		Adress2: "",
		ErsteTkgSt: "Kirchheim",
		ErsteTkgStAdresse: "Beiersgraben, 36275 Kirchheim",
		Betrieb: "DB Netz AG",
		OE: "I.NA-MI-N-KSL-IL 03",
		Gewerk: "LST",
		kmArbeitsort: 11,
		nBhf: "Bad Hersfeld",
		kmnBhf: 12,
		TB: "Tarifkraft",
	},
	aZ: {
		bBN: "19:30",
		bN: "19:45",
		bS: "20:15",
		bT: "07:00",
		eN: "06:15",
		eS: "07:00",
		eT: "15:45",
		eTF: "13:00",
		rZ: "00:20",
	},
	fZ: [
		{
			key: "Kaiserau",
			text: "km 167,0",
			value: "00:50",
		},
		{
			key: "Wildsberg",
			text: "km 170,6",
			value: "00:40",
		},
		{
			key: "Licherode",
			text: "km 179,0",
			value: "00:35",
		},
		{
			key: "Ersrode",
			text: "km 173,7",
			value: "00:25",
		},
		{
			key: "Mühlbach",
			text: "km 189,4",
			value: "00:20",
		},
		{
			key: "Kirchheim",
			text: "km 196,5",
			value: "00:10",
		},
		{
			key: "Hattenbach",
			text: "km 202,1",
			value: "00:15",
		},
		{
			key: "Richthof",
			text: "km 208,0",
			value: "00:20",
		},
		{
			key: "Langenschwarz",
			text: "km 214,9",
			value: "00:35",
		},
		{
			key: "Michelsrombach",
			text: "km 221,4",
			value: "00:40",
		},
		{
			key: "Dietershahn",
			text: "km 227,6",
			value: "00:40",
		},
		{
			key: "Fulda",
			text: "Materialtransport",
			value: "00:40",
		},
		{
			key: "Kassel",
			text: "Materialtransport",
			value: "01:00",
		},
	],
	vorgabenB: {
		0: {
			Name: "B1 + Nacht",
			beginnB: {
				tag: 3,
				zeit: "15:45",
			},
			endeB: {
				tag: 3,
				zeit: "07:00",
				Nwoche: true,
			},
			nacht: true,
			beginnN: {
				tag: 0,
				zeit: "19:30",
				Nwoche: true,
			},
			endeN: {
				tag: 3,
				zeit: "06:15",
				Nwoche: true,
			},
			standard: true,
		},
		1: {
			Name: "B1 + Nacht (ab Sa)",
			beginnB: {
				tag: 3,
				zeit: "15:45",
			},
			endeB: {
				tag: 3,
				zeit: "07:00",
				Nwoche: true,
			},
			nacht: true,
			beginnN: {
				tag: 6,
				zeit: "19:45",
				Nwoche: false,
			},
			endeN: {
				tag: 3,
				zeit: "06:15",
				Nwoche: true,
			},
		},
		2: {
			Name: "B1",
			beginnB: {
				tag: 3,
				zeit: "15:45",
			},
			endeB: {
				tag: 3,
				zeit: "07:00",
				Nwoche: true,
			},
			nacht: false,
			beginnN: {
				tag: 0,
				zeit: "19:30",
				Nwoche: true,
			},
			endeN: {
				tag: 3,
				zeit: "06:15",
				Nwoche: true,
			},
		},
		3: {
			Name: "B2",
			beginnB: {
				tag: 3,
				zeit: "15:45",
			},
			endeB: {
				tag: 6,
				zeit: "19:45",
				Nwoche: false,
			},
			nacht: false,
			beginnN: {
				tag: 6,
				zeit: "19:45",
				Nwoche: false,
			},
			endeN: {
				tag: 3,
				zeit: "06:15",
				Nwoche: true,
			},
		},
	},
};

export const datenBerechungMock: IVorgabenBerechnung = {
	"1": {
		B: {
			B: 6000,
			L1: 1,
			L2: 1,
			L3: 1,
			K: 15,
		},
		E: {
			A8: 15,
			A14: 1,
			A24: 1,
			S8: 15,
			S14: 1,
		},
		N: {
			F: 2,
		},
	},
	"2": {
		B: {
			B: 6000,
			L1: 1,
			L2: 1,
			L3: 1,
			K: 15,
		},
		E: {
			A8: 15,
			A14: 1,
			A24: 1,
			S8: 15,
			S14: 1,
		},
		N: {
			F: 2,
		},
	},
	"3": {
		B: {
			B: 6000,
			L1: 1,
			L2: 1,
			L3: 1,
			K: 15,
		},
		E: {
			A8: 15,
			A14: 1,
			A24: 1,
			S8: 15,
			S14: 1,
		},
		N: {
			F: 2,
		},
	},
	"4": {
		B: {
			B: 6000,
			L1: 1,
			L2: 1,
			L3: 1,
			K: 15,
		},
		E: {
			A8: 15,
			A14: 1,
			A24: 1,
			S8: 15,
			S14: 1,
		},
		N: {
			F: 2,
		},
	},
	"5": {
		B: {
			B: 6000,
			L1: 1,
			L2: 1,
			L3: 1,
			K: 15,
		},
		E: {
			A8: 15,
			A14: 1,
			A24: 1,
			S8: 15,
			S14: 1,
		},
		N: {
			F: 2,
		},
	},
	"6": {
		B: {
			B: 6000,
			L1: 1,
			L2: 1,
			L3: 1,
			K: 15,
		},
		E: {
			A8: 15,
			A14: 1,
			A24: 1,
			S8: 15,
			S14: 1,
		},
		N: {
			F: 2,
		},
	},
	"7": {
		B: {
			B: 6000,
			L1: 1,
			L2: 1,
			L3: 1,
			K: 15,
		},
		E: {
			A8: 15,
			A14: 1,
			A24: 1,
			S8: 15,
			S14: 1,
		},
		N: {
			F: 2,
		},
	},
	"8": {
		B: {
			B: 6000,
			L1: 1,
			L2: 1,
			L3: 1,
			K: 15,
		},
		E: {
			A8: 15,
			A14: 1,
			A24: 1,
			S8: 15,
			S14: 1,
		},
		N: {
			F: 2,
		},
	},
	"9": {
		B: {
			B: 6000,
			L1: 1,
			L2: 1,
			L3: 1,
			K: 15,
		},
		E: {
			A8: 15,
			A14: 1,
			A24: 1,
			S8: 15,
			S14: 1,
		},
		N: {
			F: 2,
		},
	},
	"10": {
		B: {
			B: 6000,
			L1: 1,
			L2: 1,
			L3: 1,
			K: 15,
		},
		E: {
			A8: 15,
			A14: 1,
			A24: 1,
			S8: 15,
			S14: 1,
		},
		N: {
			F: 2,
		},
	},
	"11": {
		B: {
			B: 6000,
			L1: 1,
			L2: 1,
			L3: 1,
			K: 15,
		},
		E: {
			A8: 15,
			A14: 1,
			A24: 1,
			S8: 15,
			S14: 1,
		},
		N: {
			F: 2,
		},
	},
	"12": {
		B: {
			B: 6000,
			L1: 1,
			L2: 1,
			L3: 1,
			K: 15,
		},
		E: {
			A8: 15,
			A14: 1,
			A24: 1,
			S8: 15,
			S14: 1,
		},
		N: {
			F: 2,
		},
	},
};

export const mockNeben = (): void => {
	document.body.insertAdjacentHTML(
		"beforeend",
		'<div class="table-responsive">' +
			'<table id="tableN" class="table table-bordered table-striped table-hover align-middle" aria-label="Nebengeld"></table>' +
			"</div>",
	);

	createCustomTable("tableN", {
		columns: [
			{ name: "tagN", title: "Tag", sortable: true, sorted: true, direction: "ASC" },
			{ name: "beginN", title: "Arbeit Von", type: "time" },
			{ name: "endeN", title: "Arbeit Bis", type: "time" },
			{ name: "beginPauseN", title: "Pause Von", breakpoints: "sm", type: "time" },
			{ name: "endePauseN", title: "Pause Bis", breakpoints: "sm", type: "time" },
			{ name: "dauerN", title: "Anzahl", breakpoints: "md" },
			{ name: "nrN", title: "Zulage", breakpoints: "md" },
		],
		rows: [],
	});
};

export const mockEWT = (): void => {
	document.body.insertAdjacentHTML(
		"beforeend",
		'<div class="table-responsive">' +
			'<table id="tableE" class="table table-bordered table-striped table-hover align-middle" aria-label="EWT"></table>' +
			"</div>",
	);

	const berechnenParser = (value: boolean) => {
		return value
			? '<div class="form-check form-switch"><input type="checkbox" class="row-checkbox form-check-input" checked></div>'
			: '<div class="form-check form-switch"><input type="checkbox" class="row-checkbox form-check-input"></div>';
	};
	const schichtParser = (value: unknown) => {
		switch (value) {
			case "T":
				return "Tag";
			case "N":
				return "Nacht";
			case "BN":
				return "<span class='SchichtBereitschaft'>Bereitschaft<br>+ Nacht</span>";
			case "S":
				return "Sonder";
			default:
				return "";
		}
	};
	createCustomTable("tableE", {
		columns: [
			{ name: "tagE", title: "Tag", sortable: true, sorted: true, direction: "ASC" },
			{ name: "eOrtE", title: "Einsatzort", classes: ["custom-text-truncate"], type: "text" },
			{ name: "schichtE", title: "Schicht", parser: schichtParser, type: "time" },
			{ name: "abWE", title: "Ab Wohnung", breakpoints: "xl", type: "time" },
			{ name: "beginE", title: "Arbeitszeit Von", breakpoints: "md", type: "time" },
			{ name: "ab1E", title: "Ab 1.Tgk.-St.", breakpoints: "lg", type: "time" },
			{ name: "anEE", title: "An Einsatzort", breakpoints: "lg", type: "time" },
			{ name: "abEE", title: "Ab Einsatzort", breakpoints: "lg", type: "time" },
			{ name: "an1E", title: "An 1.Tgk.-St.", breakpoints: "lg", type: "time" },
			{ name: "endeE", title: "Arbeitszeit Bis", breakpoints: "md", type: "time" },
			{ name: "anWE", title: "An Wohnung", breakpoints: "xl", type: "time" },
			{ name: "berechnen", title: "Berechnen?", parser: berechnenParser, breakpoints: "xxl" },
		],
		rows: [],
	});
};

export const mockBereitschaft = (): void => {
	document.body.insertAdjacentHTML(
		"beforeend",
		'<div class="table-responsive">' +
			'<h4 id="titelBZ">Bereitschaftszeitraum</h4>' +
			'<table id="tableBZ" class="table table-bordered table-striped table-hover align-middle" aria-describedby="TitelBZ"></table>' +
			"</div>" +
			'<div class="table-responsive">' +
			'<h4 id="titelBE">Bereitschaftseinsätze</h4>' +
			'<table id="tableBE" class="table table-bordered table-striped table-hover align-middle" aria-describedby="titelBE"></table>' +
			"</div>",
	);

	const datetimeParser = (value: string): string => dayjs(value).format("DD.MM.YYYY, LT");
	const timeZeroParser = (value: number): number | string => (!value ? "" : value);
	createCustomTable("tableBZ", {
		columns: [
			{ name: "beginB", title: "Von", parser: datetimeParser, sortable: true, sorted: true, direction: "ASC" },
			{ name: "endeB", title: "Bis", parser: datetimeParser, sortable: true },
			{ name: "pauseB", title: "Pause", parser: timeZeroParser, breakpoints: "xs" },
		],
		rows: [],
	});
	createCustomTable("tableBE", {
		columns: [
			{ name: "tagBE", title: "Tag", sortable: true, sorted: true, direction: "ASC" },
			{ name: "auftragsnummerBE", title: "Auftrags-Nr.", classes: ["custom-text-truncate"] },
			{ name: "beginBE", title: "Von", breakpoints: "sm", type: "time" },
			{ name: "endeBE", title: "Bis", breakpoints: "sm", type: "time" },
			{ name: "lreBE", title: "LRE" },
			{ name: "privatkmBE", title: "Privat Km", parser: timeZeroParser, breakpoints: "md" },
		],
		rows: [],
	});
};

export const datenBZMock: Required<IDaten>["BZ"] = {
	1: [],
	2: [],
	3: [
		{
			beginB: "2023-03-02T14:45:00.000Z",
			endeB: "2023-03-02T21:30:00.000Z",
			pauseB: 30,
		},
		{
			beginB: "2023-03-08T14:45:00.000Z",
			endeB: "2023-03-09T06:00:00.000Z",
			pauseB: 30,
		},
		{
			beginB: "2023-03-09T14:45:00.000Z",
			endeB: "2023-03-10T06:00:00.000Z",
			pauseB: 30,
		},
		{
			beginB: "2023-03-10T12:00:00.000Z",
			endeB: "2023-03-11T07:00:00.000Z",
			pauseB: 0,
		},
		{
			beginB: "2023-03-11T07:00:00.000Z",
			endeB: "2023-03-12T07:00:00.000Z",
			pauseB: 0,
		},
		{
			beginB: "2023-03-12T07:00:00.000Z",
			endeB: "2023-03-12T18:30:00.000Z",
			pauseB: 0,
		},
		{
			beginB: "2023-03-13T05:15:00.000Z",
			endeB: "2023-03-13T06:00:00.000Z",
			pauseB: 45,
		},
		{
			beginB: "2023-03-13T14:45:00.000Z",
			endeB: "2023-03-13T18:30:00.000Z",
			pauseB: 0,
		},
		{
			beginB: "2023-03-14T05:15:00.000Z",
			endeB: "2023-03-14T06:00:00.000Z",
			pauseB: 45,
		},
		{
			beginB: "2023-03-14T14:45:00.000Z",
			endeB: "2023-03-14T18:30:00.000Z",
			pauseB: 0,
		},
		{
			beginB: "2023-03-15T05:15:00.000Z",
			endeB: "2023-03-15T06:00:00.000Z",
			pauseB: 45,
		},
	],
	4: [],
	5: [],
	6: [],
	7: [],
	8: [],
	9: [],
	10: [],
	11: [],
	12: [],
};

export const datenBEMock: Required<IDaten>["BE"] = {
	1: [],
	2: [],
	3: [
		{
			tagBE: "10.03.2023",
			auftragsnummerBE: "Test",
			beginBE: "00:14",
			endeBE: "01:59",
			lreBE: "LRE 1",
			privatkmBE: 0,
		},
	],
	4: [],
	5: [],
	6: [],
	7: [],
	8: [],
	9: [],
	10: [],
	11: [],
	12: [],
};

export const datenEWTMock: Required<IDaten>["EWT"] = {
	1: [],
	2: [],
	3: [
		{
			tagE: "01",
			eOrtE: "Licherode",
			schichtE: "T",
			abWE: "06:40",
			ab1E: "07:20",
			anEE: "07:55",
			beginE: "07:00",
			endeE: "15:45",
			abEE: "14:50",
			an1E: "15:25",
			anWE: "16:05",
			berechnen: true,
		},
		{
			tagE: "02",
			eOrtE: "Kirchheim",
			schichtE: "T",
			abWE: "06:40",
			ab1E: "07:20",
			anEE: "07:30",
			beginE: "07:00",
			endeE: "15:45",
			abEE: "15:15",
			an1E: "15:25",
			anWE: "16:05",
			berechnen: true,
		},
		{
			tagE: "06",
			eOrtE: "Mühlbach",
			schichtE: "T",
			abWE: "06:40",
			ab1E: "07:20",
			anEE: "07:40",
			beginE: "07:00",
			endeE: "15:45",
			abEE: "15:05",
			an1E: "15:25",
			anWE: "16:05",
			berechnen: true,
		},
		{
			tagE: "08",
			eOrtE: "Mühlbach",
			schichtE: "T",
			abWE: "06:40",
			ab1E: "07:20",
			anEE: "07:40",
			beginE: "07:00",
			endeE: "15:45",
			abEE: "15:05",
			an1E: "15:25",
			anWE: "16:05",
			berechnen: true,
		},
		{
			tagE: "09",
			eOrtE: "Richthof",
			schichtE: "T",
			abWE: "06:40",
			ab1E: "07:20",
			anEE: "07:40",
			beginE: "07:00",
			endeE: "15:45",
			abEE: "15:05",
			an1E: "15:25",
			anWE: "16:05",
			berechnen: true,
		},
		{
			tagE: "13",
			eOrtE: "Licherode",
			schichtE: "BN",
			abWE: "19:10",
			ab1E: "20:30",
			anEE: "21:05",
			beginE: "19:30",
			endeE: "06:15",
			abEE: "04:55",
			an1E: "05:30",
			anWE: "06:35",
			berechnen: true,
		},
		{
			tagE: "14",
			eOrtE: "Licherode",
			schichtE: "BN",
			abWE: "19:10",
			ab1E: "20:30",
			anEE: "21:05",
			beginE: "19:30",
			endeE: "06:15",
			abEE: "04:55",
			an1E: "05:30",
			anWE: "06:35",
			berechnen: true,
		},
		{
			tagE: "15",
			eOrtE: "Licherode",
			schichtE: "BN",
			abWE: "19:10",
			ab1E: "20:30",
			anEE: "21:05",
			beginE: "19:30",
			endeE: "06:15",
			abEE: "04:55",
			an1E: "05:30",
			anWE: "06:35",
			berechnen: true,
		},
		{
			tagE: "28",
			eOrtE: "Langenschwarz",
			schichtE: "T",
			abWE: "06:40",
			ab1E: "07:20",
			anEE: "07:55",
			beginE: "07:00",
			endeE: "15:45",
			abEE: "14:50",
			an1E: "15:25",
			anWE: "16:05",
			berechnen: true,
		},
		{
			tagE: "29",
			eOrtE: "Langenschwarz",
			schichtE: "T",
			abWE: "06:40",
			ab1E: "07:20",
			anEE: "07:55",
			beginE: "07:00",
			endeE: "15:45",
			abEE: "14:50",
			an1E: "15:25",
			anWE: "16:05",
			berechnen: true,
		},
		{
			tagE: "30",
			eOrtE: "Langenschwarz",
			schichtE: "T",
			abWE: "06:40",
			ab1E: "07:20",
			anEE: "07:55",
			beginE: "07:00",
			endeE: "15:45",
			abEE: "14:50",
			an1E: "15:25",
			anWE: "16:05",
			berechnen: true,
		},
	],
	4: [],
	5: [],
	6: [],
	7: [],
	8: [],
	9: [],
	10: [],
	11: [],
	12: [],
};

export const datenNMock: Required<IDaten>["N"] = {
	1: [],
	2: [],
	3: [
		{
			tagN: "12",
			beginN: "19:30",
			endeN: "06:15",
			anzahl040N: 1,
			auftragN: "123456789",
		},
		{
			tagN: "13",
			beginN: "19:30",
			endeN: "06:15",
			anzahl040N: 1,
			auftragN: "223456789",
		},
		{
			tagN: "14",
			beginN: "19:30",
			endeN: "06:15",
			anzahl040N: 1,
			auftragN: "323456789",
		},
	],
	4: [],
	5: [],
	6: [],
	7: [],
	8: [],
	9: [],
	10: [],
	11: [],
	12: [],
};

export const mockEinstellungen = (): void => {
	document.body.insertAdjacentHTML(
		"beforeend",
		'<form class="text-center" id="formEinstellungen">' +
			'<button type="submit" class="btn btn-success" name="btnES" id="btnSaveEinstellungen" data-disabler><span class="material-icons-round big-icons">save</span>Speichern</button>' +
			'<input type="Text" placeholder="Max" id="Vorname" class="form-control validate" required /><label for="Vorname">Vorname</label>' +
			'<input type="Text" placeholder="Mustermann" id="Nachname" class="form-control validate" required /><label for="Nachname">Nachname</label>' +
			'<input type="Text" placeholder="01234567" id="PNummer" class="form-control validate" required /><label for="PNummer">Personalnummer</label>' +
			'<input type="tel" id="Telefon" placeholder="0123/45678910" class="form-control validate" required /><label for="Telefon">Telefon</label>' +
			'<input type="Text" placeholder="Musterstraße 17, 12345 Musterstadt" id="Adress1" class="form-control validate" required /><label for="Adress1">Wohnsitz 1</label>' +
			'<input type="Text" placeholder="Musterstraße 17, 12345 Musterstadt" id="Adress2" class="form-control validate" /><label for="Adress2">Wohnsitz 2</label>' +
			'<input type="Text" placeholder="Kirchheim" id="ErsteTkgSt" class="form-control validate" required /><label for="ErsteTkgSt">Erste Tätigkeitsstätte</label>' +
			'<input type="Text" placeholder="DB Netz AG" id="Betrieb" class="form-control validate" required /><label for="Betrieb">Betrieb</label>' +
			'<input type="Text" placeholder="I.NA-MI-N-KSL-IL 03" id="OE" class="form-control validate" required /><label for="OE">OE</label>' +
			'<input type="Text" placeholder="LST" id="Gewerk" class="form-control validate" required /><label for="Gewerk">Gewerk</label>' +
			'<input type="Number" placeholder="12" id="kmArbeitsort" class="form-control validate" min="1" max="100" required /><label for="kmArbeitsort">Entfernung zur Arbeitsstätte in km</label>' +
			'<input type="Text" placeholder="Bad Hersfeld" id="nBhf" class="form-control validate" required /><label for="nBhf">nächster Bahnhof</label>' +
			'<input type="Number" placeholder="12" id="kmnBhf" class="form-control validate" min="1" max="100" required /><label for="kmnBhf">Entfernung zum nächsten Bahnhof in km</label>' +
			'<select class="form-select validate" id="TB" name="TB" required><option value="" disabled selected>Bitte Wählen</option><option value="Tarifkraft">Tarifkraft</option><option value="Besoldungsgruppe A 8">Besoldungsgruppe A 8</option><option value="Besoldungsgruppe A 9">Besoldungsgruppe A 9</option></select><label for="TB">Tarif / Beamter</label>' +
			'<input type="time" id="rZ" class="form-control validate" required /><label for="rZ">Fahrzeit Wo / Ao</label>' +
			'<input type="time" id="bT" class="form-control validate" required /><label for="bT">Arbeitsbeginn Tag</label>' +
			'<input type="time" id="eT" class="form-control validate" required /><label for="eT">Arbeitsende Mo-Do</label>' +
			'<input type="time" id="eTF" class="form-control validate" required /><label for="eTF">Arbeitsende Fr</label>' +
			'<input type="time" id="bN" class="form-control validate" required /><label for="bN">Arbeitsbeginn Nacht</label>' +
			'<input type="time" id="bBN" class="form-control validate" required /><label for="bBN">Arbeitsbeginn Nacht Bereitschaft</label>' +
			'<input type="time" id="eN" class="form-control validate" required /><label for="eN">Arbeitsende Nacht</label>' +
			'<input type="time" id="bS" class="form-control validate" required /><label for="bS">Arbeitsbeginn Sonderschicht</label>' +
			'<input type="time" id="eS" class="form-control validate" required /><label for="eS">Arbeitsende Sonderschicht</label>' +
			'<table id="tableVE" class="table table-bordered table-striped table-hover align-middle"	aria-label="Voreinstellungen Bereitschaft"></table>' +
			'<table class="table table-bordered table-striped table-hover mt-3" aria-describedby="titelTkgSt">' +
			'<thead><tr class="table-primary align-middle text-center"><th id="titelTkgSt">Tätigkeitsstätte</th><th class="w40">Beschreibung</th><th class="w20">Fahrzeit</th></tr></thead>' +
			'<tbody id="TbodyTätigkeitsstätten"></tbody>' +
			"</table></form>",
	);
};
