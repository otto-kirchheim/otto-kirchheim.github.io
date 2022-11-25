jQuery($ => {
	// Bereitschaftszeitraum
	const $modal = $("#editor-modalB");
	const $editor = $("#editorB");
	const $editorTitle = $("#editor-titleB");
	const ftBZ = FooTable.init("#tableBZ", {
		columns: [
			{ name: "beginB", title: "Von", sortable: true, sorted: true, direction: "ASC" },
			{ name: "endeB", title: "Bis", sortable: true },
			{ name: "pauseB", title: "Pause", sortable: false, breakpoints: "xs" },
		],
		rows: DataBZ(),
		empty: "Keine Daten verfügbar",
		sorting: { enabled: true },
		editing: {
			enabled: true,
			position: "left",
			showText: '<span class="material-icons-round" aria-hidden="true">edit</span> Bearbeiten',
			hideText: "Fertig",
			addText: "Neue Zeile",
			editText: '<span class="material-icons-round" aria-hidden="true">edit</span>',
			deleteText: '<span class="material-icons-round" aria-hidden="true">delete</span>',
			addRow: () => {
				$modal.removeData("row");
				$editor[0].reset();
				$editorTitle.text("Einsatzzeitraum hinzufügen");
				$modal.modal("show");
			},
			editRow: row => {
				const values = row.val();
				$editor.find("#beginB").val(moment(values.beginB, "DD.MM.YYYY / HH:mm").format("YYYY-MM-DDTHH:mm"));
				$editor.find("#endeB").val(moment(values.endeB, "DD.MM.YYYY / HH:mm").format("YYYY-MM-DDTHH:mm"));
				let pauseB = Number(values.pauseB);
				if (pauseB === 0) {
					pauseB = "";
				}
				$editor.find("#pauseB").val(pauseB);

				$modal.data("row", row);
				$editorTitle.text("Zeile Bearbeiten");
				$modal.modal("show");
			},
			deleteRow: row => {
				row.delete();
				setTimeout(() => {
					saveTableData("tableBZ", ftBZ);
				}, 100);
			},
		},
	});

	console.log({ ftBZ });

	$editor.on("submit", e => {
		if (this.checkValidity && !this.checkValidity()) return;
		e.preventDefault();
		const row = $modal.data("row");
		const values = {
			beginB: moment($editor.find("#beginB").val()).format("DD.MM.YYYY / HH:mm"),
			endeB: moment($editor.find("#endeB").val()).format("DD.MM.YYYY / HH:mm"),
			pauseB: `${$editor.find("#pauseB").val()}`,
		};
		if (row instanceof FooTable.Row) {
			row.val(values);
		} else {
			ftBZ.rows.add(values);
		}
		setTimeout(() => {
			saveTableData("tableBZ", ftBZ);
		}, 100);
		$modal.modal("hide");
	});

	$("#eingabeZeit").on("show.bs.modal", () => {
		generateEingabeMaskeZeiten(JSON.parse(localStorage.getItem("VorgabenB")));
	});

	// ----------------------------- Bereitschaftseinsätze ------------------------------------------------

	const $modalBE = $("#editor-modalBE");
	const $editorBE = $("#editorBE");
	const $editorTitleBE = $("#editor-titleBE");
	const ftBE = FooTable.init("#tableBE", {
		columns: [
			{ name: "tagBE", title: "Tag", sortable: true, sorted: true, direction: "ASC" },
			{ name: "auftragsnummerBE", title: "Auftragsnummer", sortable: false },
			{ name: "beginBE", title: "Von", sortable: false, breakpoints: "xs" },
			{ name: "endeBE", title: "Bis", sortable: false, breakpoints: "xs" },
			{ name: "lreBE", title: "LRE", sortable: false, breakpoints: "xs" },
			{ name: "privatkmBE", title: "Privat Km", sortable: false, breakpoints: "xs md" },
		],
		rows: DataBE(),
		empty: "Keine Daten verfügbar",
		sorting: { enabled: true },
		editing: {
			enabled: true,
			position: "left",
			showText: '<span class="material-icons-round" aria-hidden="true">edit</span> Bearbeiten',
			hideText: "Fertig",
			addText: "Neue Zeile",
			editText: '<span class="material-icons-round" aria-hidden="true">edit</span>',
			deleteText: '<span class="material-icons-round" aria-hidden="true">delete</span>',
			addRow: () => {
				$modalBE.removeData("row");
				$editorBE[0].reset();
				$editorBE.find("#tagBE").val(
					moment()
						.year(localStorage.getItem("Jahr"))
						.month(localStorage.getItem("Monat") - 1)
						.format("YYYY-MM-DD")
				);
				$editorTitleBE.text("Einsatzzeitraum hinzufügen");
				$modalBE.modal("show");
			},
			editRow: row => {
				const values = row.val();
				$editorBE.find("#tagBE").val(moment(values.tagBE, "DD.MM.YYYY").format("YYYY-MM-DD"));
				$editorBE.find("#auftragsnummerBE").val(values.auftragsnummerBE);
				$editorBE.find("#beginBE").val(values.beginBE);
				$editorBE.find("#endeBE").val(values.endeBE);
				$editorBE.find("#lreBE").val(values.lreBE);
				let privatkmBE = Number(values.privatkmBE) === 0 ? "" : Number(values.privatkmBE);
				$editorBE.find("#privatkmBE").val(privatkmBE);

				$modalBE.data("row", row);
				$editorTitleBE.text("Zeile Bearbeiten");
				$modalBE.modal("show");
			},
			deleteRow: row => {
				row.delete();
				setTimeout(() => {
					saveTableData("tableBE", ftBE);
				}, 100);
			},
		},
	});
	console.log({ ftBE });

	$editorBE.on("submit", e => {
		if (this.checkValidity && !this.checkValidity()) return;
		e.preventDefault();
		const row = $modalBE.data("row");
		const values = {
			tagBE: moment($editorBE.find("#tagBE").val()).format("DD.MM.YYYY"),
			auftragsnummerBE: $editorBE.find("#auftragsnummerBE").val(),
			beginBE: $editorBE.find("#beginBE").val(),
			endeBE: $editorBE.find("#endeBE").val(),
			lreBE: $editorBE.find("#lreBE option:selected").val(),
			privatkmBE: $editorBE.find("#privatkmBE").val(),
		};
		values.privatkmBE = !values.privatkmBE || values.privatkmBE === 0 ? "" : values.privatkmBE + "";

		if (row instanceof FooTable.Row) {
			row.val(values);
		} else {
			ftBE.rows.add(values);
		}

		setTimeout(() => {
			saveTableData("tableBE", ftBE);
		}, 100);

		$modalBE.modal("hide");
	});

	$("#eingabeEinsatz").on("show.bs.modal", () => {
		generateEingabeMaskeEinsatz();
	});

	$("#editor-modalBE").on("show.bs.modal", () => {
		setMinMaxDatum("#tagBE");
	});

	$("#btnUEB").on("click", () => {
		saveDaten($("#btnUEB")[0]);
	});
	$("#btnDLB").on("click", () => {
		download($("#btnDLB")[0], "B");
	});
	$("#btnALBZ").on("click", () => {
		FooTable.get("#tableBZ").rows.load([]);
		buttonDisable(false);
		localStorage.setItem("dataBZ", JSON.stringify([]));
	});
	$("#btnALBE").on("click", () => {
		FooTable.get("#tableBE").rows.load([]);
		buttonDisable(false);
		localStorage.setItem("dataBE", JSON.stringify([]));
	});
	$("#formEingabeZeit").on("submit", e => {
		e.preventDefault();
		bereitschaftEingabeWeb(localStorage.getItem("UserID"));
	});
	$("#b12").on("change", () => {
		b12aendern(JSON.parse(localStorage.getItem("VorgabenB")));
	});
	$("#bA").on("change", () => {
		datumAnpassen(JSON.parse(localStorage.getItem("VorgabenB")));
	});
	$("#nacht").on("change", () => {
		nachtAusblenden();
	});
	$("#sa").on("change", () => {
		saAEndern(JSON.parse(localStorage.getItem("VorgabenB")));
	});
	$("#eigen").on("change", () => {
		eigeneWerte(JSON.parse(localStorage.getItem("VorgabenB")));
	});
	$("#formEingabeEinsatz").on("submit", e => {
		e.preventDefault();
		sendDataE();
	});
});

