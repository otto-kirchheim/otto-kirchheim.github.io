import { defineVorlagenAbschnitt } from '../../adminFeatures';
import { normalizeVorgabenB, vorgabenBInVorlage, type VorgabenBRow } from './vorgabenB';
import VorgabenBEditor from './VorgabenBEditor';

/** Abschnitt fuer `profilVorlage.abschnitte` der Bereitschaft. */
export const vorgabenBAbschnitt = defineVorlagenAbschnitt<VorgabenBRow[]>({
  id: 'VorgabenB',
  label: 'VorgabenB',
  ausVorlage: template => normalizeVorgabenB(template.VorgabenB),
  inVorlage: (result, rows) => {
    const vorgabenB = vorgabenBInVorlage(rows);
    if (vorgabenB.length > 0) result.VorgabenB = vorgabenB;
    else delete result.VorgabenB;
  },
  hatDaten: rows => rows.length > 0,
  Editor: VorgabenBEditor,
});
