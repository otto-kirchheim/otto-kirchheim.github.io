function storageAvailable(type) {
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
}

if (storageAvailable("localStorage")) {
  // Yippee! We can use localStorage awesomeness
  var alertNode = document.querySelector(".alert");
  var alert = new bootstrap.Alert(alertNode);
  alert.close();
}

function autoCollapse(x) {
  const navLinks = document.querySelectorAll(".nav-item");
  if (x.matches) {
    navLinks.forEach((l) => {
      l.setAttribute("data-bs-toggle", "collapse");
      l.setAttribute("data-bs-target", "#navmenu");
    });
  } else {
    navLinks.forEach((l) => {
      l.removeAttribute("data-bs-toggle");
      l.removeAttribute("data-bs-target");
    });
  }
}
var x = window.matchMedia("(max-width: 575.98px)");
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
      data.Daten.EWT = tableToArray("#tableE");
      break;
    case "N":
      data.Daten.N = tableToArray("#tableN");
      break;
  }

  try {
    console.time("download");
    const response = await fetch(`${API_URL}/download/${modus}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (response.status == 200) {
      var data = await response.json();
      var uri = `data:application/pdf;base64,${encodeURIComponent(
        await data.data
      )}`;
      downloadURI(uri, data.name);
      console.timeEnd("download");
    } else {
      console.log("Fehler");
      toastr.error(`Download fehlerhaft: ${data.message}`);
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

async function saveDaten(button) {
  setLoading(button.id);
  buttonDisable(true);
  saveTableData("tableBZ");
  saveTableData("tableBE");
  saveTableData("tableE");
  saveTableData("tableN");
  saveEinstellungen();
  let user;
  try {
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
    const response = await fetch(`${API_URL}/saveData`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    user = await response.json();
    console.log(user);

    if (response.status == 200) {
      generateTableBerechnung(user.datenBerechnung);
      generateEingabeMaskeEinstellungen(user.User);

      let ftBZ = FooTable.get("#tableBZ");
      console.log("save ", ftBZ);
      ftBZ.rows.load(DataBZ(user.daten.datenBZ));

      let ftBE = FooTable.get("#tableBE");
      console.log("save ", ftBE);
      ftBE.rows.load(DataBE(user.daten.datenBE));

      let ftE = FooTable.get("#tableE");
      console.log("save ", ftE);
      ftE.rows.load(DataE(user.daten.datenE));

      let ftN = FooTable.get("#tableN");
      console.log("save ", ftN);
      ftN.rows.load(DataN(user.daten.datenN));

      setTimeout(function () {
        saveTableData("tableBZ", ftBZ);
        saveTableData("tableBE", ftBE);
        saveTableData("tableE", ftE);
        saveTableData("tableN", ftN);
        localStorage.setItem("VorgabenU", JSON.stringify(user.User));
      }, 100);
      console.log("Erfolgreich gespeichert");
      toastr.success("Daten gespeichert");
    } else {
      console.log("Fehler", user.message);
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
      localStorage.setItem(
        "dataBZ",
        JSON.stringify(tableToArray("#tableBZ", ft))
      );
      break;
    case "tableBE":
      localStorage.setItem(
        "dataBE",
        JSON.stringify(tableToArray("#tableBE", ft))
      );
      break;
    case "tableE":
      var data = tableToArray("#tableE", ft);
      data.forEach((value) => value.pop());
      localStorage.setItem("dataE", JSON.stringify(data));
      break;
    case "tableN":
      localStorage.setItem(
        "dataN",
        JSON.stringify(tableToArray("#tableN", ft))
      );
  }
}

function tableToArray(tableID, ft) {
  //console.log("---Table to Array---");
  if (!ft) ft = FooTable.get(tableID);
  var data = ft
    .toCSV()
    .replace(/"/g, "")
    .replace(/^,/gm, "")
    .split("\n")
    .slice(1, -1)
    .map((v) => v.split(","));
  //console.log(data);
  return data;
}

function setLoading(btn) {
  var btn = $(`#${btn}`);
  if (!btn.data("normal-text")) {
    btn.data("normal-text", btn.html());
  }
  if (!btn.data("loading-text")) {
    btn.data(
      "loading-text",
      "<span class='spinner-grow spinner-grow-sm' role='status' aria-hidden='true'></span>"
    );
  }
  btn.prop("disabled", true);
  btn.html(btn.data("loading-text"));
}

function clearLoading(btn) {
  var btn = $(`#${btn}`);
  btn.html(btn.data("normal-text"));
  btn.prop("disabled", false);
}

function buttonDisable(status) {
  document.getElementById("btnUEE").disabled = status;
  document.getElementById("btnDLE").disabled = status;
  document.getElementById("btnZb").disabled = status;

  document.getElementById("btnUEB").disabled = status;
  document.getElementById("btnDLB").disabled = status;

  document.getElementById("btnESN").disabled = status;
  document.getElementById("btnUEN").disabled = status;
  document.getElementById("btnDLN").disabled = status;

  document.getElementById("btnESEE").disabled = status;
  document.getElementById("btnESE").disabled = status;
  document.getElementById("btnESZ").disabled = status;

  document.getElementById("btnAuswaehlen").disabled = status;

  document.getElementById("btnUEbernehmenES").disabled = status;

  var btnALE = document.getElementsByName("btnALE");
  for (let i = 0; i < btnALE.length; i++) {
    btnALE[i].disabled = status;
  }
  var btnALB = document.getElementsByName("btnALB");
  for (let i = 0; i < btnALB.length; i++) {
    btnALB[i].disabled = status;
  }

  if (document.getElementById("btnUEZE")) {
    document.getElementById("btnUEZE").disabled = status;
  }
  if (document.getElementById("btnUEZB")) {
    document.getElementById("btnUEZB").disabled = status;
  }
  if (document.getElementById("btnUEZBE")) {
    document.getElementById("btnUEZBE").disabled = status;
  }

  if (document.getElementById("btnAEE")) {
    var btnAEE = document.getElementsByName("btnAEE");
    for (i = 0; i < btnAEE.length; i++) {
      btnAEE[i].disabled = status;
    }
  }
  if (document.getElementById("btnAEB")) {
    var btnAEB = document.getElementsByName("btnAEB");
    for (i = 0; i < btnAEB.length; i++) {
      btnAEB[i].disabled = status;
    }
  }
  if (document.getElementById("btnAEBE")) {
    var btnAEBE = document.getElementsByName("btnAEBE");
    for (i = 0; i < btnAEBE.length; i++) {
      btnAEBE[i].disabled = status;
    }
  }
  console.log(`Button disabled: ${status}`);
}

function DatenSortieren(daten) {
  daten.sort(function (x, y) {
    var xp = x[0];
    var yp = y[0];
    return xp == yp ? 0 : xp < yp ? -1 : 1;
  });
}
