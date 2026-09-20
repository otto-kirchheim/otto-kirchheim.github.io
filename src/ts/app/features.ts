/**
 * Feature-Manifest: die einzige Stelle, die Feature-Module kennt. Ein Feature hinzufuegen oder entfernen =
 * Ordner `features/<id>` plus ein `featureRegistry.define(...)` hier. Teile werden per `import()` erst bei Bedarf geladen.
 * Die Import-Position in `main.tsx` legt die Registrierungsreihenfolge fest.
 */

import { featureRegistry } from '@/core/hooks';
import { eaMeta } from '@/features/EA/meta';

featureRegistry.define({
  meta: eaMeta,
  parts: {
    ui: () => import('@/features/EA/parts/ui'),
    events: () => import('@/features/EA/parts/events'),
  },
});