function DataBZ(data) {
	if (data == null) {
		if (localStorage.getItem("dataBZ") == null) return [];
		data = JSON.parse(localStorage.getItem("dataBZ"));
	}
	const data1 = [];
	data.forEach((row, i) => {
		data1[i] = {
			beginB: row[0],
			endeB: row[1],
			pauseB: row[2],
		};
	});
	return data1;
}

function DataBE(data) {
	if (data == null) {
		if (localStorage.getItem("dataBE") == null) return [];
		data = JSON.parse(localStorage.getItem("dataBE"));
	}
	const data1 = [];
	data.forEach((row, i) => {
		data1[i] = {
			tagBE: row[0],
			auftragsnummerBE: row[1],
			beginBE: row[2],
			endeBE: row[3],
			lreBE: row[4],
			privatkmBE: row[5],
		};
	});
	return data1;
}

// Eingabemaske Bereitschaftszeiten

function generateEingabeMaskeZeiten(vorgabenB) {
	const datumHeute = moment();
	const Monat = localStorage.getItem("Monat");
	const Jahr = localStorage.getItem("Jahr");
	const datum = moment([Jahr, Monat - 1, 1])
		.date(datumHeute.date())
		.day(3);
	if (moment(datum).isSameOrBefore(moment([Jahr, Monat - 1, 1]).startOf("M"))) {
		datum.add(7, "d");
	} else if (moment(datum).isSameOrAfter(moment([Jahr, Monat - 1, 1]).endOf("M"))) {
		datum.subtract(7, "d");
	}

	const datumBeginnB = moment(datum).format("YYYY-MM-DD");
	const datumBeginnN = moment(datumBeginnB).day(7).format("YYYY-MM-DD");
	const datumEndeB = moment(datumBeginnB).day(10).format("YYYY-MM-DD");
	const datumEndeN = moment(datumBeginnN).day(3).format("YYYY-MM-DD");
	// Beginn Bereitschaftszeitraum
	document.getElementById("bA").value = datumBeginnB;
	setMinMaxDatum("#bA");
	document.getElementById("bAT").value = vorgabenB[1];
	// Ende Bereitschaftszeitraum
	document.getElementById("bE").value = datumEndeB;
	setMinMaxDatum("#bE", datumBeginnB, 0, 1);
	document.getElementById("bET").value = vorgabenB[0];
	// Beginn Nacht
	document.getElementById("nA").value = datumBeginnN;
	setMinMaxDatum("#nA", datumBeginnB, 0, 1);
	document.getElementById("nAT").value = vorgabenB[4];
	// Ende Nacht
	document.getElementById("nE").value = datumEndeN;
	setMinMaxDatum("#nE", datumBeginnB, 0, 1);
	document.getElementById("nET").value = vorgabenB[5];
}

