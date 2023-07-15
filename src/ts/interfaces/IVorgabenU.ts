export interface IVorgabenU {
	pers: IVorgabenUPers;
	aZ: IVorgabenUaZ;
	fZ: IVorgabenUfZ[];
	vorgabenB: { [key: string]: IVorgabenUvorgabenB };
}

export interface IVorgabenUPers {
	Vorname: string;
	Nachname: string;
	PNummer: string;
	Telefon: string;
	Adress1: string;
	Adress2: string;
	ErsteTkgSt: string;
	Betrieb: string;
	OE: string;
	Gewerk: string;
	kmArbeitsort: number;
	nBhf: string;
	kmnBhf: number;
	TB: "Besoldungsgruppe A 8" | "Besoldungsgruppe A 9" | "Tarifkraft";
}
export interface IVorgabenUaZ {
	[key: string]: string;
	bBN: string;
	bN: string;
	bS: string;
	bT: string;
	eN: string;
	eS: string;
	eT: string;
	eTF: string;
	rZ: string;
}
export interface IVorgabenUfZ {
	[key: string]: string;
	key: string;
	text: string;
	value: string;
}
export interface IVorgabenUvorgabenB {
	Name: string;
	beginnB: {
		tag: number;
		zeit: string;
	};
	endeB: {
		tag: number;
		zeit: string;
		Nwoche: boolean;
	};
	nacht: boolean;
	beginnN: {
		tag: number;
		zeit: string;
		Nwoche: boolean;
	};
	endeN: {
		tag: number;
		zeit: string;
		Nwoche: boolean;
	};
	standard?: true;
}
