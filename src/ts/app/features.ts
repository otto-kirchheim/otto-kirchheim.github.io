/**
 * Feature-Manifest: die einzige Stelle, die Feature-Module kennt. Ein Feature hinzufuegen oder entfernen =
 * Ordner `features/<Ordner>` plus ein `featureRegistry.define(...)` hier. Teile werden per `import()` erst bei Bedarf geladen.
 * Die Import-Position in `main.tsx` legt die Registrierungsreihenfolge fest.
 */

import { featureRegistry } from '@/shared/lib/feature';
import { berMeta } from '@/features/ber/meta';
import { eaMeta } from '@/features/ea/meta';
import { ewtMeta } from '@/features/ewt/meta';
import { ezMeta } from '@/features/ez/meta';

featureRegistry.define({
  meta: berMeta,
  parts: {
    ui: () => import('@/features/ber/parts/ui'),
    data: () => import('@/features/ber/parts/data'),
    pdf: () => import('@/features/ber/parts/pdf'),
    help: () => import('@/features/ber/parts/help'),
    berechnung: () => import('@/features/ber/parts/berechnung'),
    einstellungen: () => import('@/features/ber/parts/einstellungen'),
  },
});

featureRegistry.define({
  meta: ewtMeta,
  parts: {
    ui: () => import('@/features/ewt/parts/ui'),
    data: () => import('@/features/ewt/parts/data'),
    pdf: () => import('@/features/ewt/parts/pdf'),
    help: () => import('@/features/ewt/parts/help'),
    berechnung: () => import('@/features/ewt/parts/berechnung'),
    einstellungen: () => import('@/features/ewt/parts/einstellungen'),
  },
});

featureRegistry.define({
  meta: ezMeta,
  parts: {
    ui: () => import('@/features/ez/parts/ui'),
    data: () => import('@/features/ez/parts/data'),
    pdf: () => import('@/features/ez/parts/pdf'),
    help: () => import('@/features/ez/parts/help'),
    berechnung: () => import('@/features/ez/parts/berechnung'),
    einstellungen: () => import('@/features/ez/parts/einstellungen'),
    events: () => import('@/features/ez/parts/events'),
  },
});

featureRegistry.define({
  meta: eaMeta,
  parts: {
    ui: () => import('@/features/ea/parts/ui'),
    data: () => import('@/features/ea/parts/data'),
    pdf: () => import('@/features/ea/parts/pdf'),
    help: () => import('@/features/ea/parts/help'),
    berechnung: () => import('@/features/ea/parts/berechnung'),
    events: () => import('@/features/ea/parts/events'),
  },
});