function b12aendern(
	vorgabenB = JSON.parse(localStorage.getItem("VorgabenB")),
	datum = moment(document.getElementById("bA").value)
) {
	if (document.getElementById("b12").checked) {
		document.getElementById("bE").value = moment(datum).day(6).format("YYYY-MM-DD");
		document.getElementById("bET").value = vorgabenB[3];
		document.getElementById("nacht").checked = false;
	} else {
		document.getElementById("bE").value = moment(datum).add(7, "d").format("YYYY-MM-DD");
		document.getElementById("bET").value = vorgabenB[0];
		document.getElementById("nacht").checked = true;
	}
	nachtAusblenden();
}

function nachtAusblenden() {
	if (document.getElementById("nacht").checked) {
		document.getElementById("nachtschicht").style.display = "flex";
	} else {
		document.getElementById("nachtschicht").style.display = "none";
	}
}

function saAEndern(
	vorgabenB = JSON.parse(localStorage.getItem("VorgabenB")),
	datum = moment(document.getElementById("bA").value)
) {
	if (document.getElementById("sa").checked) {
		document.getElementById("nA").value = moment(datum).day(6).format("YYYY-MM-DD");
		document.getElementById("nAT").value = vorgabenB[3];
		document.getElementById("nE").value = moment(datum).day(10).format("YYYY-MM-DD");
	} else {
		document.getElementById("nA").value = moment(datum).day(7).format("YYYY-MM-DD");
		document.getElementById("nAT").value = vorgabenB[4];
		document.getElementById("nE").value = moment(datum).day(10).format("YYYY-MM-DD");
	}
}

function datumAnpassen(vorgabenB = JSON.parse(localStorage.getItem("VorgabenB"))) {
	const datum = moment(document.getElementById("bA").value);
	b12aendern(vorgabenB, datum);
	saAEndern(vorgabenB);
}

