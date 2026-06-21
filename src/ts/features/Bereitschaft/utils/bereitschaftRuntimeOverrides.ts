import type { ISchichtZeiten, IVorgabenUvorgabenB } from '@/types';

export type BereitschaftRuntimeOverrides = NonNullable<IVorgabenUvorgabenB['schichtenOverrides']> & {
  sonderOverride?: ISchichtZeiten;
};

/**
 * Modulweite Brücke für die im „Neue Bereitschaft eingeben"-Modal interaktiv gesetzten
 * Arbeitszeit-Overrides (Preact-Editor → imperativer Submit). Pro Modal-Öffnung zurücksetzen.
 */
let runtimeOverrides: BereitschaftRuntimeOverrides | undefined;

export const setBereitschaftRuntimeOverrides = (overrides: BereitschaftRuntimeOverrides | undefined): void => {
  runtimeOverrides = overrides;
};

export const getBereitschaftRuntimeOverrides = (): BereitschaftRuntimeOverrides | undefined => runtimeOverrides;
