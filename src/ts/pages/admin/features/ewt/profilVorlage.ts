import { defineVorlagenAbschnitt } from '../../adminFeatures';
import { normalizeFahrzeit, type FahrzeitRow } from './fahrzeit';
import FahrzeitEditor from './FahrzeitEditor';

/** Abschnitt fuer `profilVorlage.abschnitte` der EWT. */
export const fahrzeitAbschnitt = defineVorlagenAbschnitt<FahrzeitRow[]>({
  id: 'Fahrzeit',
  label: 'Fahrzeit',
  ausVorlage: template => normalizeFahrzeit(template.Fahrzeit),
  inVorlage: (result, rows) => {
    // Beschreibung (text) ist optional; nur Tätigkeitsstätte und Fahrzeit sind Pflicht
    const fahrzeit = rows.filter(row => row.key.trim() && row.value.trim());
    if (fahrzeit.length > 0) result.Fahrzeit = fahrzeit;
    else delete result.Fahrzeit;
  },
  hatDaten: rows => rows.length > 0,
  Editor: FahrzeitEditor,
});