function eigeneWerte(vorgabenB = JSON.parse(localStorage.getItem("VorgabenB"))) {
	if (document.getElementById("eigen").checked) {
		document.getElementById("bAT").disabled = false;
		document.getElementById("bE").disabled = false;
		document.getElementById("bET").disabled = false;
		document.getElementById("nA").disabled = false;
		document.getElementById("nAT").disabled = false;
		document.getElementById("nE").disabled = false;
		document.getElementById("nET").disabled = false;
	} else {
		document.getElementById("bAT").disabled = true;
		document.getElementById("bE").disabled = true;
		document.getElementById("bET").disabled = true;
		document.getElementById("nA").disabled = true;
		document.getElementById("nAT").disabled = true;
		document.getElementById("nE").disabled = true;
		document.getElementById("nET").disabled = true;
		datumAnpassen(vorgabenB);
		document.getElementById("bAT").value = vorgabenB[1];
		b12aendern(vorgabenB);
		document.getElementById("nET").value = vorgabenB[5];
	}
}

// Eingabemaske Bereitschafteinsatz

function generateEingabeMaskeEinsatz() {
	const datum = moment();
	document.getElementById("Datum").value = datum.format("YYYY-MM-DD");
	setMinMaxDatum("#Datum");
}

function sendDataE() {
	$("#eingabeEinsatz").modal("hide");
	setLoading("btnESE");

	const daten = [];

	daten.push(moment(document.getElementById("Datum").value).format("DD.MM.YYYY"));
	daten.push(document.getElementById("SAPNR").value);
	daten.push(document.getElementById("ZeitVon").value);
	daten.push(document.getElementById("ZeitBis").value);
	daten.push($("#LRE option:selected").text());
	daten.push(document.getElementById("privatkm").value);
	const berZeit = document.getElementById("berZeit").checked;

	console.log(daten);

	const ftBE = FooTable.get("#tableBE");
	ftBE.rows.load(DataBE([daten]), true);
	setTimeout(() => {
		saveTableData("tableBE", ftBE);
	}, 100);

	document.getElementById("SAPNR").value = "";
	document.getElementById("ZeitVon").value = "";
	document.getElementById("ZeitBis").value = "";
	document.getElementById("privatkm").value = "";
	document.getElementById("berZeit").checked = false;
	document.getElementById("LRE").value = "";

	if (berZeit) {
		daten[0] = document.getElementById("Datum").value;
		const bereitschaftsAnfang = moment(`${daten[0]}T${daten[2]}`);
		const bereitschaftsEnde = moment(`${daten[0]}T${daten[3]}`);
		if (bereitschaftsEnde.isBefore(bereitschaftsAnfang)) {
			bereitschaftsEnde.add(1, "d");
		}
		const dataTable = tableToArray("#tableBZ");

		const data = BereitschaftEingabe(
			bereitschaftsAnfang,
			bereitschaftsEnde,
			moment(bereitschaftsEnde),
			moment(bereitschaftsEnde),
			false,
			dataTable
		);

		if (data == null) {
			clearLoading("btnESE");
			toastr.warning("Bereitschaftszeitraum Bereits vorhanden!");
			return;
		}

		localStorage.setItem("dataBZ", JSON.stringify(data));
		setTimeout(() => {
			FooTable.get("#tableBZ").rows.load(DataBZ(data));
		}, 1000);

		toastr.success(
			"Neuer Bereitschaftszeitraum hinzugefügt</br>Speichern nicht vergessen!</br></br>Berechnung wird erst nach Speichern aktualisiert",
			"",
			{ enableHtml: true }
		);
	}

	clearLoading("btnESE");
}

