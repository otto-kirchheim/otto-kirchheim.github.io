import { IDaten, IVorgabenBerechnung, IVorgabenGeld, IVorgabenU } from ".";

export interface UserDatenServer extends IDaten {
	vorgabenU: IVorgabenU;
	datenGeld: IVorgabenGeld;
	datenBerechnung: IVorgabenBerechnung | false;
}
