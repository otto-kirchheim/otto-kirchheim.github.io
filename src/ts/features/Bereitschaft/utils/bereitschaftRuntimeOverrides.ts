import type { ISchichtZeiten, IVorgabenUvorgabenB } from '@/types';

export type BereitschaftRuntimeOverrides = NonNullable<IVorgabenUvorgabenB['schichtenOverrides']> & {
  sonderOverride?: ISchichtZeiten;
};

/**
 * Modulweite Brücke für die im „Neue Bereitschaft eingeben"-Modal interaktiv gesetzten
 * Arbeitszeit-Overrides (React-Editor → imperativer Submit). Pro Modal-Öffnung zurücksetzen.
 */
let runtimeOverrides: BereitschaftRuntimeOverrides | undefined;

/**
 * Setzt die Runtime-Overrides des geöffneten Modals.
 *
 * @param overrides - Neue Overrides; `undefined` setzt zurück.
 */
export const setBereitschaftRuntimeOverrides = (overrides: BereitschaftRuntimeOverrides | undefined): void => {
  runtimeOverrides = overrides;
};

/**
 * Liefert die Runtime-Overrides des geöffneten Modals.
 *
 * @returns Aktuelle Overrides oder `undefined`.
 */
export const getBereitschaftRuntimeOverrides = (): BereitschaftRuntimeOverrides | undefined => runtimeOverrides;
