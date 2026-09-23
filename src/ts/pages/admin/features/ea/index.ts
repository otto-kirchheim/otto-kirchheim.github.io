import type { AdminFeature } from '../../adminFeatures';

/** Admin-Anteile des Entgeltausgleichs (`ea`). */
const adminFeature: AdminFeature = {
  id: 'ea',
  resources: [
    {
      label: 'Entgeltausgleich',
      shortLabel: 'EA',
      endpoint: 'entgeltausgleich',
      tableFields: ['User', 'Jahr', 'Monat', 'Tag', 'Dauer'],
      extraFields: ['EWT', 'Taetigkeit', 'Entgeltgruppe', 'createdAt'],
      schemaFields: ['User', 'EWT', 'Jahr', 'Monat', 'Tag', 'Dauer', 'Taetigkeit', 'Entgeltgruppe'],
    },
  ],
  // Verknuepfung auf die EWT (Feld `EWT`); ohne das EWT-Feature entfaellt der Link.
  crossRefs: { EWT: { endpoint: 'einsatzwechseltaetigkeiten' } },
  formular: { code: 'ea', label: 'Endgeltausgleich (EA)', order: 4 },
  statsRows: [
    { label: 'Entgeltausgleich-Einträge', countKey: 'entgeltausgleich', growthKey: 'entgeltausgleichLast7d' },
  ],
};

export default adminFeature;
