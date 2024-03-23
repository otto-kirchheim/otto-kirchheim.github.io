import { Duration } from "dayjs/plugin/duration";
import type { IDatenEWT, IVorgabenE, IVorgabenU } from "../../interfaces";
import { getDurationFromTime } from "../../utilities";
import dayjs from "../../utilities/configDayjs";

export default function berechnen(vorgabenU: IVorgabenU, daten: IDatenEWT[], jahr: number, monat: number): IDatenEWT[] {
	const { getPascalEnde, initializeVorgabenE, calculateTimes, getSchichtDaten } = createHelpers(vorgabenU);

	const vorgabenE = initializeVorgabenE();

	const eOrte = Object.keys(vorgabenE.fZ);

	for (const TagDaten of daten) {
		if (!TagDaten.berechnen) continue;
		const datum = dayjs([jahr, monat - 1, Number(TagDaten.tagE)]);
		const schichtDaten = getSchichtDaten(TagDaten.schichtE as "T" | "N" | "BN" | "S", datum, vorgabenE);

		Object.assign(
			TagDaten,
			calculateTimes(TagDaten, datum, schichtDaten, eOrte.includes(TagDaten.eOrtE), vorgabenE, getPascalEnde()),
		);
	}

	return daten;
}

function createHelpers(userSettings: IVorgabenU) {
	const getPascalEnde = (): Duration =>
		userSettings.pers.Vorname === "Ackermann" && userSettings.pers.Nachname === "Pascal"
			? dayjs.duration(5, "m")
			: dayjs.duration(0, "m");

	const getSchichtDaten = (schicht: string, datum: dayjs.Dayjs, vorgabenE: IVorgabenE) => {
		type SchichtKeys = "T" | "N" | "BN" | "S";
		const schichten: Record<SchichtKeys, { beginn: Duration; ende: Duration; svzA: Duration; svzE: Duration }> = {
			T: {
				beginn: vorgabenE.bT,
				ende: datum.isoWeekday() === 5 ? vorgabenE.eTF : vorgabenE.eT,
				svzA: dayjs.duration(20, "m"),
				svzE: dayjs.duration(20, "m"),
			},
			N: {
				beginn: vorgabenE.bN,
				ende: vorgabenE.eN.add(1, "d"),
				svzA: dayjs.duration(45, "m"),
				svzE: dayjs.duration(45, "m"),
			},
			BN: {
				beginn: vorgabenE.bBN,
				ende: vorgabenE.eN.add(1, "d"),
				svzA: dayjs.duration(60, "m"),
				svzE: dayjs.duration(45, "m"),
			},
			S: {
				beginn: vorgabenE.bS,
				ende: vorgabenE.eS,
				svzA: dayjs.duration(20, "m"),
				svzE: dayjs.duration(20, "m"),
			},
		};

		if (!(schicht in schichten)) throw new Error("Schicht unbekannt");
		return schichten[schicht as SchichtKeys];
	};

	const initializeVorgabenE = () => {
		const vorgabenE = { fZ: {} } as IVorgabenE;

		Object.entries(userSettings.aZ).forEach(([key, value]) => {
			vorgabenE[key] = getDurationFromTime(value);
		});

		userSettings.fZ.forEach(place => {
			vorgabenE.fZ[place.key] = getDurationFromTime(place.value);
		});

		return vorgabenE;
	};

	const calculateTimes = (
		TagDaten: IDatenEWT,
		datum: dayjs.Dayjs,
		schichtDaten: ReturnType<typeof getSchichtDaten>,
		eOrt: boolean,
		vorgabenE: IVorgabenE,
		endePascal: Duration,
	) => {
		const jahr: number = datum.year(),
			monat: number = datum.month();

		const convertToDayjs = (value: string, addTag: boolean, Tag: IDatenEWT): dayjs.Dayjs => {
			const zeit = value.split(":");
			let tag = Number(Tag.tagE);
			if (addTag && ["BN", "N"].includes(Tag.schichtE)) tag -= 1;
			return dayjs([jahr, monat - 1, tag, +zeit[0], +zeit[1], 0, 0]);
		};

		const beginE_dayjs =
			TagDaten.beginE.length === 5 ? convertToDayjs(TagDaten.beginE, false, TagDaten) : datum.add(schichtDaten.beginn);
		const beginE = beginE_dayjs.format("LT");
		const endeE_dayjs =
			TagDaten.endeE.length === 5 ? convertToDayjs(TagDaten.endeE, true, TagDaten) : datum.add(schichtDaten.ende);
		const endeE = endeE_dayjs.format("LT");

		const abWE = TagDaten.abWE.length === 5 ? TagDaten.abWE : beginE_dayjs.subtract(vorgabenE.rZ).format("LT");
		const ab1E_dayjs =
			TagDaten.ab1E.length === 5 ? convertToDayjs(TagDaten.ab1E, false, TagDaten) : beginE_dayjs.add(schichtDaten.svzA);
		const ab1E = ab1E_dayjs.format("LT");

		const an1E_dayjs =
			TagDaten.an1E.length === 5 ? convertToDayjs(TagDaten.an1E, true, TagDaten) : endeE_dayjs.subtract(schichtDaten.svzE);
		const an1E = an1E_dayjs.format("LT");
		const anWE = TagDaten.anWE.length === 5 ? TagDaten.anWE : endeE_dayjs.add(vorgabenE.rZ).add(endePascal).format("LT");

		const anEE = !(eOrt && TagDaten.anEE === "")
			? TagDaten.anEE
			: ab1E_dayjs.add(vorgabenE.fZ[TagDaten.eOrtE]).format("LT");
		const abEE = !(eOrt && TagDaten.abEE === "")
			? TagDaten.abEE
			: an1E_dayjs.subtract(vorgabenE.fZ[TagDaten.eOrtE]).format("LT");

		return { beginE, endeE, abWE, ab1E, an1E, anWE, anEE, abEE };
	};

	return { getPascalEnde, initializeVorgabenE, calculateTimes, getSchichtDaten };
}
