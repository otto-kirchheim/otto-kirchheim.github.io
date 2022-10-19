jQuery(function ($) {
  // Bereitschaftszeitraum
  var $modal = $("#editor-modalB"),
    $editor = $("#editorB"),
    $editorTitle = $("#editor-titleB"),
    ftBZ = FooTable.init("#tableBZ", {
      columns: [
        {
          name: "beginB",
          title: "Von",
          sortable: true,
          sorted: true,
          direction: "ASC",
        },
        { name: "endeB", title: "Bis", sortable: true },
        { name: "pauseB", title: "Pause", sortable: false, breakpoints: "xs" },
      ],
      rows: DataBZ(),
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
          $modal.removeData("row");
          $editor[0].reset();
          $editorTitle.text("Einsatzzeitraum hinzufügen");
          $modal.modal("show");
        },
        editRow: function (row) {
          var values = row.val();
          //console.log(values)
          $editor
            .find("#beginB")
            .val(
              moment(values.beginB, "DD.MM.YYYY / HH:mm").format(
                "YYYY-MM-DDTHH:mm"
              )
            );
          $editor
            .find("#endeB")
            .val(
              moment(values.endeB, "DD.MM.YYYY / HH:mm").format(
                "YYYY-MM-DDTHH:mm"
              )
            );
          let pauseB = Number(values.pauseB);
          if (pauseB == 0) {
            pauseB = "";
          }
          $editor.find("#pauseB").val(pauseB);

          $modal.data("row", row);
          $editorTitle.text("Zeile Bearbeiten");
          $modal.modal("show");
        },
        deleteRow: function (row) {
          row.delete();
          setTimeout(function () {
            saveTableData("tableBZ", ftBZ);
          }, 100);
        },
      },
    });

  console.log(ftBZ);

  $editor.on("submit", function (e) {
    if (this.checkValidity && !this.checkValidity()) return;
    e.preventDefault();
    var row = $modal.data("row"),
      values = {
        beginB: moment($editor.find("#beginB").val()).format(
          "DD.MM.YYYY / HH:mm"
        ),
        endeB: moment($editor.find("#endeB").val()).format(
          "DD.MM.YYYY / HH:mm"
        ),
        pauseB: `${$editor.find("#pauseB").val()}`,
      };
    //console.log(values)

    if (row instanceof FooTable.Row) {
      row.val(values);
    } else {
      ftBZ.rows.add(values);
    }
    setTimeout(function () {
      saveTableData("tableBZ", ftBZ);
    }, 100);
    $modal.modal("hide");
  });

  //----------------------------- Bereitschaftseinsätze ------------------------------------------------

  var $modalBE = $("#editor-modalBE"),
    $editorBE = $("#editorBE"),
    $editorTitleBE = $("#editor-titleBE"),
    ftBE = FooTable.init("#tableBE", {
      columns: [
        {
          name: "tagBE",
          title: "Tag",
          sortable: true,
          sorted: true,
          direction: "ASC",
        },
        { name: "auftragsnummerBE", title: "Auftragsnummer", sortable: false },
        { name: "beginBE", title: "Von", sortable: false, breakpoints: "xs" },
        { name: "endeBE", title: "Bis", sortable: false, breakpoints: "xs" },
        { name: "lreBE", title: "LRE", sortable: false, breakpoints: "xs" },
        {
          name: "privatkmBE",
          title: "Privat Km",
          sortable: false,
          breakpoints: "xs md",
        },
      ],
      rows: DataBE(),
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
        editRow: function (row) {
          var values = row.val();
          $editorBE
            .find("#tagBE")
            .val(moment(values.tagBE, "DD.MM.YYYY").format("YYYY-MM-DD"));
          $editorBE.find("#auftragsnummerBE").val(values.auftragsnummerBE);
          $editorBE.find("#beginBE").val(values.beginBE);
          $editorBE.find("#endeBE").val(values.endeBE);
          $editorBE.find("#lreBE").val(values.lreBE);
          let privatkmBE = Number(values.privatkmBE);
          if (privatkmBE == 0) {
            privatkmBE = "";
          }
          $editorBE.find("#privatkmBE").val(privatkmBE);

          $modalBE.data("row", row);
          $editorTitleBE.text("Zeile Bearbeiten");
          $modalBE.modal("show");
        },
        deleteRow: function (row) {
          row.delete();
          setTimeout(function () {
            saveTableData("tableBE", ftBE);
          }, 100);
        },
      },
    });

  console.log(ftBE);

  $editorBE.on("submit", function (e) {
    if (this.checkValidity && !this.checkValidity()) return;
    e.preventDefault();
    var row = $modalBE.data("row"),
      values = {
        tagBE: moment($editorBE.find("#tagBE").val()).format("DD.MM.YYYY"),
        auftragsnummerBE: $editorBE.find("#auftragsnummerBE").val(),
        beginBE: $editorBE.find("#beginBE").val(),
        endeBE: $editorBE.find("#endeBE").val(),
        lreBE: $editorBE.find("#lreBE option:selected").val(),
        privatkmBE: $editorBE.find("#privatkmBE").val(),
      };
    if (!values.privatkmBE || values.privatkmBE == 0) {
      values.privatkmBE = "";
    } else {
      values.privatkmBE = values.privatkmBE + "";
    }
    //console.log(values)

    if (row instanceof FooTable.Row) {
      row.val(values);
    } else {
      ftBE.rows.add(values);
    }

    setTimeout(function () {
      saveTableData("tableBE", ftBE);
    }, 100);

    $modalBE.modal("hide");
  });
});

function DataBZ(data) {
  //console.log(data)
  if (data == null) {
    if (localStorage.getItem("dataBZ") == null) return [];
    data = JSON.parse(localStorage.getItem("dataBZ"));
  }
  //console.log(data)
  var data1 = [];
  data.forEach((row, i) => {
    //console.log(row)
    data1[i] = {
      beginB: row[0],
      endeB: row[1],
      pauseB: row[2],
    };
  });
  //console.log(data1)
  return data1;
}

