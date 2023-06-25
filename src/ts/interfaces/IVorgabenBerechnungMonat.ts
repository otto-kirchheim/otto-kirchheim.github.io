export interface IVorgabenBerechnungMonat {
	B: {
		B: number;
		L1: number;
		L2: number;
		L3: number;
		K: number;
	};
	E: {
		A8: number;
		A14: number;
		A24: number;
		S8: number;
		S14: number;
	};
	N: {
		F: number;
	};
}

export interface IVorgabenBerechnung {
	1: IVorgabenBerechnungMonat;
	2: IVorgabenBerechnungMonat;
	3: IVorgabenBerechnungMonat;
	4: IVorgabenBerechnungMonat;
	5: IVorgabenBerechnungMonat;
	6: IVorgabenBerechnungMonat;
	7: IVorgabenBerechnungMonat;
	8: IVorgabenBerechnungMonat;
	9: IVorgabenBerechnungMonat;
	10: IVorgabenBerechnungMonat;
	11: IVorgabenBerechnungMonat;
	12: IVorgabenBerechnungMonat;
}
