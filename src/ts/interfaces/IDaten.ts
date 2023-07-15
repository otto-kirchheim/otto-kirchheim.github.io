// export interface IDaten {
// 	[key: number]: IMonatsdaten;
// 	1: IMonatsdaten;
// 	2: IMonatsdaten;
// 	3: IMonatsdaten;
// 	4: IMonatsdaten;
// 	5: IMonatsdaten;
// 	6: IMonatsdaten;
// 	7: IMonatsdaten;
// 	8: IMonatsdaten;
// 	9: IMonatsdaten;
// 	10: IMonatsdaten;
// 	11: IMonatsdaten;
// 	12: IMonatsdaten;
// }

// export interface IMonatsdaten<EWTType = string> {
// 	BZ: IDatenBZ[];
// 	BE: IDatenBE[];
// 	EWT: IDatenEWT<EWTType>[];
// 	N: IDatenN[];
// }

export interface IDaten<EWTType = string> {
	BZ: IDatenBZ[];
	BE: IDatenBE[];
	EWT: IDatenEWT<EWTType>[];
	N: IDatenN[];
}
export interface IDatenBZ {
	[key: string]: string | number;
	beginB: string;
	endeB: string;
	pauseB: number;
}
export interface IDatenBE {
	[key: string]: string | number;
	tagBE: string;
	auftragsnummerBE: string;
	beginBE: string;
	endeBE: string;
	lreBE: string;
	privatkmBE: number;
}

export interface IDatenEWT<EWTType = string> {
	[key: string]: string | EWTType | boolean;
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
}

export interface IDatenN {
	[key: string]: string | number;
	tagN: string;
	beginN: `${number}${number}:${number}${number}`;
	endeN: `${number}${number}:${number}${number}`;
	beginPauseN: `${number}${number}:${number}${number}`;
	endePauseN: `${number}${number}:${number}${number}`;
	nrN: string;
	dauerN: number;
}
