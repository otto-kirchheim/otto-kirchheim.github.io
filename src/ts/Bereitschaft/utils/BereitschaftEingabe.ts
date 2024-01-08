import { Dayjs } from "dayjs";
import { Duration } from "dayjs/plugin/duration.js";
import isBetween from "dayjs/plugin/isBetween";
import { isHoliday } from "feiertagejs";
import type { IDatenBZ, IMonatsDaten, IVorgabenU } from "../../interfaces";
import { DatenSortieren, Storage, getDurationFromTime } from "../../utilities";
import dayjs from "../../utilities/configDayjs";
dayjs.extend(isBetween);

export default function BereitschaftEingabe(
	bereitschaftsAnfang: Dayjs,
	bereitschaftsEnde: Dayjs,
	nachtAnfang: Dayjs,
	nachtEnde: Dayjs,
	nacht: boolean,
	daten: IMonatsDaten["BZ"],
): IMonatsDaten["BZ"] | false {
	console.time("Generiere Bereitschaft");

	console.groupCollapsed("Vorgaben");
	console.log("nacht: " + nacht);
	console.log("Bereitschafts Anfang: " + bereitschaftsAnfang.toDate());
	console.log("Bereitschafts Ende: " + bereitschaftsEnde.toDate());
	console.log("Nacht Anfang: " + nachtAnfang.toDate());
	console.log("Nacht Ende: " + nachtEnde.toDate());
	console.groupEnd();

	let bereitschaftsAnfangNacht: Dayjs;
	let bereitschaftsAnfangMerker: Dayjs | null;
	let bereitschaftsAnfangA: Dayjs;
	let bereitschaftsEndeMerker: Dayjs | null;
	let bereitschaftsEndeA: Dayjs;
	let bereitschaftsEndeB: Dayjs;
	let arbeitstagHeute: boolean;
	let arbeitstagMorgen: boolean;
	let pause: number | null = null;
	let pauseMerker: Dayjs;
	let pauseMerkerTag: Dayjs;
	let pauseMerkerNacht: Dayjs;

	let changed: boolean = false;

	// Voreinstellungen Übernehmen
	const datenU: IVorgabenU = Storage.get<IVorgabenU>("VorgabenU", { check: true });
	if (!datenU) throw new Error("VorgabenU nicht gefunden");
	// Tagschicht Anfangszeit Mo-Do
	const tagAnfangsZeitMoDo: Duration = getDurationFromTime(datenU.aZ.eT);
	// Tagschicht Anfangszeit Fr
	const tagAnfangsZeitFr: Duration = getDurationFromTime(datenU.aZ.eTF);
	// Tagschicht Endezeit Mo-Fr
	const tagEndeZeitMoFr: Duration = getDurationFromTime(datenU.aZ.bT);
	// Feste Variablen
	const ruheZeit: number = 10;
	const tagPausenVorgabe: number = 30;
	const nachtPausenVorgabe: number = 45;
	const bereitschaftsZeitraumWechsel: Duration = dayjs.duration(8, "hours");
	const arbeitsAnfang: Duration[] = [
		tagEndeZeitMoFr,
		tagEndeZeitMoFr,
		tagEndeZeitMoFr,
		tagEndeZeitMoFr,
		tagEndeZeitMoFr,
		bereitschaftsZeitraumWechsel,
		bereitschaftsZeitraumWechsel,
		tagEndeZeitMoFr,
	];
	const arbeitsEnde: Duration[] = [
		tagAnfangsZeitMoDo,
		tagAnfangsZeitMoDo,
		tagAnfangsZeitMoDo,
		tagAnfangsZeitMoDo,
		tagAnfangsZeitFr,
		bereitschaftsZeitraumWechsel,
		bereitschaftsZeitraumWechsel,
		tagAnfangsZeitMoDo,
	];
	const pausenTag: number[] = [0, tagPausenVorgabe, tagPausenVorgabe, tagPausenVorgabe, tagPausenVorgabe, 0, 0, 0];

	const B2 = (
		bereitschaftsAnfang: dayjs.Dayjs,
		nachtAnfang: dayjs.Dayjs,
		arbeitsAnfang: Duration[],
		arbeitstagHeute: boolean,
		arbeitstagMorgen: boolean,
		nacht: boolean,
	): dayjs.Dayjs => {
		console.group("B2");
		let merker: dayjs.Dayjs | undefined;
		const tagBereitschaftsAnfang = bereitschaftsAnfang.day();
		console.log(`Wochentag Bereitschafts Anfang: ${tagBereitschaftsAnfang} --- ${bereitschaftsAnfang.format("dd")}`);
		// neues Ende 2,
		// am nächsten Tag,
		// Begin normale Schicht bzw. neuer Bereitschaftszyklus
		if (!bereitschaftsAnfang.isSame(nachtAnfang, "d")) {
			if (arbeitstagMorgen === true)
				merker = bereitschaftsAnfang.add(1, "d").startOf("d").add(arbeitsAnfang[tagBereitschaftsAnfang]);
			else merker = bereitschaftsAnfang.add(1, "d").startOf("d").add(bereitschaftsZeitraumWechsel);

			console.log(`Merker B2.1: ${merker.toDate()}`);
		}
		// Wie oben, aber:
		// 2x Ende am gleichen Tag
		// nach Monatswechsel (0 Uhr bzw. Nachtschicht Ende )
		if (
			bereitschaftsAnfang.isSame(nachtAnfang, "d") ||
			nacht === false ||
			(bereitschaftsAnfang.date() === 1 &&
				(bereitschaftsAnfang.isSame(bereitschaftsAnfang.startOf("month")) ||
					(bereitschaftsAnfang.hour() === nachtEnde.hour() && bereitschaftsAnfang.minute() === nachtEnde.minute())))
		) {
			if (arbeitstagHeute === true)
				merker = bereitschaftsAnfang
					.startOf("d")
					.add(arbeitsAnfang[tagBereitschaftsAnfang === 0 ? 6 : tagBereitschaftsAnfang - 1]);
			else merker = bereitschaftsAnfang.startOf("d").add(bereitschaftsZeitraumWechsel);

			console.log(`Merker B2.2: ${merker.toDate()}`);
		}

		if (
			bereitschaftsAnfang.date() === 1 &&
			(bereitschaftsAnfang.isSame(bereitschaftsAnfang.startOf("month")) ||
				(bereitschaftsAnfang.hour() === nachtEnde.hour() && bereitschaftsAnfang.minute() === nachtEnde.minute()))
		) {
			debugger;
			if (arbeitstagHeute === true)
				merker = bereitschaftsAnfang
					.startOf("d")
					.add(arbeitsAnfang[tagBereitschaftsAnfang === 0 ? 6 : tagBereitschaftsAnfang - 1]);
			else merker = bereitschaftsAnfang.startOf("d").add(bereitschaftsZeitraumWechsel);
			console.log(`Merker B2.3: ${merker.toDate()}`);
		}

		// Wie oben, aber:
		// wenn merker kleiner/gleich Bereitschafts Anfang -> am nächsten Tag
		if (merker?.isSameOrBefore(bereitschaftsAnfang)) {
			if (arbeitstagMorgen === true)
				merker = bereitschaftsAnfang.add(1, "d").startOf("d").add(arbeitsAnfang[tagBereitschaftsAnfang]);
			else merker = bereitschaftsAnfang.add(1, "d").startOf("d").add(bereitschaftsZeitraumWechsel);

			console.log(`Merker B2.4: ${merker.toDate()}`);
		}
		console.groupEnd();
		return merker as dayjs.Dayjs;
	};

	const Arbeitstag = (datum: dayjs.Dayjs, zusatz = 0): boolean => {
		const adjustedDatum = datum.add(zusatz, "d");
		const isWeekend = adjustedDatum.isoWeekday() > 5;
		const isHolidayHE = isHoliday(adjustedDatum.toDate(), "HE");

		return !(isHolidayHE || isWeekend);
	};

	// Berechne ob Tag ein Arbeitstag ist
	arbeitstagHeute = Arbeitstag(bereitschaftsAnfang);
	console.log(`Arbeitstag Heute: ${arbeitstagHeute} --- ${bereitschaftsAnfang.format("dd")}`);
	arbeitstagMorgen = Arbeitstag(bereitschaftsAnfang, 1);
	console.log(`Arbeitstag Morgen: ${arbeitstagMorgen} --- ${bereitschaftsAnfang.add(1, "d").format("dd")}`);

	// Sonstige Variablen Vorbereiten
	bereitschaftsEndeMerker = bereitschaftsAnfang.clone();

	const datenVorher: number = daten.length;
	debugger;
	/// --- Beginn Berechnung --- ///
	while (daten.length < 26 && bereitschaftsAnfang.isBefore(bereitschaftsEnde)) {
		/// #Berechnung Bereitschaftsende# ///
		console.groupCollapsed("Bereitschafts Ende");
		// neues Ende Arbeitszeit
		bereitschaftsEndeA = B2(bereitschaftsAnfang, nachtAnfang, arbeitsAnfang, arbeitstagHeute, arbeitstagMorgen, nacht);
		console.log(`Bereitschafts Ende A: ${bereitschaftsEndeA.toDate()}`);

		// neues Ende Bereitschaftszyklus
		bereitschaftsEndeB = bereitschaftsAnfang.add(1, "d").hour(8).minute(0);
		console.log(`Bereitschafts Ende B: ${bereitschaftsEndeB.toDate()}`);

		console.groupEnd();

		// überprüfe welches Bereitschaftsende Zutrifft
		bereitschaftsEndeMerker = dayjs.min(bereitschaftsEndeA, bereitschaftsEndeB, nachtAnfang, bereitschaftsEnde);
		if (!bereitschaftsEndeMerker) throw new Error("Fehler bei Berechnung: bereitschaftsEndeMerker");
		console.log(`Bereitschafts Ende Merker: ${bereitschaftsEndeMerker.toDate()}`);

		/// #Berechnung Bereitschaftsanfang# ///
		console.groupCollapsed("Bereitschafts Anfang");

		// neuer Bereitschaftsanfang Nacht
		bereitschaftsAnfangNacht = nachtAnfang.add(1, "d").hour(nachtEnde.hour()).minute(nachtEnde.minute());
		console.log(`Bereitschafts Anfang Nacht: ${bereitschaftsAnfangNacht.toDate()}`);

		// neues Ende 2, Arbeitszeit
		bereitschaftsAnfangA = B2(bereitschaftsAnfang, nachtAnfang, arbeitsEnde, arbeitstagHeute, arbeitstagMorgen, nacht);
		console.log(`Bereitschafts Anfang A: ${bereitschaftsAnfangA.toDate()}`);

		console.groupEnd();

		bereitschaftsAnfangMerker = bereitschaftsAnfang.isSame(bereitschaftsEndeMerker, "d")
			? dayjs.min(bereitschaftsAnfangNacht, bereitschaftsAnfangA, bereitschaftsEndeB)
			: dayjs.min(dayjs.max(bereitschaftsAnfangA, bereitschaftsEndeB) ?? bereitschaftsEnde, bereitschaftsAnfangNacht);
		if (!bereitschaftsAnfangMerker) throw new Error("Fehler bei Berechnung bereitschaftsAnfangMerker");
		console.log(`Bereitschafts Anfang Merker: ${bereitschaftsAnfangMerker.toDate()}`);

		/// #Berechnung Pause# ///
		console.groupCollapsed("Berechnung Pause");

		// Pause Tagschicht, Falls keine Pause oder nach Nachtschicht, dann ""
		pauseMerker = bereitschaftsAnfang.startOf("d").add(tagAnfangsZeitMoDo);
		if (pause === nachtPausenVorgabe) {
			pause = 0;
		} else {
			pause = bereitschaftsAnfang.isSame(pauseMerker) ? pausenTag[bereitschaftsAnfang.day()] : 0;
		}

		// Pause Nachtschicht, normal und bei Ruhe nach Nacht
		pauseMerkerNacht = bereitschaftsAnfang.hour(nachtEnde.hour()).minute(nachtEnde.minute());
		pauseMerkerTag = pauseMerker.hour(nachtEnde.hour()).add(ruheZeit, "h").minute(nachtEnde.minute());
		if (bereitschaftsAnfang.isSame(pauseMerkerNacht) || bereitschaftsAnfang.isSame(pauseMerkerTag))
			pause = nachtPausenVorgabe;

		console.groupEnd();
		console.log(`Pausen Zeit: ${pause}`);

		console.log(
			`Eingabe Tabelle: ${bereitschaftsAnfang.format("L, LT")} --- ${bereitschaftsEndeMerker.format(
				"L, LT",
			)} --- ${pause}`,
		);

		/// #Prüfen ob Daten bereits vorhanden# ///
		const newDaten: IDatenBZ = {
			beginB: bereitschaftsAnfang.toISOString(),
			endeB: bereitschaftsEndeMerker.toISOString(),
			pauseB: pause,
		};

		let change: boolean = false;
		[change, daten] = vorhandenCheck(daten, newDaten);
		if (!changed && change) changed = change;

		console.group("Übernehme Daten neuer Tag");

		/// #Übernehme Daten für nächsten Tag# ///
		// neuen Bereitschaftsanfang übernehmen
		bereitschaftsAnfang = bereitschaftsAnfangMerker.clone();
		console.log("Bereitschafts Anfang: " + bereitschaftsAnfang.toDate());

		// neuen Nachtschichtanfang setzten, Wenn kleiner als Bereitschaftsanfang
		if (bereitschaftsAnfang.isAfter(nachtAnfang)) nachtAnfang = nachtAnfang.add(1, "d");
		console.log(`Nacht Anfang: ${nachtAnfang.toDate()}`);
		if (nachtAnfang.isAfter(nachtEnde) && !nachtAnfang.isSame(bereitschaftsEnde)) {
			nachtAnfang = bereitschaftsEnde.clone();
			nacht = false;
		}
		console.log(`Nacht: ${nacht}`);

		// Berechne ob Tag ein Arbeitstag ist
		arbeitstagHeute = Arbeitstag(bereitschaftsAnfang);
		console.log(`Arbeitstag Heute: ${arbeitstagHeute} --- ${bereitschaftsAnfang.format("dd")}`);
		arbeitstagMorgen = Arbeitstag(bereitschaftsAnfang, 1);
		console.log(`Arbeitstag Morgen: ${arbeitstagMorgen} --- ${bereitschaftsAnfang.add(1, "d").format("dd")}`);
		console.groupEnd();

		if (!nacht) continue;
		if (!bereitschaftsAnfang.isSame(nachtAnfang, "d")) continue;
		if (bereitschaftsAnfang.isSame(nachtAnfang, "d") && bereitschaftsAnfang.isSame(bereitschaftsAnfangA)) continue;
		/// #Berechnung ob Ruhe nach Nacht am Sonntag & Feiertage# ///
		console.group("Prüfen ob Ruhe nach Nacht:");

		// neues Ende Arbeitszeit
		bereitschaftsEndeA = B2(bereitschaftsAnfang, nachtAnfang, arbeitsAnfang, arbeitstagHeute, arbeitstagMorgen, nacht);
		console.log(`Bereitschafts Ende A: ${bereitschaftsEndeA.toDate()}`);

		// neues Ende Bereitschaftszyklus
		bereitschaftsEndeB = bereitschaftsAnfang.add(1, "d").startOf("d").add(bereitschaftsZeitraumWechsel);
		console.log(`Bereitschafts Ende B: ${bereitschaftsEndeB.toDate()}`);

		// überprüfe welches Bereitschaftsende Zutrifft
		bereitschaftsEndeMerker = dayjs.min(bereitschaftsEndeA, bereitschaftsEndeB, nachtAnfang, bereitschaftsEnde);
		if (!bereitschaftsEndeMerker) throw new Error("Fehler bei Berechnung bereitschaftsEndeMerker");
		console.log(`Bereitschafts Ende Merker: ${bereitschaftsEndeMerker.toDate()}`);

		// überprüfe ob Ruhe nach Nacht nötig ist
		if (
			bereitschaftsAnfang.isSame(nachtAnfang, "d") &&
			bereitschaftsAnfangNacht.isBefore(nachtAnfang.subtract(10, "h")) &&
			bereitschaftsEndeMerker.isAfter(bereitschaftsAnfangNacht.add(1, "h"))
		) {
			bereitschaftsAnfangNacht = bereitschaftsAnfangNacht.add(ruheZeit, "h");
			console.log(`Bereitschafts Anfang Nacht: ${bereitschaftsAnfangNacht.toDate()}`);
			const bereitschaftsAnfangMerker = dayjs.max(
				dayjs.min(bereitschaftsAnfangA, bereitschaftsEndeB) ?? bereitschaftsEnde,
				bereitschaftsAnfangNacht,
			);
			if (!bereitschaftsAnfangMerker) throw new Error("Fehler bei Berechnung bereitschaftsAnfang");
			bereitschaftsAnfang = bereitschaftsAnfangMerker;
			console.log(`Bereitschafts Anfang: ${bereitschaftsAnfang.toDate()}`);
			arbeitstagHeute = Arbeitstag(bereitschaftsAnfang);
			console.log(`Arbeitstag Heute: ${arbeitstagHeute} --- ${bereitschaftsAnfang.format("dd")}`);
			arbeitstagMorgen = Arbeitstag(bereitschaftsAnfang, 1);
			console.log(`Arbeitstag Morgen: ${arbeitstagMorgen} --- ${bereitschaftsAnfang.add(1, "d").format("dd")}`);
		}
		console.groupEnd();
	}
	DatenSortieren(daten, "beginB");

	console.timeEnd("Generiere Bereitschaft");

	if (datenVorher == daten.length && !changed) {
		console.log("Keine änderung, Bereitschaft bereits vorhanden");

		return false;
	}

	return daten;
}

