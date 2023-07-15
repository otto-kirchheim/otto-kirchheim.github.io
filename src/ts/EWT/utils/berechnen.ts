import { Duration } from "dayjs/plugin/duration";
import type { IDaten, IDatenEWT, IVorgabenE, IVorgabenU } from "../../interfaces";
import dayjs from "../../utilities/configDayjs";
import { getDurationFromTime } from "../../utilities";

export default function berechnen(
	vorgabenU: IVorgabenU,
	daten: IDaten["EWT"],
	jahr: number,
	monat: number,
): IDaten["EWT"] {
	const { getPascalEnde, initializeVorgabenE, calculateTimes, getSchichtDaten } = createHelpers(vorgabenU);

	const vorgabenE = initializeVorgabenE();

	const eOrte = Object.keys(vorgabenE.fZ);

	for (const Tag of daten) {
		if (!Tag.berechnen) continue;
		const datum = dayjs([jahr, monat - 1, Number(Tag.tagE)]);
		const schichtDaten = getSchichtDaten(Tag.schichtE as "T" | "N" | "BN" | "S", datum, vorgabenE);

		Object.assign(Tag, calculateTimes(Tag, datum, schichtDaten, eOrte, vorgabenE, getPascalEnde()));
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
		Tag: IDatenEWT,
		datum: dayjs.Dayjs,
		schichtDaten: ReturnType<typeof getSchichtDaten>,
		eOrte: string[],
		vorgabenE: IVorgabenE,
		endePascal: Duration,
	) => {
		const jahr = datum.year(),
			monat = datum.month(),
			eOrt = eOrte.includes(Tag.eOrtE);

		const convertToDayjs = (value: string, addTag: boolean, Tag: IDatenEWT): dayjs.Dayjs => {
			const zeit = value.split(":");
			let tag = Number(Tag.tagE);
			if (addTag && ["BN", "N"].includes(Tag.schichtE)) {
				tag -= 1;
			}
			return dayjs([jahr, monat - 1, tag, +zeit[0], +zeit[1], 0, 0]);
		};

		const beginE_d = Tag.beginE.length === 5 ? convertToDayjs(Tag.beginE, !1, Tag) : datum.add(schichtDaten.beginn);
		const beginE = beginE_d.format("LT");
		const endeE_d = Tag.endeE.length === 5 ? convertToDayjs(Tag.endeE, !0, Tag) : datum.add(schichtDaten.ende);
		const endeE = endeE_d.format("LT");

		const abWE = Tag.abWE.length === 5 ? Tag.abWE : beginE_d.subtract(vorgabenE.rZ).format("LT");
		const ab1E_d = Tag.ab1E.length === 5 ? convertToDayjs(Tag.ab1E, !1, Tag) : beginE_d.add(schichtDaten.svzA);
		const ab1E = ab1E_d.format("LT");

		const an1E_d = Tag.an1E.length === 5 ? convertToDayjs(Tag.an1E, !0, Tag) : endeE_d.subtract(schichtDaten.svzE);
		const an1E = an1E_d.format("LT");
		const anWE = Tag.anWE.length === 5 ? Tag.anWE : endeE_d.add(vorgabenE.rZ).add(endePascal).format("LT");

		const anEE = !(eOrt && Tag.anEE === "") ? Tag.anEE : ab1E_d.add(vorgabenE.fZ[Tag.eOrtE]).format("LT");
		const abEE = !(eOrt && Tag.abEE === "") ? Tag.abEE : an1E_d.subtract(vorgabenE.fZ[Tag.eOrtE]).format("LT");

		return { beginE, endeE, abWE, ab1E, an1E, anWE, anEE, abEE };
	};

	return { getPascalEnde, initializeVorgabenE, calculateTimes, getSchichtDaten };
}
