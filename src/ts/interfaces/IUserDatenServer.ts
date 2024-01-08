import { IDaten, IVorgabenGeld, IVorgabenU } from ".";

export interface UserDatenServer extends Required<IDaten> {
	vorgabenU: IVorgabenU;
	datenGeld: IVorgabenGeld;
}

export type ReturnTypeSaveData = {
	daten: Required<IDaten>;
	user: IVorgabenU;
};
