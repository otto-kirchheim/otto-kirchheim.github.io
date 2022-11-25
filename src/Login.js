jQuery($ => {
	$("#formLogin").on("submit", e => {
		e.preventDefault();
		loginUser();
	});
	$("#formNewUser").on("submit", e => {
		e.preventDefault();
		checkNeuerBenutzer();
	});
	$("#formChangePW").on("submit", e => {
		e.preventDefault();
		checkPasswort()();
	});
	$("#formSelectMonatJahr").on("submit", e => {
		e.preventDefault();
		SelectYear();
	});
	$("#btnNewUser").on("click", () => {
		$("loginDisplay").addClass("d-none");
		$("NewDisplay").removeClass("d-none");
	});
	$("#btnCancelNewUser").on("click", () => {
		$("NewDisplay").addClass("d-none");
		$("loginDisplay").removeClass("d-none");
	});
	$("#btnCancelChangePW").on("click", () => {
		$("ChangeDisplay").addClass("d-none");
		$("SelectDisplay").removeClass("d-none");
	});
	$("#btnPasswortAEndern").on("click", () => {
		$("SelectDisplay").addClass("d-none");
		$("ChangeDisplay").removeClass("d-none");
	});
	$("#btnLogout").on("click", () => {
		Logout();
	});
	$("#Monat").on("change", () => {
		changeMonatJahr();
	});
	$("#Jahr").on("change", () => {
		changeMonatJahr();
	});

	$("#Benutzer2").popover();
	$("#Passwort1").popover();
	$("#Passwort2").popover();
	$("#Passwort3").popover();
	$("#Passwort4").popover();
	$("#Monat").popover();
	$("#Jahr").popover();

	if (localStorage.getItem("Benutzer") && localStorage.getItem("UserID")) {
		let benutzer = localStorage.getItem("Benutzer");
		document.getElementById("Willkommen").innerHTML = `Hallo, ${benutzer}.`;
		document.getElementById("loginDisplay").classList.add("d-none");

		let jahr = localStorage.getItem("Jahr");
		document.getElementById("Jahr").value = jahr;

		let monat = localStorage.getItem("Monat");
		document.getElementById("Monat").value = monat;

		document.getElementById("SelectDisplay").classList.remove("d-none");
		console.log("Benutzer gefunden");

		if (JSON.parse(localStorage.getItem("VorgabenU"))?.pers.TB == "Tarifkraft")
			document.getElementById("AnzeigenN-tab").classList.remove("d-none");

		document.getElementById("tab").classList.remove("d-none");

		SelectYear(monat, jahr);
	}
});

function changeMonatJahr() {
	if (
		document.getElementById("Monat").value != localStorage.getItem("Monat") &&
		document.getElementById("Jahr").value != localStorage.getItem("Jahr")
	) {
		buttonDisable(true);
		document.getElementById("btnAuswaehlen").disabled = false;
		return;
	}
	buttonDisable(false);
}

async function loginUser(
	username = document.getElementById("Benutzer").value,
	passwort = document.getElementById("Passwort").value
) {
	document.getElementById("btnLogin").disabled = true;
	setLoading("btnLogin");

	let data = { Name: username, Passwort: passwort };

	try {
		const response = await fetch(`${API_URL}/login`, {
			mode: "cors",
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});
		const responded = await response.json();
		if (response.status == 200) {
			let UserID = responded.data.UserID;
			console.log({ UserID });
			username = `${username[0].toUpperCase()}${username.substring(1)}`;
			localStorage.setItem("Benutzer", username);
			document.getElementById("Willkommen").innerHTML = `Hallo, ${username}.`;
			document.getElementById("loginDisplay").classList.add("d-none");
			document.getElementById("ChangeDisplay").classList.add("d-none");
			document.getElementById("NewDisplay").classList.add("d-none");

			localStorage.setItem("UserID", UserID);

			const aktJahr = moment().year();
			document.getElementById("Jahr").value = aktJahr;

			const monat = moment().month() + 1;
			document.getElementById("Monat").value = monat;

			document.getElementById("SelectDisplay").classList.remove("d-none");
			document.getElementById("Benutzer").value = "";
			document.getElementById("Passwort").value = "";
			document.getElementById("errorMessage").innerHTML = "";

			console.log("Eingeloggt");
			SelectYear(monat, aktJahr);
		} else {
			document.getElementById("errorMessage").innerHTML = `Fehler beim Login: ${responded.message}`;
		}
	} catch (err) {
		console.log(err.message);
	} finally {
		clearLoading("btnLogin");
	}
}