async function bereitschaftEingabeWeb(UserID) {
	$("#eingabeZeit").modal("hide");
	setLoading("btnESZ");

	const bereitschaftsAnfang = moment(`${document.getElementById("bA").value}T${document.getElementById("bAT").value}`);
	const bereitschaftsEnde = moment(`${document.getElementById("bE").value}T${document.getElementById("bET").value}`);
	const nacht = document.getElementById("nacht").checked;
	let nachtAnfang, nachtEnde;
	if (nacht === true) {
		nachtAnfang = moment(`${document.getElementById("nA").value}T${document.getElementById("nAT").value}`);
		nachtEnde = moment(`${document.getElementById("nE").value}T${document.getElementById("nET").value}`);
	} else {
		nachtAnfang = moment(bereitschaftsEnde);
		nachtEnde = moment(bereitschaftsEnde);
	}

	const monat = document.getElementById("Monat").value;
	const jahr = document.getElementById("Jahr").value;

	let data = [];
	let data1 = tableToArray("#tableBZ");
	let data2 = [];
	console.log({ bereitschaftsAnfang });
	console.log({ bereitschaftsEnde });
	console.log({ nachtAnfang });
	console.log({ nachtEnde });
	console.log({ nacht });
	console.log({ monat });
	console.log({ jahr });
	console.log({ UserID });

	if (bereitschaftsAnfang.isSame(bereitschaftsEnde, "month")) {
		data = BereitschaftEingabe(bereitschaftsAnfang, bereitschaftsEnde, nachtAnfang, nachtEnde, nacht, data1);
	} else {
		const monat2 = bereitschaftsEnde.month();
		const jahr2 = bereitschaftsEnde.year();

		const bereitschaftsEndeWechsel = moment([jahr2, monat2, 1]);
		let nachtEnde1, nachtAnfang2, bereitschaftsEndeWechsel2;
		if (bereitschaftsEndeWechsel.isBefore(nachtAnfang)) {
			nachtEnde1 = moment(nachtEnde);
			nachtAnfang2 = moment(nachtAnfang);
			bereitschaftsEndeWechsel2 = moment(bereitschaftsEndeWechsel);
		} else if (moment(bereitschaftsEndeWechsel).isAfter(nachtEnde)) {
			nachtEnde1 = moment(nachtEnde);
			bereitschaftsEndeWechsel2 = moment(bereitschaftsEndeWechsel);
			nachtAnfang2 = moment(bereitschaftsEnde);
			nachtEnde = moment(bereitschaftsEnde);
		} else if (
			moment(bereitschaftsEndeWechsel).isAfter(nachtAnfang) &&
			moment(bereitschaftsEndeWechsel).isBefore(nachtEnde)
		) {
			nachtEnde1 = moment([jahr2, monat2, 1, nachtEnde.hours(), nachtEnde.minutes()]);
			nachtAnfang2 = moment([jahr2, monat2, 1, nachtAnfang.hours(), nachtAnfang.minutes()]);
			bereitschaftsEndeWechsel2 = moment(nachtEnde1);
		} else {
			throw Error("Fehler bei Nacht und Bereitschaft");
		}

		data1 = BereitschaftEingabe(bereitschaftsAnfang, bereitschaftsEndeWechsel, nachtAnfang, nachtEnde1, nacht, data1);

		try {
			const response = await fetch(`${API_URL}/${UserID}&${monat2 + 1}&${jahr2}`, {
				mode: "cors",
				method: "GET",
			});
			const responded2 = await response.json();

			if (response.status != 200) {
				console.log("Fehler");
				return;
			}
			let dataResponded2 = responded2.data.datenB.datenBZ;
			console.log(dataResponded2);

			data2 = BereitschaftEingabe(
				bereitschaftsEndeWechsel2,
				bereitschaftsEnde,
				nachtAnfang2,
				nachtEnde,
				nacht,
				dataResponded2
			);
			const dataSave = {
				BZ: data2,
				UserID,
				Monat: monat2 + 1,
				Jahr: jahr2,
			};
			const responseSave = await fetch(`${API_URL}/saveData`, {
				mode: "cors",
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(dataSave),
			});

			const dataResponse = await responseSave.json();
			if (responseSave.status != 200) {
				console.log("Fehler:", dataResponse.message);
				toastr.error("Es ist ein Fehler beim Monatswechsel aufgetreten");
				return;
			}
			console.log(dataResponse.data);
			toastr.success(`Daten für Monat ${monat2 + 1} gespeichert`);
		} catch (err) {
			console.log(err);
			return;
		}

		console.log("Daten Monat 1", data1);
		console.log("Daten Monat 2", data2);

		data = data1;
	}
	if (data == null) {
		clearLoading("btnESZ");
		toastr.warning("Bereitschaftszeitraum Bereits vorhanden!");
		return;
	}

	localStorage.setItem("dataBZ", JSON.stringify(data));
	setTimeout(() => {
		FooTable.get("#tableBZ").rows.load(DataBZ(data));
	}, 1000);

	clearLoading("btnESZ");
	toastr.success(
		"Neuer Bereitschaftszeitraum hinzugefügt</br>Speichern nicht vergessen!</br></br>Berechnung wird erst nach Speichern aktualisiert",
		"",
		{ enableHtml: true }
	);
}

