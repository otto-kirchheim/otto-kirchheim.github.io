jQuery($ => {
	const $modalE = $("#editor-modalE");
	const $editorE = $("#editorE");
	const $editorTitleE = $("#editor-titleE");
	const ftE = FooTable.init("#tableE", {
		columns: [
			{ name: "tagE", title: "Tag", sortable: true, sorted: true, direction: "ASC" },
			{ name: "eOrtE", title: "Einsatzort", sortable: false },
			{ name: "schichtE", title: "Schicht", sortable: false },
			{ name: "abWE", title: "Ab Wohnung", sortable: false, breakpoints: "xs sm md" },
			{ name: "ab1E", title: "Ab 1.Tgk.-St.", sortable: false, breakpoints: "xs sm" },
			{ name: "anEE", title: "An Einsatzort", sortable: false, breakpoints: "xs" },
			{ name: "beginE", title: "Arbeitszeit Von", sortable: false, breakpoints: "xs" },
			{ name: "endeE", title: "Arbeitszeit Bis", sortable: false, breakpoints: "xs" },
			{ name: "abEE", title: "Ab Einsatzort", sortable: false, breakpoints: "xs" },
			{ name: "an1E", title: "An 1.Tgk.-St.", sortable: false, breakpoints: "xs sm" },
			{ name: "anWE", title: "An Wohnung", sortable: false, breakpoints: "xs sm md" },
			{ name: "berechnen", title: "", sortable: false, visible: false },
			{ name: "_checkbox", title: "Berechnen?", visible: true, sortable: false, breakpoints: "xs sm md" },
		],
		rows: DataE(),
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
				$modalE.removeData("row");
				$editorE[0].reset();
				$editorE.find("#tagE2").val(
					moment()
						.year(localStorage.getItem("Jahr"))
						.month(localStorage.getItem("Monat") - 1)
						.format("YYYY-MM-DD")
				);
				$editorTitleE.text("Anwesenheit hinzufügen");
				$modalE.modal("show");
			},
			editRow: row => {
				var values = row.val();
				console.log(values);
				$editorE.find("#tagE2").val(
					moment(values.tagE, "DD.MM.YYYY")
						.year(localStorage.getItem("Jahr"))
						.month(localStorage.getItem("Monat") - 1)
						.format("YYYY-MM-DD")
				);
				$editorE.find("#schichtE").val(values.schichtE);
				$editorE.find("#abWE").val(moment(values.abWE, "HH:mm").format("HH:mm"));
				$editorE.find("#ab1E").val(moment(values.ab1E, "HH:mm").format("HH:mm"));
				$editorE.find("#anEE").val(moment(values.anEE, "HH:mm").format("HH:mm"));
				$editorE.find("#beginE").val(moment(values.beginE, "HH:mm").format("HH:mm"));
				$editorE.find("#endeE").val(moment(values.endeE, "HH:mm").format("HH:mm"));
				$editorE.find("#abEE").val(moment(values.abEE, "HH:mm").format("HH:mm"));
				$editorE.find("#an1E").val(moment(values.an1E, "HH:mm").format("HH:mm"));
				$editorE.find("#anWE").val(moment(values.anWE, "HH:mm").format("HH:mm"));
				$editorE.find("#berechnen").prop("checked", JSON.parse(values.berechnen));

				$modalE.data("row", row);
				$editorTitleE.text("Anwesenheit Bearbeiten");
				$modalE.modal("show");
				$editorE.find("#eOrtE").val(values.eOrtE);
			},
			deleteRow: row => {
				row.delete();
				setTimeout(() => {
					saveTableData("tableE", ftE);
				}, 100);
			},
		},
	});

	console.log({ ftE });

	$editorE.on("submit", e => {
		if (this.checkValidity && !this.checkValidity()) return;
		e.preventDefault();
		let row = $modalE.data("row"),
			values = {
				tagE: moment($editorE.find("#tagE2").val()).format("DD"),
				eOrtE: $editorE.find("#eOrtE option:selected").val(),
				schichtE: $editorE.find("#schichtE option:selected").val(),
				abWE: $editorE.find("#abWE").val(),
				ab1E: $editorE.find("#ab1E").val(),
				anEE: $editorE.find("#anEE").val(),
				beginE: $editorE.find("#beginE").val(),
				endeE: $editorE.find("#endeE").val(),
				abEE: $editorE.find("#abEE").val(),
				an1E: $editorE.find("#an1E").val(),
				anWE: $editorE.find("#anWE").val(),
				berechnen: $editorE.find("#berechnen").prop("checked"),
			};
		values._checkbox = JSON.parse(values.berechnen)
			? '<div class="form-check form-switch"><input type="checkbox" class="row-checkbox form-check-input" checked></div>'
			: '<div class="form-check form-switch"><input type="checkbox" class="row-checkbox form-check-input"></div>';

		$editorE.find("#tagE2").removeAttr("min").removeAttr("max");
		row instanceof FooTable.Row ? row.val(values) : ftE.rows.add(values);

		setTimeout(() => {
			saveTableData("tableE", ftE);
		}, 100);

		$modalE.modal("hide");
	});

	$("#tableE").on("click", ".row-checkbox", e => {
		var newValues = {};
		var row;
		$(e.target).closest("tr").has("th").length == 1
			? (row = $(e.target).closest("tr").parent().closest("tr").prev().data("__FooTableRow__"))
			: (row = $(e.target).closest("tr").data("__FooTableRow__"));

		if ($(e.target).prop("checked")) {
			newValues.berechnen = "true";
			newValues._checkbox =
				'<div class="form-check form-switch"><input type="checkbox" class="row-checkbox form-check-input" checked></div>';
		} else {
			newValues.berechnen = "false";
			newValues._checkbox =
				'<div class="form-check form-switch"><input type="checkbox" class="row-checkbox form-check-input"></div>';
		}
		row.val(newValues, true);

		setTimeout(() => {
			saveTableData("tableE", ftE);
		}, 100);
	});

	$("#eingabeEWT").on("show.bs.modal", () => {
		generateEingabeMaskeEWT();
		generateEditorModalE("EOrt");
	});

	$("#editor-modalE").on("show.bs.modal", () => {
		generateEditorModalE("eOrtE");
		setMinMaxDatum("#tagE2");
	});

	$("#btnZb").on("click", () => {
		ewtBerechnen(
			localStorage.getItem("Monat"),
			localStorage.getItem("Jahr"),
			localStorage.getItem("dataE"),
			localStorage.getItem("VorgabenU")
		);
	});
	$("#btnUEE").on("click", () => {
		saveDaten($("#btnUEE")[0]);
	});
	$("#btnDLE").on("click", () => {
		download($("#btnDLE")[0], "E");
	});
	$("#btnALE").on("click", () => {
		FooTable.get("#tableE").rows.load([]);
		buttonDisable(false);
		localStorage.setItem("dataE", JSON.stringify([]));
	});
	$("#formEingabeEWT").on("submit", e => {
		e.preventDefault();
		addEWTtag();
	});
	$("#btnNaechsterTag").on("click", () => {
		naechsterTag();
	});
	$("#btnClearZeiten").on("click", () => {
		clearZeiten();
	});
});

