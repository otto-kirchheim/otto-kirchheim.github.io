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
    F: number;    // 040 Fahrentschädigung (Stück)
    A: number;    // Minuten, Hint A (841, 842, 843)
    B: number;    // Minuten, Hint B (811–828)
    C: number;    // Minuten, Hint C (831–835)
    CA: number;   // Minuten, Hint C+A (837)
    CB: number;   // Minuten, Hint C+B (838)
    C9: number;   // Stück, Hint C*9 (839)
    SIPO: number; // Minuten, Hint SIPO (846)
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