function SelectYear(monat = document.getElementById("Monat").value, jahr = document.getElementById("Jahr").value) {
	setLoading("btnAuswaehlen");
	document.getElementById("errorMessage").innerHTML = "";

	if (localStorage.getItem("Jahr") && localStorage.getItem("Monat")) {
		if (localStorage.getItem("Jahr") != jahr || localStorage.getItem("Monat") != monat) {
			localStorage.setItem("monatswechsel", true);
		}
	}
	localStorage.setItem("Jahr", jahr);
	localStorage.setItem("Monat", monat);

	const userID = localStorage.getItem("UserID");
	if (!userID) return;

	LadeUserDaten(userID, monat, jahr);
}

function Logout() {
	localStorage.clear();
	document.getElementById("tab").classList.add("d-none");
	document.getElementById("loginDisplay").classList.remove("d-none");
	document.getElementById("NewDisplay").classList.add("d-none");
	document.getElementById("SelectDisplay").classList.add("d-none");
	document.getElementById("Willkommen").innerHTML = "Willkommen";
}

async function checkPasswort() {
	const passwortAlt = document.getElementById("passwortOld").value,
		passwort3 = document.getElementById("Passwort3").value,
		passwort4 = document.getElementById("Passwort4").value;

	if (!passwortAlt) {
		document.getElementById("errorMessage").innerHTML = "Bitte Aktuelles Passwort Eingeben";
		return;
	}
	if (!passwort3) {
		document.getElementById("errorMessage").innerHTML = "Bitte Neues Passwort Eingeben";
		return;
	}
	if (!passwort4) {
		document.getElementById("errorMessage").innerHTML = "Bitte Neues Passwort wiederholen";
		return;
	}
	if (passwort3 != passwort4) {
		document.getElementById("errorMessage").innerHTML = "Passworter falsch wiederholt";
		return;
	}
	if (passwortAlt == passwort3) {
		document.getElementById("errorMessage").innerHTML = "Passwörter Alt und Neu sind gleich";
		return;
	}

	setLoading("btnChange");

	try {
		let data = {
			UserID: localStorage.getItem("UserID"),
			PasswortAlt: passwortAlt,
			PasswortNeu: passwort3,
		};
		const response = await fetch(`${API_URL}/changePW`, {
			mode: "cors",
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});
		const responded = await response.json();
		if (response.status >= 400) {
			console.log(responded.message);
			document.getElementById("errorMessage").innerHTML = responded.message;
			toastr.error("Passwort konnte nicht geändert werden.");
			return;
		}
		if (response.status == 200) {
			console.log(`Passwort geändert: ${responded.data}`);
			toastr.success("Passwort wurde geändert");
			document.getElementById("errorMessage").innerHTML = "";
		} else {
			console.log("Fehler");
			toastr.error("Passwort konnte nicht geändert werden.");
			return;
		}
		document.getElementById("SelectDisplay").classList.remove("d-none");
		document.getElementById("ChangeDisplay").classList.add("d-none");
		document.getElementById("passwortOld").value = "";
		document.getElementById("Passwort3").value = "";
		document.getElementById("Passwort4").value = "";
	} catch (err) {
		console.log(err);
		return;
	} finally {
		clearLoading("btnChange");
	}
}

