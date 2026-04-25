import type { IDatenBE } from '../../../core/types';

function getBereitschaftsEinsatzSignature(row: IDatenBE): string {
  return JSON.stringify({
    bereitschaftszeitraumBE: row.bereitschaftszeitraumBE ?? '',
    tagBE: row.tagBE,
    auftragsnummerBE: row.auftragsnummerBE,
    beginBE: row.beginBE,
    endeBE: row.endeBE,
    lreBE: row.lreBE,
    privatkmBE: row.privatkmBE,
  });
}

export default function isSameBereitschaftsEinsatz(candidate: IDatenBE, current?: IDatenBE): boolean {
  if (!current) return false;
  if (current._id && candidate._id) return current._id === candidate._id;
  if (getBereitschaftsEinsatzSignature(candidate) === getBereitschaftsEinsatzSignature(current)) return true;
  return candidate === current;
}
