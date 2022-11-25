jQuery($ => {
	if (
		localStorage.getItem("datenBerechnung") &&
		localStorage.getItem("VorgabenU") &&
		localStorage.getItem("VorgabenGeld")
	)
		generateTableBerechnung(
			JSON.parse(localStorage.getItem("datenBerechnung")),
			JSON.parse(localStorage.getItem("VorgabenGeld"))
		);
});

function generateTableBerechnung(datenBerechnung, datenGeld = JSON.parse(localStorage.getItem("VorgabenGeld"))) {
	if (datenBerechnung === true) return clearLoading("btnNeuBerech");

	const tarif_beamter = JSON.parse(localStorage.getItem("VorgabenU")).pers.TB;

	let berechnung = Array(12).fill([]);

	let tbody = document.getElementById("tbodyBerechnung");
	tbody.innerHTML =
		'<tr><td colspan="2" rowspan="2">Bereitschaftszeiten</td></tr>    <tr></tr>     <tr><td colspan="2">Rufbereitschaftszulage</td></tr>   <tr><td colspan="2">LRE 1</td></tr>      <tr><td colspan="2">LRE 2</td></tr>      <tr><td colspan="2">LRE 3</td></tr>      <tr><td colspan="2">Privat-PKW</td></tr>      <tr><td colspan="2">Summe Bereitschaft</td></tr>      <tr><td rowspan="3" style="white-space: normal;">Anzahl der Abwesenheiten nach FGr-TV / LfTV / RVB</td> <td>>8</td> </tr>      <tr><td>>14</td></tr>      <tr><td>>24</td></tr>      <tr><td rowspan="2" style="white-space: normal;">steuerfreie Abwesenheiten § 9 EStG</td><td>>8</td></tr>      <tr><td>>24</td></tr>      <tr><td colspan="2">Summe EWT</td></tr>      <tr><td colspan="2">Summe Nebenbezüge</td></tr>      <tr><td colspan="2">Summe Gesamt</td></tr>';

	let rows = tbody.querySelectorAll("tr");

	rows.forEach((row, index) => {
		datenBerechnung.forEach((datenBerechnungItem, x) => {
			let td = document.createElement("td");

			switch (index) {
				case 0:
					if (datenBerechnungItem[0][0] == 0) {
						row.appendChild(td);
						return;
					}
					td.textContent = datenBerechnungItem[0][0];
					row.appendChild(td);
					break;
				case 1:
					if (datenBerechnungItem[0][0] == 0) {
						row.appendChild(td);
						return;
					}
					td.textContent =
						tarif_beamter === "Tarifkraft"
							? time_convert(datenBerechnungItem[0][0])
							: Math.round((datenBerechnungItem[0][0] - 600) / 8 / 60, 0);
					row.appendChild(td);
					break;
				case 2:
					if (datenBerechnungItem[0][0] == 0) {
						row.appendChild(td);
						return;
					}
					berechnung[x][0] =
						tarif_beamter === "Tarifkraft"
							? Math.round(datenBerechnungItem[0][0] / 60, 0) * datenGeld[x][tarif_beamter]
							: Math.round((datenBerechnungItem[0][0] - 600) / 8 / 60, 0) * datenGeld[x][tarif_beamter];

					td.textContent = berechnung[x][0].toLocaleString("de-DE", {
						style: "currency",
						currency: "EUR",
					});

					row.appendChild(td);
					break;
				case 3:
					if (datenBerechnungItem[0][1] == 0) {
						row.appendChild(td);
						return;
					}
					berechnung[x][0] = berechnung[x][0] + Math.round(datenBerechnungItem[0][1], 0) * datenGeld[x].LRE1;
					td.textContent = (Math.round(datenBerechnungItem[0][1], 0) * datenGeld[x].LRE1).toLocaleString("de-DE", {
						style: "currency",
						currency: "EUR",
					});
					row.appendChild(td);
					break;
				case 4:
					if (datenBerechnungItem[0][2] == 0) {
						row.appendChild(td);
						return;
					}
					berechnung[x][0] = berechnung[x][0] + Math.round(datenBerechnungItem[0][2], 0) * datenGeld[x].LRE2;
					td.textContent = (Math.round(datenBerechnungItem[0][2], 0) * datenGeld[x].LRE2).toLocaleString("de-DE", {
						style: "currency",
						currency: "EUR",
					});
					row.appendChild(td);
					break;
				case 5:
					if (datenBerechnungItem[0][3] == 0) {
						row.appendChild(td);
						return;
					}
					berechnung[x][0] = berechnung[x][0] + Math.round(datenBerechnungItem[0][3], 0) * datenGeld[x].LRE3;
					td.textContent = (Math.round(datenBerechnungItem[0][3], 0) * datenGeld[x].LRE3).toLocaleString("de-DE", {
						style: "currency",
						currency: "EUR",
					});
					row.appendChild(td);
					break;
				case 6:
					if (datenBerechnungItem[0][4] == 0) {
						row.appendChild(td);
						return;
					}
					berechnung[x][0] = berechnung[x][0] + Math.round(datenBerechnungItem[0][4], 0) * datenGeld[x].PrivatPKW;
					td.textContent = (Math.round(datenBerechnungItem[0][4], 0) * datenGeld[x].PrivatPKW).toLocaleString("de-DE", {
						style: "currency",
						currency: "EUR",
					});
					row.appendChild(td);
					break;
				case 7:
					if (berechnung[x].length === 0 || !berechnung[x][0]) {
						berechnung[x][0] = 0;
						row.appendChild(td);
						return;
					}
					td.textContent = berechnung[x][0].toLocaleString("de-DE", {
						style: "currency",
						currency: "EUR",
					});
					row.appendChild(td);
					break;
				case 8:
					if (datenBerechnungItem[1][0] == 0) {
						row.appendChild(td);
						return;
					}
					if (tarif_beamter === "Tarifkraft") {
						berechnung[x][1] = datenBerechnungItem[1][0] * datenGeld[x].TE8;
					}
					td.textContent = datenBerechnungItem[1][0];
					row.appendChild(td);
					break;
				case 9:
					if (datenBerechnungItem[1][1] == 0) {
						row.appendChild(td);
						return;
					}
					if (tarif_beamter === "Tarifkraft") {
						berechnung[x][1] = berechnung[x][1] + datenBerechnungItem[1][1] * datenGeld[x].TE14;
					}
					td.textContent = datenBerechnungItem[1][1];
					row.appendChild(td);
					break;
				case 10:
					if (datenBerechnungItem[1][2] == 0) {
						row.appendChild(td);
						return;
					}
					if (tarif_beamter === "Tarifkraft") {
						berechnung[x][1] = berechnung[x][1] + datenBerechnungItem[1][2] * datenGeld[x].TE24;
					}
					td.textContent = datenBerechnungItem[1][2];
					row.appendChild(td);
					break;
				case 11:
					if (datenBerechnungItem[1][3] == 0) {
						row.appendChild(td);
						return;
					}
					if (tarif_beamter !== "Tarifkraft") {
						berechnung[x][1] = datenBerechnungItem[1][3] * datenGeld[x].BE8;
					}
					td.textContent = datenBerechnungItem[1][3];
					row.appendChild(td);
					break;
				case 12:
					if (datenBerechnungItem[1][4] == 0) {
						row.appendChild(td);
						return;
					}
					if (tarif_beamter !== "Tarifkraft") {
						berechnung[x][1] = berechnung[x][1] + datenBerechnungItem[1][4] * datenGeld[x].BE14;
					}
					td.textContent = datenBerechnungItem[1][4];
					row.appendChild(td);
					break;
				case 13:
					if (berechnung[x].length == 0 || !berechnung[x][1]) {
						berechnung[x][1] = 0;
						row.appendChild(td);
						return;
					}
					td.textContent = berechnung[x][1].toLocaleString("de-DE", {
						style: "currency",
						currency: "EUR",
					});
					row.appendChild(td);
					break;
				case 14:
					if (datenBerechnungItem[2][0] == 0) {
						berechnung[x][2] = 0;
						row.appendChild(td);
						return;
					}
					if (tarif_beamter !== "Tarifkraft") {
						berechnung[x][2] = 0;
						row.appendChild(td);
						return;
					} else {
						berechnung[x][2] = datenBerechnungItem[2][0] * datenGeld[x].Fahrentsch;
					}
					td.textContent = berechnung[x][2].toLocaleString("de-DE", {
						style: "currency",
						currency: "EUR",
					});
					row.appendChild(td);
					break;
				case 15:
					if (berechnung[x].length == 0 || (!berechnung[x][0] && !berechnung[x][1] && !berechnung[x][2])) {
						row.appendChild(td);
						return;
					}

					td.textContent = (Number(berechnung[x][0]) + Number(berechnung[x][1]) + Number(berechnung[x][2])).toLocaleString(
						"de-DE",
						{ style: "currency", currency: "EUR" }
					);
					row.appendChild(td);
					break;
			}
		});
	});
}

function time_convert(num) {
	const hours = Math.floor(num / 60);
	const minutes = Math.round(num % 60, 0);
	return `${hours}:${minutes.toString().padStart(2, "0")}`;
}
