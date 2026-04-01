import type { CustomTableTypes } from '../class/CustomTable';

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
  BZ?: IDatenBZ<BZType>[];
  BE?: IDatenBE[];
  EWT?: IDatenEWT<EWTType>[];
  N?: IDatenN[];
}

type IDatenBZValues<BZType = string> = BZType | number | string | undefined;

export interface IDatenBZ<BZType = string> extends CustomTableTypes {
  [key: string]: IDatenBZValues<BZType>;
  _id?: string;
  beginB: BZType;
  endeB: BZType;
  pauseB: number;
}

type IDatenBEValues = string | number | undefined;

export interface IDatenBE extends CustomTableTypes {
  [key: string]: IDatenBEValues;
  _id?: string;
  bereitschaftszeitraumBE?: string;
  tagBE: string;
  auftragsnummerBE: string;
  beginBE: string;
  endeBE: string;
  lreBE: 'LRE 1' | 'LRE 2' | 'LRE 1/2 ohne x' | 'LRE 3' | 'LRE 3 ohne x';
  privatkmBE: number;
}

type IDatenEWTValues<EWTType = string> = string | EWTType | boolean | undefined;
export interface IDatenEWT<EWTType = string> {
  [key: string]: IDatenEWTValues<EWTType>;
  _id?: string;
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

type IDatenNValues = string | number | undefined;
export interface IDatenN {
  [key: string]: IDatenNValues;
  _id?: string;
  ewtRef?: string;
  tagN: string;
  beginN: string;
  endeN: string;
  anzahl040N: number;
  auftragN: string;
}
