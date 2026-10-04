import type { AdminFeature } from '../../adminFeatures';
import katalog from './katalog';
import { fahrzeitAbschnitt } from './profilVorlage';

/** Admin-Anteile der EWT (`ewt`): Einsatzwechseltätigkeit. */
const adminFeature: AdminFeature = {
  id: 'ewt',
  resources: [
    {
      label: 'Einsatzwechseltätigkeit',
      shortLabel: 'EWT',
      endpoint: 'einsatzwechseltaetigkeiten',
      tableFields: ['User', 'Jahr', 'Monat', 'Schicht', 'Tag'],
      extraFields: ['createdAt'],
      schemaFields: [
        'User',
        'Jahr',
        'Monat',
        'Tag',
        'Buchungstag',
        'Einsatzort',
        'Schicht',
        'abWE',
        'ab1E',
        'anEE',
        'beginE',
        'endeE',
        'abEE',
        'an1E',
        'anWE',
        'berechnen',
      ],
      nurDatumFelder: ['Tag', 'Buchungstag'],
      zeitFelder: ['abWE', 'ab1E', 'anEE', 'beginE', 'endeE', 'abEE', 'an1E', 'anWE'],
    },
  ],
  fieldEnums: { Schicht: ['T', 'SP', 'N', 'S', 'BN'] },
  formular: { code: 'ewt', label: 'Einsatzwechseltätigkeit (EWT)', order: 2, katalog },
  statsRows: [{ label: 'Einsatzwechseltätigkeiten', countKey: 'einsatzwechseltaetigkeiten', growthKey: 'ewtLast7d' }],
  profilVorlage: { abschnitte: [fahrzeitAbschnitt] },
};

export default adminFeature;
