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
      };
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
    };
  });
  //console.log(data1)
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
}

function ewtBerechnen(monat, jahr, daten, vorgabenU) {
  daten = JSON.parse(daten);
  vorgabenU = JSON.parse(vorgabenU);
  //console.log(daten)

  daten.forEach(function (zeile) {
    var tag = zeile[0];
    zeile[0] = Number(zeile[0]);
    for (var i = 3; i <= 10; i++) {
      if (zeile[i]) {
        if ((i > 6 && zeile[2] == "BN") || zeile[2] == "N") {
          tag = zeile[0] + 1;
        }
        zeile[i] =
          `${moment()
            .year(jahr)
            .month(monat - 1)
            .day(tag)
            .hour(moment(zeile[i], "HH:mm").hour())
            .minute(moment(zeile[i], "HH:mm").minute())
            .format("YYYY-MM-DDTHH:mm:00.000")}Z`;
      } else {
        zeile[i] = "";
      }
    }
  });

  DatenSortieren(daten);

  //console.log(daten)

  var beginn;
  var ende;
  var svzA;
  var svzE;
  var datumAbW;
  var datumAb1;
  var datumAnE;
  var datumBeginn;
  var datumEnde;
  var datumAbE;
  var datumAn1;
  var datumAnW;

  // Konstante Variablen
  const millisTag = 1000 * 60 * 60 * 24;

  // Wandle vorgabenU um
  //console.log("vorgabenU: ", vorgabenU)

  var endePascal = 0;
  //console.log(vorgabenU.pers.Name)
  if (vorgabenU.pers.Name == "Ackermann, Pascal") {
    endePascal = 5 * 1000 * 60;
  }
  //console.log(endePascal)

  var vorgabenE = vorgabenU.aZ;
  for (const [key, value] of Object.entries(vorgabenE)) {
    vorgabenE[key] = new Date(`1970-01-01T${value}:00.000Z`);
  }

  vorgabenE.fZ = vorgabenU.fZ;

  //console.log("VorgabenE: ", vorgabenE)
  //Logger.log(vorgabenE.fZ)

  // Beginn der Berechnung
  for (var i = 0; i < daten.length; i++) {
    //console.log("Daten Tag: ", daten[i])
    var datum = new Date(jahr, monat - 1, daten[i][0]);
    var schicht = daten[i][2];
    //console.log("Datum: ", datum)
    //console.log("Schicht: ", schicht)
    switch (schicht) {
      case "N":
        //console.log("Nachtschicht")
        beginn = vorgabenE.bN;
        ende = new Date(vorgabenE.eN.getTime() + millisTag);
        svzA = 45 * 60 * 1000;
        svzE = svzA;
        break;
      case "S":
        //console.log("Sonderschicht")
        beginn = vorgabenE.bS;
        ende = vorgabenE.eS;
        svzA = 20 * 60 * 1000;
        svzE = svzA;
        break;
      case "BN":
        //console.log("Nachtschicht Bereitschaft")
        beginn = vorgabenE.bBN;
        ende = new Date(vorgabenE.eN.getTime() + millisTag);
        svzA = 60 * 60 * 1000;
        svzE = 45 * 60 * 1000;
        break;
      case "":
        //console.log("ohne Schicht")
        beginn = vorgabenE.bT;
        if (datum.getDay() === 5) {
          ende = vorgabenE.eTF;
        } else {
          ende = vorgabenE.eT;
        }
        svzA = 20 * 60 * 1000;
        svzE = svzA;
        break;
      default:
        throw Error("Schichtfehler");
    }
    //console.log("Beginn: ", beginn)
    //console.log("Ende: ", ende)
    //console.log("TimeZoneOffset: ", datum.getTimezoneOffset() * 60000)

    // Arbeitszeit Beginn
    if (daten[i][6] === "") {
      datumBeginn = new Date(datum.getTime() + beginn.getTime());
      daten[i][6] = datumBeginn;
    } else {
      daten[i][6] = new Date(
        new Date(daten[i][6]).getTime() + datum.getTimezoneOffset() * 60000
      );
      datumBeginn = daten[i][6];
    }
    //console.log(datumBeginn)
    // Arbeitszeit Ende
    if (daten[i][7] === "") {
      datumEnde = new Date(datum.getTime() + ende.getTime());
      daten[i][7] = datumEnde;
    } else {
      daten[i][7] = new Date(
        new Date(daten[i][7]).getTime() + datum.getTimezoneOffset() * 60000
      );
      datumEnde = daten[i][7];
    }
    //console.log(datumEnde)
    // Ab Wohnung
    if (daten[i][3] === "") {
      datumAbW = new Date(datumBeginn.getTime() - vorgabenE.rZ.getTime());
      daten[i][3] = datumAbW;
    } else {
      daten[i][3] = new Date(
        new Date(daten[i][3]).getTime() + datum.getTimezoneOffset() * 60000
      );
    }
    // Ab erste Tätigkeitsstätte
    if (daten[i][4] === "") {
      datumAb1 = new Date(datumBeginn.getTime() + svzA);
      daten[i][4] = datumAb1;
    } else {
      daten[i][4] = new Date(
        new Date(daten[i][4]).getTime() + datum.getTimezoneOffset() * 60000
      );
      datumAb1 = daten[i][4];
    }
    // An erste Tätigkeitsstätte
    if (daten[i][9] === "") {
      datumAn1 = new Date(datumEnde.getTime() - svzE);
      daten[i][9] = datumAn1;
    } else {
      daten[i][9] = new Date(
        new Date(daten[i][9]).getTime() + datum.getTimezoneOffset() * 60000
      );
      datumAn1 = daten[i][9];
    }
    // An Wohnung
    if (daten[i][10] === "") {
      datumAnW = new Date(
        datumEnde.getTime() + vorgabenE.rZ.getTime() + endePascal
      );
      daten[i][10] = datumAnW;
    } else {
      daten[i][10] = new Date(
        new Date(daten[i][10]).getTime() + datum.getTimezoneOffset() * 60000
      );
    }
    if (daten[i][1] !== "") {
      //console.log("Arbeitsort: ", daten[i][1])
      //console.log("Zeit Arbeitsort: ", vorgabenE.fZ[daten[i][1]])
      // An Einsatzort
      if (daten[i][5] === "") {
        datumAnE = new Date(
          datumAb1.getTime() + new Date(vorgabenE.fZ[daten[i][1]][1]).getTime()
        );
        daten[i][5] = datumAnE;
      } else {
        daten[i][5] = new Date(
          new Date(daten[i][5]).getTime() + datum.getTimezoneOffset() * 60000
        );
      }
      // Ab Einsatzort
      if (daten[i][8] === "") {
        datumAbE = new Date(
          datumAn1.getTime() - new Date(vorgabenE.fZ[daten[i][1]][1]).getTime()
        );
        daten[i][8] = datumAbE;
      } else {
        daten[i][8] = new Date(
          new Date(daten[i][8]).getTime() + datum.getTimezoneOffset() * 60000
        );
      }
    }
    //console.log("Daten Tag bearbeitet: ", daten[i])
  }
  //console.log(daten)

  daten.forEach((zeile) => {
    //Logger.log(zeile)
    zeile[0] = (`0${zeile[0]}`).slice(-2);
    for (var i = 3; i <= 10; i++) {
      //console.log(zeile[i])
      if (zeile[i]) zeile[i] = moment(zeile[i]).format("HH:mm"); //("0" + zeile[i].getHours()).slice(-2) + ":" + ("0" + zeile[i].getMinutes()).slice(-2)
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
  var dataE = tableToArray("#tableE");
  //console.log(dataE)
  var monat = document.getElementById("Monat").value;
  var jahr = document.getElementById("Jahr").value;

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
  var monat = document.getElementById("Monat").value;
  var jahr = document.getElementById("Jahr").value;

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
  var tag = (`0${document.getElementById("tagE").value}`).slice(-2);
  var ort = document.getElementById("EOrt").value;
  var schicht = document.getElementById("Schicht").value;
  //console.log(tag)
  //console.log(ort)
  //console.log(schicht)

  naechsterTag(tag);

  var data = [[tag, ort, schicht, "", "", "", "", "", "", "", ""]];

  let ftE = FooTable.get("#tableE");
  console.log("save ", ftE);
  ftE.rows.load(DataE(data), true);

  setTimeout(function () {
    saveTableData("tableE", ftE);
  }, 100);
}
