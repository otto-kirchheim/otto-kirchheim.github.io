import { generateTableBerechnung } from ".";
import {
	IDaten,
	IDatenBE,
	IDatenBEJahr,
	IDatenBZ,
	IDatenBZJahr,
	IDatenEWT,
	IDatenEWTJahr,
	IDatenN,
	IDatenNJahr,
	IVorgabenBerechnung,
	IVorgabenBerechnungMonat,
} from "../interfaces";
import { Storage } from "../utilities";
import dayjs from "../utilities/configDayjs";

export default function aktualisiereBerechnung(Jahr?: number, daten?: Required<IDaten>): IVorgabenBerechnung {
	Jahr = Jahr ?? Storage.get<number>("Jahr", { check: true });
	daten = daten ?? {
		BZ: Storage.get<IDatenBZJahr>("dataBZ", { default: {} as IDatenBZJahr }),
		BE: Storage.get<IDatenBEJahr>("dataBE", { default: {} as IDatenBEJahr }),
		EWT: Storage.get<IDatenEWTJahr>("dataE", { default: {} as IDatenEWTJahr }),
		N: Storage.get<IDatenNJahr>("dataN", { default: {} as IDatenNJahr }),
	};
	if (!daten) throw new Error("Keine Daten gefunden");

	const Berechnung: IVorgabenBerechnung = Storage.get<IVorgabenBerechnung>("datenBerechnung", {
		check: true,
		default: {} as IVorgabenBerechnung,
	});

	if (!("BZ" in daten && "BE" in daten && "EWT" in daten && "N" in daten))
		throw new Error("Daten entsprechen nicht dem Interface IDaten");
	const { BZ, BE, EWT, N } = daten;

	for (let Monat = 1; Monat <= 12; Monat++) {
		const [BZMonat, BEMonat, EWTMonat, NMonat] = [BZ[Monat], BE[Monat], EWT[Monat], N[Monat]];
		Berechnung[Monat as keyof IVorgabenBerechnung] = aktualisiereBerechnungMonat(
			BZMonat,
			BEMonat,
			EWTMonat,
			NMonat,
			Monat,
			Jahr,
		);
	}

	Storage.set<IVorgabenBerechnung>("datenBerechnung", Berechnung);
	generateTableBerechnung(Berechnung);

	return Berechnung;

	function aktualisiereBerechnungMonat(
		BZMonat: IDatenBZ[],
		BEMonat: IDatenBE[],
		EWTMonat: IDatenEWT[],
		NMonat: IDatenN[],
		monat: number,
		jahr: number,
	): IVorgabenBerechnungMonat {
		const Berechnung: IVorgabenBerechnungMonat = {
			B: { B: 0, L1: 0, L2: 0, L3: 0, K: 0 },
			E: { A8: 0, A14: 0, A24: 0, S8: 0, S14: 0 },
			N: { F: 0 },
		};

		BZMonat.forEach(value => {
			Berechnung.B.B += dayjs(value.endeB).diff(dayjs(value.beginB), "minute") + value.pauseB;
		});

		BEMonat.forEach(value => {
			const von = dayjs(`${value.tagBE} ${value.beginBE}`, "DD.MM.YYYY HH:mm");
			let bis = dayjs(`${value.tagBE} ${value.endeBE}`, "DD.MM.YYYY HH:mm");
			if (bis.isBefore(von)) bis = bis.add(1, "day");
			Berechnung.B.B -= bis.diff(von, "minute");

			const LREValue = value.lreBE;

			if (LREValue === "LRE 1") Berechnung.B.L1++;
			else if (LREValue === "LRE 2") Berechnung.B.L2++;
			else if (LREValue === "LRE 3") Berechnung.B.L3++;

			if (value.privatkmBE) Berechnung.B.K += value.privatkmBE;
		});

		const isInRange = (value: number, min: number, max = Infinity): boolean => value >= min && value < max;

		EWTMonat.forEach(value => {
			const Monat = `0${monat}`.slice(-2);
			const tagBuchung = `0${value.tagE}`.slice(-2);
			const tagAnfang = ["BN", "N"].includes(value.schichtE) ? `0${Number(value.tagE) - 1}`.slice(-2) : tagBuchung;

			if ("abWE" in value && "anWE" in value) {
				const von = dayjs(`${jahr}-${Monat}-${tagAnfang}T${value.abWE}`);
				const bis = dayjs(`${jahr}-${Monat}-${tagBuchung}T${value.anWE}`);

				const abWohnung = bis.diff(von, "hour", true);

				if (isInRange(abWohnung, 8, 14)) Berechnung.E.A8++;
				else if (isInRange(abWohnung, 14, 24)) Berechnung.E.A14++;
				else Berechnung.E.A24++;
			}
			if ("ab1E" in value && "an1E" in value) {
				const von = dayjs(`${jahr}-${Monat}-${tagAnfang}T${value.ab1E}`);
				const bis = dayjs(`${jahr}-${Monat}-${tagBuchung}T${value.an1E}`);

				const ab1Taetigkeit = bis.diff(von, "hour", true);

				if (ab1Taetigkeit >= 8 && ab1Taetigkeit < 24) Berechnung.E.S8++;
				else if (ab1Taetigkeit >= 24) Berechnung.E.S14++;
			}
		});

		Berechnung.N.F = NMonat.length;

		return Berechnung;
	}
}