function DataE(data) {
	if (data == null) {
		if (localStorage.getItem("dataE") == null) return [];
		data = JSON.parse(localStorage.getItem("dataE"));
	}
	var data1 = [];
	data.forEach((row, i) => {
		data1[i] = {
			tagE: {
				options: {
					sortValue: Number(row[0]),
				},
				value: row[0],
			},
			eOrtE: row[1],
			schichtE: row[2],
			abWE: row[3],
			ab1E: row[4],
			anEE: row[5],
			beginE: row[6],
			endeE: row[7],
			abEE: row[8],
			an1E: row[9],
			anWE: row[10],
			berechnen: row[11] || true,
		};
		data1[i]._checkbox = JSON.parse(data1[i].berechnen)
			? '<div class="form-check form-switch"><input type="checkbox" class="row-checkbox form-check-input" checked></div>'
			: '<div class="form-check form-switch"><input type="checkbox" class="row-checkbox form-check-input"></div>';
	});
	return data1;
}

function clearZeiten() {
	$("#abWE").val("");
	$("#ab1E").val("");
	$("#anEE").val("");
	$("#beginE").val("");
	$("#endeE").val("");
	$("#abEE").val("");
	$("#an1E").val("");
	$("#anWE").val("");
	$("#berechnen").val(true);
}