function BereitschaftEingabe(bereitschaftsAnfang, bereitschaftsEnde, nachtAnfang, nachtEnde, nacht, daten) {
	console.log("nacht: " + nacht);
	console.log("Bereitschafts Anfang: " + bereitschaftsAnfang.toDate());
	console.log("Bereitschafts Ende: " + bereitschaftsEnde.toDate());
	console.log("Nacht Anfang: " + nachtAnfang.toDate());
	console.log("Nacht Ende: " + nachtEnde.toDate());

	let bereitschaftsAnfangNacht,
		bereitschaftsAnfangMerker,
		bereitschaftsAnfangA,
		bereitschaftsEndeMerker,
		bereitschaftsEndeA,
		bereitschaftsEndeB,
		arbeitstagHeute,
		arbeitstagMorgen,
		pause,
		pauseMerker,
		pauseMerkerTag,
		pauseMerkerNacht;

	// Voreinstellungen Übernehmen
	const datenU = JSON.parse(localStorage.getItem("VorgabenU"));
	const tagAnfangsZeitMoDo = moment("1970-01-01T" + datenU.aZ.eT); // Tagschicht Anfangszeit Mo-Do
	const tagAnfangsZeitFr = moment("1970-01-01T" + datenU.aZ.eTF); // Tagschicht Anfangszeit Fr
	const tagEndeZeitMoFr = moment("1970-01-01T" + datenU.aZ.bT); // Tagschicht Endezeit Mo-Fr

	// Feste Variablen
	const ruheZeit = 10;
	const tagPausenVorgabe = 30;
	const nachtPausenVorgabe = 45;
	const bereitschaftsZeitraumWechsel = moment([1970, 0, 1, 8, 0]);
	const arbeitsAnfang = [
		bereitschaftsZeitraumWechsel,
		tagEndeZeitMoFr,
		tagEndeZeitMoFr,
		tagEndeZeitMoFr,
		tagEndeZeitMoFr,
		tagEndeZeitMoFr,
		bereitschaftsZeitraumWechsel,
		bereitschaftsZeitraumWechsel,
	];
	const arbeitsEnde = [
		bereitschaftsZeitraumWechsel,
		tagAnfangsZeitMoDo,
		tagAnfangsZeitMoDo,
		tagAnfangsZeitMoDo,
		tagAnfangsZeitMoDo,
		tagAnfangsZeitFr,
		bereitschaftsZeitraumWechsel,
		bereitschaftsZeitraumWechsel,
	];
	const pausenTag = ["", tagPausenVorgabe, tagPausenVorgabe, tagPausenVorgabe, tagPausenVorgabe, "", "", ""];

	const B2 = (bereitschaftsAnfang, nachtAnfang, arbeitsAnfang, arbeitstagHeute, arbeitstagMorgen, nacht) => {
		let merker;
		const tagBereitschaftsAnfang = bereitschaftsAnfang.weekday();
		console.log(`Wochentag Bereitschafts Anfang: ${tagBereitschaftsAnfang}`);
		// neues Ende 2,
		// am nächsten Tag,
		// Begin normale Schicht bzw. neuer Bereitschaftszyklus
		if (!bereitschaftsAnfang.isSame(nachtAnfang, "day")) {
			merker =
				arbeitstagMorgen === true
					? moment(bereitschaftsAnfang)
						.add(1, "d")
						.hour(arbeitsAnfang[tagBereitschaftsAnfang + 1].hour())
						.minute(arbeitsAnfang[tagBereitschaftsAnfang + 1].minute())
					: moment(bereitschaftsAnfang).add(1, "d").hour(8).minute(0);

			console.log(`Merker B2.1: ${merker.toDate()}`);
		}
		// Wie oben, aber:
		// 2x Ende am gleichen Tag
		if (bereitschaftsAnfang.isSame(nachtAnfang, "day") | (nacht === false)) {
			merker =
				arbeitstagHeute === true
					? moment(bereitschaftsAnfang)
						.hour(arbeitsAnfang[tagBereitschaftsAnfang].hour())
						.minute(arbeitsAnfang[tagBereitschaftsAnfang].minute())
					: moment(bereitschaftsAnfang).hour(8).minute(0);

			console.log(`Merker B2.2: ${merker.toDate()}`);
		}
		// Wie oben, aber:
		// wenn merker kleiner/gleich Bereitschafts Anfang -> am nächsten Tag
		if (!merker.isAfter(bereitschaftsAnfang)) {
			merker =
				arbeitstagMorgen === true
					? moment(bereitschaftsAnfang)
						.add(1, "d")
						.hour(arbeitsAnfang[tagBereitschaftsAnfang + 1].hour())
						.minute(arbeitsAnfang[tagBereitschaftsAnfang + 1].minute())
					: moment(bereitschaftsAnfang).add(1, "d").hour(8).minute(0);

			console.log(`Merker B2.3: ${merker.toDate()}`);
		}
		return merker;
	};

	const Arbeitstag = (datum, zusatz = 0) => {
		datum = moment(datum).add(zusatz, "d");
		const feiertag = feiertagejs.isHoliday(datum.toDate(), "HE");
		return !(feiertag | (datum.weekday() < 1) | (datum.weekday() > 5));
	};

	// Berechne ob Tag ein Arbeitstag ist
	arbeitstagHeute = Arbeitstag(bereitschaftsAnfang);
	console.log(`Arbeitstag Heute: ${arbeitstagHeute}`);
	arbeitstagMorgen = Arbeitstag(bereitschaftsAnfang, 1);
	console.log(`Arbeitstag Morgen: ${arbeitstagMorgen}`);

	// Sonstige Variablen Vorbereiten
	bereitschaftsEndeMerker = moment(bereitschaftsAnfang);

	const datenVorher = daten.length;

	/// --- Beginn Berechnung --- ///
	while (daten.length < 26 && bereitschaftsAnfang.isBefore(bereitschaftsEnde)) {
		/// #Berechnung Bereitschaftsende# ///

		// neues Ende Arbeitszeit
		bereitschaftsEndeA = B2(bereitschaftsAnfang, nachtAnfang, arbeitsAnfang, arbeitstagHeute, arbeitstagMorgen, nacht);
		console.log(`Bereitschafts Ende A: ${bereitschaftsEndeA.toDate()}`);

		// neues Ende Bereitschaftszyklus
		bereitschaftsEndeB = moment(bereitschaftsAnfang).add(1, "d").hour(8).minute(0);
		console.log(`Bereitschafts Ende B: ${bereitschaftsEndeB.toDate()}`);

		// überprüfe welches Bereitschaftsende Zutrifft
		bereitschaftsEndeMerker = moment.min(bereitschaftsEndeA, bereitschaftsEndeB, nachtAnfang, bereitschaftsEnde);
		console.log(`Bereitschafts Ende Merker: ${bereitschaftsEndeMerker.toDate()}`);

		/// #Berechnung Bereitschaftsanfang# ///

		// neuer Bereitschaftsanfang Nacht
		bereitschaftsAnfangNacht = moment(nachtAnfang).add(1, "d").hour(nachtEnde.hour()).minute(nachtEnde.minute());
		console.log(`Bereitschafts Anfang Nacht: ${bereitschaftsAnfangNacht.toDate()}`);

		// neues Ende 2, Arbeitszeit
		bereitschaftsAnfangA = B2(bereitschaftsAnfang, nachtAnfang, arbeitsEnde, arbeitstagHeute, arbeitstagMorgen, nacht);
		console.log(`Bereitschafts Anfang A: ${bereitschaftsAnfangA.toDate()}`);

		// überprüfe welches Bereitschaftanfang Zutrifft
		if (bereitschaftsAnfang.isSame(bereitschaftsEndeMerker, "day")) {
			bereitschaftsAnfangMerker = moment.min(bereitschaftsAnfangNacht, bereitschaftsAnfangA, bereitschaftsEndeB);
		} else {
			bereitschaftsAnfangMerker = moment.min(
				moment.max(bereitschaftsAnfangA, bereitschaftsEndeB),
				bereitschaftsAnfangNacht
			);
		}
		console.log(`Bereitschafts Anfang Merker: ${bereitschaftsAnfangMerker.toDate()}`);

		/// #Berechnung Pause# ///

		// Pause Tagschicht, Falls keine Pause oder nach Nachtschicht, dann ""
		pauseMerker = moment(bereitschaftsAnfang).hour(tagAnfangsZeitMoDo.hour()).minute(tagAnfangsZeitMoDo.minute());
		if (pause === nachtPausenVorgabe) {
			pause = "";
		} else if (bereitschaftsAnfang.isSame(pauseMerker)) {
			pause = pausenTag[bereitschaftsAnfang.weekday()];
		} else if (!bereitschaftsAnfang.isSame(pauseMerker)) {
			pause = "";
		}

		// Pause Nachtschicht, normal und bei Ruhe nach Nacht
		pauseMerkerNacht = moment(bereitschaftsAnfang).hour(nachtEnde.hour()).minute(nachtEnde.minute());
		pauseMerkerTag = moment(pauseMerker).hour(nachtEnde.hour()).add(ruheZeit, "hour").minute(nachtEnde.minute());
		if (bereitschaftsAnfang.isSame(pauseMerkerNacht) | bereitschaftsAnfang.isSame(pauseMerkerTag)) {
			pause = nachtPausenVorgabe;
		}
		console.log(`Pausen Zeit: ${pause}`);

		console.log(
			`Eingabe Tabelle: ${bereitschaftsAnfang.format("DD.MM.YYYY / HH:mm")} --- ${bereitschaftsEndeMerker.format(
				"DD.MM.YYYY / HH:mm"
			)} --- ${pause.toString()}`
		);

		/// #Prüfen ob Daten bereits vorhanden# ///

		let newDaten = [
			bereitschaftsAnfang.format("DD.MM.YYYY / HH:mm"),
			bereitschaftsEndeMerker.format("DD.MM.YYYY / HH:mm"),
			pause.toString(),
		];

		if (!daten.some(row => JSON.stringify(row) === JSON.stringify(newDaten))) {
			daten.push(newDaten);
		} else {
			console.log("Bereitschaftszeitraum bereits vorhanden");
		}

		/// #Übernehme Daten für nächsten Tag# ///
		// neuen Bereitschaftsanfang übernehmen
		bereitschaftsAnfang = moment(bereitschaftsAnfangMerker);
		console.log("Bereitschafts Anfang: " + bereitschaftsAnfang.toDate());

		// neuen Nachtschichtanfang setzten, Wenn kleiner als Bereitschaftsanfang
		if (bereitschaftsAnfang.isAfter(nachtAnfang)) {
			nachtAnfang.add(1, "d");
		}
		console.log(`Nacht Anfang: ${nachtAnfang.toDate()}`);
		if (nachtAnfang.isAfter(nachtEnde) && !nachtAnfang.isSame(bereitschaftsEnde)) {
			nachtAnfang = moment(bereitschaftsEnde);
			nacht = false;
		}
		console.log(`Nacht: ${nacht}`);

		// Berechne ob Tag ein Arbeitstag ist
		arbeitstagHeute = Arbeitstag(bereitschaftsAnfang);
		console.log(`Arbeitstag Heute: ${arbeitstagHeute}`);
		arbeitstagMorgen = Arbeitstag(bereitschaftsAnfang, 1);
		console.log(`Arbeitstag Morgen: ${arbeitstagMorgen}`);

		if (!nacht) continue;
		/// #Berechnung ob Ruhe nach Nacht am Sonntag & Feiertage# ///

		// neues Ende Arbeitszeit
		bereitschaftsEndeA = B2(bereitschaftsAnfang, nachtAnfang, arbeitsAnfang, arbeitstagHeute, arbeitstagMorgen, nacht);
		console.log(`Bereitschafts Ende A: ${bereitschaftsEndeA.toDate()}`);

		// neues Ende Bereitschaftszyklus
		bereitschaftsEndeB = moment(bereitschaftsAnfang).add(1, "d").hour(8).minute(0);
		console.log(`Bereitschafts Ende B: ${bereitschaftsEndeB.toDate()}`);

		// überprüfe welches Bereitschaftsende Zutrifft
		bereitschaftsEndeMerker = moment.min(bereitschaftsEndeA, bereitschaftsEndeB, nachtAnfang, bereitschaftsEnde);
		console.log(`Bereitschafts Ende Merker: ${bereitschaftsEndeMerker.toDate()}`);

		// überprüfe ob Ruhe nach Nacht nötig ist
		if (
			bereitschaftsAnfang.isSame(nachtAnfang, "day") &&
			moment(bereitschaftsAnfangNacht).isBefore(moment(nachtAnfang).subtract({ days: 1, hours: 10 })) &&
			moment(bereitschaftsEndeMerker).isBefore(moment(bereitschaftsAnfangNacht).subtract(1, "h"))
		) {
			bereitschaftsAnfangNacht.add(ruheZeit, "h");
			console.log(`Bereitschafts Anfang Nacht: ${bereitschaftsAnfangNacht}`);
			bereitschaftsAnfang = moment.max(moment.min(bereitschaftsAnfangA, bereitschaftsEndeB), bereitschaftsAnfangNacht);
			console.log(`Bereitschafts Anfang: ${bereitschaftsAnfang}`);
			arbeitstagHeute = Arbeitstag(bereitschaftsAnfang, 0);
			console.log(`Arbeitstag Heute: ${arbeitstagHeute}`);
			arbeitstagMorgen = Arbeitstag(bereitschaftsAnfang, 1);
			console.log(`Arbeitstag Morgen: ${arbeitstagMorgen}`);
		}
	}
	DatenSortieren(daten);

	if (datenVorher == daten.length) {
		console.log("Keine änderung, Bereitschaft bereits vorhanden");
		return;
	}

	return daten;
}
