import { CustomTableTypes } from "../class/CustomTable";

export interface IMonatsDaten<EWTType = string> {
	BZ: IDatenBZ[];
	BE: IDatenBE[];
	EWT: IDatenEWT<EWTType>[];
	N: IDatenN[];
}

export type IDatenAllValuesWithKey<BZType = string, EWTType = string> = {
	[key: string]: IDatenBZValues<BZType> | IDatenBEValues | IDatenEWTValues<EWTType> | IDatenNValues;
};

export type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U];

export interface IDaten<BZType = string, EWTType = string> {
	BZ?: IDatenBZJahr<BZType>;
	BE?: IDatenBEJahr;
	EWT?: IDatenEWTJahr<EWTType>;
	N?: IDatenNJahr;
}

type IDatenBZValues<BZType = string> = BZType | number;

export interface IDatenBZ<BZType = string> extends CustomTableTypes {
	[key: string]: IDatenBZValues<BZType>;
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

type IDatenBEValues = string | number;

export interface IDatenBE extends CustomTableTypes {
	[key: string]: IDatenBEValues;
	tagBE: string;
	auftragsnummerBE: string;
	beginBE: string;
	endeBE: string;
	lreBE: "LRE 1" | "LRE 2" | "LRE 1/2 ohne x" | "LRE 3" | "LRE 3 ohne x";
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

type IDatenEWTValues<EWTType = string> = string | EWTType | boolean;
export interface IDatenEWT<EWTType = string> {
	[key: string]: IDatenEWTValues<EWTType>;
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

type IDatenNValues = string | number;
export interface IDatenN {
	[key: string]: IDatenNValues;
	tagN: string;
	beginN: string;
	endeN: string;
	anzahl040N: number;
	auftragN: string;
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
