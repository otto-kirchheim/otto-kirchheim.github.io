import { beforeEach, describe, expect, it } from 'bun:test';
import '@/app/features';
import { featureRegistry } from '@/shared/lib/feature';
import {
  isRowInMonat,
  resourceDefs,
  resourceByStorageKey,
  resourceDef,
  resourceKeys,
  storageKeyOf,
  tableIdOf,
} from '@/shared/lib/ressource/resourceConfig';
import type { FeatureDefinition } from '@/shared/lib/feature';

describe('resourceConfig (aus meta.resources der Features)', () => {
  beforeEach(() => {
    // Der Test veraendert die Registry nicht; das Manifest aus dem Import bleibt bestehen.
    expect(featureRegistry.metas()).toHaveLength(4);
  });

  it('liefert Schluessel, Storage-Keys und Tabellen-Ids der vier Features in Feature-Reihenfolge', () => {
    expect(resourceKeys()).toEqual(['BZ', 'BE', 'EWT', 'N', 'EA']);
    expect(storageKeyOf('EWT')).toBe('dataE');
    expect(tableIdOf('EWT')).toBe('tableE');
    expect(resourceByStorageKey('dataEA')?.key).toBe('EA');
    expect(resourceByStorageKey('VorgabenU')).toBeUndefined();
  });

  it('wirft mit klarer Meldung, wenn kein Feature die Ressource anmeldet', () => {
    const definitions = (featureRegistry as unknown as { definitions: Map<string, FeatureDefinition> }).definitions;
    const ea = definitions.get('ea')!;
    definitions.delete('ea');
    try {
      expect(() => resourceDef('EA')).toThrow("Ressource 'EA' ist von keinem Feature angemeldet");
      expect(resourceKeys()).toEqual(['BZ', 'BE', 'EWT', 'N']);
    } finally {
      definitions.set('ea', ea);
    }
  });

  it('EWT faellt auch mit dem Buchungstag in den Monat, die anderen nur ueber monatOf', () => {
    const ewt = resourceDef('EWT');
    const row = { Tag: '2026-03-31', Buchungstag: '2026-04-01' };
    expect(isRowInMonat(ewt, row, 3)).toBe(true);
    expect(isRowInMonat(ewt, row, 4)).toBe(true);
    expect(ewt.monatOf(row)).toBe(3);

    const bz = resourceDef('BZ');
    expect(isRowInMonat(bz, { Beginn: '2026-05-10T08:00:00' }, 5)).toBe(true);
    expect(isRowInMonat(bz, { Beginn: '2026-05-10T08:00:00' }, 6)).toBe(false);
  });

  it('bildet die Jahres-Gates unveraendert ab (Neben ab 2024 in beiden Filtern, EA ab 2025 nur beim Laden)', () => {
    expect(resourceDef('N')).toMatchObject({ minYear: 2024, filterMinYear: 2024 });
    expect(resourceDef('EA').minYear).toBe(2025);
    expect(resourceDef('EA').filterMinYear).toBeUndefined();
    expect(resourceDef('BZ').minYear).toBeUndefined();
  });

  it('bestimmt den Speicher-Zeitraum je Ressource aus dem Datumsfeld im jeweiligen Format', () => {
    expect(resourceDef('BZ').periodOf({ Beginn: '2026-05-10T08:00:00' })).toEqual({ monat: 5, jahr: 2026 });
    expect(resourceDef('BE').periodOf({ Tag: '10.05.2026' })).toEqual({ monat: 5, jahr: 2026 });
    expect(resourceDef('EWT').periodOf({ Tag: '2026-05-10' })).toEqual({ monat: 5, jahr: 2026 });
    expect(resourceDef('N').periodOf({ Tag: '10.05.2026' })).toEqual({ monat: 5, jahr: 2026 });
    expect(resourceDef('EA').periodOf({ Tag: '10.05.2026' })).toEqual({ monat: 5, jahr: 2026 });
    // Strikte Formate: ein falsches Format ergibt keinen Zeitraum (Aufrufer nutzt dann Monat/Jahr der Anzeige).
    expect(resourceDef('BE').periodOf({ Tag: '2026-05-10' })).toBeUndefined();
    expect(resourceDef('EWT').periodOf({ Tag: 'kein Datum' })).toBeUndefined();
  });

  it('N und EA ignorieren die EWT-Verknuepfung beim Signatur-Abgleich, die anderen nicht', () => {
    expect(resourceDef('N').signatureOmitKeys).toEqual(['EWT']);
    expect(resourceDef('EA').signatureOmitKeys).toEqual(['EWT']);
    expect(resourceDef('BZ').signatureOmitKeys).toBeUndefined();
    expect(resourceDef('EWT').signatureOmitKeys).toBeUndefined();
  });

  it('stellt je Ressource einen Backend-Adapter bereit', () => {
    for (const resource of resourceDefs()) {
      expect(typeof resource.api.fromBackend).toBe('function');
      expect(typeof resource.api.loadYear).toBe('function');
      expect(typeof resource.api.bulk).toBe('function');
    }
  });
});