function vorhandenCheck(daten: IDatenBZ[], newDaten: IDatenBZ, depth: number = 1): [boolean, IDatenBZ[]] {
	const MAX_DEPTH = 3;
	if (depth > MAX_DEPTH) throw new Error("Fehler bei vorhandenCheck - Recurse Funktion");

	const B_WECHSEL_STUNDE = 8;
	const B_WECHSEL_MINUTE = 0;

	const updatedDaten: IDatenBZ[] = [...daten];
	const newBegin: Dayjs = dayjs(newDaten.beginB);
	const newEnd: Dayjs = dayjs(newDaten.endeB);

	const Tag1Neu: number = newBegin.date();
	const Tag2Neu: number = newEnd.date();

	const filteredDaten: IDatenBZ[] = daten.filter(value => {
		const TagBeginB: number = dayjs(value.beginB).date();
		const TagEndeB: number = dayjs(value.endeB).date();
		return TagBeginB === Tag1Neu || TagBeginB === Tag2Neu || TagEndeB === Tag1Neu || TagEndeB === Tag2Neu;
	});

	for (const row of filteredDaten) {
		const rowBegin = dayjs(row.beginB);
		const rowEnd = dayjs(row.endeB);

		if (newBegin.isBetween(rowBegin, rowEnd, null, "[]") && newEnd.isBetween(rowBegin, rowEnd, null, "[]")) {
			console.log("Bereitschaftszeitraum bereits in einem anderen Zeitraum vorhanden");
			return [false, daten];
		}

		if (rowBegin.isBetween(newBegin, newEnd, null, "()") && rowEnd.isBetween(newBegin, newEnd, null, "()")) {
			console.log("Bereitschaftszeitraum überschneidet andern Zeitraum komplett");
			row.beginB = newBegin.toISOString();
			row.endeB = newEnd.toISOString();
			return [true, daten];
		}

		const endeBDate: Dayjs = rowEnd.set("hour", B_WECHSEL_STUNDE).set("minute", B_WECHSEL_MINUTE);
		if (newBegin.isBetween(rowBegin, rowEnd, null, "[)") && !rowEnd.isSame(endeBDate) && newEnd.isAfter(row.endeB)) {
			if (newEnd.isAfter(endeBDate)) {
				row.endeB = endeBDate.toISOString();

				const neuerZeitraum: IDatenBZ = {
					beginB: endeBDate.toISOString(),
					endeB: newDaten.endeB,
					pauseB: 0,
				};
				console.log("Überschneidung Bereitschaftszeitraum neues Ende nach vorhandenem und Bereitschaftszeitraumwechsel");
				return vorhandenCheck(daten, neuerZeitraum, depth + 1);
			} else {
				row.endeB = newDaten.endeB;
				console.log("Überschneidung Bereitschaftszeitraum neues Ende nach vorhandenem");
				return [true, daten];
			}
		}

		const beginBDate: Dayjs = rowBegin.set("hour", B_WECHSEL_STUNDE).set("minute", B_WECHSEL_MINUTE);
		if (newEnd.isBetween(rowBegin, rowEnd, null, "(]") && !rowBegin.isSame(beginBDate) && newBegin.isBefore(row.beginB)) {
			if (newBegin.isBefore(beginBDate)) {
				row.beginB = beginBDate.toISOString();

				const neuerZeitraum: IDatenBZ = {
					beginB: newDaten.beginB,
					endeB: beginBDate.toISOString(),
					pauseB: 0,
				};
				console.log("Überschneidung Bereitschaftszeitraum neuer Begin vor vorhandenem und Bereitschaftszeitraumwechsel");

				return vorhandenCheck(daten, neuerZeitraum, depth + 1);
			} else {
				row.beginB = newDaten.beginB;
				console.log("Überschneidung Bereitschaftszeitraum neuer Begin vor vorhandenem");
				return [true, daten];
			}
		}
	}
	updatedDaten.push(newDaten);
	return [true, updatedDaten];
}