async function checkNeuerBenutzer() {
	const zugangscode = document.getElementById("Zugang").value,
		benutzer = document.getElementById("Benutzer2").value,
		passwort1 = document.getElementById("Passwort1").value,
		passwort2 = document.getElementById("Passwort2").value;

	if (!zugangscode) {
		document.getElementById("errorMessage").innerHTML = "Bitte Zugangscode Eingeben";
		return;
	}
	if (!benutzer) {
		document.getElementById("errorMessage").innerHTML = "Bitte Benutzername Eingeben";
		return;
	}
	if (!passwort1) {
		document.getElementById("errorMessage").innerHTML = "Bitte Passwort Eingeben";
		return;
	}
	if (!passwort2) {
		document.getElementById("errorMessage").innerHTML = "Bitte Passwort wiederholen";
		return;
	}
	if (passwort1 != passwort2) {
		document.getElementById("errorMessage").innerHTML = "Passwörter falsch wiederholt";
		return;
	}
	setLoading("btnNeu");
	let data = {
		Code: zugangscode,
		Name: benutzer,
		Passwort: passwort1,
	};
	try {
		const response = await fetch(`${API_URL}/add`, {
			mode: "cors",
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});
		const responded = await response.json();
		if (response.status >= 400) {
			console.log(responded.message);
			document.getElementById("errorMessage").innerHTML = responded.message;
			return;
		}
		if (response.status == 201) {
			console.log(`Neue User ID: ${responded.data.UserID}`);
			toastr.success("Benutzer erfolgreich angelegt");
		} else {
			console.log("Fehler: ", responded.message);
			toastr.error(`Fehler bei Benutzerstellung ${responded.message}`);
			return;
		}
	} catch (err) {
		console.log(err);
		return;
	} finally {
		clearLoading("btnNeu");
	}

	document.getElementById("errorMessage").innerHTML = "";

	loginUser(document.getElementById("Benutzer2").value, document.getElementById("Passwort1").value);

	document.getElementById("Zugang").value = "";
	document.getElementById("Benutzer2").value = "";
	document.getElementById("Passwort1").value = "";
	document.getElementById("Passwort2").value = "";
}

async function LadeUserDaten(UserID, monat, jahr) {
	document.getElementById("Monat").value = monat;
	let datum = moment()
		.year(jahr)
		.month(monat - 1);
	document.getElementById("Datum").value = datum.format("YYYY-MM-DD");
	document.getElementById("MonatB").innerText =
		document.getElementById("MonatE").innerText =
		document.getElementById("MonatN").innerText =
		document.getElementById("MonatBerechnung").innerText =
			datum.format("MM / YY");

	let user;
	try {
		const response = await fetch(`${API_URL}/${UserID}&${monat}&${jahr}`, {
			mode: "cors",
			method: "GET",
		});
		const responded = await response.json();
		if (response.status == 200) {
			user = responded.data;
		} else {
			console.log("Fehler: ", responded.message);
			toastr.error("Keine Verbindung zum Server oder Serverfehler");
			return;
		}
	} catch (err) {
		console.log(err);
		return;
	} finally {
		clearLoading("btnAuswaehlen");
	}

	const dataArray = user;

	console.log("Daten geladen: ", dataArray);
	const { vorgabenB, vorgabenU, datenBerechnung, datenGeld } = dataArray,
		dataBZ = dataArray.datenB.datenBZ,
		dataBE = dataArray.datenB.datenBE,
		dataE = dataArray.datenE,
		dataN = dataArray.datenN;

	let vorhanden = [];

	let monatswechsel = false;

	if (localStorage.getItem("monatswechsel")) {
		monatswechsel = true;
		localStorage.removeItem("monatswechsel");
	}

	let dataServer = {};
	if (localStorage.getItem("dataServer")) {
		dataServer = JSON.parse(localStorage.getItem("dataServer"));
		console.log("Unterschiede Server - Client | Bereits vorhanden", dataServer);
	}

	localStorage.setItem("VorgabenB", JSON.stringify(vorgabenB));

	const saveDaten = (nameStorage, name, data, dataName, beschreibung, loadTable = false) => {
		if (!localStorage.getItem(nameStorage)) {
			console.log(`${name} speichern, nicht vorhanden`);
			localStorage.setItem(nameStorage, JSON.stringify(data));
			if (loadTable) FooTable.get(loadTable.name).rows.load(loadTable.data);
		} else if (monatswechsel) {
			console.log(`${name} speichern`);
			localStorage.setItem(nameStorage, JSON.stringify(data));
		} else if (localStorage.getItem(nameStorage) !== JSON.stringify(data)) {
			console.log(`${name} vorhanden & änderungen`);
			if (!vorhanden.find(element => element == beschreibung)) vorhanden.push(beschreibung);
			dataServer[dataName] = data;
			eval(dataName + " = JSON.parse(localStorage.getItem(nameStorage))");
		}
	};

	saveDaten("VorgabenU", "VorgabenU", vorgabenU, "vorgabenU", "Persönliche Daten");
	saveDaten("dataBZ", "DatenBZ", dataBZ, "dataBZ", "Bereitschaftszeit", { name: "#tableBZ", data: DataBZ(dataBZ) });
	saveDaten("dataBE", "DatenBE", dataBE, "dataBE", "Bereitschaftseinsatz", { name: "#tableBE", data: DataBE(dataBE) });
	saveDaten("dataE", "DatenE", dataE, "dataE", "EWT", { name: "#tableE", data: DataE(dataE) });
	saveDaten("dataN", "DatenN", dataN, "dataN", "Nebenbezüge", { name: "#tableN", data: DataN(dataN) });

	localStorage.setItem("datenBerechnung", JSON.stringify(datenBerechnung));
	localStorage.setItem("VorgabenGeld", JSON.stringify(datenGeld));

	if (Object.keys(dataServer).length > 0) console.log("Unterschiede Server - Client", dataServer);

	if (vorhanden.length > 0) {
		localStorage.setItem("dataServer", JSON.stringify(dataServer));

		toastr.info(
			`<pre>${vorhanden.join(
				"\r\n"
			)}<pre><div class="alertstyle"> <button class="btn btn-primary" type="button" onclick="SaveUserDatenUEberschreiben();">Überschreiben</button><button class="btn btn-secondary" type="button" onclick="SaveUserDatenUEberschreiben(false);">Behalten</button></div>`,
			"Ungespeicherte Daten gefunden:",
			{
				positionClass: "toast-bottom-center",
				closeButton: true,
				tapToDismiss: false,
				timeOut: 0,
				extendedTimeOut: 0,
			}
		);
	}

	if (dataServer.dataBZ != null || monatswechsel)
		setTimeout(() => {
			FooTable.get("#tableBZ").rows.load(DataBZ(dataBZ));
		}, 1000);

	if (dataServer.dataBE != null || monatswechsel)
		setTimeout(() => {
			FooTable.get("#tableBE").rows.load(DataBE(dataBE));
		}, 1000);

	if (dataServer.dataE != null || monatswechsel)
		setTimeout(() => {
			FooTable.get("#tableE").rows.load(DataE(dataE));
		}, 1000);

	if (dataServer.dataN != null || monatswechsel)
		setTimeout(() => {
			FooTable.get("#tableN").rows.load(DataN(dataN));
		}, 1000);

	generateTableBerechnung(datenBerechnung, datenGeld);
	generateEingabeMaskeEinstellungen(vorgabenU);
	clearLoading("btnAuswaehlen");
	buttonDisable(false);
	if (vorgabenU.pers.TB == "Tarifkraft") document.getElementById("AnzeigenN-tab").classList.remove("d-none");
	document.getElementById("tab").classList.remove("d-none");
	toastr.success("Neue Daten geladen");
}