function DataBE(data) {
  if (data == null) {
    if (localStorage.getItem("dataBE") == null) return [];
    data = JSON.parse(localStorage.getItem("dataBE"));
  }
  //console.log(data)
  var data1 = [];
  data.forEach((row, i) => {
    //console.log(row)
    data1[i] = {
      tagBE: row[0],
      auftragsnummerBE: row[1],
      beginBE: row[2],
      endeBE: row[3],
      lreBE: row[4],
      privatkmBE: row[5],
    };
  });
  //console.log(data1)
  return data1;
}

// Eingabemaske Bereitschaftszeiten

function generateEingabeMaskeZeiten(vorgabenB) {
  var datumHeute = moment();
  var Monat = localStorage.getItem("Monat");
  var Jahr = localStorage.getItem("Jahr");
  var datum = moment([Jahr, Monat - 1, 1]);
  if (
    moment(datum)
      .date(datumHeute.date())
      .day(3)
      .isBetween(moment(datum).startOf("M"), moment(datum).endOf("M"))
  )
    datum.date(datumHeute.date());
  else if (
    moment(datum)
      .date(datumHeute.date())
      .day(3)
      .isSameOrBefore(moment(datum).startOf("M"))
  )
    datum.date(datumHeute.date()).add(7, "d");
  else if (
    moment(datum)
      .date(datumHeute.date())
      .day(3)
      .isSameOrAfter(moment(datum).endOf("M"))
  )
    datum.date(datumHeute.date()).subtract(7, "d");
  var datum1 = moment(datum).day(3).format("YYYY-MM-DD"); //Beginn B
  var datum2 = moment(datum1).day(7).format("YYYY-MM-DD"); //Beginn N
  var datum3 = moment(datum1).day(10).format("YYYY-MM-DD"); //Ende B
  var datum4 = moment(datum2).day(3).format("YYYY-MM-DD"); //Ende N

  //console.log(datum1);
  //console.log(datum2);
  //console.log(datum3);
  //console.log(datum4);
  //console.log(vorgabenB)

  document.getElementById("bA").value = datum1;
  document.getElementById("bA").min = moment(datum1)
    .startOf("M")
    .format("YYYY-MM-DD");
  document.getElementById("bA").max = moment(datum1)
    .endOf("M")
    .format("YYYY-MM-DD");
  document.getElementById("bAT").value = vorgabenB[1];
  document.getElementById("bE").value = datum3;
  document.getElementById("bE").min = moment(datum1)
    .startOf("M")
    .format("YYYY-MM-DD");
  document.getElementById("bE").max = moment(datum1)
    .add(1, "M")
    .endOf("M")
    .format("YYYY-MM-DD");
  document.getElementById("bET").value = vorgabenB[0];
  document.getElementById("nA").value = datum2;
  document.getElementById("nA").min = moment(datum1)
    .startOf("M")
    .format("YYYY-MM-DD");
  document.getElementById("nA").max = moment(datum1)
    .add(1, "M")
    .endOf("M")
    .format("YYYY-MM-DD");
  document.getElementById("nAT").value = vorgabenB[4];
  document.getElementById("nE").value = datum4;
  document.getElementById("nE").min = moment(datum1)
    .startOf("M")
    .format("YYYY-MM-DD");
  document.getElementById("nE").max = moment(datum1)
    .add(1, "M")
    .endOf("M")
    .format("YYYY-MM-DD");
  document.getElementById("nET").value = vorgabenB[5];
}

