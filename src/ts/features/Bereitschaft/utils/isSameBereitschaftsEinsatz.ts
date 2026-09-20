import type { IDatenBE } from '@/types';

/**
 * Bildet eine Signatur aus den fachlichen Identitätsfeldern eines Einsatzes, um noch nicht gesyncte Zeilen ohne `_id` zu vergleichen.
 *
 * @param row - Bereitschaftseinsatz.
 * @returns JSON-String der Identitätsfelder (Tag, Auftragsnummer, Beginn, Ende, LRE, PrivatKm).
 */
function getBereitschaftsEinsatzSignature(row: IDatenBE): string {
  return JSON.stringify({
    Tag: row.Tag,
    Auftragsnummer: row.Auftragsnummer,
    Beginn: row.Beginn,
    Ende: row.Ende,
    LRE: row.LRE,
    PrivatKm: row.PrivatKm,
  });
}

/**
 * Prüft, ob zwei Bereitschaftseinsätze denselben Datensatz meinen.
 *
 * @param candidate - Zu prüfender Einsatz.
 * @param current - Vergleichseinsatz; `undefined` liefert `false`.
 * @returns `true`, wenn beide dieselbe `_id` haben, sonst bei gleicher Signatur oder gleicher Objektreferenz.
 */
export default function isSameBereitschaftsEinsatz(candidate: IDatenBE, current?: IDatenBE): boolean {
  if (!current) return false;
  if (current._id && candidate._id) return current._id === candidate._id;
  if (getBereitschaftsEinsatzSignature(candidate) === getBereitschaftsEinsatzSignature(current)) return true;
  return candidate === current;
}
