import { describe, expect, it, vi } from "vitest";
import { DataN } from "../src/ts/Neben/utils";
import { Storage } from "../src/ts/utilities";
import { IDaten } from "../src/ts/interfaces";

describe("#DataN function", () => {
	it("should return an empty array when no data is provided and there is no data in storage", () => {
		const result = DataN(undefined, 3);
		expect(result).toEqual([]);
	});

	it("should return data from storage when no data is provided", () => {
		const storageData: IDaten["N"] = {
			1: [],
			2: [],
			3: [
				{
					tagN: "12",
					beginN: "19:30",
					endeN: "06:15",
					beginPauseN: "01:00",
					endePauseN: "01:45",
					nrN: "040 Fahrentsch.",
					dauerN: 1,
				},
				{
					tagN: "13",
					beginN: "19:30",
					endeN: "06:15",
					beginPauseN: "01:00",
					endePauseN: "01:45",
					nrN: "040 Fahrentsch.",
					dauerN: 1,
				},
			],
			4: [],
			5: [],
			6: [],
			7: [],
			8: [],
			9: [],
			10: [],
			11: [],
			12: [],
		};
		vi.spyOn(Storage, "check").mockReturnValue(true);
		vi.spyOn(Storage, "get").mockReturnValue(storageData);

		const result = DataN(undefined, 3);
		expect(result).toEqual([
			{
				tagN: "12",
				beginN: "19:30",
				endeN: "06:15",
				beginPauseN: "01:00",
				endePauseN: "01:45",
				nrN: "040 Fahrentsch.",
				dauerN: 1,
			},
			{
				tagN: "13",
				beginN: "19:30",
				endeN: "06:15",
				beginPauseN: "01:00",
				endePauseN: "01:45",
				nrN: "040 Fahrentsch.",
				dauerN: 1,
			},
		]);

		vi.spyOn(Storage, "check").mockRestore();
		vi.spyOn(Storage, "get").mockRestore();
	});
});
