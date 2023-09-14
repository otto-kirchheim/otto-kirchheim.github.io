import type {
	IVorgabenBerechnung,
	IVorgabenBerechnungMonat,
	IVorgabenGeld,
	IVorgabenGeldType,
	IVorgabenU,
} from "../interfaces";
import { Storage, clearLoading } from "../utilities";

export default function generateTableBerechnung(
	datenBerechnung: true | IVorgabenBerechnung,
	datenGeld: IVorgabenGeld = Storage.get<IVorgabenGeld>("VorgabenGeld", { check: true }),
): void {
	if (datenBerechnung === true) return clearLoading("btnNeuBerech");

	Object.setPrototypeOf(datenGeld, {
		getMonat: function (maxMonat: number): IVorgabenGeldType {
			let returnObjekt = datenGeld[1];
			const keys = Object.keys(datenGeld).map(Number);
			if (keys.length > 1 && maxMonat > 1 && Math.max(...keys.filter(key => key <= maxMonat)) > 1)
				for (let monat = 2; monat <= maxMonat; monat++)
					if (typeof datenGeld[monat] !== "undefined") returnObjekt = { ...returnObjekt, ...datenGeld[monat] };

			return returnObjekt;
		},
	});

	const tarif_beamter = Storage.get<IVorgabenU>("VorgabenU", { check: true }).pers.TB;
	const berechnung: number[][] = Array.from<unknown, number[]>({ length: 12 }, () => []);

	const tbody = document.querySelector<HTMLTableSectionElement>("#tbodyBerechnung");
	if (!tbody) return;
	tbody.innerHTML = `
		<tr><th rowspan="2">Bereitschaftszeiten</th></tr>
		<tr></tr>
		<tr><th>Bereitschaftszulage</th></tr>
		<tr><th>LRE 1</th></tr>
		<tr><th>LRE 2</th></tr>
		<tr><th>LRE 3</th></tr>
		<tr><th>Privat-PKW</th></tr>
		<tr><th>Summe Bereitschaft</th></tr>
		<tr><th><table class="table table-borderless m-0"><tbody>
			<tr><td class="py-0">Anzahl der</td><td class="py-0">>8</td></tr>
			<tr><td class="py-0">Abwesenheiten nach</td><td class="py-0">>14</td></tr>
			<tr><td class="py-0">FGr-TV / LfTV / RVB</td><td class="py-0">>24</td></tr>
		</tbody></table></th></tr>
		<tr><th><table class="table table-borderless m-0"><tbody>
			<tr><td class="py-0">steuerfreie Abwesen-</td><td class="py-0">>8</td></tr>
			<tr><td class="py-0">heiten § 9 EStG</td><td class="py-0">>14</td></tr>
		</tbody></table></th></tr>
		<tr><th>Summe EWT</th></tr>
		<tr><th>Summe Nebenbezüge</th></tr>
		<tr><th>Summe Gesamt</th></tr>
		`;

	const nullParser = (value: null | string | number) => value ?? "&nbsp;";
	const time_convert = (num: number): string => {
		const hours = Math.floor(num / 60);
		const minutes = Math.round(num % 60);
		return `${hours}:${minutes.toString().padStart(2, "0")}`;
	};
	const formatCurrency = (value: number): string =>
		value.toLocaleString("de-DE", {
			style: "currency",
			currency: "EUR",
		});

	Array.from(tbody.children).forEach((row, index) => {
		for (const [Monat, datenBerechnungItem] of Object.entries(datenBerechnung) as [string, IVorgabenBerechnungMonat][]) {
			const monat = +Monat;
			const monatZeroIndex = monat - 1;
			const td = document.createElement("td");
			let privatPKW: number;

			switch (index) {
				case 0:
					if (datenBerechnungItem.B.B !== 0) td.textContent = datenBerechnungItem.B.B.toString();
					break;
				case 1:
					if (datenBerechnungItem.B.B !== 0)
						td.textContent =
							tarif_beamter === "Tarifkraft"
								? time_convert(datenBerechnungItem.B.B)
								: Math.round((datenBerechnungItem.B.B - 600) / 8 / 60).toString();
					break;
				case 2:
					if (datenBerechnungItem.B.B !== 0) {
						berechnung[monatZeroIndex][0] =
							tarif_beamter === "Tarifkraft"
								? Math.round(datenBerechnungItem.B.B / 60) * datenGeld.getMonat(monat)[tarif_beamter]
								: Math.round((datenBerechnungItem.B.B - 600) / 8 / 60) * datenGeld.getMonat(monat)[tarif_beamter];

						td.textContent = formatCurrency(berechnung[monatZeroIndex][0]);
					}
					break;
				case 3:
					if (datenBerechnungItem.B.L1 !== 0) {
						berechnung[monatZeroIndex][0] += Math.round(datenBerechnungItem.B.L1) * datenGeld.getMonat(monat).LRE1;
						td.textContent = formatCurrency(Math.round(datenBerechnungItem.B.L1) * datenGeld.getMonat(monat).LRE1);
					}
					break;
				case 4:
					if (datenBerechnungItem.B.L2 !== 0) {
						berechnung[monatZeroIndex][0] += Math.round(datenBerechnungItem.B.L2) * datenGeld.getMonat(monat).LRE2;
						td.textContent = formatCurrency(Math.round(datenBerechnungItem.B.L2) * datenGeld.getMonat(monat).LRE2);
					}
					break;
				case 5:
					if (datenBerechnungItem.B.L3 !== 0) {
						berechnung[monatZeroIndex][0] += Math.round(datenBerechnungItem.B.L3) * datenGeld.getMonat(monat).LRE3;
						td.textContent = formatCurrency(Math.round(datenBerechnungItem.B.L3) * datenGeld.getMonat(monat).LRE3);
					}
					break;
				case 6:
					if (datenBerechnungItem.B.K !== 0) {
						privatPKW =
							Math.round(datenBerechnungItem.B.K) *
							(tarif_beamter === "Tarifkraft"
								? datenGeld.getMonat(monat).PrivatPKWTarif
								: datenGeld.getMonat(monat).PrivatPKWBeamter);

						berechnung[monatZeroIndex][0] += privatPKW;
						td.textContent = formatCurrency(privatPKW);
					}
					break;
				case 7:
					if (berechnung[monatZeroIndex].length !== 0) {
						td.textContent = formatCurrency(berechnung[monatZeroIndex][0]);
					} else if (!berechnung[monatZeroIndex][0]) {
						berechnung[monatZeroIndex][0] = 0;
					}
					break;
				case 8:
					if (tarif_beamter === "Tarifkraft") {
						if (datenBerechnungItem.E.A8 !== 0) {
							berechnung[monatZeroIndex][1] = datenBerechnungItem.E.A8 * datenGeld.getMonat(monat).TE8;
						}
						if (datenBerechnungItem.E.A14 !== 0) {
							berechnung[monatZeroIndex][1] += datenBerechnungItem.E.A14 * datenGeld.getMonat(monat).TE14;
						}
						if (datenBerechnungItem.E.A24 !== 0) {
							berechnung[monatZeroIndex][1] += datenBerechnungItem.E.A24 * datenGeld.getMonat(monat).TE24;
						}
					}
					if (datenBerechnungItem.E.A8 > 0 || datenBerechnungItem.E.A14 > 0 || datenBerechnungItem.E.A24 > 0)
						td.innerHTML =
							`${nullParser(datenBerechnungItem.E.A8)} <br />` +
							`${nullParser(datenBerechnungItem.E.A14)} <br />` +
							`${nullParser(datenBerechnungItem.E.A24)}`;

					break;
				case 9:
					if (tarif_beamter !== "Tarifkraft") {
						if (datenBerechnungItem.E.S8 !== 0) {
							berechnung[monatZeroIndex][1] = datenBerechnungItem.E.S8 * datenGeld.getMonat(monat).BE8;
						}
						if (datenBerechnungItem.E.S14 !== 0) {
							berechnung[monatZeroIndex][1] += datenBerechnungItem.E.S14 * datenGeld.getMonat(monat).BE14;
						}
					}
					if (datenBerechnungItem.E.S8 > 0 || datenBerechnungItem.E.S14 > 0)
						td.innerHTML = `${nullParser(datenBerechnungItem.E.S8)} <br /> ${nullParser(datenBerechnungItem.E.S14)}`;

					row.appendChild(td);
					break;

				case 10:
					if (berechnung[monatZeroIndex].length > 1) {
						td.textContent = formatCurrency(berechnung[monatZeroIndex][1]);
					} else if (!berechnung[monatZeroIndex][1]) {
						berechnung[monatZeroIndex][1] = 0;
					}
					break;
				case 11:
					if (datenBerechnungItem.N.F === 0) {
						berechnung[monatZeroIndex][2] = 0;
					} else {
						if (tarif_beamter !== "Tarifkraft") {
							berechnung[monatZeroIndex][2] = 0;
						} else {
							berechnung[monatZeroIndex][2] = datenBerechnungItem.N.F * datenGeld.getMonat(monat).Fahrentsch;
						}
						td.textContent = formatCurrency(berechnung[monatZeroIndex][2]);
					}
					break;
				case 12:
					if (
						berechnung[monatZeroIndex].length !== 0 &&
						(berechnung[monatZeroIndex][0] || berechnung[monatZeroIndex][1] || berechnung[monatZeroIndex][2])
					) {
						const sum =
							Number(berechnung[monatZeroIndex][0]) +
							Number(berechnung[monatZeroIndex][1]) +
							Number(berechnung[monatZeroIndex][2]);
						td.textContent = formatCurrency(sum);
					}
					break;
			}
			row.appendChild(td);
		}
	});
}
