import { LreType } from '@otto-kirchheim/nebengeld-shared';
import type { AdminFeature } from '../../adminFeatures';

/** Admin-Anteile der Bereitschaft (`ber`): Bereitschaftseinsatz und Bereitschaftszeitraum. */
const adminFeature: AdminFeature = {
  id: 'ber',
  resources: [
    {
      label: 'Bereitschaftseinsatz',
      shortLabel: 'BE',
      endpoint: 'bereitschaftseinsaetze',
      tableFields: ['User', 'Jahr', 'Monat', 'LRE', 'Auftragsnummer'],
      extraFields: ['Tag', 'createdAt'],
      schemaFields: [
        'User',
        'Bereitschaftszeitraum',
        'Jahr',
        'Monat',
        'Tag',
        'Auftragsnummer',
        'Beginn',
        'Ende',
        'LRE',
        'PrivatKm',
      ],
    },
    {
      label: 'Bereitschaftszeitraum',
      shortLabel: 'BZ',
      endpoint: 'bereitschaftszeitraeume',
      tableFields: ['User', 'Jahr', 'Monat', 'Beginn', 'Ende'],
      extraFields: ['createdAt'],
      schemaFields: ['User', 'Jahr', 'Monat', 'Beginn', 'Ende', 'Pause'],
    },
  ],
  crossRefs: { Bereitschaftszeitraum: { endpoint: 'bereitschaftszeitraeume', isArray: true } },
  fieldEnums: { LRE: Object.values(LreType) },
  formular: { code: 'bereitschaft', label: 'Bereitschaft (B)', order: 3 },
  statsRows: [
    {
      label: 'Bereitschaftseinsätze',
      countKey: 'bereitschaftseinsaetze',
      growthKey: 'bereitschaftseinsaetzeLast7d',
    },
    {
      label: 'Bereitschaftszeiträume',
      countKey: 'bereitschaftszeitraeume',
      growthKey: 'bereitschaftszaetraumeLast7d',
    },
  ],
};

export default adminFeature;
