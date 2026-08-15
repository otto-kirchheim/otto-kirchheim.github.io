import type { CustomTableTypes } from '@/infrastructure/table/CustomTable';
import type { LreType } from '@otto-kirchheim/nebengeld-shared';

export interface IMonatsDaten<EWTType = string> {
  BZ: IDatenBZ[];
  BE: IDatenBE[];
  EWT: IDatenEWT<EWTType>[];
  N: IDatenN[];
  EA: IDatenEA[];
}

export type IDatenAllValuesWithKey<BZType = string, EWTType = string> = {
  [key: string]: IDatenBZValues<BZType> | IDatenBEValues | IDatenEWTValues<EWTType> | IDatenNValues | IDatenEAValues;
};

export type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U];

export interface IDaten<BZType = string, EWTType = string> {
  BZ?: IDatenBZ<BZType>[];
  BE?: IDatenBE[];
  EWT?: IDatenEWT<EWTType>[];
  N?: IDatenN[];
  EA?: IDatenEA[];
}

type IDatenBZValues<BZType = string> = BZType | number | string | undefined;

export interface IDatenBZ<BZType = string> extends CustomTableTypes {
  [key: string]: IDatenBZValues<BZType>;
  _id?: string;
  Beginn: BZType;
  Ende: BZType;
  Pause: number;
}

type IDatenBEValues = string | number | string[] | undefined;

export interface IDatenBE extends CustomTableTypes {
  [key: string]: IDatenBEValues;
  _id?: string;
  Bereitschaftszeitraum?: string[];
  Tag: string;
  Auftragsnummer: string;
  Beginn: string;
  Ende: string;
  LRE: LreType;
  PrivatKm: number;
}

type IDatenEWTValues<EWTType = string> = string | EWTType | boolean | undefined;
export interface IDatenEWT<EWTType = string> {
  [key: string]: IDatenEWTValues<EWTType>;
  _id?: string;
  Tag: string;
  Buchungstag?: string;
  Einsatzort: string;
  Schicht: string;
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

export interface INebenZulage {
  Typ: string;
  Wert: number;
}

type IDatenNValues = string | number | INebenZulage[] | undefined;
export interface IDatenN {
  [key: string]: IDatenNValues;
  _id?: string;
  EWT?: string;
  Tag: string;
  Beginn: string;
  Ende: string;
  Zulagen?: INebenZulage[];
  zulagenAnzeigeN?: string;
  Auftragsnummer: string;
}

type IDatenEAValues = string | undefined;
export interface IDatenEA {
  [key: string]: IDatenEAValues;
  _id?: string;
  EWT?: string;
  Tag: string;
  Dauer: string;
  Taetigkeit: string;
  Entgeltgruppe: string;
}
