import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import type { FeatureMeta } from '@/shared/lib/feature';
import { featureLifecycleRegistry, featureRegistry } from '@/shared/lib/feature';
import getEwtDatenFuerZuordnung from '@/shared/lib/ressource/getEwtDatenFuerZuordnung';
import Storage from '@/shared/lib/storage/Storage';

function meta(id: string, order: number, benoetigt?: string[]): FeatureMeta {
  return {
    id,
    label: id,
    icon: 'cash',
    order,
    resources: [],
    legacyDefaultOn: true,
    legacy: {
      lifecycleName: id,
      tabKey: id,
      paneId: id,
      rootId: `${id}-root`,
      navId: `${id}-tab`,
      saveButtonId: `btnSave${id}`,
    },
    benoetigt,
  };
}

describe('getEwtDatenFuerZuordnung', () => {
  beforeEach(() => {
    localStorage.clear();
    Storage.set('Benutzer', 'Tester');
    Storage.set('Monat', 6);
    Storage.set('Jahr', 2025);
    Storage.set('dataE', [
      { _id: 'e1', Tag: '2025-06-10T00:00:00.000Z', Buchungstag: '2025-06-10T00:00:00.000Z', berechnen: true },
    ]);
    featureRegistry.clear();
    featureLifecycleRegistry.clearAll();
  });
  afterEach(() => {
    featureRegistry.clear();
    featureLifecycleRegistry.clearAll();
  });

  it('liefert die EWT-Zeilen, wenn ewt im Manifest steht', () => {
    featureRegistry.define({ meta: meta('ewt', 1), parts: {} });
    featureRegistry.define({ meta: meta('ez', 2, ['ewt']), parts: {} });

    expect(getEwtDatenFuerZuordnung('ez', { scope: 'all' })).toHaveLength(1);
  });

  it('liefert [] ohne ewt im Manifest, auch wenn Alt-Daten in dataE liegen', () => {
    featureRegistry.define({ meta: meta('ez', 2, ['ewt']), parts: {} });

    expect(getEwtDatenFuerZuordnung('ez', { scope: 'all' })).toEqual([]);
  });

  it('ein Feature ohne Abhaengigkeit von ewt liest weiter aus dataE', () => {
    featureRegistry.define({ meta: meta('ber', 1), parts: {} });

    expect(getEwtDatenFuerZuordnung('ber', { scope: 'all' })).toHaveLength(1);
  });
});
