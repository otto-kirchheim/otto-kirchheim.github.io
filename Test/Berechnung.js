function generateTableBerechnung(datenBerechnung, datenGeld) {
  //console.log("datenBerechnung", datenBerechnung)
  //console.log("datenGeld", datenGeld)
  if (datenBerechnung === true) return clearLoading("btnNeuBerech");
  if (!datenGeld) datenGeld = JSON.parse(localStorage.getItem("VorgabenGeld"));
  var tarif_beamter = JSON.parse(localStorage.getItem("VorgabenU")).pers.TB;
  //console.log(tarif_beamter)

  var berechnung = [[], [], [], [], [], [], [], [], [], [], [], []];

  var tbody = document.getElementById("tbodyBerechnung");
  tbody.innerHTML =
    '<tr><td colspan="2" rowspan="2">Bereitschaftszeiten</td></tr>    <tr></tr>     <tr><td colspan="2">Rufbereitschaftszulage</td></tr>   <tr><td colspan="2">LRE 1</td></tr>      <tr><td colspan="2">LRE 2</td></tr>      <tr><td colspan="2">LRE 3</td></tr>      <tr><td colspan="2">Privat-PKW</td></tr>      <tr><td colspan="2">Summe Bereitschaft</td></tr>      <tr><td rowspan="3" style="white-space: normal;">Anzahl der Abwesenheiten nach FGr-TV / LfTV / RVB</td> <td>>8</td> </tr>      <tr><td>>14</td></tr>      <tr><td>>24</td></tr>      <tr><td rowspan="2" style="white-space: normal;">steuerfreie Abwesenheiten § 9 EStG</td><td>>8</td></tr>      <tr><td>>24</td></tr>      <tr><td colspan="2">Summe EWT</td></tr>      <tr><td colspan="2">Summe Nebenbezüge</td></tr>      <tr><td colspan="2">Summe Gesamt</td></tr>';

  let rows = tbody.querySelectorAll("tr");
  //console.log(rows)

  let td = document.createElement("td");
  rows.forEach((row, index) => {
    //console.log("Zeile: (index) ", index)
    //console.log(berechnung)
    for (var x = 0; x < datenBerechnung.length; x++) {
      //console.log("Monat: (x) " + x)
      let td = document.createElement("td");
      switch (index) {
        case 0:
          if (datenBerechnung[x][0][0] == 0) {
            row.appendChild(td);
            continue;
          }
          td.textContent = datenBerechnung[x][0][0];
          //console.log("Inhalt: " + td.innerText)
          row.appendChild(td);
          break;
        case 1:
          if (datenBerechnung[x][0][0] == 0) {
            row.appendChild(td);
            continue;
          }
          if (tarif_beamter === "Tarifkraft") {
            td.textContent = time_convert(datenBerechnung[x][0][0]);
            //console.log("Inhalt: " + td.innerText)
            row.appendChild(td);
          } else {
            td.textContent = Math.round(
              (datenBerechnung[x][0][0] - 600) / 8 / 60,
              0
            );
            //console.log("Inhalt: " + td.innerText)
            row.appendChild(td);
          }
          break;
        case 2:
          if (datenBerechnung[x][0][0] == 0) {
            row.appendChild(td);
            continue;
          }
          if (tarif_beamter === "Tarifkraft") {
            berechnung[x][0] =
              Math.round(datenBerechnung[x][0][0] / 60, 0) *
              datenGeld[x][tarif_beamter];
            td.textContent = berechnung[x][0].toLocaleString("de-DE", {
              style: "currency",
              currency: "EUR",
            });
          } else {
            berechnung[x][0] =
              Math.round((datenBerechnung[x][0][0] - 600) / 8 / 60, 0) *
              datenGeld[x][tarif_beamter];
            td.textContent = berechnung[x][0].toLocaleString("de-DE", {
              style: "currency",
              currency: "EUR",
            });
          }
          //console.log("Inhalt: " + td.innerText)
          row.appendChild(td);
          break;
        case 3:
          if (datenBerechnung[x][0][1] == 0) {
            row.appendChild(td);
            continue;
          }
          berechnung[x][0] =
            berechnung[x][0] +
            Math.round(datenBerechnung[x][0][1], 0) * datenGeld[x].LRE1;
          td.textContent = (
            Math.round(datenBerechnung[x][0][1], 0) * datenGeld[x].LRE1
          ).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
          //console.log("Inhalt: " + td.innerText)
          row.appendChild(td);
          break;
        case 4:
          if (datenBerechnung[x][0][2] == 0) {
            row.appendChild(td);
            continue;
          }
          berechnung[x][0] =
            berechnung[x][0] +
            Math.round(datenBerechnung[x][0][2], 0) * datenGeld[x].LRE2;
          td.textContent = (
            Math.round(datenBerechnung[x][0][2], 0) * datenGeld[x].LRE2
          ).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
          //console.log("Inhalt: " + td.innerText)
          row.appendChild(td);
          break;
        case 5:
          if (datenBerechnung[x][0][3] == 0) {
            row.appendChild(td);
            continue;
          }
          berechnung[x][0] =
            berechnung[x][0] +
            Math.round(datenBerechnung[x][0][3], 0) * datenGeld[x].LRE3;
          td.textContent = (
            Math.round(datenBerechnung[x][0][3], 0) * datenGeld[x].LRE3
          ).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
          //console.log("Inhalt: " + td.innerText)
          row.appendChild(td);
          break;
        case 6:
          if (datenBerechnung[x][0][4] == 0) {
            row.appendChild(td);
            continue;
          }
          berechnung[x][0] =
            berechnung[x][0] +
            Math.round(datenBerechnung[x][0][4], 0) * datenGeld[x].PrivatPKW;
          td.textContent = (
            Math.round(datenBerechnung[x][0][4], 0) * datenGeld[x].PrivatPKW
          ).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
          //console.log("Inhalt: " + td.innerText)
          row.appendChild(td);
          break;
        case 7:
          //console.log("Berechnung 0: ", berechnung[x][0])
          //console.log("Berechnung 0 length: ", berechnung[x].length === 0)
          if (berechnung[x].length === 0 || !berechnung[x][0]) {
            berechnung[x][0] = 0;
            row.appendChild(td);
            continue;
          }
          td.textContent = berechnung[x][0].toLocaleString("de-DE", {
            style: "currency",
            currency: "EUR",
          });
          //console.log("Inhalt: " + td.innerText)
          row.appendChild(td);
          break;
        case 8:
          if (datenBerechnung[x][1][0] == 0) {
            row.appendChild(td);
            continue;
          }
          if (tarif_beamter === "Tarifkraft") {
            berechnung[x][1] = datenBerechnung[x][1][0] * datenGeld[x].TE8;
          }
          td.textContent = datenBerechnung[x][1][0];
          //console.log("Inhalt: " + td.innerText)
          row.appendChild(td);
          break;
        case 9:
          if (datenBerechnung[x][1][1] == 0) {
            row.appendChild(td);
            continue;
          }
          if (tarif_beamter === "Tarifkraft") {
            berechnung[x][1] =
              berechnung[x][1] + datenBerechnung[x][1][1] * datenGeld[x].TE14;
          }
          td.textContent = datenBerechnung[x][1][1];
          //console.log("Inhalt: " + td.innerText)
          row.appendChild(td);
          break;
        case 10:
          if (datenBerechnung[x][1][2] == 0) {
            row.appendChild(td);
            continue;
          }
          if (tarif_beamter === "Tarifkraft") {
            berechnung[x][1] =
              berechnung[x][1] + datenBerechnung[x][1][2] * datenGeld[x].TE24;
          }
          td.textContent = datenBerechnung[x][1][2];
          //console.log("Inhalt: " + td.innerText)
          row.appendChild(td);
          break;
        case 11:
          if (datenBerechnung[x][1][3] == 0) {
            row.appendChild(td);
            continue;
          }
          if (tarif_beamter !== "Tarifkraft") {
            berechnung[x][1] = datenBerechnung[x][1][3] * datenGeld[x].BE8;
          }
          td.textContent = datenBerechnung[x][1][3];
          //console.log("Inhalt: " + td.innerText)
          row.appendChild(td);
          break;
        case 12:
          if (datenBerechnung[x][1][4] == 0) {
            row.appendChild(td);
            continue;
          }
          if (tarif_beamter !== "Tarifkraft") {
            berechnung[x][1] =
              berechnung[x][1] + datenBerechnung[x][1][4] * datenGeld[x].BE14;
          }
          td.textContent = datenBerechnung[x][1][4];
          //console.log("Inhalt: " + td.innerText)
          row.appendChild(td);
          break;
        case 13:
          if (berechnung[x].length == 0 || !berechnung[x][1]) {
            berechnung[x][1] = 0;
            row.appendChild(td);
            continue;
          }
          td.textContent = berechnung[x][1].toLocaleString("de-DE", {
            style: "currency",
            currency: "EUR",
          });
          //console.log("Inhalt: " + td.innerText)
          row.appendChild(td);
          break;
        case 14:
          if (datenBerechnung[x][2][0] == 0) {
            berechnung[x][2] = 0;
            row.appendChild(td);
            continue;
          }
          if (tarif_beamter !== "Tarifkraft") {
            berechnung[x][2] = 0;
            row.appendChild(td);
            continue;
          } else {
            berechnung[x][2] =
              datenBerechnung[x][2][0] * datenGeld[x].Fahrentsch;
          }
          td.textContent = berechnung[x][2].toLocaleString("de-DE", {
            style: "currency",
            currency: "EUR",
          });
          //console.log("Inhalt: " + td.innerText)
          row.appendChild(td);
          break;
        case 15:
          if (
            berechnung[x].length == 0 ||
            (!berechnung[x][0] && !berechnung[x][1] && !berechnung[x][2])
          ) {
            row.appendChild(td);
            continue;
          }

          td.textContent = (
            Number(berechnung[x][0]) +
            Number(berechnung[x][1]) +
            Number(berechnung[x][2])
          ).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
          //console.log("Inhalt: " + td.innerText)
          row.appendChild(td);
          break;
      }
    }
    //console.log(berechnung)
  });
  clearLoading("btnAktBerech");
  clearLoading("btnNeuBerech");
}

function time_convert(num) {
  //console.log(num)
  var hours = Math.floor(num / 60);
  var minutes = ("00" + Math.round(num % 60, 0)).slice(-2);
  //console.log(hours + " : " + minutes)
  return `${hours}:${minutes}`;
}
