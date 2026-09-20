import { afterAll, beforeAll, describe, expect, it, vi } from 'bun:test';
import '@/app/features';
import { featureRegistry } from '@/core/hooks';
import type { FeatureMeta, FeatureParts } from '@/core/hooks';
import calculateBerechnungRows from '@/features/Berechnung/calculateBerechnungRows';
import generateTableBerechnung from '@/features/Berechnung/generateTableBerechnung';
import { type IBerechnungTeil, ladeBerechnungsTeile } from '@/features/Berechnung/ladeBerechnungsTeile';
import Storage from '@/infrastructure/storage/Storage';
import type { IVorgabenBerechnung } from '@/types';
import { VorgabenGeldMock, VorgabenUMock, datenBerechungMock } from '@test/mockData';

/** Slot eines Fantasie-Features, das ohne Aenderung an `Berechnung` in Tabelle und Summe erscheint. */
const demoSlot: FeatureParts['berechnung'] = {
  bucketKey: 'X' as never,
  aggregate: () => ({}),
  calc: () => ({ ergebnis: {}, summe: 5, zaehltInGesamtsumme: true }),
  hatDaten: () => true,
  tabelle: () => [{ id: 'demo', label: 'Demo-Summe', inhalt: () => '5' }],
  karte: () => null,
};

const demoMeta: FeatureMeta = {
  id: 'demo',
  label: 'Demo',
  icon: 'cash',
  order: 9,
  resources: [],
  legacyDefaultOn: false,
  legacy: {
    lifecycleName: 'Demo',
    tabKey: 'demo',
    paneId: 'Demo',
    rootId: 'demo-root',
    navId: 'demo-tab',
    saveButtonId: 'btnSaveDemo',
  },
};

const summeGesamt = (teile: IBerechnungTeil[]) =>
  calculateBerechnungRows(datenBerechungMock, VorgabenGeldMock, 'Tarifkraft', teile)[0].summeGesamt;

describe('Berechnung ueber Feature-Slots', () => {
  let teile: IBerechnungTeil[];

  beforeAll(async () => {
    teile = await ladeBerechnungsTeile();
  });

  afterAll(() => vi.restoreAllMocks());

  it('laedt die Slots aller Features in meta.order (ber, ewt, ez, ea) mit den persistierten Bucket-Schluesseln', () => {
    expect(teile.map(t => [t.id, t.tabKey, t.part.bucketKey])).toEqual([
      ['ber', 'bereitschaft', 'B'],
      ['ewt', 'ewt', 'E'],
      ['ez', 'neben', 'N'],
      ['ea', 'ea', 'EA'],
    ]);
  });

  it('Entfernbarkeit: ohne den EWT-Slot fehlen dessen Werte, die Gesamtsumme besteht aus den uebrigen Features', () => {
    const ohneEwt = teile.filter(t => t.id !== 'ewt');
    const [ergebnis] = calculateBerechnungRows(datenBerechungMock, VorgabenGeldMock, 'Tarifkraft', ohneEwt);
    const [mitAllem] = calculateBerechnungRows(datenBerechungMock, VorgabenGeldMock, 'Tarifkraft', teile);

    expect(ergebnis.summeEwt).toBeNull();
    expect(ergebnis.abwesenheiten).toBeNull();
    expect(mitAllem.summeEwt).not.toBeNull();
    expect(ergebnis.summeGesamt).toBeCloseTo((mitAllem.summeGesamt ?? 0) - (mitAllem.summeEwt ?? 0), 6);
  });

  it('Robustheit: ein Snapshot ohne Bucket eines Features (aelter oder unvollstaendig) wirft nicht, die Werte fehlen nur', () => {
    const ohneEwtUndN = {
      1: { B: datenBerechungMock[1].B, EA: datenBerechungMock[1].EA },
    } as unknown as IVorgabenBerechnung;

    const [ergebnis] = calculateBerechnungRows(ohneEwtUndN, VorgabenGeldMock, 'Tarifkraft', teile);

    expect(ergebnis.bereitschaftMinuten).not.toBeNull();
    expect(ergebnis.summeEwt).toBeNull();
    expect(ergebnis.summeNebenbezuege).toBeNull();
  });

  it('Chunk-Fehler: ein fehlgeschlagener Slot blockiert die anderen nicht (Snackbar + Log)', async () => {
    const original = featureRegistry.loadAll.bind(featureRegistry);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(featureRegistry, 'loadAll').mockImplementation(async part => {
      const ergebnisse = await original(part);
      return ergebnisse.map(e =>
        e.id === 'ewt' ? { id: 'ewt', ok: false as const, error: new Error('Chunk fehlt') } : e,
      );
    });

    const geladen = await ladeBerechnungsTeile();

    expect(geladen.map(t => t.id)).toEqual(['ber', 'ez', 'ea']);
    expect(errorSpy).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('Erweiterbarkeit: ein neues Feature mit Slot erscheint in Summe und Tabelle ohne Aenderung an Berechnung', async () => {
    featureRegistry.define({ meta: demoMeta, parts: { berechnung: async () => ({ default: demoSlot }) } });

    const mitDemo = await ladeBerechnungsTeile();
    expect(mitDemo.map(t => t.id)).toEqual(['ber', 'ewt', 'ez', 'ea', 'demo']);
    expect(summeGesamt(mitDemo)).toBeCloseTo((summeGesamt(teile) ?? 0) + 5, 6);

    Storage.set('VorgabenU', VorgabenUMock);
    Storage.set('VorgabenGeld', VorgabenGeldMock);
    document.body.innerHTML = '<table><tbody id="tbodyBerechnung"></tbody></table>';
    await generateTableBerechnung(datenBerechungMock as IVorgabenBerechnung, VorgabenGeldMock);

    expect(document.querySelector('#tbodyBerechnung')!.textContent).toContain('Demo-Summe');
  });
});
