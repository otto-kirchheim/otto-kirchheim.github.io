jQuery($ => {
	if (storageAvailable("localStorage")) {
		var alertNode = document.querySelector(".alert");
		var alert = new bootstrap.Alert(alertNode);
		alert.close();
	}

	if (localStorage.getItem("UserID")) {
		var url = document.location.toString();
		if (url.match("#")) {
			activeTab(url.split("#")[1]);
		}
	}
});

const API_URL = "https://web-app-rn6h2lgzma-ey.a.run.app/api/v1";
navigator.serviceWorker.register("service-worker.js");

const activeTab = tab => {
	console.log(tab);
	var sel = document.querySelector("#" + tab + "-tab");
	console.log(sel);
	bootstrap.Tab.getOrCreateInstance(sel).show();
};

const storageAvailable = type => {
	var storage;
	try {
		storage = window[type];
		var x = "__storage_test__";
		storage.setItem(x, x);
		storage.removeItem(x);
		return true;
	} catch (e) {
		return (
			e instanceof DOMException &&
			// everything except Firefox
			(e.code === 22 ||
				// Firefox
				e.code === 1014 ||
				// test name field too, because code might not be present
				// everything except Firefox
				e.name === "QuotaExceededError" ||
				// Firefox
				e.name === "NS_ERROR_DOM_QUOTA_REACHED") &&
			// acknowledge QuotaExceededError only if there's something already stored
			storage &&
			storage.length !== 0
		);
	}
};

const autoCollapse = x => {
	const navLinks = document.querySelectorAll(".nav-item");
	if (x.matches) {
		navLinks.forEach(l => {
			l.setAttribute("data-bs-toggle", "collapse");
			l.setAttribute("data-bs-target", "#navmenu");
		});
	} else {
		navLinks.forEach(l => {
			l.removeAttribute("data-bs-toggle");
			l.removeAttribute("data-bs-target");
		});
	}
};

var x = window.matchMedia("(max-width: 767.98px)");
autoCollapse(x);
x.addEventListener("change", autoCollapse);

//https://codeseven.github.io/toastr/
toastr.options = {
	closeButton: false,
	debug: false,
	newestOnTop: false,
	progressBar: true,
	positionClass: "toast-bottom-left",
	preventDuplicates: true,
	onclick: null,
	showDuration: "300",
	hideDuration: "1000",
	timeOut: "3000",
	extendedTimeOut: "1000",
	showEasing: "swing",
	hideEasing: "linear",
	showMethod: "fadeIn",
	hideMethod: "fadeOut",
	escapeHtml: false,
};

async function download(button, modus) {
	setLoading(button.id);
	buttonDisable(true);
	var data = {
		VorgabenU: JSON.parse(localStorage.getItem("VorgabenU")),
		VorgabenGeld: JSON.parse(localStorage.getItem("VorgabenGeld")),
		Daten: {},
		Monat: document.getElementById("Monat").value,
		Jahr: document.getElementById("Jahr").value,
	};

	switch (modus) {
		case "B":
			data.Daten.BZ = tableToArray("#tableBZ");
			data.Daten.BE = tableToArray("#tableBE");
			break;
		case "E":
			var dataE = tableToArray("#tableE");
			dataE.forEach(value => value.pop());
			data.Daten.EWT = dataE;
			break;
		case "N":
			data.Daten.N = tableToArray("#tableN");
			break;
	}

	try {
		console.time("download");
		const response = await fetch(`${API_URL}/download/${modus}`, {
			mode: "cors",
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});
		const responsed = await response.json();
		if (response.status == 200) {
			let dataResponded = responsed.data;
			var uri = `data:application/pdf;base64,${encodeURIComponent(dataResponded.data)}`;
			downloadURI(uri, dataResponded.name);
			console.timeEnd("download");
		} else {
			console.log("Fehler", responsed.message);
			toastr.error(`Download fehlerhaft: ${responsed.message}`);
			return;
		}
	} catch (err) {
		console.log(err);
		return;
	} finally {
		buttonDisable(false);
		clearLoading(button.id);
	}
}

function downloadURI(uri, name) {
	let link = document.createElement("a");
	link.download = name;
	link.href = uri;
	link.click();
}

