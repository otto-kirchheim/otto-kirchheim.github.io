import { IDaten, IVorgabenBerechnung, IVorgabenBerechnungMonat } from "../interfaces";
import { Storage } from "../utilities";
import dayjs from "../utilities/configDayjs";

export default function aktualisiereBerechnung(Jahr?: number, daten?: IDaten): IVorgabenBerechnung {
	Jahr = Jahr ?? Storage.get<number>("Jahr");
	daten = daten ?? {
		BZ: Storage.get("dataBZ") ?? {},
		BE: Storage.get("dataBE") ?? {},
		EWT: Storage.get("dataE") ?? {},
		N: Storage.get("dataN") ?? {},
	};
	if (!daten) throw new Error("Keine Daten gefunden");

	const Berechnung: IVorgabenBerechnung = Storage.check("datenBerechnung")
		? Storage.get("datenBerechnung")
		: ({} as IVorgabenBerechnung);

	for (let Monat = 1; Monat <= 12; Monat++)
		Berechnung[Monat as keyof IVorgabenBerechnung] = aktualisiereBerechnungMonat(daten, Monat, Jahr);

	Storage.set("datenBerechnung", Berechnung);

	return Berechnung;

	function aktualisiereBerechnungMonat(
		daten: IDaten,
		monat: number,
		jahr: number,
	): {
		B: { B: number; L1: number; L2: number; L3: number; K: number };
		E: { A8: number; A14: number; A24: number; S8: number; S14: number };
		N: { F: number };
	} {
		const Berechnung: IVorgabenBerechnungMonat = {
			B: { B: 0, L1: 0, L2: 0, L3: 0, K: 0 },
			E: { A8: 0, A14: 0, A24: 0, S8: 0, S14: 0 },
			N: { F: 0 },
		};

		daten.BZ[monat].forEach(value => {
			Berechnung.B.B += dayjs(value.endeB).diff(dayjs(value.beginB), "minute") + value.pauseB;
		});

		daten.BE[monat].forEach(value => {
			const von = dayjs(`${value.tagBE} ${value.beginBE}`, "DD.MM.YYYY HH:mm");
			let bis = dayjs(`${value.tagBE} ${value.endeBE}`, "DD.MM.YYYY HH:mm");
			if (bis.isBefore(von)) bis = bis.add(1, "day");
			Berechnung.B.B -= bis.diff(von, "minute");

			switch (value.lreBE.toString()) {
				case "LRE 1":
					Berechnung.B.L1++;
					break;
				case "LRE 2":
					Berechnung.B.L2++;
					break;
				case "LRE 3":
					Berechnung.B.L3++;
					break;
			}

			if (value.privatkmBE) Berechnung.B.K += value.privatkmBE;
		});

		daten.EWT[monat].forEach(value => {
			const Monat = `0${monat}`.slice(-2);
			const tag = `0${value.tagE}`.slice(-2);
			let tag1 = tag;
			if (["BN", "N"].includes(value.schichtE)) tag1 = `0${Number(value.tagE) - 1}`.slice(-2);

			if (value.abWE && value.anWE) {
				const von = dayjs(`${jahr}-${Monat}-${tag1}T${value.abWE}`);
				const bis = dayjs(`${jahr}-${Monat}-${tag}T${value.anWE}`);

				const abWohnung = bis.diff(von, "hour", true);

				if (abWohnung >= 8 && abWohnung < 14) {
					Berechnung.E.A8++;
				} else if (abWohnung > 14 && abWohnung < 24) {
					Berechnung.E.A14++;
				} else if (abWohnung >= 24) {
					Berechnung.E.A24++;
				}
			}
			if (value.ab1E && value.an1E) {
				const von = dayjs(`${jahr}-${Monat}-${tag1}T${value.ab1E}`);
				const bis = dayjs(`${jahr}-${Monat}-${tag}T${value.an1E}`);

				const ab1Taetigkeit = bis.diff(von, "hour", true);

				if (ab1Taetigkeit >= 8 && ab1Taetigkeit < 24) {
					Berechnung.E.S8++;
				} else if (ab1Taetigkeit >= 24) {
					Berechnung.E.S14++;
				}
			}
		});

		Berechnung.N.F = daten.N[monat].length;

		return Berechnung;
	}
}