function ewtBerechnen(monat, jahr, daten, vorgabenU) {
	monat = Number(monat);
	jahr = Number(jahr);
	daten = JSON.parse(daten);
	vorgabenU = JSON.parse(vorgabenU);
	daten.forEach(zeile => {
		if (JSON.parse(zeile[11]) == false) return;
		var tag = Number(zeile[0]);
		zeile[0] = tag;
		for (var i = 3; i <= 10; i++) {
			if (zeile[i]) {
				let tagI = tag;
				let zeit = zeile[i].split(":");
				if (i > 6 && (zeile[2] == "BN" || zeile[2] == "N")) {
					tagI = zeile[0] - 1;
				}
				zeile[i] = moment()
					.year(jahr)
					.month(monat - 1)
					.date(tagI)
					.hour(zeit[0])
					.minute(zeit[1])
					.seconds(0)
					.millisecond(0);
			} else {
				zeile[i] = "";
			}
		}
	});

	DatenSortieren(daten);

	let beginn, ende, svzA, svzE, datumAbW, datumAb1, datumAnE, datumBeginn, datumEnde, datumAbE, datumAn1, datumAnW;

	// Wandle vorgabenU um
	var endePascal = moment.duration(0, "m");
	if (vorgabenU.pers.Name == "Ackermann, Pascal") {
		endePascal = moment.duration(5, "minute");
	}
	var vorgabenE = vorgabenU.aZ;
	for (const [key, value] of Object.entries(vorgabenE)) {
		vorgabenE[key] = moment.duration(value);
	}
	vorgabenE.fZ = {};
	for (const [key, value] of Object.entries(vorgabenU.fZ)) {
		vorgabenE.fZ[key] = moment.duration(value[1]);
	}

	// Beginn der Berechnung
	for (const Tag of daten) {
		if (Tag[11] == "false") continue;
		let datum = moment([jahr, monat - 1, Tag[0]]),
			schicht = Tag[2];
		switch (schicht) {
			case "N":
				beginn = moment.duration(vorgabenE.bN);
				ende = moment.duration(vorgabenE.eN).add(1, "d");
				svzA = moment.duration(45, "m");
				svzE = moment.duration(svzA);
				break;
			case "S":
				beginn = moment.duration(vorgabenE.bS);
				ende = moment.duration(vorgabenE.eS);
				svzA = moment.duration(20, "m");
				svzE = moment.duration(svzA);
				break;
			case "BN":
				beginn = moment.duration(vorgabenE.bBN);
				ende = moment.duration(vorgabenE.eN).add(1, "d");
				svzA = moment.duration(60, "m");
				svzE = moment.duration(45, "m");
				break;
			case "":
				beginn = moment.duration(vorgabenE.bT);
				if (datum.day() === 5) {
					ende = moment.duration(vorgabenE.eTF);
				} else {
					ende = moment.duration(vorgabenE.eT);
				}
				svzA = moment.duration(20, "m");
				svzE = moment.duration(svzA);
				break;
			default:
				throw Error("Schichtfehler");
		}

		// Arbeitszeit Beginn
		Tag[6] = datumBeginn = Tag[6] === "" ? moment(datum).add(beginn) : Tag[6];
		// Arbeitszeit Ende
		Tag[7] = datumEnde = Tag[7] === "" ? moment(datum).add(ende) : Tag[7];
		// Ab Wohnung
		Tag[3] = Tag[3] === "" ? moment(datumBeginn).subtract(vorgabenE.rZ) : Tag[3];
		// Ab erste Tätigkeitsstätte
		Tag[4] = datumAb1 = Tag[4] === "" ? moment(datumBeginn).add(svzA) : Tag[4];
		// An erste Tätigkeitsstätte
		Tag[9] = datumAn1 = Tag[9] === "" ? moment(datumEnde).subtract(svzE) : Tag[9];
		// An Wohnung
		Tag[10] = Tag[10] === "" ? moment(datumEnde).add(vorgabenE.rZ).add(endePascal) : Tag[10];
		if (Tag[1] !== "") {
			// An Einsatzort
			Tag[5] = Tag[5] === "" ? moment(datumAb1).add(vorgabenE.fZ[Tag[1]]) : Tag[5];
			// Ab Einsatzort
			Tag[8] = Tag[8] === "" ? moment(datumAn1).subtract(vorgabenE.fZ[Tag[1]]) : Tag[8];
		}
	}

	daten.forEach(zeile => {
		if (zeile[11] == "false") return;
		zeile[0] = `0${zeile[0]}`.slice(-2);
		for (var i = 3; i <= 10; i++) {
			if (zeile[i]) zeile[i] = moment(zeile[i]).format("HH:mm");
		}
	});

	const ftE = FooTable.get("#tableE");
	console.log("save ", { ftE });
	ftE.rows.load(DataE(daten));

	setTimeout(() => {
		saveTableData("tableE", ftE);
	}, 100);

	toastr.success("Zeiten berechnet, Bitte Manuell speichern");
}

