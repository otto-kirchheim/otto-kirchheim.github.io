import { Dayjs } from "dayjs";
import { Duration } from "dayjs/plugin/duration.js";
import { isHoliday } from "feiertagejs";
import type { IDatenBZ, IMonatsDaten, IVorgabenU } from "../../interfaces";
import { DatenSortieren, Storage, getDurationFromTime } from "../../utilities";
import dayjs from "../../utilities/configDayjs";

type Schicht = {
	beginn: Dayjs;
	ende: Dayjs;
	pause: number;
};

export default function BerZeitenBerechnen(
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

	let changed: boolean = false;

	// Voreinstellungen Übernehmen
	const datenU: IVorgabenU = Storage.get<IVorgabenU>("VorgabenU", { check: true });
	if (!datenU) throw new Error("VorgabenU nicht gefunden");

	const datenVorher: number = daten.length;

	// Feste Variablen
	const ruheZeit: number = 10;
	const tagPausenVorgabe: number = 30;
	const nachtPausenVorgabe: number = 45;
	const bereitschaftsZeitraumWechsel: Duration = dayjs.duration(8, "hours");

	const Arbeitstag = (datum: dayjs.Dayjs, zusatz = 0): boolean => {
		const adjustedDatum = datum.add(zusatz, "d");
		const isWeekend = adjustedDatum.isoWeekday() > 5;
		const isHolidayHE = isHoliday(adjustedDatum.toDate(), "HE");

		return !(isHolidayHE || isWeekend);
	};

	const getNachtSchichten = (anfang: Dayjs, ende: Dayjs, pausenVorgabe: number): Schicht[] => {
		const schichten: Schicht[] = [];
		const nachtAnfangsZeit: Duration = dayjs.duration({
			hours: anfang.hour(),
			minutes: anfang.minute(),
		});
		const nachtEndeZeit: Duration = dayjs.duration({
			days: ende.hour() < anfang.hour() ? 1 : undefined,
			hours: ende.hour(),
			minutes: ende.minute(),
		});

		let tagAnfang: Dayjs = anfang.startOf("day");

		while (tagAnfang.isBefore(ende, "day")) {
			schichten.push({
				beginn: tagAnfang.add(nachtAnfangsZeit),
				ende: tagAnfang.add(nachtEndeZeit),
				pause: pausenVorgabe,
			});
			tagAnfang = tagAnfang.add(1, "day");
		}

		return schichten;
	};

	const getTagSchichten = (anfang: Dayjs, ende: Dayjs, pausenVorgabe: number): Schicht[] => {
		const maxEnde: Dayjs = anfang.add(1, "month").startOf("month");

		const TagEndeZeitMoDo: Duration = getDurationFromTime(datenU.aZ.eT);
		const TagEndeZeitFr: Duration = getDurationFromTime(datenU.aZ.eTF);

		const tagAnfangZeit: Duration = getDurationFromTime(datenU.aZ.bT);
		const TagEndeZeit = (tagAnfang: Dayjs): Duration => {
			if (tagAnfang.isoWeekday() < 5) return TagEndeZeitMoDo;
			if (tagAnfang.isoWeekday() === 5) return TagEndeZeitFr;
			return bereitschaftsZeitraumWechsel;
		};

		const getPause = (anfang: Dayjs): number => {
			if (nacht && anfang.isBetween(nachtAnfang, nachtEnde)) return 0;
			if (anfang.isoWeekday() < 5) return pausenVorgabe;
			return 0;
		};

		let tagAnfang: Dayjs = anfang.startOf("day");

		const schichten: Schicht[] = [];

		while (tagAnfang.isSameOrBefore(ende, "day") && tagAnfang.isBefore(maxEnde)) {
			schichten.push(
				Arbeitstag(tagAnfang)
					? {
							beginn: tagAnfang.add(tagAnfangZeit),
							ende: tagAnfang.add(TagEndeZeit(tagAnfang)),
							pause: getPause(tagAnfang.add(tagAnfangZeit)),
						}
					: {
							beginn: tagAnfang.add(bereitschaftsZeitraumWechsel),
							ende: tagAnfang.add(bereitschaftsZeitraumWechsel),
							pause: 0,
						},
			);
			tagAnfang = tagAnfang.add(1, "day");
		}

		return schichten;
	};

	const nachtSchichten: Schicht[] = nacht ? getNachtSchichten(nachtAnfang, nachtEnde, nachtPausenVorgabe) : [];
	const tagSchichten: Schicht[] = getTagSchichten(bereitschaftsAnfang, bereitschaftsEnde, tagPausenVorgabe);

	const kombinierteSchichten: Schicht[] = [...tagSchichten, ...nachtSchichten];
	DatenSortieren<Schicht>(kombinierteSchichten, "beginn");

	// Prüfen ob bereitschaftsAnfang vor der 1. Schicht ist
	if (bereitschaftsAnfang.isBefore(kombinierteSchichten[0].beginn))
		kombinierteSchichten.unshift({
			beginn: bereitschaftsAnfang,
			ende: bereitschaftsAnfang,
			pause: 0,
		});
	// Prüfen ob bereitschaftsAnfang zwischen Schicht 1 und 2 ist
	else if (
		kombinierteSchichten.length > 2 &&
		bereitschaftsAnfang.isBetween(kombinierteSchichten[0].ende, kombinierteSchichten[1].beginn, null, "()")
	)
		kombinierteSchichten.splice(0, 1, {
			beginn: bereitschaftsAnfang,
			ende: bereitschaftsAnfang,
			pause: 0,
		});

	// Prüfen ob bereitschaftsEnde nach der letzten Schicht ist
	if (bereitschaftsEnde.isAfter(kombinierteSchichten[kombinierteSchichten.length - 1].ende))
		kombinierteSchichten.push({
			beginn: bereitschaftsEnde,
			ende: bereitschaftsEnde,
			pause: 0,
		});
	// Prüfen ob bereitschaftsEnde zwischen den letzten Schichten ist
	else if (
		kombinierteSchichten.length > 2 &&
		bereitschaftsEnde.isBetween(
			kombinierteSchichten[kombinierteSchichten.length - 2].ende,
			kombinierteSchichten[kombinierteSchichten.length - 1].beginn,
			null,
			"()",
		)
	)
		kombinierteSchichten.splice(-1, 1, {
			beginn: bereitschaftsEnde,
			ende: bereitschaftsEnde,
			pause: 0,
		});

	for (let i = 0; i < kombinierteSchichten.length - 1; i++) {
		const aktuelleSchicht = kombinierteSchichten[i];
		const nächsteSchicht = kombinierteSchichten[i + 1];

		let change: boolean = false;

		//Prüfen auf ruheZeit
		if (
			nacht &&
			nachtEnde &&
			aktuelleSchicht.ende.hour() === nachtEnde.hour() &&
			aktuelleSchicht.ende.minute() === nachtEnde.minute() &&
			(
				(nächsteSchicht.beginn.hour() === 8 ? kombinierteSchichten[i + 2]?.beginn : nächsteSchicht.beginn) ??
				nächsteSchicht.beginn
			).diff(aktuelleSchicht.ende, "hour") > 1
		) {
			kombinierteSchichten[i + 1].beginn = kombinierteSchichten[i + 1].ende = aktuelleSchicht.ende.add(ruheZeit, "hour");
			kombinierteSchichten[i + 1].pause = aktuelleSchicht.pause;
			continue;
		}

		[change, daten] = vorhandenCheck(daten, {
			beginB: aktuelleSchicht.ende.toISOString(),
			endeB: nächsteSchicht.beginn.toISOString(),
			pauseB: aktuelleSchicht.pause,
		});
		if (!changed && change) changed = change;
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

		// Prüfen, ob der neue Zeitraum bereits in einem anderen Zeitraum vorhanden ist
		if (newBegin.isBetween(rowBegin, rowEnd, null, "[]") && newEnd.isBetween(rowBegin, rowEnd, null, "[]")) {
			console.log("Bereitschaftszeitraum bereits in einem anderen Zeitraum vorhanden");
			return [false, daten];
		}

		// Prüfen, ob der neue Zeitraum einen vorhandenen Zeitraum vollständig überschneidet
		if (rowBegin.isBetween(newBegin, newEnd, null, "()") && rowEnd.isBetween(newBegin, newEnd, null, "()")) {
			console.log("Bereitschaftszeitraum überschneidet andern Zeitraum komplett");
			row.beginB = newBegin.toISOString();
			row.endeB = newEnd.toISOString();
			return [true, daten];
		}

		const endeBDate: Dayjs = rowEnd.set("hour", B_WECHSEL_STUNDE).set("minute", B_WECHSEL_MINUTE);
		if (newBegin.isBetween(rowBegin, rowEnd, null, "[)") && !rowEnd.isSame(endeBDate) && newEnd.isAfter(row.endeB)) {
			// Überlappung, wobei das neue Ende nach dem vorhandenen Ende und dem Bereitschaftszeitraumwechsel liegt
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
			// Überlappung, wobei der neue Beginn vor dem vorhandenen Beginn und dem Bereitschaftszeitraumwechsel liegt
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
	// Wenn keine Überlappung gefunden wurde, fügen Sie den neuen Zeitraum hinzu
	updatedDaten.push(newDaten);
	return [true, updatedDaten];
}
