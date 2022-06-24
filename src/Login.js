if (localStorage.getItem("Benutzer") && localStorage.getItem("UserID")) {
  var benutzer = localStorage.getItem("Benutzer");
  document.getElementById("Willkommen").innerHTML = `Hallo, ${benutzer}.`;
  document.getElementById("loginDisplay").classList.add("d-none");

  var jahr = localStorage.getItem("Jahr");
  document.getElementById("Jahr").value = jahr;

  var monat = localStorage.getItem("Monat");
  document.getElementById("Monat").value = monat;

  document.getElementById("SelectDisplay").classList.remove("d-none");
  console.log("Benutzer gefunden");

  if (localStorage.getItem("VorgabenU")) {
    if (JSON.parse(localStorage.getItem("VorgabenU")).pers.TB == "Tarifkraft")
      document.getElementById("AnzeigenN-tab").classList.remove("d-none");
  }

  document.getElementById("tab").classList.remove("d-none");

  SelectYear(monat, jahr);
}

async function loginUser(username, passwort) {
  if (username == null) {
    username = document.getElementById("Benutzer").value;
  }
  if (passwort == null) {
    passwort = document.getElementById("Passwort").value;
  }
  document.getElementById("btnLogin").disabled = true;
  setLoading("btnLogin");

  let data = { Name: username, Passwort: passwort };

  try {
    const response = await fetch(`${API_URL}/checkpw`, {
      mode: "cors",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const userID = await response.json();
    //console.log("Request complete! response:", response);
    if (response.status == 200) {
      console.log(userID.userID);
      username = `${username[0].toUpperCase()}${username.substring(1)}`;
      localStorage.setItem("Benutzer", username);
      document.getElementById("Willkommen").innerHTML = `Hallo, ${username}.`;
      document.getElementById("loginDisplay").classList.add("d-none");
      document.getElementById("ChangeDisplay").classList.add("d-none");
      document.getElementById("NewDisplay").classList.add("d-none");

      localStorage.setItem("UserID", userID.userID);

      var aktJahr = moment().year();
      document.getElementById("Jahr").value = aktJahr;

      var monat = moment().month() + 1;
      document.getElementById("Monat").value = monat;

      document.getElementById("SelectDisplay").classList.remove("d-none");
      document.getElementById("Benutzer").value = "";
      document.getElementById("Passwort").value = "";
      document.getElementById("errorMessage").innerHTML = "";

      console.log("Eingeloggt");
      SelectYear(monat, aktJahr);
    } else {
      document.getElementById(
        "errorMessage"
      ).innerHTML = `Fehler beim Login: ${userID.message}`;
    }
  } catch (err) {
    console.log(err.message);
  } finally {
    clearLoading("btnLogin");
  }
}

function SelectYear(monat, jahr) {
  setLoading("btnAuswaehlen");
  document.getElementById("errorMessageSelect").innerHTML = "";

  if (!monat) monat = document.getElementById("Monat").value;
  if (!jahr) jahr = document.getElementById("Jahr").value;

  if (localStorage.getItem("Jahr") && localStorage.getItem("Monat")) {
    if (
      localStorage.getItem("Jahr") != jahr ||
      localStorage.getItem("Monat") != monat
    ) {
      localStorage.setItem("monatswechsel", true);
    }
  }

  localStorage.setItem("Jahr", jahr);
  localStorage.setItem("Monat", monat);

  var userID = localStorage.getItem("UserID");

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
  var passwortAlt = document.getElementById("passwortOld").value;
  var passwort3 = document.getElementById("Passwort3").value;
  var passwort4 = document.getElementById("Passwort4").value;

  if (!passwortAlt) {
    document.getElementById("errorMessageChange").innerHTML =
      "Bitte Aktuelles Passwort Eingeben";
    return;
  }
  if (!passwort3) {
    document.getElementById("errorMessageChange").innerHTML =
      "Bitte Neues Passwort Eingeben";
    return;
  }
  if (!passwort4) {
    document.getElementById("errorMessageChange").innerHTML =
      "Bitte Neues Passwort wiederholen";
    return;
  }
  if (passwort3 != passwort4) {
    document.getElementById("errorMessageChange").innerHTML =
      "Passworter falsch wiederholt";
    return;
  }
  if (passwortAlt == passwort3) {
    document.getElementById("errorMessageChange").innerHTML =
      "Passwörter Alt und neu sind gleich";
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
    user = await response.json();
    if (response.status >= 400 || response.status <= 500) {
      console.log(user.message);
      document.getElementById("errorMessageChange").innerHTML = user.message;
      toastr.error("Passwort konnte nicht geändert werden.");
      return;
    }
    if (response.status == 200) {
      console.log(`Passwort geändert: ${user}`);
      toastr.success("Passwort wurde geändert");
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
  var zugangscode = document.getElementById("Zugang").value;
  var benutzer = document.getElementById("Benutzer2").value;
  var passwort1 = document.getElementById("Passwort1").value;
  var passwort2 = document.getElementById("Passwort2").value;

  if (!zugangscode) {
    document.getElementById("errorMessageNew").innerHTML =
      "Bitte Zugangscode Eingeben";
    return;
  }
  if (!benutzer) {
    document.getElementById("errorMessageNew").innerHTML =
      "Bitte Benutzername Eingeben";
    return;
  }
  if (!passwort1) {
    document.getElementById("errorMessageNew").innerHTML =
      "Bitte Passwort Eingeben";
    return;
  }
  if (!passwort2) {
    document.getElementById("errorMessageNew").innerHTML =
      "Bitte Passwort wiederholen";
    return;
  }
  if (passwort1 != passwort2) {
    document.getElementById("errorMessageNew").innerHTML =
      "Passwörter falsch wiederholt";
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
    var user = await response.json();
    if (response.status == 401) {
      console.log(user.message);
      document.getElementById("errorMessageNew").innerHTML = user.message;
      return;
    }
    if (response.status == 201) {
      console.log(`Neue User ID: ${user}`);
      toastr.success("Benutzer erfolgreich angelegt");
    } else {
      console.log("Fehler: ", user.message);
      toastr.error(`Fehler bei Benutzerstellung ${user.message}`);
      return;
    }
  } catch (err) {
    console.log(err);
    return;
  } finally {
    clearLoading("btnNeu");
  }

  document.getElementById("errorMessageNew").innerHTML = "";

  loginUser(
    document.getElementById("Benutzer2").value,
    document.getElementById("Passwort1").value
  );

  document.getElementById("Zugang").value = "";
  document.getElementById("Benutzer2").value = "";
  document.getElementById("Passwort1").value = "";
  document.getElementById("Passwort2").value = "";
}

async function LadeUserDaten(UserID, monat, jahr) {
  document.getElementById("Monat").value = monat;
  let datum = moment().year(jahr).month(monat);
  let datumkurz = datum.format("MM / YY");
  document.getElementById("Datum").value = datum.format("YYYY-MM-DD");
  document.getElementById("MonatB").innerText = datumkurz;
  document.getElementById("MonatE").innerText = datumkurz;
  document.getElementById("MonatN").innerText = datumkurz;
  document.getElementById("MonatBerechnung").innerText = datumkurz;

  let user;
  try {
    const response = await fetch(`${API_URL}/${UserID}&${monat}&${jahr}`, {
      mode: "cors",
      method: "GET",
    });
    user = await response.json();
    if (response.status == 200) {
      console.log(user);
    } else {
      console.log("Fehler: ", user.message);
      toastr.error("Keine Verbindung zum Server oder Serverfehler");
      return;
    }
  } catch (err) {
    console.log(err);
    return;
  } finally {
    clearLoading("btnAuswaehlen");
  }

  var dataArray = user;

  console.log("Daten geladen: ", dataArray);
  var vorgabenB = dataArray.vorgabenB;
  var vorgabenU = dataArray.vorgabenU;
  var dataBZ = dataArray.datenB.datenBZ;
  var dataBE = dataArray.datenB.datenBE;
  var dataE = dataArray.datenE;
  var dataN = dataArray.datenN;
  var datenBerechnung = dataArray.datenBerechnung;
  var datenGeld = dataArray.datenGeld;

  var vorhanden = [];

  var monatswechsel = false;

  if (localStorage.getItem("monatswechsel")) {
    monatswechsel = true;
    localStorage.removeItem("monatswechsel");
  }

  if (localStorage.getItem("dataServer")) {
    dataServer = JSON.parse(localStorage.getItem("dataServer"));
    console.log("Unterschiede Server - Client | Bereits vorhanden", dataServer);
  } else {
    var dataServer = {};
  }

  localStorage.setItem("VorgabenB", JSON.stringify(vorgabenB));

  if (!localStorage.getItem("VorgabenU")) {
    console.log("VorgabenU speichern, nicht vorhanden");
    localStorage.setItem("VorgabenU", JSON.stringify(vorgabenU));
  } else if (monatswechsel) {
    console.log("VorgabenU speichern");
    localStorage.setItem("VorgabenU", JSON.stringify(vorgabenU));
  } else if (localStorage.getItem("VorgabenU") !== JSON.stringify(vorgabenU)) {
    console.log("VorgabenU vorhanden & änderungen");
    if (!vorhanden.find((element) => element == "Persönliche Daten"))
      vorhanden.push("Persönliche Daten");
    dataServer.vorgabenU = vorgabenU;
    vorgabenU = JSON.parse(localStorage.getItem("VorgabenU"));
  }

  if (!localStorage.getItem("dataBZ")) {
    console.log("DatenBZ speichern, nicht vorhanden");
    localStorage.setItem("dataBZ", JSON.stringify(dataBZ));
    FooTable.get("#tableBZ").rows.load(DataBZ(dataBZ));
  } else if (monatswechsel) {
    console.log("DatenBZ speichern");
    localStorage.setItem("dataBZ", JSON.stringify(dataBZ));
  } else if (localStorage.getItem("dataBZ") !== JSON.stringify(dataBZ)) {
    console.log("DatenBZ vorhanden & änderungen");
    vorhanden.push("Bereitschaftszeit");
    dataServer.dataBZ = dataBZ;
    dataBZ = JSON.parse(localStorage.getItem("dataBZ"));
  }

  if (!localStorage.getItem("dataBE")) {
    console.log("DatenBE speichern, nicht vorhanden");
    localStorage.setItem("dataBE", JSON.stringify(dataBE));
    FooTable.get("#tableBE").rows.load(DataBE(dataBE));
  } else if (monatswechsel) {
    console.log("DatenBE speichern");
    localStorage.setItem("dataBE", JSON.stringify(dataBE));
  } else if (localStorage.getItem("dataBE") !== JSON.stringify(dataBE)) {
    console.log("DatenBE vorhanden & änderungen");
    vorhanden.push("Bereitschaftseinsatz");
    dataServer.dataBE = dataBE;
    dataBE = JSON.parse(localStorage.getItem("dataBE"));
  }

  if (!localStorage.getItem("dataE")) {
    console.log("DatenE speichern, nicht vorhanden");
    localStorage.setItem("dataE", JSON.stringify(dataE));
    FooTable.get("#tableE").rows.load(DataE(dataE));
  } else if (monatswechsel) {
    console.log("DatenE speichern");
    localStorage.setItem("dataE", JSON.stringify(dataE));
  } else if (localStorage.getItem("dataE") !== JSON.stringify(dataE)) {
    console.log("DatenE vorhanden & änderungen");
    vorhanden.push("EWT");
    dataServer.dataE = dataE;
    dataE = JSON.parse(localStorage.getItem("dataE"));
  }

  if (!localStorage.getItem("dataN")) {
    console.log("DatenN speichern, nicht vorhanden");
    localStorage.setItem("dataN", JSON.stringify(dataN));
    FooTable.get("#tableN").rows.load(DataN(dataN));
  } else if (monatswechsel) {
    console.log("DatenN speichern");
    localStorage.setItem("dataN", JSON.stringify(dataN));
  } else if (localStorage.getItem("dataN") !== JSON.stringify(dataN)) {
    console.log("DatenN vorhanden & änderungen");
    vorhanden.push("Nebenbezüge");
    dataServer.dataN = dataN;
    dataN = JSON.parse(localStorage.getItem("dataN"));
  }

  localStorage.setItem("datenBerechnung", JSON.stringify(datenBerechnung));
  localStorage.setItem("VorgabenGeld", JSON.stringify(datenGeld));

  if (Object.keys(dataServer).length > 0)
    console.log("Unterschiede Server - Client", dataServer);

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

  if (dataServer.dataBZ != null || monatswechsel == true)
    setTimeout(function () {
      FooTable.get("#tableBZ").rows.load(DataBZ(dataBZ));
    }, 1000);
  if (dataServer.dataBE != null || monatswechsel == true)
    setTimeout(function () {
      FooTable.get("#tableBE").rows.load(DataBE(dataBE));
    }, 1000);
  var eingabeZeit = document.getElementById("eingabeZeit");
  eingabeZeit.addEventListener("show.bs.modal", () => {
    generateEingabeMaskeZeiten(JSON.parse(localStorage.getItem("VorgabenB")));
  });
  var eingabeEinsatz = document.getElementById("eingabeEinsatz");
  eingabeEinsatz.addEventListener("show.bs.modal", () => {
    generateEingabeMaskeEinsatz();
  });
  var eingabeModalBE = document.getElementById("editor-modalBE");
  eingabeModalBE.addEventListener("show.bs.modal", () => {
    generateEditorModalN("tagBE");
  });

  if (dataServer.dataE != null || monatswechsel == true)
    setTimeout(function () {
      FooTable.get("#tableE").rows.load(DataE(dataE));
    }, 1000);
  var eingabeEWT = document.getElementById("eingabeEWT");
  eingabeEWT.addEventListener("show.bs.modal", () => {
    generateEingabeMaskeEWT();
    generateEditorModalE("EOrt");
  });
  var editorModalE = document.getElementById("editor-modalE");
  editorModalE.addEventListener("show.bs.modal", () => {
    generateEditorModalE("eOrtE");
    generateEditorModalN("tagE2");
  });

  if (dataServer.dataN != null || monatswechsel == true)
    setTimeout(function () {
      FooTable.get("#tableN").rows.load(DataN(dataN));
    }, 1000);
  var eingabeNeben = document.getElementById("eingabeNeben");
  eingabeNeben.addEventListener("show.bs.modal", () => {
    generateEingabeMaskeNeben();
  });
  var editorModalN = document.getElementById("editor-modalN");
  editorModalN.addEventListener("show.bs.modal", () => {
    generateEditorModalN("tagN2");
  });

  generateTableBerechnung(datenBerechnung, datenGeld);

  generateEingabeMaskeEinstellungen(vorgabenU);

  clearLoading("btnAuswaehlen");
  buttonDisable(false);

  if (vorgabenU.pers.TB == "Tarifkraft")
    document.getElementById("AnzeigenN-tab").classList.remove("d-none");

  document.getElementById("tab").classList.remove("d-none");

  toastr.success("Neue Daten geladen");
  return;
}

function SaveUserDatenUEberschreiben(ueberschreiben = true) {
  //console.log(ueberschreiben)
  if (!ueberschreiben) {
    localStorage.removeItem("dataServer");
    toastr.remove();
    return;
  }
  var dataServer = JSON.parse(localStorage.getItem("dataServer"));

  console.log(dataServer);

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
