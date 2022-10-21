jQuery(function ($) {
  var $modalE = $("#editor-modalE"),
    $editorE = $("#editorE"),
    $editorTitleE = $("#editor-titleE"),
    ftE = FooTable.init("#tableE", {
      columns: [
        {
          name: "tagE",
          title: "Tag",
          sortable: true,
          sorted: true,
          direction: "ASC",
        },
        { name: "eOrtE", title: "Einsatzort", sortable: false },
        { name: "schichtE", title: "Schicht", sortable: false },
        {
          name: "abWE",
          title: "Ab Wohnung",
          sortable: false,
          breakpoints: "xs sm md",
        },
        {
          name: "ab1E",
          title: "Ab 1.Tgk.-St.",
          sortable: false,
          breakpoints: "xs sm",
        },
        {
          name: "anEE",
          title: "An Einsatzort",
          sortable: false,
          breakpoints: "xs",
        },
        {
          name: "beginE",
          title: "Arbeitszeit Von",
          sortable: false,
          breakpoints: "xs",
        },
        {
          name: "endeE",
          title: "Arbeitszeit Bis",
          sortable: false,
          breakpoints: "xs",
        },
        {
          name: "abEE",
          title: "Ab Einsatzort",
          sortable: false,
          breakpoints: "xs",
        },
        {
          name: "an1E",
          title: "An 1.Tgk.-St.",
          sortable: false,
          breakpoints: "xs sm",
        },
        {
          name: "anWE",
          title: "An Wohnung",
          sortable: false,
          breakpoints: "xs sm md",
        },
        {
          name: "berechnen",
          title: "",
          sortable: false,
          visible: false,
        },
        {
          name: "_checkbox",
          title: "Berechnen?",
          visible: true,
          sortable: false,
          breakpoints: "xs sm md",
        },
      ],
      rows: DataE(),
      empty: "Keine Daten verfügbar",
      sorting: { enabled: true },
      editing: {
        enabled: true,
        position: "left",
        showText:
          '<span class="material-icons-round" aria-hidden="true">edit</span> Bearbeiten',
        hideText: "Fertig",
        addText: "Neue Zeile",
        editText:
          '<span class="material-icons-round" aria-hidden="true">edit</span>',
        deleteText:
          '<span class="material-icons-round" aria-hidden="true">delete</span>',
        addRow: function () {
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
        editRow: function (row) {
          var values = row.val();
          console.log(values);
          $editorE.find("#tagE2").val(
            moment(values.tagE, "DD.MM.YYYY")
              .year(localStorage.getItem("Jahr"))
              .month(localStorage.getItem("Monat") - 1)
              .format("YYYY-MM-DD")
          );
          //$editorE.find('#eOrtE').val(values.eOrtE);
          $editorE.find("#schichtE").val(values.schichtE);
          $editorE
            .find("#abWE")
            .val(moment(values.abWE, "HH:mm").format("HH:mm"));
          $editorE
            .find("#ab1E")
            .val(moment(values.ab1E, "HH:mm").format("HH:mm"));
          $editorE
            .find("#anEE")
            .val(moment(values.anEE, "HH:mm").format("HH:mm"));
          $editorE
            .find("#beginE")
            .val(moment(values.beginE, "HH:mm").format("HH:mm"));
          $editorE
            .find("#endeE")
            .val(moment(values.endeE, "HH:mm").format("HH:mm"));
          $editorE
            .find("#abEE")
            .val(moment(values.abEE, "HH:mm").format("HH:mm"));
          $editorE
            .find("#an1E")
            .val(moment(values.an1E, "HH:mm").format("HH:mm"));
          $editorE
            .find("#anWE")
            .val(moment(values.anWE, "HH:mm").format("HH:mm"));
          $editorE
            .find("#berechnen")
            .prop("checked", JSON.parse(values.berechnen));

          $modalE.data("row", row);
          $editorTitleE.text("Anwesenheit Bearbeiten");
          $modalE.modal("show");
          $editorE.find("#eOrtE").val(values.eOrtE);
        },
        deleteRow: function (row) {
          row.delete();
          setTimeout(function () {
            saveTableData("tableE", ftE);
          }, 100);
        },
      },
    });

  console.log(ftE);

  $editorE.on("submit", function (e) {
    if (this.checkValidity && !this.checkValidity()) return;
    e.preventDefault();
    var row = $modalE.data("row"),
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
    if (JSON.parse(values.berechnen) == true) {
      values._checkbox =
        '<div class="form-check form-switch"><input type="checkbox" class="row-checkbox form-check-input" checked></div>';
    } else {
      values._checkbox =
        '<div class="form-check form-switch"><input type="checkbox" class="row-checkbox form-check-input"></div>';
    }
    $editorE.find("#tagE2").removeAttr("min").removeAttr("max");
    //console.log(values)

    if (row instanceof FooTable.Row) {
      row.val(values);
    } else {
      ftE.rows.add(values);
    }

    setTimeout(function () {
      saveTableData("tableE", ftE);
    }, 100);

    $modalE.modal("hide");
  });
  $tableE = $("#tableE");
  $tableE.on("click", ".row-checkbox", function () {
    var newValues = {};
    var row;
    console.log($(this).closest("tr").has("th").length);
    if ($(this).closest("tr").has("th").length == 1) {
      row = $(this)
        .closest("tr")
        .parent()
        .closest("tr")
        .prev()
        .data("__FooTableRow__");
    } else {
      row = $(this).closest("tr").data("__FooTableRow__");
    }
    if ($(this).prop("checked")) {
      //Prepare Values
      newValues.berechnen = "true";
      newValues._checkbox =
        '<div class="form-check form-switch"><input type="checkbox" class="row-checkbox form-check-input" checked></div>';
    } else {
      //Prepare Values
      newValues.berechnen = "false";
      newValues._checkbox =
        '<div class="form-check form-switch"><input type="checkbox" class="row-checkbox form-check-input"></div>';
    }
    row.val(newValues, true);

    setTimeout(function () {
      saveTableData("tableE", ftE);
    }, 100);
  });
});

function DataE(data) {
  //console.log(data)
  if (data == null) {
    if (localStorage.getItem("dataE") == null) return [];
    data = JSON.parse(localStorage.getItem("dataE"));
  }
  //console.log(data)
  var data1 = [];
  data.forEach((row, i) => {
    //console.log(row)
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
    if (JSON.parse(data1[i].berechnen) == true) {
      data1[i]._checkbox =
        '<div class="form-check form-switch"><input type="checkbox" class="row-checkbox form-check-input" checked></div>';
    } else {
      data1[i]._checkbox =
        '<div class="form-check form-switch"><input type="checkbox" class="row-checkbox form-check-input"></div>';
    }
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
  //console.log(daten)

  daten.forEach(function (zeile) {
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

  //console.log(daten)

  var beginn,
    ende,
    svzA,
    svzE,
    datumAbW,
    datumAb1,
    datumAnE,
    datumBeginn,
    datumEnde,
    datumAbE,
    datumAn1,
    datumAnW;

  // Wandle vorgabenU um
  //console.log("vorgabenU: ", vorgabenU)

  var endePascal = moment.duration(0, "m");
  //console.log(vorgabenU.pers.Name)
  if (vorgabenU.pers.Name == "Ackermann, Pascal") {
    endePascal = moment.duration(5, "minute"); //5 * 1000 * 60;
  }
  //console.log(endePascal)

  var vorgabenE = vorgabenU.aZ;
  for (const [key, value] of Object.entries(vorgabenE)) {
    vorgabenE[key] = moment.duration(value);
  }
  vorgabenE.fZ = {};
  for (const [key, value] of Object.entries(vorgabenU.fZ)) {
    vorgabenE.fZ[key] = moment.duration(value[1]);
  }

  // Beginn der Berechnung
  for (var i = 0; i < daten.length; i++) {
    if (JSON.parse(daten[i][11]) == false) continue;
    var datum = moment([jahr, monat - 1, daten[i][0]]);
    var schicht = daten[i][2];
    switch (schicht) {
      case "N":
        //console.log("Nachtschicht")
        beginn = moment.duration(vorgabenE.bN);
        ende = moment.duration(vorgabenE.eN).add(1, "d");
        svzA = moment.duration(45, "m");
        svzE = moment.duration(svzA);
        break;
      case "S":
        //console.log("Sonderschicht")
        beginn = moment.duration(vorgabenE.bS);
        ende = moment.duration(vorgabenE.eS);
        svzA = moment.duration(20, "m");
        svzE = moment.duration(svzA);
        break;
      case "BN":
        //console.log("Nachtschicht Bereitschaft")
        beginn = moment.duration(vorgabenE.bBN);
        ende = moment.duration(vorgabenE.eN).add(1, "d");
        svzA = moment.duration(60, "m");
        svzE = moment.duration(45, "m");
        break;
      case "":
        //console.log("ohne Schicht")
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
    if (daten[i][6] === "") {
      datumBeginn = moment(datum).add(beginn);
      daten[i][6] = datumBeginn;
    } else {
      datumBeginn = daten[i][6];
    }
    //console.log(datumBeginn)
    // Arbeitszeit Ende
    if (daten[i][7] === "") {
      datumEnde = moment(datum).add(ende);
      daten[i][7] = datumEnde;
    } else {
      datumEnde = daten[i][7];
    }
    //console.log(datumEnde)
    // Ab Wohnung
    if (daten[i][3] === "") {
      datumAbW = moment(datumBeginn).subtract(vorgabenE.rZ);
      daten[i][3] = datumAbW;
    }
    // Ab erste Tätigkeitsstätte
    if (daten[i][4] === "") {
      datumAb1 = moment(datumBeginn).add(svzA);
      daten[i][4] = datumAb1;
    } else {
      datumAb1 = daten[i][4];
    }
    // An erste Tätigkeitsstätte
    if (daten[i][9] === "") {
      datumAn1 = moment(datumEnde).subtract(svzE);
      daten[i][9] = datumAn1;
    } else {
      datumAn1 = daten[i][9];
    }
    // An Wohnung
    if (daten[i][10] === "") {
      datumAnW = moment(datumEnde).add(vorgabenE.rZ).add(endePascal);
      daten[i][10] = datumAnW;
    }
    if (daten[i][1] !== "") {
      //console.log("Arbeitsort: ", daten[i][1])
      //console.log("Zeit Arbeitsort: ", vorgabenE.fZ[daten[i][1]])
      // An Einsatzort
      if (daten[i][5] === "") {
        datumAnE = moment(datumAb1).add(vorgabenE.fZ[daten[i][1]]);
        daten[i][5] = datumAnE;
      }
      // Ab Einsatzort
      if (daten[i][8] === "") {
        datumAbE = moment(datumAn1).subtract(vorgabenE.fZ[daten[i][1]]);
        daten[i][8] = datumAbE;
      }
    }
    //console.log("Daten Tag bearbeitet: ", daten[i])
  }
  //console.log(daten)

  daten.forEach((zeile) => {
    if (JSON.parse(zeile[11]) == false) return;
    //Logger.log(zeile)
    zeile[0] = `0${zeile[0]}`.slice(-2);
    for (var i = 3; i <= 10; i++) {
      //console.log(zeile[i])
      if (zeile[i]) zeile[i] = moment(zeile[i]).format("HH:mm");
    }
  });

  //console.log(daten)

  let ftE = FooTable.get("#tableE");
  console.log("save ", ftE);
  ftE.rows.load(DataE(daten));

  setTimeout(function () {
    saveTableData("tableE", ftE);
  }, 100);

  toastr.success("Zeiten berechnet, Bitte Manuell speichern");
}

function generateEditorModalE(eOrt) {
  var vorgabenU = JSON.parse(localStorage.getItem("VorgabenU")),
    eOrt = document.getElementById(eOrt);

  eOrt.innerHTML = "";

  let opt = document.createElement("option");
  opt.value = "";
  opt.innerText = "";
  eOrt.append(opt);

  for (key of Object.keys(vorgabenU.fZ)) {
    opt = document.createElement("option");
    opt.value = key;
    opt.innerText = key;
    eOrt.append(opt);
  }
}

function generateEingabeMaskeEWT() {
  var dataE = tableToArray("#tableE"),
    monat = document.getElementById("Monat").value,
    jahr = document.getElementById("Jahr").value;

  document.getElementById("tagE").min = moment([jahr, monat - 1, 1])
    .startOf("month")
    .format("YYYY-MM-DD");
  document.getElementById("tagE").max = moment([jahr, monat - 1, 1])
    .endOf("month")
    .format("YYYY-MM-DD");

  if (dataE.length == 0) return naechsterTag("0", []);

  //console.log('Test')

  dataE.forEach((value, index, dataE) => {
    dataE[index] = Number(value[0]);
  });
  //console.log(dataE)

  var max = dataE.reduce((a, b) => {
    return Math.max(a, b);
  }, -Infinity);
  //console.log(max)

  naechsterTag(max, dataE);
}

function naechsterTag(tag, dataE) {
  //console.log("nächster Tag")
  if (tag == null) tag = moment(document.getElementById("tagE").value).date();
  if (tag == "") tag = 1;
  var monat = document.getElementById("Monat").value,
    jahr = document.getElementById("Jahr").value;

  if (dataE == null) {
    dataE = tableToArray("#tableE");
    //console.log(dataE)

    dataE.forEach((value, index, dataE) => {
      dataE[index] = Number(value[0]);
    });
    //console.log(dataE)
  }

  var letzterTag = moment(document.getElementById("tagE").max).date();
  //console.log(letzterTag)

  do {
    tag = Number(tag) + 1;
    //console.log(tag)
    if (dataE.length > 0) {
      var found = dataE.find((element) => Number(element) == Number(tag));
    } else {
      found = undefined;
    }
    //console.log(found)
  } while (found != undefined);

  if (tag <= letzterTag) {
    document.getElementById("tagE").value = moment([
      jahr,
      monat - 1,
      tag,
    ]).format("YYYY-MM-DD");
  } else {
    naechsterTag("0", dataE);
  }
  return;
}

function addEWTtag() {
  var tag = `0${document.getElementById("tagE").value}`.slice(-2),
    ort = document.getElementById("EOrt").value,
    schicht = document.getElementById("Schicht").value;

  naechsterTag(tag);

  var data = [[tag, ort, schicht, "", "", "", "", "", "", "", "", true]];

  let ftE = FooTable.get("#tableE");
  console.log("save ", ftE);
  ftE.rows.load(DataE(data), true);

  setTimeout(function () {
    saveTableData("tableE", ftE);
  }, 100);
}