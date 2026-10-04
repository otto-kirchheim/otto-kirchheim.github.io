import type { FeatureParts } from '@/shared/lib/feature';
import { unlinkEwtRefsForDeletedIds } from '@/shared/lib/ressource/unlinkEwtRefs';
import syncEaDurationFromEwtRows from '../model/syncEwtToEa';

/**
 * Event-Teil des EA-Features: aktualisiert `Storage.dataEA` unabhaengig vom DOM, auch wenn der EA-Tab nicht
 * gemountet ist (EA deaktiviert, EWT aktiv), sonst driften verknuepfte EA-Dauern unbemerkt.
 */
const events: FeatureParts['events'] = {
  'ewt:persisted': ({ rows }) => syncEaDurationFromEwtRows(rows),
  'ewt:deleted': ({ ids }) => unlinkEwtRefsForDeletedIds('EA', ids),
};

export default events;
