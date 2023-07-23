export interface IMonatsDaten<EWTType = string> {
	BZ: IDatenBZ[];
	BE: IDatenBE[];
	EWT: IDatenEWT<EWTType>[];
	N: IDatenN[];
}

export interface IDaten<BZType = string, EWTType = string> {
	BZ: IDatenBZJahr<BZType>;
	BE: IDatenBEJahr;
	EWT: IDatenEWTJahr<EWTType>;
	N: IDatenNJahr;
}

export interface IDatenBZ<BZType = string> {
	[key: string]: BZType | number;
	beginB: BZType;
	endeB: BZType;
	pauseB: number;
}

export interface IDatenBZJahr<BZType = string> {
	[key: number]: IDatenBZ<BZType>[];
	1: IDatenBZ<BZType>[];
	2: IDatenBZ<BZType>[];
	3: IDatenBZ<BZType>[];
	4: IDatenBZ<BZType>[];
	5: IDatenBZ<BZType>[];
	6: IDatenBZ<BZType>[];
	7: IDatenBZ<BZType>[];
	8: IDatenBZ<BZType>[];
	9: IDatenBZ<BZType>[];
	10: IDatenBZ<BZType>[];
	11: IDatenBZ<BZType>[];
	12: IDatenBZ<BZType>[];
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
	beginN: string;
	endeN: string;
	beginPauseN: string;
	endePauseN: string;
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
