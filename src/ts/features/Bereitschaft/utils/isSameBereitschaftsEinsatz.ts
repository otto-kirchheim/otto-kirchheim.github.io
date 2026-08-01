import type { IDatenBE } from '@/types';

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

export default function isSameBereitschaftsEinsatz(candidate: IDatenBE, current?: IDatenBE): boolean {
  if (!current) return false;
  if (current._id && candidate._id) return current._id === candidate._id;
  if (getBereitschaftsEinsatzSignature(candidate) === getBereitschaftsEinsatzSignature(current)) return true;
  return candidate === current;
}
