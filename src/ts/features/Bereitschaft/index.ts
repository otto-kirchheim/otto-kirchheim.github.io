import type { IVorgabenUvorgabenB } from '@/types';
import { featureLifecycleRegistry } from '@/core/hooks';
import { mountBereitschaftTab, unmountBereitschaftTab } from './BereitschaftTab';

// Zeiten werden je Wochentag aus vorgabenU.aZ abgeleitet; die Vorgaben definieren nur Tag-/Wochen-Bereich + Schichten.
// Wird auch von Einstellungen (generateEingabeMaskeEinstellungen.ts) als Default verwendet — bleibt daher
// unabhängig vom Mount-Zustand des Bereitschaft-Tabs immer verfügbar.
export const BereitschaftsEinsatzZeiträume: { [key: number]: IVorgabenUvorgabenB } = {
  0: {
    Name: 'B1',
    beginnB: { tag: 4 },
    endeB: { tag: 4, Nwoche: true },
    nacht: false,
    beginnN: { tag: 0, Nwoche: true },
    endeN: { tag: 4, Nwoche: true },
  },
  1: {
    Name: 'B2',
    beginnB: { tag: 4 },
    endeB: { tag: 0, Nwoche: false },
    nacht: false,
    beginnN: { tag: 0, Nwoche: false },
    endeN: { tag: 4, Nwoche: true },
  },
  2: {
    Name: 'B1 + Nacht',
    beginnB: { tag: 4 },
    endeB: { tag: 4, Nwoche: true },
    nacht: true,
    beginnN: { tag: 0, Nwoche: true },
    endeN: { tag: 4, Nwoche: true },
    standard: true,
  },
  3: {
    Name: 'B1 + Nacht (ab Sa)',
    beginnB: { tag: 4 },
    endeB: { tag: 4, Nwoche: true },
    nacht: true,
    beginnN: { tag: 6, Nwoche: false },
    endeN: { tag: 3, Nwoche: true },
  },
};

featureLifecycleRegistry.registerFeature({
  name: 'Bereitschaft',
  async register(): Promise<void> {
    mountBereitschaftTab();
  },
  async unregister(): Promise<void> {
    unmountBereitschaftTab();
  },
});