function b12aendern(vorgabenB, datum) {
  if (!datum) {
    datum = moment(document.getElementById("bA").value);
  }
  if (!vorgabenB) {
    vorgabenB = JSON.parse(localStorage.getItem("VorgabenB"));
  }
  //console.log(vorgabenB)
  //console.log("B12: " + document.getElementById('b12').checked);
  //console.log(vorgabenB[0])
  if (document.getElementById("b12").checked) {
    document.getElementById("bE").value = moment(datum)
      .day(6)
      .format("YYYY-MM-DD");
    document.getElementById("bET").value = vorgabenB[3];
    document.getElementById("nacht").checked = false;
  } else {
    document.getElementById("bE").value = moment(datum)
      .add(7, "d")
      .format("YYYY-MM-DD");
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

function saAEndern(vorgabenB, datum) {
  if (!datum) {
    datum = moment(document.getElementById("bA").value);
  }
  if (!vorgabenB) {
    vorgabenB = JSON.parse(localStorage.getItem("VorgabenB"));
  }
  //console.log(vorgabenB)
  //console.log("Ab Samstag: " + document.getElementById('sa').checked);
  //console.log(vorgabenB[3])
  //console.log(vorgabenB[4])
  if (document.getElementById("sa").checked) {
    document.getElementById("nA").value = moment(datum)
      .day(6)
      .format("YYYY-MM-DD");
    document.getElementById("nAT").value = vorgabenB[3];
    document.getElementById("nE").value = moment(datum)
      .day(10)
      .format("YYYY-MM-DD");
  } else {
    document.getElementById("nA").value = moment(datum)
      .day(7)
      .format("YYYY-MM-DD");
    document.getElementById("nAT").value = vorgabenB[4];
    document.getElementById("nE").value = moment(datum)
      .day(10)
      .format("YYYY-MM-DD");
  }
}

function datumAnpassen(vorgabenB) {
  var datum = moment(document.getElementById("bA").value);
  if (!vorgabenB) {
    vorgabenB = JSON.parse(localStorage.getItem("VorgabenB"));
  }
  //console.log(datum)
  b12aendern(vorgabenB, datum);
  //document.getElementById('nE').value = document.getElementById('bE').value;
  saAEndern(vorgabenB);
}

function eigeneWerte(vorgabenB) {
  if (!vorgabenB) {
    vorgabenB = JSON.parse(localStorage.getItem("VorgabenB"));
  }
  if (document.getElementById("eigen").checked) {
    document.getElementById("bAT").readOnly = false;
    document.getElementById("bE").readOnly = false;
    document.getElementById("bET").readOnly = false;
    document.getElementById("nA").readOnly = false;
    document.getElementById("nAT").readOnly = false;
    document.getElementById("nE").readOnly = false;
    document.getElementById("nET").readOnly = false;
  } else {
    document.getElementById("bAT").readOnly = true;
    document.getElementById("bE").readOnly = true;
    document.getElementById("bET").readOnly = true;
    document.getElementById("nA").readOnly = true;
    document.getElementById("nAT").readOnly = true;
    document.getElementById("nE").readOnly = true;
    document.getElementById("nET").readOnly = true;
    datumAnpassen(vorgabenB);
    document.getElementById("bAT").value = vorgabenB[1];
    b12aendern(vorgabenB);
    document.getElementById("nET").value = vorgabenB[5];
  }
}

// Eingabemaske Bereitschafteinsatz

function generateEingabeMaskeEinsatz() {
  var datum = moment();
  document.getElementById("Datum").value = datum.format("YYYY-MM-DD");
  document.getElementById("Datum").min = datum
    .startOf("month")
    .format("YYYY-MM-DD");
  document.getElementById("Datum").max = datum
    .endOf("month")
    .format("YYYY-MM-DD");
}

function sendDataE(UserID) {
  $("#eingabeEinsatz").modal("hide");
  setLoading("btnESE");

  var daten = [];

  daten.push(
    moment(document.getElementById("Datum").value).format("DD.MM.YYYY")
  );
  daten.push(document.getElementById("SAPNR").value);
  daten.push(document.getElementById("ZeitVon").value);
  daten.push(document.getElementById("ZeitBis").value);
  daten.push($("#LRE option:selected").text());
  daten.push(document.getElementById("privatkm").value);
  var berZeit = document.getElementById("berZeit").checked;

  console.log(daten);

  let ftBE = FooTable.get("#tableBE");
  ftBE.rows.load(DataBE([daten]), true);
  setTimeout(function () {
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
    var bereitschaftsAnfang = moment(`${daten[0]}T${daten[2]}`);
    var bereitschaftsEnde = moment(`${daten[0]}T${daten[3]}`);
    if (bereitschaftsEnde.isBefore(bereitschaftsAnfang))
      bereitschaftsEnde.add(1, "d");
    var data = tableToArray("#tableBZ");

    var data = BereitschaftEingabe(
      bereitschaftsAnfang,
      bereitschaftsEnde,
      moment(bereitschaftsEnde),
      moment(bereitschaftsEnde),
      false,
      data
    );

    if (data == null) {
      clearLoading("btnESE");
      toastr.warning("Bereitschaftszeitraum Bereits vorhanden!");
      return;
    }

    localStorage.setItem("dataBZ", JSON.stringify(data));
    setTimeout(function () {
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

  var bereitschaftsAnfang = moment(
    `${document.getElementById("bA").value}T${
      document.getElementById("bAT").value
    }`
  );
  var bereitschaftsEnde = moment(
    `${document.getElementById("bE").value}T${
      document.getElementById("bET").value
    }`
  );
  var nacht = document.getElementById("nacht").checked;
  if (nacht === true) {
    var nachtAnfang = moment(
      `${document.getElementById("nA").value}T${
        document.getElementById("nAT").value
      }`
    );
    var nachtEnde = moment(
      `${document.getElementById("nE").value}T${
        document.getElementById("nET").value
      }`
    );
  } else {
    nachtAnfang = moment(bereitschaftsEnde);
    nachtEnde = moment(bereitschaftsEnde);
  }

  var monat = document.getElementById("Monat").value;
  var jahr = document.getElementById("Jahr").value;

  var data = [];
  var data1 = tableToArray("#tableBZ");
  var data2 = [];
  console.log({ bereitschaftsAnfang });
  console.log({ bereitschaftsEnde });
  console.log({ nachtAnfang });
  console.log({ nachtEnde });
  console.log({ nacht });
  console.log({ monat });
  console.log({ jahr });
  console.log({ UserID });
  //return false;

  if (!bereitschaftsAnfang.isSame(bereitschaftsEnde, "month")) {
    var monat2 = bereitschaftsEnde.month();
    var jahr2 = bereitschaftsEnde.year();

    var bereitschaftsEndeWechsel = moment([jahr2, monat2, 1]);
    if (bereitschaftsEndeWechsel.isBefore(nachtAnfang)) {
      var nachtEnde1 = moment(nachtEnde);
      var nachtAnfang2 = moment(nachtAnfang);
      var bereitschaftsEndeWechsel2 = moment(bereitschaftsEndeWechsel);
    } else if (moment(bereitschaftsEndeWechsel).isAfter(nachtEnde)) {
      var nachtEnde1 = moment(nachtEnde);
      var bereitschaftsEndeWechsel2 = moment(bereitschaftsEndeWechsel);
      nachtAnfang2 = moment(bereitschaftsEnde);
      nachtEnde = moment(bereitschaftsEnde);
    } else if (
      moment(bereitschaftsEndeWechsel).isAfter(nachtAnfang) &&
      moment(bereitschaftsEndeWechsel).isBefore(nachtEnde)
    ) {
      var nachtEnde1 = moment([
        jahr2,
        monat2,
        1,
        nachtEnde.hours(),
        nachtEnde.minutes(),
      ]);
      var nachtAnfang2 = moment([
        jahr2,
        monat2,
        1,
        nachtAnfang.hours(),
        nachtAnfang.minutes(),
      ]);
      var bereitschaftsEndeWechsel2 = moment(nachtEnde1);
    } else {
      throw Error("Fehler bei Nacht und Bereitschaft");
    }

    data1 = BereitschaftEingabe(
      bereitschaftsAnfang,
      bereitschaftsEndeWechsel,
      nachtAnfang,
      nachtEnde1,
      nacht,
      data1
    );

    try {
      const response = await fetch(
        `${API_URL}/${UserID}&${monat2 + 1}&${jahr2}`,
        {
          method: "GET",
        }
      );
      if (response.status == 200) {
        data2 = (await response.json()).datenB.datenBZ;
        //console.log("Request complete! response:", response);
        console.log(data2);
      } else {
        console.log("Fehler");
        return;
      }
      data2 = BereitschaftEingabe(
        bereitschaftsEndeWechsel2,
        bereitschaftsEnde,
        nachtAnfang2,
        nachtEnde,
        nacht,
        data2
      );
      let dataSave = {
        BZ: data2,
        UserID,
        Monat: monat2 + 1,
        Jahr: jahr2,
      };
      const responseSave = await fetch(`${API_URL}/saveData`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataSave),
      });
      dataResponse = await responseSave.json();
      console.log(dataResponse);

      if (responseSave.status == 200) {
        toastr.success(`Daten für Monat ${monat2 + 1} gespeichert`);
      } else {
        console.log("Fehler", dataResponse.message);
        toastr.error("Es ist ein Fehler beim Monatswechsel aufgetreten");
        return;
      }
    } catch (err) {
      console.log(err);
      return;
    }

    console.log("Daten Monat 1", data1);
    console.log("Daten Monat 2", data2);

    data = data1;
  } else {
    data = BereitschaftEingabe(
      bereitschaftsAnfang,
      bereitschaftsEnde,
      nachtAnfang,
      nachtEnde,
      nacht,
      data1
    );
  }
  if (data == null) {
    clearLoading("btnESZ");
    toastr.warning("Bereitschaftszeitraum Bereits vorhanden!");
    return;
  }

  localStorage.setItem("dataBZ", JSON.stringify(data));
  setTimeout(function () {
    FooTable.get("#tableBZ").rows.load(DataBZ(data));
  }, 1000);

  clearLoading("btnESZ");
  toastr.success(
    "Neuer Bereitschaftszeitraum hinzugefügt</br>Speichern nicht vergessen!</br></br>Berechnung wird erst nach Speichern aktualisiert",
    "",
    { enableHtml: true }
  );
}

function BereitschaftEingabe(
  bereitschaftsAnfang,
  bereitschaftsEnde,
  nachtAnfang,
  nachtEnde,
  nacht,
  daten
) {
  console.log("nacht: " + nacht);
  console.log("Bereitschafts Anfang: " + bereitschaftsAnfang.toDate());
  console.log("Bereitschafts Ende: " + bereitschaftsEnde.toDate());
  console.log("Nacht Anfang: " + nachtAnfang.toDate());
  console.log("Nacht Ende: " + nachtEnde.toDate());

  var bereitschaftsAnfangNacht;
  var bereitschaftsAnfangMerker;
  var bereitschaftsAnfangA;
  var bereitschaftsEndeMerker;
  var bereitschaftsEndeA;
  var bereitschaftsEndeB;
  //var monat;
  //var jahr;
  var arbeitstagHeute; // W
  var arbeitstagMorgen; // W1
  var pause; // P
  var pauseMerker;
  var pauseMerkerTag;
  var pauseMerkerNacht;

  // Voreinstellungen Übernehmen

  var datenU = JSON.parse(localStorage.getItem("VorgabenU"));
  //console.log(datenU)
  const tagAnfangsZeitMoDo = moment("1970-01-01T" + datenU.aZ.eT); // AE1 Tagschicht Anfangszeit Mo-Do
  const tagAnfangsZeitFr = moment("1970-01-01T" + datenU.aZ.eTF); // AE2 Tagschicht Anfangszeit Fr
  const tagEndeZeitMoFr = moment("1970-01-01T" + datenU.aZ.bT); // AA1 Tagschicht Endezeit Mo-Fr

  // Feste Variablen

  const ruheZeit = 10;
  const tagPausenVorgabe = 30; // APV
  const nachtPausenVorgabe = 45; // NP
  const bereitschaftsZeitraumWechsel = moment([1970, 0, 1, 8, 0]); // f

  const arbeitsAnfang = [
    bereitschaftsZeitraumWechsel,
    tagEndeZeitMoFr,
    tagEndeZeitMoFr,
    tagEndeZeitMoFr,
    tagEndeZeitMoFr,
    tagEndeZeitMoFr,
    bereitschaftsZeitraumWechsel,
    bereitschaftsZeitraumWechsel,
  ]; // AA Arbeits Anfang
  const arbeitsEnde = [
    bereitschaftsZeitraumWechsel,
    tagAnfangsZeitMoDo,
    tagAnfangsZeitMoDo,
    tagAnfangsZeitMoDo,
    tagAnfangsZeitMoDo,
    tagAnfangsZeitFr,
    bereitschaftsZeitraumWechsel,
    bereitschaftsZeitraumWechsel,
  ]; // AE Arbeits Ende
  const pausenTag = [
    "",
    tagPausenVorgabe,
    tagPausenVorgabe,
    tagPausenVorgabe,
    tagPausenVorgabe,
    "",
    "",
    "",
  ];

  // Berechne ob Tag ein Arbeitstag ist

  arbeitstagHeute = Arbeitstag(bereitschaftsAnfang, 0);
  console.log(`Arbeitstag Heute: ${arbeitstagHeute}`);
  arbeitstagMorgen = Arbeitstag(bereitschaftsAnfang, 1);
  console.log(`Arbeitstag Morgen: ${arbeitstagMorgen}`);

  // Sonstige Variablen Vorbereiten

  bereitschaftsEndeMerker = moment(bereitschaftsAnfang);
  var monat = bereitschaftsAnfang.month() + 1;
  var jahr = bereitschaftsAnfang.year();

  var datenVorher = daten.length;

  // Beginn Berechnung //

  while (daten.length < 26 && bereitschaftsAnfang.isBefore(bereitschaftsEnde)) {
    /// #Berechnung Bereitschaftsende# ///

    // neues Ende Arbeitszeit
    bereitschaftsEndeA = B2(
      bereitschaftsAnfang,
      nachtAnfang,
      arbeitsAnfang,
      arbeitstagHeute,
      arbeitstagMorgen,
      nacht
    );
    console.log(`Bereitschafts Ende A: ${bereitschaftsEndeA.toDate()}`);

    // neues Ende Bereitschaftszyklus
    bereitschaftsEndeB = moment(bereitschaftsAnfang)
      .add(1, "d")
      .hour(8)
      .minute(0);
    console.log(`Bereitschafts Ende B: ${bereitschaftsEndeB.toDate()}`);

    // überprüfe welches Bereitschaftsende Zutrifft
    bereitschaftsEndeMerker = moment.min(
      bereitschaftsEndeA,
      bereitschaftsEndeB,
      nachtAnfang,
      bereitschaftsEnde
    );
    console.log(
      `Bereitschafts Ende Merker: ${bereitschaftsEndeMerker.toDate()}`
    );

    /// #Berechnung Bereitschaftsanfang# ///

    // neuer Bereitschaftsanfang Nacht
    bereitschaftsAnfangNacht = moment(nachtAnfang)
      .add(1, "d")
      .hour(nachtEnde.hour())
      .minute(nachtEnde.minute());
    console.log(
      `Bereitschafts Anfang Nacht: ${bereitschaftsAnfangNacht.toDate()}`
    );

    // neues Ende 2, Arbeitszeit
    bereitschaftsAnfangA = B2(
      bereitschaftsAnfang,
      nachtAnfang,
      arbeitsEnde,
      arbeitstagHeute,
      arbeitstagMorgen,
      nacht
    );
    console.log(`Bereitschafts Anfang A: ${bereitschaftsAnfangA.toDate()}`);

    //überprüfe welches Bereitschaftanfang Zutrifft
    if (bereitschaftsAnfang.isSame(bereitschaftsEndeMerker, "day")) {
      bereitschaftsAnfangMerker = moment.min(
        bereitschaftsAnfangNacht,
        bereitschaftsAnfangA,
        bereitschaftsEndeB
      );
    } else {
      bereitschaftsAnfangMerker = moment.min(
        moment.max(bereitschaftsAnfangA, bereitschaftsEndeB),
        bereitschaftsAnfangNacht
      );
    }
    console.log(
      `Bereitschafts Anfang Merker: ${bereitschaftsAnfangMerker.toDate()}`
    );

    /// #Berechnung Pause# ///

    // Pause Tagschicht, Falls keine Pause oder nach Nachtschicht, dann ""
    pauseMerker = moment(bereitschaftsAnfang)
      .hour(tagAnfangsZeitMoDo.hour())
      .minute(tagAnfangsZeitMoDo.minute());
    if (pause === nachtPausenVorgabe) {
      pause = "";
    } else if (bereitschaftsAnfang.isSame(pauseMerker)) {
      pause = pausenTag[bereitschaftsAnfang.weekday()];
    } else if (!bereitschaftsAnfang.isSame(pauseMerker)) {
      pause = "";
    }

    //Pause Nachtschicht, normal und bei Ruhe nach Nacht
    pauseMerkerNacht = moment(bereitschaftsAnfang)
      .hour(nachtEnde.hour())
      .minute(nachtEnde.minute());
    pauseMerkerTag = moment(pauseMerker)
      .hour(nachtEnde.hour())
      .add(ruheZeit, "hour")
      .minute(nachtEnde.minute());
    if (
      bereitschaftsAnfang.isSame(pauseMerkerNacht) |
      bereitschaftsAnfang.isSame(pauseMerkerTag)
    ) {
      pause = nachtPausenVorgabe;
    }
    console.log(`Pausen Zeit: ${pause}`);

    console.log(
      `Eingabe Tabelle: ${bereitschaftsAnfang.format(
        "DD.MM.YYYY / HH:mm"
      )} --- ${bereitschaftsEndeMerker.format(
        "DD.MM.YYYY / HH:mm"
      )} --- ${pause.toString()}`
    );

    var vorhanden = false;

    /// #Prüfen ob Daten bereits vorhanden# ///
    while (vorhanden == false) {
      for (var value of daten) {
        console.log(value);
        if (
          moment(value[0], "DD.MM.YYYY / HH:mm").isSame(bereitschaftsAnfang)
        ) {
          if (
            moment(value[1], "DD.MM.YYYY / HH:mm").isSame(
              bereitschaftsEndeMerker
            )
          ) {
            if (value[2].toString() === pause.toString()) {
              console.log("Bereitschaftszeitraum bereits vorhanden");
              vorhanden = true;
              break;
            }
          }
        }
      }
      if (vorhanden) break;
      /// #Eingabe Bereitschaftszeiten# ///
      daten.push([
        bereitschaftsAnfang.format("DD.MM.YYYY / HH:mm"),
        bereitschaftsEndeMerker.format("DD.MM.YYYY / HH:mm"),
        pause.toString(),
      ]);
      break;
    }

    vorhanden = false;

    /// #Übernehme Daten für nächsten Tag# ///

    // neuen Bereitschaftsanfang übernehmen
    bereitschaftsAnfang = moment(bereitschaftsAnfangMerker);
    console.log("Bereitschafts Anfang: " + bereitschaftsAnfang.toDate());

    // neuen Nachtschichtanfang setzten, Wenn kleiner als Bereitschaftsanfang
    if (bereitschaftsAnfang.isAfter(nachtAnfang)) {
      nachtAnfang.add(1, "d");
    }
    console.log(`Nacht Anfang: ${nachtAnfang.toDate()}`);
    if (
      nachtAnfang.isAfter(nachtEnde) &&
      !nachtAnfang.isSame(bereitschaftsEnde)
    ) {
      nachtAnfang = moment(bereitschaftsEnde);
      nacht = false;
    }
    console.log(`Nacht: ${nacht}`);

    // Berechne ob Tag ein Arbeitstag ist
    arbeitstagHeute = Arbeitstag(bereitschaftsAnfang, 0);
    console.log(`Arbeitstag Heute: ${arbeitstagHeute}`);
    arbeitstagMorgen = Arbeitstag(bereitschaftsAnfang, 1);
    console.log(`Arbeitstag Morgen: ${arbeitstagMorgen}`);

    /// #Berechnung ob Ruhe nach Nacht am Sonntag & Feiertage# ///

    if (nacht === true) {
      // neues Ende Arbeitszeit
      bereitschaftsEndeA = B2(
        bereitschaftsAnfang,
        nachtAnfang,
        arbeitsAnfang,
        arbeitstagHeute,
        arbeitstagMorgen,
        nacht
      );
      console.log(`Bereitschafts Ende A: ${bereitschaftsEndeA.toDate()}`);

      // neues Ende Bereitschaftszyklus
      bereitschaftsEndeB = moment(bereitschaftsAnfang)
        .add(1, "d")
        .hour(8)
        .minute(0);
      console.log(`Bereitschafts Ende B: ${bereitschaftsEndeB.toDate()}`);

      // überprüfe welches Bereitschaftsende Zutrifft
      bereitschaftsEndeMerker = moment.min(
        bereitschaftsEndeA,
        bereitschaftsEndeB,
        nachtAnfang,
        bereitschaftsEnde
      );
      console.log(
        `Bereitschafts Ende Merker: ${bereitschaftsEndeMerker.toDate()}`
      );

      //Überprüfe ob Ruhe nach Nacht nötig ist
      if (
        bereitschaftsAnfang.isSame(nachtAnfang, "day") &&
        moment(bereitschaftsAnfangNacht).isBefore(
          moment(nachtAnfang).subtract({ days: 1, hours: 10 })
        ) &&
        moment(bereitschaftsEndeMerker).isBefore(
          moment(bereitschaftsAnfangNacht).subtract(1, "h")
        )
      ) {
        bereitschaftsAnfangNacht.add(ruheZeit, "h");
        console.log(`Bereitschafts Anfang Nacht: ${bereitschaftsAnfangNacht}`);
        bereitschaftsAnfang = moment.max(
          moment.min(bereitschaftsAnfangA, bereitschaftsEndeB),
          bereitschaftsAnfangNacht
        );
        console.log(`Bereitschafts Anfang: ${bereitschaftsAnfang}`);
        arbeitstagHeute = Arbeitstag(bereitschaftsAnfang, 0);
        console.log(`Arbeitstag Heute: ${arbeitstagHeute}`);
        arbeitstagMorgen = Arbeitstag(bereitschaftsAnfang, 1);
        console.log(`Arbeitstag Morgen: ${arbeitstagMorgen}`);
      }
    }
  }
  DatenSortieren(daten);

  //console.log(datenVorher)
  //console.log(daten.length)
  if (datenVorher == daten.length) {
    console.log("Keine änderung, Bereitschaft bereits vorhanden");
    return;
  }
  return daten;
}

function B2(
  bereitschaftsAnfang,
  nachtAnfang,
  arbeitsAnfang,
  arbeitstagHeute,
  arbeitstagMorgen,
  nacht
) {
  var merker;
  tagBereitschaftsAnfang = bereitschaftsAnfang.weekday();
  console.log(`Wochentag Bereitschafts Anfang: ${tagBereitschaftsAnfang}`);
  // neues Ende 2,
  // am nächsten Tag,
  // Begin normale Schicht bzw. neuer Bereitschaftszyklus
  if (!bereitschaftsAnfang.isSame(nachtAnfang, "day")) {
    if (arbeitstagMorgen === true) {
      merker = moment(bereitschaftsAnfang)
        .add(1, "d")
        .hour(arbeitsAnfang[tagBereitschaftsAnfang + 1].hour())
        .minute(arbeitsAnfang[tagBereitschaftsAnfang + 1].minute());
    } else {
      merker = moment(bereitschaftsAnfang).add(1, "d").hour(8).minute(0);
    }
    console.log(`Merker B2.1: ${merker.toDate()}`);
  }
  // Wie oben, aber:
  // 2x Ende am gleichen Tag
  if (bereitschaftsAnfang.isSame(nachtAnfang, "day") | (nacht === false)) {
    if (arbeitstagHeute === true) {
      merker = moment(bereitschaftsAnfang)
        .hour(arbeitsAnfang[tagBereitschaftsAnfang].hour())
        .minute(arbeitsAnfang[tagBereitschaftsAnfang].minute());
    } else {
      merker = moment(bereitschaftsAnfang).hour(8).minute(0);
    }
    console.log(`Merker B2.2: ${merker.toDate()}`);
  }
  // Wie oben, aber:
  // wenn merker kleiner/gleich Bereitschafts Anfang -> am nächsten Tag
  if (merker.isAfter(bereitschaftsAnfang)) {
    return merker;
  } else {
    if (arbeitstagMorgen === true) {
      merker = moment(bereitschaftsAnfang)
        .add(1, "d")
        .hour(arbeitsAnfang[tagBereitschaftsAnfang + 1].hour())
        .minute(arbeitsAnfang[tagBereitschaftsAnfang + 1].minute());
    } else {
      merker = moment(bereitschaftsAnfang).add(1, "d").hour(8).minute(0);
    }
    console.log(`Merker B2.3: ${merker.toDate()}`);
  }
  return merker;
}

function Arbeitstag(datum, zusatz) {
  datum = moment(datum).add(zusatz, "d"); // = moment([datum.year(), datum.month(), datum.date() + zusatz]);
  var feiertag = isHoliday(datum.toDate(), "HE");
  if (feiertag === true) {
    return false;
  } else if ((datum.weekday() < 1) | (datum.weekday() > 5)) {
    return false;
  }
  return true;
}

const germanTranslations = {
  NEUJAHRSTAG: 'Neujahrstag',
  HEILIGEDREIKOENIGE: 'Heilige Drei Könige',
  KARFREITAG: 'Karfreitag',
  OSTERSONNTAG: 'Ostersonntag',
  OSTERMONTAG: 'Ostermontag',
  TAG_DER_ARBEIT: 'Tag der Arbeit',
  CHRISTIHIMMELFAHRT: 'Christi Himmelfahrt',
  PFINGSTSONNTAG: 'Pfingstsonntag',
  PFINGSTMONTAG: 'Pfingstmontag',
  FRONLEICHNAM: 'Fronleichnam',
  MARIAHIMMELFAHRT: 'Mariä Himmelfahrt',
  DEUTSCHEEINHEIT: 'Tag der Deutschen Einheit',
  REFORMATIONSTAG: 'Reformationstag',
  ALLERHEILIGEN: 'Allerheiligen',
  BUBETAG: 'Buß- und Bettag',
  ERSTERWEIHNACHTSFEIERTAG: '1. Weihnachtstag',
  ZWEITERWEIHNACHTSFEIERTAG: '2. Weihnachtstag',
  WELTKINDERTAG: 'Weltkindertag',
  WELTFRAUENTAG: 'Weltfrauentag',
  AUGSBURGER_FRIEDENSFEST: 'Augsburger Friedensfest'
};

const allHolidays = [
  'NEUJAHRSTAG',
  'HEILIGEDREIKOENIGE',
  'KARFREITAG',
  'OSTERSONNTAG',
  'OSTERMONTAG',
  'TAG_DER_ARBEIT',
  'CHRISTIHIMMELFAHRT',
  'MARIAHIMMELFAHRT',
  'PFINGSTSONNTAG',
  'PFINGSTMONTAG',
  'FRONLEICHNAM',
  'DEUTSCHEEINHEIT',
  'REFORMATIONSTAG',
  'ALLERHEILIGEN',
  'BUBETAG',
  'ERSTERWEIHNACHTSFEIERTAG',
  'ZWEITERWEIHNACHTSFEIERTAG',
  'WELTKINDERTAG',
  'WELTFRAUENTAG',
  'AUGSBURGER_FRIEDENSFEST',
];

const allRegions = [
  'BW',
  'BY',
  'BE',
  'BB',
  'HB',
  'HE',
  'HH',
  'MV',
  'NI',
  'NW',
  'RP',
  'SL',
  'SN',
  'ST',
  'SH',
  'TH',
  'BUND',
  'AUGSBURG',
  'ALL',
];

// translations
const defaultLanguage = 'de';
let currentLanguage = defaultLanguage;
const translations = {
    de: germanTranslations,
};
/**
 * Check is specific date is holiday.
 * @param date
 * @param {Region} region two character {@link Region} code
 * @returns {boolean}
 */
 function isHoliday(date, region) {
  checkRegion(region);
  const year = date.getFullYear();
  const internalDate = toUtcTimestamp(date);
  const holidays = getHolidaysAsUtcTimestamps(year, region);
  return holidays.indexOf(internalDate) !== -1;
}
/**
 * Checks if the given region is a valid {@link Region}.
 *
 * @param region {@link Region} to check
 * @throws {Error}
 * @private
 */
 function checkRegion(region) {
  if (region === null || region === undefined) {
      throw new Error(`Region must not be undefined or null`);
  }
  if (allRegions.indexOf(region) === -1) {
      throw new Error(`Invalid region: ${region}! Must be one of ${allRegions.toString()}`);
  }
}
/**
* Checks if the given holidayName is a valid {@link HolidayType}.
* @param holidayName {@link HolidayType} to check
* @throws {Error}
* @private
*/
function checkHolidayType(holidayName) {
  if (holidayName === null || holidayName === undefined) {
      throw new TypeError('holidayName must not be null or undefined');
  }
  if (allHolidays.indexOf(holidayName) === -1) {
      throw new Error(`feiertage.js: invalid holiday type "${holidayName}"! Must be one of ${allHolidays.toString()}`);
  }
}
function isSpecificHoliday(date, holidayName, region = 'ALL') {
  checkRegion(region);
  checkHolidayType(holidayName);
  const holidays = getHolidaysOfYear(date.getFullYear(), region);
  const foundHoliday = holidays.find(holiday => holiday.equals(date));
  if (!foundHoliday) {
      return false;
  }
  return foundHoliday.name === holidayName;
}
/**
* Returns all holidays of a year in a {@link Region}.
* @param year
* @param region
* @returns {Array.<Holiday>}
*/
function getHolidays(year, region) {
  let y;
  if (typeof year === 'string') {
      y = parseInt(year, 10);
  }
  else {
      y = year;
  }
  checkRegion(region);
  return getHolidaysOfYear(y, region);
}
/**
*
* @param year
* @param region
* @returns {*}
* @private
*/
function getHolidaysAsUtcTimestamps(year, region) {
  const holidays = getHolidaysOfYear(year, region);
  return holidays.map(holiday => toUtcTimestamp(holiday.date));
}
/**
*
* @param year
* @param region
* @returns {{objects: Array.<Holiday>, integers}}
* @private
*/
function getHolidaysOfYear(year, region) {
  const easterDate = getEasterDate(year);
  const karfreitag = addDays(new Date(easterDate.getTime()), -2);
  const ostermontag = addDays(new Date(easterDate.getTime()), 1);
  const christiHimmelfahrt = addDays(new Date(easterDate.getTime()), 39);
  const pfingstsonntag = addDays(new Date(easterDate.getTime()), 49);
  const pfingstmontag = addDays(new Date(easterDate.getTime()), 50);
  const holidays = [
      ...getCommonHolidays(year),
      newHoliday('KARFREITAG', karfreitag),
      newHoliday('OSTERMONTAG', ostermontag),
      newHoliday('CHRISTIHIMMELFAHRT', christiHimmelfahrt),
      newHoliday('PFINGSTMONTAG', pfingstmontag),
  ];
  addHeiligeDreiKoenige(year, region, holidays);
  addEasterAndPfingsten(year, region, easterDate, pfingstsonntag, holidays);
  addFronleichnam(region, easterDate, holidays);
  addMariaeHimmelfahrt(year, region, holidays);
  addReformationstag(year, region, holidays);
  addAllerheiligen(year, region, holidays);
  addBussUndBetttag(year, region, holidays);
  addWeltkindertag(year, region, holidays);
  addWeltfrauenTag(year, region, holidays);
  addRegionalHolidays(year, region, holidays);
  return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
}
function getCommonHolidays(year) {
  return [
      newHoliday('NEUJAHRSTAG', makeDate(year, 1, 1)),
      newHoliday('TAG_DER_ARBEIT', makeDate(year, 5, 1)),
      newHoliday('DEUTSCHEEINHEIT', makeDate(year, 10, 3)),
      newHoliday('ERSTERWEIHNACHTSFEIERTAG', makeDate(year, 12, 25)),
      newHoliday('ZWEITERWEIHNACHTSFEIERTAG', makeDate(year, 12, 26)),
  ];
}
function addRegionalHolidays(year, region, feiertageObjects) {
  if (region === 'AUGSBURG') {
      feiertageObjects.push(newHoliday('AUGSBURGER_FRIEDENSFEST', makeDate(year, 8, 8)));
  }
}
function addHeiligeDreiKoenige(year, region, feiertageObjects) {
  if (region === 'BW' ||
      region === 'BY' ||
      region === 'AUGSBURG' ||
      region === 'ST' ||
      region === 'ALL') {
      feiertageObjects.push(newHoliday('HEILIGEDREIKOENIGE', makeDate(year, 1, 6)));
  }
}
function addEasterAndPfingsten(year, region, easterDate, pfingstsonntag, feiertageObjects) {
  if (region === 'BB' || region === 'ALL') {
      feiertageObjects.push(newHoliday('OSTERSONNTAG', easterDate), newHoliday('PFINGSTSONNTAG', pfingstsonntag));
  }
}
function addFronleichnam(region, easterDate, holidays) {
  if (region === 'BW' ||
      region === 'BY' ||
      region === 'AUGSBURG' ||
      region === 'HE' ||
      region === 'NW' ||
      region === 'RP' ||
      region === 'SL' ||
      region === 'ALL') {
      const fronleichnam = addDays(new Date(easterDate.getTime()), 60);
      holidays.push(newHoliday('FRONLEICHNAM', fronleichnam));
  }
}
function addMariaeHimmelfahrt(year, region, holidays) {
  if (region === 'SL' || region === 'BY' || region === 'AUGSBURG') {
      holidays.push(newHoliday('MARIAHIMMELFAHRT', makeDate(year, 8, 15)));
  }
}
function addReformationstag(year, region, holidays) {
  if (year === 2017 ||
      region === 'NI' ||
      region === 'BB' ||
      region === 'HB' ||
      region === 'HH' ||
      region === 'MV' ||
      region === 'SN' ||
      region === 'ST' ||
      region === 'TH' ||
      region === 'ALL') {
      holidays.push(newHoliday('REFORMATIONSTAG', makeDate(year, 10, 31)));
  }
}
function addAllerheiligen(year, region, holidays) {
  if (region === 'BW' ||
      region === 'BY' ||
      region === 'AUGSBURG' ||
      region === 'NW' ||
      region === 'RP' ||
      region === 'SL' ||
      region === 'ALL') {
      holidays.push(newHoliday('ALLERHEILIGEN', makeDate(year, 11, 1)));
  }
}
function addBussUndBetttag(year, region, holidays) {
  if (region === 'SN' || region === 'ALL') {
      // @todo write test
      const bussbettag = getBussBettag(year);
      holidays.push(newHoliday('BUBETAG', makeDate(bussbettag.getUTCFullYear(), bussbettag.getUTCMonth() + 1, bussbettag.getUTCDate())));
  }
}
function addWeltkindertag(year, region, holidays) {
  if (year >= 2019 && (region === 'TH' || region === 'ALL')) {
      holidays.push(newHoliday('WELTKINDERTAG', makeDate(year, 9, 20)));
  }
}
function addWeltfrauenTag(year, region, feiertageObjects) {
  if (region !== 'BE') {
      return;
  }
  if (year < 2018) {
      return;
  }
  feiertageObjects.push(newHoliday('WELTFRAUENTAG', makeDate(year, 3, 8)));
}
/**
* Calculates the Easter date of a given year.
* @param year {number}
* @returns {Date} Easter date
* @private
*/
function getEasterDate(year) {
  const C = Math.floor(year / 100);
  // tslint:disable:binary-expression-operand-order
  // tslint generates false positives in the following blocks
  const N = year - 19 * Math.floor(year / 19);
  const K = Math.floor((C - 17) / 25);
  let I = C - Math.floor(C / 4) - Math.floor((C - K) / 3) + 19 * N + 15;
  I -= 30 * Math.floor(I / 30);
  I -=
      Math.floor(I / 28) *
          (1 -
              Math.floor(I / 28) *
                  Math.floor(29 / (I + 1)) *
                  Math.floor((21 - N) / 11));
  let J = year + Math.floor(year / 4) + I + 2 - C + Math.floor(C / 4);
  J -= 7 * Math.floor(J / 7);
  const L = I - J;
  const M = 3 + Math.floor((L + 40) / 44);
  const D = L + 28 - 31 * Math.floor(M / 4);
  // tslint:enable:binary-expression-operand-order
  return new Date(year, M - 1, D);
}
/**
* Computes the "Buss- und Bettag"'s date.
* @param jahr {number}
* @returns {Date} the year's "Buss- und Bettag" date
* @private
*/
function getBussBettag(jahr) {
  const weihnachten = new Date(jahr, 11, 25, 12, 0, 0);
  const ersterAdventOffset = 32;
  let wochenTagOffset = weihnachten.getDay() % 7;
  if (wochenTagOffset === 0) {
      wochenTagOffset = 7;
  }
  const tageVorWeihnachten = wochenTagOffset + ersterAdventOffset;
  let bbtag = new Date(weihnachten.getTime());
  bbtag = addDays(bbtag, -tageVorWeihnachten);
  return bbtag;
}
/**
* Adds {@code days} days to the given {@link Date}.
* @param date
* @param days
* @returns {Date}
* @private
*/
function addDays(date, days) {
  const changedDate = new Date(date);
  changedDate.setDate(date.getDate() + days);
  return changedDate;
}
/**
* Creates a new {@link Date}.
* @param year
* @param naturalMonth month (1-12)
* @param day
* @returns {Date}
* @private
*/
function makeDate(year, naturalMonth, day) {
  return new Date(year, naturalMonth - 1, day);
}
/**
*
* @param name
* @param date
* @returns {Holiday}
* @private
*/
function newHoliday(name, date) {
  return {
      name,
      date,
      dateString: localeDateObjectToDateString(date),
      trans(lang = currentLanguage) {
          console.warn('FeiertageJs: You are using "Holiday.trans() method. This will be replaced in the next major version with translate()"');
          return this.translate(lang);
      },
      translate(lang = currentLanguage) {
          return lang === undefined || lang === null
              ? undefined
              : translations[lang][this.name];
      },
      getNormalizedDate() {
          return toUtcTimestamp(this.date);
      },
      equals(otherDate) {
          const dateString = localeDateObjectToDateString(otherDate);
          return this.dateString === dateString;
      },
  };
}
/**
*
* @param date
* @returns {string}
* @private
*/
function localeDateObjectToDateString(date) {
  const normalizedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  normalizedDate.setUTCHours(0, 0, 0, 0);
  return normalizedDate.toISOString().slice(0, 10);
}
/**
* Returns the UTC timestamp of the given date with hours, minutes, seconds, and milliseconds set to zero.
* @param date
* @returns {number} UTC timestamp
*/
function toUtcTimestamp(date) {
  const internalDate = new Date(date);
  internalDate.setHours(0, 0, 0, 0);
  return internalDate.getTime();
}