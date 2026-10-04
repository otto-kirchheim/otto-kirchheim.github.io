import { defineVorlagenAbschnitt } from '../../adminFeatures';
import { benoetigteZulagenAusVorlage } from './zulagen';
import ZulagenEditor from './ZulagenEditor';

/** Abschnitt fuer `profilVorlage.abschnitte` der Erschwerniszulagen. */
export const zulagenAbschnitt = defineVorlagenAbschnitt<string[]>({
  id: 'Zulagen',
  label: 'Zulagen',
  ausVorlage: template => benoetigteZulagenAusVorlage(template.Einstellungen),
  inVorlage: (result, zulagen) => {
    // Teilt sich `Einstellungen` mit den sichtbaren Bereichen; leere Einstellungen raeumt `buildTemplatePayload` weg.
    result.Einstellungen = {
      ...(result.Einstellungen as Record<string, unknown> | undefined),
      benoetigteZulagen: zulagen,
    };
  },
  hatDaten: zulagen => zulagen.length > 0,
  Editor: ZulagenEditor,
});