async function saveDaten(button, modus = "") {
	setLoading(button.id);
	buttonDisable(true);

	switch (modus) {
		case "B":
			saveTableData("tableBZ");
			saveTableData("tableBE");
			break;
		case "E":
			saveTableData("tableE");
			break;
		case "N":
			saveTableData("tableN");
			break;
		case "Einstellungen":
			saveEinstellungen();
			break;
		default:
			saveTableData("tableBZ");
			saveTableData("tableBE");
			saveTableData("tableE");
			saveTableData("tableN");
			saveEinstellungen();
			break;
	}
	let data = {
		BZ: JSON.parse(localStorage.getItem("dataBZ")),
		BE: JSON.parse(localStorage.getItem("dataBE")),
		E: JSON.parse(localStorage.getItem("dataE")),
		N: JSON.parse(localStorage.getItem("dataN")),
		User: JSON.parse(localStorage.getItem("VorgabenU")),
		UserID: localStorage.getItem("UserID"),
		Monat: localStorage.getItem("Monat"),
		Jahr: localStorage.getItem("Jahr"),
	};

	try {
		const response = await fetch(`${API_URL}/saveData`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});

		const responded = await response.json();
		if (response.status == 200) {
			const dataResponded = responded.data;
			console.log(dataResponded);

			switch (modus) {
				case "B":
					ftBZ = FooTable.get("#tableBZ");
					console.log("save ", { ftBZ });
					ftBZ.rows.load(DataBZ(dataResponded.daten.datenBZ));

					ftBE = FooTable.get("#tableBE");
					console.log("save ", { ftBE });
					ftBE.rows.load(DataBE(dataResponded.daten.datenBE));

					setTimeout(() => {
						saveTableData("tableBZ", ftBZ);
						saveTableData("tableBE", ftBE);
						localStorage.setItem("VorgabenU", JSON.stringify(dataResponded.user));
						localStorage.setItem("datenBerechnung", JSON.stringify(dataResponded.datenBerechnung));
					}, 100);
					break;
				case "E":
					ftE = FooTable.get("#tableE");
					console.log("save ", { ftE });
					ftE.rows.load(DataE(dataResponded.daten.datenE));

					setTimeout(() => {
						saveTableData("tableE", ftE);
						localStorage.setItem("VorgabenU", JSON.stringify(dataResponded.user));
						localStorage.setItem("datenBerechnung", JSON.stringify(dataResponded.datenBerechnung));
					}, 100);
					break;
				case "N":
					ftN = FooTable.get("#tableN");
					console.log("save ", { ftN });
					ftN.rows.load(DataN(dataResponded.daten.datenN));

					setTimeout(() => {
						saveTableData("tableN", ftN);
						localStorage.setItem("VorgabenU", JSON.stringify(dataResponded.user));
						localStorage.setItem("datenBerechnung", JSON.stringify(dataResponded.datenBerechnung));
					}, 100);
					break;
				case "Einstellungen":
					generateEingabeMaskeEinstellungen(dataResponded.user);
					localStorage.setItem("VorgabenU", JSON.stringify(dataResponded.user));
					localStorage.setItem("datenBerechnung", JSON.stringify(dataResponded.datenBerechnung));
					break;
				default:
					generateTableBerechnung(dataResponded.datenBerechnung);
					generateEingabeMaskeEinstellungen(dataResponded.user);

					ftBZ = FooTable.get("#tableBZ");
					console.log("save ", { ftBZ });
					ftBZ.rows.load(DataBZ(dataResponded.daten.datenBZ));

					ftBE = FooTable.get("#tableBE");
					console.log("save ", { ftBE });
					ftBE.rows.load(DataBE(dataResponded.daten.datenBE));

					ftE = FooTable.get("#tableE");
					console.log("save ", { ftE });
					ftE.rows.load(DataE(dataResponded.daten.datenE));

					ftN = FooTable.get("#tableN");
					console.log("save ", { ftN });
					ftN.rows.load(DataN(dataResponded.daten.datenN));

					setTimeout(() => {
						saveTableData("tableBZ", ftBZ);
						saveTableData("tableBE", ftBE);
						saveTableData("tableE", ftE);
						saveTableData("tableN", ftN);
						localStorage.setItem("VorgabenU", JSON.stringify(dataResponded.user));
						localStorage.setItem("datenBerechnung", JSON.stringify(dataResponded.datenBerechnung));
					}, 100);
					break;
			}
			console.log("Erfolgreich gespeichert");
			toastr.success("Daten gespeichert");
		} else {
			console.log("Fehler", responded.message);
			toastr.error("Es ist ein Fehler aufgetreten");
			return;
		}
	} catch (err) {
		console.log(err);
		return;
	} finally {
		clearLoading(button.id);
		buttonDisable(false);
	}
}

function saveTableData(tableID, ft) {
	switch (tableID) {
		case "tableBZ":
			localStorage.setItem("dataBZ", JSON.stringify(tableToArray("#tableBZ", ft)));
			break;
		case "tableBE":
			localStorage.setItem("dataBE", JSON.stringify(tableToArray("#tableBE", ft)));
			break;
		case "tableE":
			var data = tableToArray("#tableE", ft);
			data.forEach(value => value.pop());
			localStorage.setItem("dataE", JSON.stringify(data));
			break;
		case "tableN":
			localStorage.setItem("dataN", JSON.stringify(tableToArray("#tableN", ft)));
	}
}

function tableToArray(tableID, ft) {
	if (!ft) ft = FooTable.get(tableID);
	var data = ft
		.toCSV()
		.replace(/"/g, "")
		.replace(/^,/gm, "")
		.split("\n")
		.slice(1, -1)
		.map(v => v.split(","));
	return data;
}

function setLoading(btn) {
	btn = $(`#${btn}`);
	if (!btn.data("normal-text")) {
		btn.data("normal-text", btn.html());
	}
	if (!btn.data("loading-text")) {
		btn.data("loading-text", "<span class='spinner-grow spinner-grow-sm' role='status' aria-hidden='true'></span>");
	}
	btn.prop("disabled", true);
	btn.html(btn.data("loading-text"));
}

function clearLoading(btn) {
	btn = $(`#${btn}`);
	btn.html(btn.data("normal-text"));
	btn.prop("disabled", false);
}

function buttonDisable(status) {
	var buttons = document.querySelectorAll("[data-disabler]");
	buttons.forEach(button => (button.disabled = status));
	console.log(`Button disabled: ${status}`);
}

function setMinMaxDatum(tag, datum, start = 0, ende = 0) {
	if (!datum) datum = moment($(tag).val());
	var min = moment(datum).subtract(start, "M").startOf("M").format("YYYY-MM-DD");
	var max = moment(datum).add(ende, "M").endOf("M").format("YYYY-MM-DD");
	$(tag).attr("min", min).attr("max", max);
}

function DatenSortieren(daten) {
	daten.sort((x, y) => {
		var xp = x[0];
		var yp = y[0];
		return xp == yp ? 0 : xp < yp ? -1 : 1;
	});
}
