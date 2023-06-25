export interface IVorgabenGeldType {
	BE14: number;
	BE8: number;
	"Besoldungsgruppe A 8": number;
	"Besoldungsgruppe A 9": number;
	Fahrentsch: number;
	LRE1: number;
	LRE2: number;
	LRE3: number;
	PrivatPKWTarif: number;
	PrivatPKWBeamter: number;
	Tarifkraft: number;
	TE14: number;
	TE24: number;
	TE8: number;
}

export interface IVorgabenGeld {
	[key: number]: IVorgabenGeldType;
	getMonat: (maxMonat: number) => IVorgabenGeldType;
}
