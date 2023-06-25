export interface IDaten<EWTType = string> {
	BZ: {
		beginB: string;
		endeB: string;
		pauseB: number;
	}[];
	BE: {
		tagBE: string;
		auftragsnummerBE: string;
		beginBE: string;
		endeBE: string;
		lreBE: string;
		privatkmBE: number;
	}[];
	EWT: {
		tagE: string;
		eOrtE: string;
		schichtE: string;
		abWE: EWTType;
		ab1E: EWTType;
		anEE: EWTType;
		beginE: EWTType;
		endeE: EWTType;
		abEE: EWTType;
		an1E: EWTType;
		anWE: EWTType;
		berechnen: boolean;
	}[];
	N: {
		tagN: string;
		beginN: `${number}${number}:${number}${number}`;
		endeN: `${number}${number}:${number}${number}`;
		beginPauseN: `${number}${number}:${number}${number}`;
		endePauseN: `${number}${number}:${number}${number}`;
		nrN: string;
		dauerN: number;
	}[];
}
