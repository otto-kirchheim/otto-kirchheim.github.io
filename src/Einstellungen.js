jQuery($ => {
	$("#formEinstellungen").on("submit", e => {
		e.preventDefault();
		saveDaten(document.getElementById("btnUEbernehmenES"));
	});

	if (localStorage.getItem("VorgabenU"))
		generateEingabeMaskeEinstellungen(JSON.parse(localStorage.getItem("VorgabenU")));
});

function generateEingabeMaskeEinstellungen(VorgabenU) {
	Object.keys(VorgabenU.pers).forEach(key => {
		document.getElementById(key).value = VorgabenU.pers[key];
	});

	Object.keys(VorgabenU.aZ).forEach(key => {
		document.getElementById(key).value = VorgabenU.aZ[key];
	});

	let tbody = document.getElementById("TbodyTätigkeitsstätten");
	tbody.innerHTML = "";

	let td, input;
	for (const key in VorgabenU.fZ) {
		let tr = tbody.insertRow();
		td = tr.insertCell(0);
		input = document.createElement("input");
		input.setAttribute("type", "Text");
		input.setAttribute("class", "form-control");
		input.setAttribute("value", key);
		td.appendChild(input);

		td = tr.insertCell(1);
		input = document.createElement("input");
		input.setAttribute("type", "Text");
		input.setAttribute("class", "form-control");
		input.setAttribute("value", VorgabenU.fZ[key][0]);
		td.appendChild(input);

		td = tr.insertCell(2);
		input = document.createElement("input");
		input.setAttribute("type", "time");
		input.setAttribute("class", "form-control");
		input.setAttribute("value", VorgabenU.fZ[key][1]);
		td.appendChild(input);
	}

	for (let i = 0; i < 5; i++) {
		let tr = tbody.insertRow();
		let input;
		td = tr.insertCell(0);
		input = document.createElement("input");
		input.setAttribute("type", "Text");
		input.setAttribute("class", "form-control");
		input.setAttribute("value", "");
		td.appendChild(input);

		td = tr.insertCell(1);
		input = document.createElement("input");
		input.setAttribute("type", "Text");
		input.setAttribute("class", "form-control");
		input.setAttribute("value", "");
		td.appendChild(input);

		td = tr.insertCell(2);
		input = document.createElement("input");
		input.setAttribute("type", "time");
		input.setAttribute("class", "form-control");
		input.setAttribute("value", "");
		td.appendChild(input);
	}
}

function saveEinstellungen() {
	let VorgabenU = JSON.parse(localStorage.getItem("VorgabenU"));

	Object.keys(VorgabenU.pers).forEach(key => {
		VorgabenU.pers[key] = document.getElementById(key).value;
	});

	Object.keys(VorgabenU.aZ).forEach(key => {
		VorgabenU.aZ[key] = document.getElementById(key).value;
	});
	VorgabenU.fZ = table_to_array_einstellungen("TbodyTätigkeitsstätten");
	if (VorgabenU.pers.TB == "Tarifkraft") {
		document.getElementById("AnzeigenN-tab").classList.remove("d-none");
	} else {
		document.getElementById("AnzeigenN-tab").classList.add("d-none");
	}
	//
	localStorage.setItem("VorgabenU", JSON.stringify(VorgabenU));
}

function table_to_array_einstellungen(table_id) {
	const myData = document.getElementById(table_id).rows;
	let my_liste = {};
	for (const myDatum of myData) {
		let el = myDatum.children;
		const key = el[0].children[0].value;
		if (!key) {
			continue;
		}
		const km = el[1].children[0].value;
		const zeit = el[2].children[0].value;
		my_liste[key] = [km, zeit];
	}

	return my_liste;
}
