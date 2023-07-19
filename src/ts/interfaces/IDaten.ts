export interface IMonatsDaten<EWTType = string> {
	BZ: IDatenBZ[];
	BE: IDatenBE[];
	EWT: IDatenEWT<EWTType>[];
	N: IDatenN[];
}

export interface IDaten<EWTType = string> {
	BZ: IDatenBZJahr;
	BE: IDatenBEJahr;
	EWT: IDatenEWTJahr<EWTType>;
	N: IDatenNJahr;
}

export interface IDatenBZ {
	[key: string]: string | number;
	beginB: string;
	endeB: string;
	pauseB: number;
}

export interface IDatenBZJahr {
	[key: number]: IDatenBZ[];
	1: IDatenBZ[];
	2: IDatenBZ[];
	3: IDatenBZ[];
	4: IDatenBZ[];
	5: IDatenBZ[];
	6: IDatenBZ[];
	7: IDatenBZ[];
	8: IDatenBZ[];
	9: IDatenBZ[];
	10: IDatenBZ[];
	11: IDatenBZ[];
	12: IDatenBZ[];
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

export interface IDatenBEJahr {
	[key: number]: IDatenBE[];
	1: IDatenBE[];
	2: IDatenBE[];
	3: IDatenBE[];
	4: IDatenBE[];
	5: IDatenBE[];
	6: IDatenBE[];
	7: IDatenBE[];
	8: IDatenBE[];
	9: IDatenBE[];
	10: IDatenBE[];
	11: IDatenBE[];
	12: IDatenBE[];
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

export interface IDatenEWTJahr<EWTType = string> {
	[key: number]: IDatenEWT<EWTType>[];
	1: IDatenEWT<EWTType>[];
	2: IDatenEWT<EWTType>[];
	3: IDatenEWT<EWTType>[];
	4: IDatenEWT<EWTType>[];
	5: IDatenEWT<EWTType>[];
	6: IDatenEWT<EWTType>[];
	7: IDatenEWT<EWTType>[];
	8: IDatenEWT<EWTType>[];
	9: IDatenEWT<EWTType>[];
	10: IDatenEWT<EWTType>[];
	11: IDatenEWT<EWTType>[];
	12: IDatenEWT<EWTType>[];
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

export interface IDatenNJahr {
	[key: number]: IDatenN[];
	1: IDatenN[];
	2: IDatenN[];
	3: IDatenN[];
	4: IDatenN[];
	5: IDatenN[];
	6: IDatenN[];
	7: IDatenN[];
	8: IDatenN[];
	9: IDatenN[];
	10: IDatenN[];
	11: IDatenN[];
	12: IDatenN[];
}
