export interface IVorgabenU {
	pers: {
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
	};
	aZ: { bBN: string; bN: string; bS: string; bT: string; eN: string; eS: string; eT: string; eTF: string; rZ: string };
	fZ: { key: string; text: string; value: string }[];
	vorgabenB: {
		[key: string]: {
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
		};
	};
}
