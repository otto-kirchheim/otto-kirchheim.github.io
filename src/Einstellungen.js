function generateEingabeMaskeEinstellungen(VorgabenU) {
  Object.keys(VorgabenU.pers).forEach(function (key) {
    document.getElementById(key).value = VorgabenU.pers[key];
  });

  Object.keys(VorgabenU.aZ).forEach((key) => {
    document.getElementById(key).value = VorgabenU.aZ[key];
  });

  var tbody = document.getElementById("TbodyTätigkeitsstätten");
  tbody.innerHTML = "";
  var tgkSKeys = Object.keys(VorgabenU.fZ);
  for (var i = 0; i < 17; i++) {
    var tr = tbody.insertRow();
    var td = document.createElement("td");

    if (i < tgkSKeys.length) {
      td = tr.insertCell(0);
      var input = document.createElement("input");
      input.setAttribute("type", "Text");
      input.setAttribute("class", "form-control");
      input.setAttribute("value", tgkSKeys[i]);
      td.appendChild(input);

      td = tr.insertCell(1);
      var input = document.createElement("input");
      input.setAttribute("type", "Text");
      input.setAttribute("class", "form-control");
      input.setAttribute("value", VorgabenU.fZ[tgkSKeys[i]][0]);
      td.appendChild(input);

      td = tr.insertCell(2);
      var input = document.createElement("input");
      input.setAttribute("type", "time");
      input.setAttribute("class", "form-control");
      input.setAttribute("value", VorgabenU.fZ[tgkSKeys[i]][1]);
      td.appendChild(input);
    } else {
      td = tr.insertCell(0);
      var input = document.createElement("input");
      input.setAttribute("type", "Text");
      input.setAttribute("class", "form-control");
      input.setAttribute("value", "");
      td.appendChild(input);

      td = tr.insertCell(1);
      var input = document.createElement("input");
      input.setAttribute("type", "Text");
      input.setAttribute("class", "form-control");
      input.setAttribute("value", "");
      td.appendChild(input);

      td = tr.insertCell(2);
      var input = document.createElement("input");
      input.setAttribute("type", "time");
      input.setAttribute("class", "form-control");
      input.setAttribute("value", "");
      td.appendChild(input);
    }
  }
}

function saveEinstellungen() {
  var VorgabenU = JSON.parse(localStorage.getItem("VorgabenU"));

  Object.keys(VorgabenU.pers).forEach(function (key) {
    VorgabenU.pers[key] = document.getElementById(key).value;
  });

  Object.keys(VorgabenU.aZ).forEach(function (key) {
    VorgabenU.aZ[key] = document.getElementById(key).value;
  });
  //console.log(VorgabenU);

  VorgabenU.fZ = table_to_array_einstellungen("TbodyTätigkeitsstätten");

  //console.log(VorgabenU);

  if (VorgabenU.pers.TB == "Tarifkraft") {
    document.getElementById("AnzeigenN-tab").classList.remove("d-none");
  } else {
    document.getElementById("AnzeigenN-tab").classList.add("d-none");
  }
  //
  localStorage.setItem("VorgabenU", JSON.stringify(VorgabenU));
}

function table_to_array_einstellungen(table_id) {
  var myData = document.getElementById(table_id).rows;
  var my_liste = {};
  for (var i = 0; i < myData.length; i++) {
    el = myData[i].children;
    var key = el[0].children[0].value;
    if (!key) {
      continue;
    }
    var km = el[1].children[0].value;
    var zeit = el[2].children[0].value;
    my_liste[key] = [km, zeit];
  }
  return my_liste;
}