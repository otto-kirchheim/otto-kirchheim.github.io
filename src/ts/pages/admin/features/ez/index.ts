import type { AdminFeature } from '../../adminFeatures';

/** Admin-Anteile der Erschwerniszulagen (`ez`, bisher Neben): Nebengeld. */
const adminFeature: AdminFeature = {
  id: 'ez',
  resources: [
    {
      label: 'Nebengeld',
      shortLabel: 'NG',
      endpoint: 'nebengeld',
      tableFields: ['User', 'Jahr', 'Monat', 'Tag'],
      extraFields: ['EWT', 'createdAt'],
      schemaFields: ['User', 'EWT', 'Jahr', 'Monat', 'Tag', 'Beginn', 'Ende', 'Auftragsnummer', 'Zulagen'],
    },
  ],
  // Verknuepfung auf die EWT (Feld `EWT`); ohne das EWT-Feature entfaellt der Link.
  crossRefs: { EWT: { endpoint: 'einsatzwechseltaetigkeiten' } },
  formular: { code: 'ez', label: 'Zulagenzettel (EZ)', order: 1 },
  statsRows: [{ label: 'Nebengeld-Einträge', countKey: 'nebengeld', growthKey: 'nebengeldLast7d' }],
};

export default adminFeature;