function generateEditorModalE(eOrt) {
	var vorgabenU = JSON.parse(localStorage.getItem("VorgabenU"));
	eOrt = document.getElementById(eOrt);
	eOrt.innerHTML = "";

	let opt = document.createElement("option");
	opt.value = "";
	opt.innerText = "";
	eOrt.append(opt);

	for (const key of Object.keys(vorgabenU.fZ)) {
		opt = document.createElement("option");
		opt.value = key;
		opt.innerText = key;
		eOrt.append(opt);
	}
}

function generateEingabeMaskeEWT() {
	let dataE = tableToArray("#tableE"),
		monat = document.getElementById("Monat").value,
		jahr = document.getElementById("Jahr").value;

	document.getElementById("tagE").min = moment([jahr, monat - 1, 1])
		.startOf("month")
		.format("YYYY-MM-DD");
	document.getElementById("tagE").max = moment([jahr, monat - 1, 1])
		.endOf("month")
		.format("YYYY-MM-DD");

	if (dataE.length == 0) return naechsterTag("0", []);

	dataE.forEach((value, index, dataE) => {
		dataE[index] = Number(value[0]);
	});

	var max = dataE.reduce((a, b) => {
		return Math.max(a, b);
	}, -Infinity);

	naechsterTag(max, dataE);
}

function naechsterTag(tag, dataE) {
	if (tag == null) tag = moment(document.getElementById("tagE").value).date();
	if (tag == "") tag = 1;
	const monat = document.getElementById("Monat").value,
		jahr = document.getElementById("Jahr").value;
	if (dataE == null) {
		dataE = tableToArray("#tableE");
		dataE.forEach((value, index, dataE) => {
			dataE[index] = Number(value[0]);
		});
	}
	let letzterTag = moment(document.getElementById("tagE").max).date();
	do {
		tag = Number(tag) + 1;
		found = dataE.length > 0 ? dataE.find(element => Number(element) == Number(tag)) : undefined;
	} while (found != undefined);

	tag <= letzterTag
		? (document.getElementById("tagE").value = moment([jahr, monat - 1, tag]).format("YYYY-MM-DD"))
		: naechsterTag("0", dataE);
	return;
}

function addEWTtag() {
	let tag = `0${document.getElementById("tagE").value}`.slice(-2),
		ort = document.getElementById("EOrt").value,
		schicht = document.getElementById("Schicht").value;

	naechsterTag(tag);

	let data = [[tag, ort, schicht, "", "", "", "", "", "", "", "", true]];

	const ftE = FooTable.get("#tableE");
	console.log("save ", { ftE });
	ftE.rows.load(DataE(data), true);

	setTimeout(() => {
		saveTableData("tableE", ftE);
	}, 100);
}
