import type { FeatureParts } from '@/core/hooks';
import syncEaDurationFromEwtRows from '../utils/syncEwtToEa';

/**
 * Event-Teil des EA-Features: aktualisiert `Storage.dataEA` unabhaengig vom DOM, auch wenn der EA-Tab nicht
 * gemountet ist (EA deaktiviert, EWT aktiv), sonst driften verknuepfte EA-Dauern unbemerkt.
 */
const events: FeatureParts['events'] = {
  'ewt:persisted': ({ rows }) => syncEaDurationFromEwtRows(rows),
};

export default events;
