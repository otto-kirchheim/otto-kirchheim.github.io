jQuery(function ($) {
  var $modalN = $("#editor-modalN"),
    $editorN = $("#editorN"),
    $editorTitleN = $("#editor-titleN"),
    ftN = FooTable.init("#tableN", {
      columns: [
        {
          name: "tagN",
          title: "Tag",
          sortable: true,
          sorted: true,
          direction: "ASC",
        },
        { name: "beginN", title: "Arbeit Von", sortable: false },
        { name: "endeN", title: "Arbeit Bis", sortable: false },
        {
          name: "beginPauseN",
          title: "Pause Von",
          sortable: false,
          breakpoints: "xs",
        },
        {
          name: "endePauseN",
          title: "Pause Bis",
          sortable: false,
          breakpoints: "xs",
        },
        { name: "nrN", title: "Zulage", sortable: false, breakpoints: "xs md" },
        {
          name: "dauerN",
          title: "Anzahl",
          sortable: false,
          breakpoints: "xs md",
        },
      ],
      rows: DataN(),
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
          $modalN.removeData("row");
          $editorN[0].reset();
          $editorN.find("#tagN2").val(
            moment()
              .year(localStorage.getItem("Jahr"))
              .month(localStorage.getItem("Monat") - 1)
              .format("YYYY-MM-DD")
          );
          $editorTitleN.text("Nebenbezug hinzufügen");
          $modalN.modal("show");
        },
        editRow: function (row) {
          var values = row.val();
          $editorN.find("#tagN2").val(
            moment(values.tagN, "DD.MM.YYYY")
              .year(localStorage.getItem("Jahr"))
              .month(localStorage.getItem("Monat") - 1)
              .format("YYYY-MM-DD")
          );
          $editorN.find("#beginN").val(values.beginN);
          $editorN.find("#endeN").val(values.endeN);
          $editorN.find("#beginPauseN").val(values.beginPauseN);
          $editorN.find("#endePauseN").val(values.endePauseN);
          $editorN.find("#nrN").val(values.nrN);
          $editorN.find("#dauerN").val(values.dauerN);

          $modalN.data("row", row);
          $editorTitleN.text("Zeile Bearbeiten");
          $modalN.modal("show");
        },
        deleteRow: function (row) {
          row.delete();
          setTimeout(function () {
            saveTableData("tableN", ftN);
          }, 100);
        },
      },
    });

  console.log(ftN);

  $editorN.on("submit", function (e) {
    if (this.checkValidity && !this.checkValidity()) return;
    e.preventDefault();
    var row = $modalN.data("row"),
      values = {
        tagN: moment($editorN.find("#tagN2").val()).format("DD"),
        beginN: $editorN.find("#beginN").val(),
        endeN: $editorN.find("#endeN").val(),
        beginPauseN: $editorN.find("#beginPauseN").val(),
        endePauseN: $editorN.find("#endePauseN").val(),
        nrN: $editorN.find("#nrN option:selected").val(),
        dauerN: $editorN.find("#dauerN").val(),
      };
    $editorN.find("#tagN2").removeAttr("min").removeAttr("max");
    //console.log(values)

    if (row instanceof FooTable.Row) {
      row.val(values);
    } else {
      ftN.rows.add(values);
    }

    setTimeout(function () {
      saveTableData("tableN", ftN);
    }, 100);

    $modalN.modal("hide");
  });
});

function DataN(data) {
  //console.log(data)
  if (data == null) {
    if (localStorage.getItem("dataN") == null) return [];
    data = JSON.parse(localStorage.getItem("dataN"));
  }
  //console.log(data)
  var data1 = [];
  data.forEach((row, i) => {
    //console.log(row)
    data1[i] = {
      tagN: {
        options: {
          sortValue: Number(row[0]),
        },
        value: row[0],
      },
      beginN: row[1],
      endeN: row[2],
      beginPauseN: row[3],
      endePauseN: row[4],
      nrN: row[5],
      dauerN: row[6],
    };
  });
  //console.log(data1)
  return data1;
}

function generateEditorModalN(tag) {
  tag = `#${tag}`;
  var tag2 = moment($(tag).val());
  //console.log(tag2)
  var monat = tag2.month();
  var jahr = tag2.year();
  //console.log(monat, jahr)
  var min = moment()
    .year(jahr)
    .month(monat)
    .startOf("month")
    .format("YYYY-MM-DD");
  var max = moment()
    .year(jahr)
    .month(monat)
    .endOf("month")
    .format("YYYY-MM-DD");
  //console.log(min, max)
  $(tag).attr("min", min).attr("max", max);
}

function generateEingabeMaskeNeben() {
  var select = document.getElementById("tagN");
  select.innerHTML = "";
  //console.log(select)

  var dataE = tableToArray("#tableE");
  console.log(dataE);
  var dataN = tableToArray("#tableN");
  //console.log(dataN)

  var jahr = localStorage.getItem("Jahr");
  var monat = localStorage.getItem("Monat");
  for (var i = 0; i < dataE.length; i++) {
    var schicht = dataE[i][2];
    var tag1;
    var tag;
    var pauseA = "12:00";
    var pauseE = "12:30";
    if ((schicht == "N") | (schicht == "BN")) {
      tag1 = `0${dataE[i][0] - 1}`.slice(-2);
      tag = `${tag1} | ${new Date(
        jahr,
        monat - 1,
        dataE[i][0] - 1
      ).toLocaleDateString("de", {
        weekday: "short",
      })}`;
      pauseA = "01:00";
      pauseE = "01:45";
    } else {
      tag1 = `0${dataE[i][0]}`.slice(-2);
      tag = `${tag1} | ${new Date(
        jahr,
        monat - 1,
        dataE[i][0]
      ).toLocaleDateString("de", {
        weekday: "short",
      })}`;
    }
    if (new Date(jahr, monat - 1, tag).getDay() == 5) {
      pauseA = "";
      pauseE = "";
    }
    //console.log(opt)
    var el = document.createElement("option");
    if (schicht == "N") {
      el.textContent = `${tag} | Nacht`;
    } else if (schicht == "BN") {
      el.textContent = `${tag} | Nacht / Bereitschaft`;
    } else {
      el.textContent = tag;
    }
    el.value = JSON.stringify([tag1, dataE[i][6], dataE[i][7], pauseA, pauseE]);
    if (dataN) {
      dataN.forEach((value) => {
        if (Number(value[0]) == Number(tag1)) {
          el.disabled = true;
        }
      });
    }
    //console.log(el)
    select.appendChild(el);
  }
}

function addNebenTag() {
  var select = document.getElementById("tagN");

  var idN = select.selectedIndex;
  //console.log(idN)
  var daten = JSON.parse(select.value);
  daten.push(document.getElementById("Nebenbezug").value);
  daten.push(document.getElementById("AnzahlN").value);
  console.log(daten);
  select[idN].selected = false;
  select[idN].disabled = true;
  idN++;
  while (idN < select.length) {
    if (!select[idN].disabled) {
      select[idN].selected = true;
      break;
    }
    idN++;
  }

  let ftN = FooTable.get("#tableN");
  ftN.rows.load(DataN([daten]), true);
  setTimeout(function () {
    saveTableData("tableN", ftN);
  }, 100);
}
