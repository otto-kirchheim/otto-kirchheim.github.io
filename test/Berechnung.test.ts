import { beforeAll, describe, it } from "vitest";
import { VorgabenGeldMock, VorgabenUMock, datenBerechungMock } from "./mockData";
import { Storage } from "../src/ts/utilities";
import { generateTableBerechnung } from "../src/ts/Berechnung";
import { JSDOM } from "jsdom";
import { IVorgabenBerechnung } from "../src/ts/interfaces/IVorgabenBerechnungMonat";
import { IVorgabenGeld } from "../src/ts/interfaces/IVorgabenGeldType";

describe("#generateTableBerechnung", () => {
	beforeAll(() => {
		Storage.set("VorgabenU", VorgabenUMock);
		Storage.set("datenBerechnung", datenBerechungMock);
		Storage.set("VorgabenGeld", VorgabenGeldMock);

		const dom = new JSDOM(
			'<!DOCTYPE html><table class="table table-bordered table-striped table-hover align-middle table-Berechnung" aria-describedby="titelBerechnung">' +
				'<thead class="align-middle">' +
				'<tr class="table-primary align-middle">' +
				"<th></th>" +
				'<th class="col-1">Jan</th>' +
				'<th class="col-1">Feb</th>' +
				'<th class="col-1">Mär</th>' +
				'<th class="col-1">Apr</th>' +
				'<th class="col-1">Mai</th>' +
				'<th class="col-1">Jun</th>' +
				'<th class="col-1">Jul</th>' +
				'<th class="col-1">Aug</th>' +
				'<th class="col-1">Sep</th>' +
				'<th class="col-1">Okt</th>' +
				'<th class="col-1">Nov</th>' +
				'<th class="col-1">Dez</th>' +
				'</tr></thead><tbody id="tbodyBerechnung"></tbody></table>'
		);
		global.document = dom.window.document;
	});
	it("should generate 'Berechnung' Table", () => {
		generateTableBerechnung(
			Storage.get<IVorgabenBerechnung>("datenBerechnung"),
			Storage.get<IVorgabenGeld>("VorgabenGeld")
		);

		const tbody = document.querySelector<HTMLTableSectionElement>("#tbodyBerechnung");
		if (!tbody) throw new Error("tbody not found");

		const rows = tbody.children;
		if (rows.length !== 13) throw new Error(`Expected 13 rows, but found ${rows.length}`);

		const expectedValues = [
			"6000",
			"100:00",
			"258,00&nbsp;€",
			"70,94&nbsp;€",
			"46,43&nbsp;€",
			"26,57&nbsp;€",
			"4,05&nbsp;€",
			"405,99&nbsp;€",
			"15 <br>1 <br>1",
			"15 <br> 1",
			"77,20&nbsp;€",
			"13,30&nbsp;€",
			"496,49&nbsp;€",
		];

		Array.from(rows).forEach((row, rowIndex) => {
			const expectedValue = expectedValues[rowIndex];
			Array.from(row.children).forEach((cell, cellIndex) => {
				if (cellIndex === 0 && rowIndex !== 1) return;
				if (cell.innerHTML !== expectedValue) {
					throw new Error(
						`Expected cell at (${rowIndex}, ${cellIndex}) to have value '${expectedValue}', but found '${cell.innerHTML}'`
					);
				}
			});
		});
	});
});