function SaveUserDatenUEberschreiben(ueberschreiben = true) {
	if (!ueberschreiben) {
		localStorage.removeItem("dataServer");
		toastr.remove();
		return;
	}
	let dataServer = JSON.parse(localStorage.getItem("dataServer"));
	console.log({ dataServer });
	if (dataServer.vorgabenU) {
		console.log("VorgabenU überschreiben");
		localStorage.setItem("VorgabenU", JSON.stringify(dataServer.vorgabenU));
		generateEingabeMaskeEinstellungen(dataServer.vorgabenU);
		delete dataServer.vorgabenU;
	}
	if (dataServer.dataBZ) {
		console.log("DatenBZ überschreiben");
		localStorage.setItem("dataBZ", JSON.stringify(dataServer.dataBZ));
		FooTable.get("#tableBZ").rows.load(DataBZ(dataServer.dataBZ));
		delete dataServer.dataBZ;
	}
	if (dataServer.dataBE) {
		console.log("DatenBE überschreiben");
		localStorage.setItem("dataBE", JSON.stringify(dataServer.dataBE));
		FooTable.get("#tableBE").rows.load(DataBE(dataServer.dataBE));
		delete dataServer.dataBE;
	}
	if (dataServer.dataE) {
		console.log("DatenE überschreiben");
		localStorage.setItem("dataE", JSON.stringify(dataServer.dataE));
		FooTable.get("#tableE").rows.load(DataE(dataServer.dataE));
		delete dataServer.dataE;
	}
	if (dataServer.dataN) {
		console.log("DatenN überschreiben");
		localStorage.setItem("dataN", JSON.stringify(dataServer.dataN));
		FooTable.get("#tableN").rows.load(DataN(dataServer.dataN));
		delete dataServer.dataN;
	}

	localStorage.removeItem("dataServer");
	toastr.remove();
}
