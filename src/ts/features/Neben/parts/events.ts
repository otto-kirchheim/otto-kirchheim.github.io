import type { FeatureParts } from '@/core/hooks';
import syncNebengeldTimesFromEwtRows from '../utils/syncEwtToNeben';

/**
 * Event-Teil des EZ-Features: aktualisiert `Storage.dataN` unabhaengig vom DOM, auch wenn der Tab nicht gemountet ist
 * (EZ deaktiviert, EWT aktiv), sonst driften verknuepfte Zeiten (EWT) unbemerkt.
 */
const events: FeatureParts['events'] = {
  'ewt:persisted': ({ rows }) => syncNebengeldTimesFromEwtRows(rows),
};

export default events;
