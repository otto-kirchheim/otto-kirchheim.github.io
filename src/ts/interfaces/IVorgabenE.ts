import duration from "dayjs/plugin/duration.js";

export interface IVorgabenE {
	[key: string]:
		| duration.Duration
		| {
				[key: string]: duration.Duration;
				// eslint-disable-next-line no-mixed-spaces-and-tabs
		  };
	bBN: duration.Duration;
	bN: duration.Duration;
	bS: duration.Duration;
	bT: duration.Duration;
	eN: duration.Duration;
	eS: duration.Duration;
	eT: duration.Duration;
	eTF: duration.Duration;
	rZ: duration.Duration;
	fZ: {
		[key: string]: duration.Duration;
	};
}
