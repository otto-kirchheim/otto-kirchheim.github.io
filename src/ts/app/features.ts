/**
 * Feature-Manifest: die einzige Stelle, die Feature-Module kennt. Ein Feature hinzufuegen oder entfernen =
 * Ordner `features/<Ordner>` plus ein `featureRegistry.define(...)` hier. Teile werden per `import()` erst bei Bedarf geladen.
 * Die Import-Position in `main.tsx` legt die Registrierungsreihenfolge fest.
 */

import { featureRegistry } from '@/core/hooks';
import { berMeta } from '@/features/Bereitschaft/meta';
import { eaMeta } from '@/features/EA/meta';
import { ewtMeta } from '@/features/EWT/meta';
import { ezMeta } from '@/features/Neben/meta';

featureRegistry.define({
  meta: berMeta,
  parts: { ui: () => import('@/features/Bereitschaft/parts/ui') },
});

featureRegistry.define({
  meta: ewtMeta,
  parts: { ui: () => import('@/features/EWT/parts/ui') },
});

featureRegistry.define({
  meta: ezMeta,
  parts: {
    ui: () => import('@/features/Neben/parts/ui'),
    events: () => import('@/features/Neben/parts/events'),
  },
});

featureRegistry.define({
  meta: eaMeta,
  parts: {
    ui: () => import('@/features/EA/parts/ui'),
    events: () => import('@/features/EA/parts/events'),
  },
});
