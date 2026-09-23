import type { FeatureParts } from '@/shared/lib/feature';
import { unlinkEwtRefsForDeletedIds } from '@/shared/lib/ressource/unlinkEwtRefs';
import syncNebengeldTimesFromEwtRows from '../model/syncEwtToNeben';

/**
 * Event-Teil des EZ-Features: aktualisiert `Storage.dataN` unabhaengig vom DOM, auch wenn der Tab nicht gemountet ist
 * (EZ deaktiviert, EWT aktiv), sonst driften verknuepfte Zeiten (EWT) unbemerkt.
 */
const events: FeatureParts['events'] = {
  'ewt:persisted': ({ rows }) => syncNebengeldTimesFromEwtRows(rows),
  'ewt:deleted': ({ ids }) => unlinkEwtRefsForDeletedIds('N', ids),
};

export default events;
