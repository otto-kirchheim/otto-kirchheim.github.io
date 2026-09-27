import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'bun:test';
import '@/app/features';
import { featureRegistry } from '@/shared/lib/feature';
import EinstellungenTab from '@/pages/einstellungen/ui/EinstellungenTab';
import PersoenlicheDatenPanel from '@/pages/einstellungen/ui/PersoenlicheDatenPanel';
import {
  getEinstellungenTeile,
  ladeEinstellungenTeile,
  resetEinstellungenTeile,
} from '@/shared/model/einstellungen/einstellungenTeile';
import { CustomTable, createCustomTable } from '@/shared/ui/custom-table/CustomTable';
import Storage from '@/shared/lib/storage/Storage';
import { resetFeatureTabsVisible } from '@/shared/model/navigation/featureTabsStore';
import updateTabVisibility from '@/shared/model/navigation/updateTabVisibility';
import type { IVorgabenU, IVorgabenUvorgabenB } from '@/types';
import { VorgabenUMock } from '@test/mockData';
import { render } from '@test/reactRender';

/** Ids der Abschnitte im Akkordeon in Darstellungsreihenfolge. */
const abschnittIds = (container: Element): string[] =>
  [...container.querySelectorAll<HTMLElement>('.db-accordion-item[id], li[id^="collapse"]')].map(el => el.id);

describe('Einstellungen ueber Feature-Slots', () => {
  beforeAll(async () => {
    await ladeEinstellungenTeile();
  });

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('meldet Abschnitte von ber, ewt und ez mit den bisherigen Ids; ea steuert nur Pers-Felder bei', () => {
    expect(getEinstellungenTeile().map(t => t.id)).toEqual(['ber', 'ewt', 'ez', 'ea']);
    expect(getEinstellungenTeile().find(t => t.id === 'ea')!.part.PersFelder).toBeDefined();
    expect(getEinstellungenTeile().flatMap(t => t.part.sections.map(s => [s.id, s.titel]))).toEqual([
      ['collapseThree', 'Bereitschaft'],
      ['collapseFour', 'Fahrzeiten'],
      ['collapseSix', 'Zulagen'],
    ]);
  });

  it('rendert die Abschnitte der Features zwischen den globalen in der bisherigen Reihenfolge', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    render(<EinstellungenTab />, container);

    const ids = abschnittIds(container);
    expect(ids).toEqual([
      'collapseOne',
      'collapsePasskeys',
      'collapseTwo',
      'collapseThree',
      'collapseFour',
      'collapseFive',
      'collapseSix',
    ]);
    expect(container.querySelector('#tableVE')).not.toBeNull();
    expect(container.querySelector('#fahrzeiten-panel')).not.toBeNull();
    expect(container.querySelector('#settings-zulagen-list')).not.toBeNull();
    render(null, container);
  });

  it('blendet die Abschnitte deaktivierter Features aus, ohne sie abzubauen (Werte bleiben erhalten)', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    render(<EinstellungenTab />, container);
    const ausgeblendet = (id: string) => container.querySelector(`#${id}`)!.classList.contains('d-none');

    // Vor dem ersten Setzen (nicht angemeldet) sind alle sichtbar.
    expect(['collapseThree', 'collapseFour', 'collapseSix'].map(ausgeblendet)).toEqual([false, false, false]);

    updateTabVisibility(['ewt']);
    expect(ausgeblendet('collapseThree')).toBe(true);
    expect(ausgeblendet('collapseFour')).toBe(false);
    expect(ausgeblendet('collapseSix')).toBe(true);
    // Der Inhalt bleibt im DOM, `saveEinstellungen` sammelt ihn weiter.
    expect(container.querySelector('#tableVE')).not.toBeNull();
    expect(ausgeblendet('collapseOne')).toBe(false);

    updateTabVisibility(['bereitschaft', 'ewt', 'neben']);
    expect(['collapseThree', 'collapseFour', 'collapseSix'].map(ausgeblendet)).toEqual([false, false, false]);
    resetFeatureTabsVisible();
    render(null, container);
  });

  it('Entfernbarkeit: ohne den ez-Slot fehlt dessen Abschnitt, die uebrigen bleiben', async () => {
    const original = featureRegistry.loadAll.bind(featureRegistry);
    vi.spyOn(featureRegistry, 'loadAll').mockImplementation(async part =>
      (await original(part)).filter(ergebnis => ergebnis.id !== 'ez'),
    );
    resetEinstellungenTeile();
    await ladeEinstellungenTeile();

    const container = document.createElement('div');
    document.body.appendChild(container);
    render(<EinstellungenTab />, container);

    expect(abschnittIds(container)).toEqual([
      'collapseOne',
      'collapsePasskeys',
      'collapseTwo',
      'collapseThree',
      'collapseFour',
      'collapseFive',
    ]);
    render(null, container);
  });

  it('Chunk-Fehler: ein fehlgeschlagener Slot blockiert die anderen nicht (Log + Snackbar)', async () => {
    const original = featureRegistry.loadAll.bind(featureRegistry);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(featureRegistry, 'loadAll').mockImplementation(async part =>
      (await original(part)).map(e => (e.id === 'ewt' ? { id: 'ewt', ok: false as const, error: new Error('x') } : e)),
    );
    resetEinstellungenTeile();

    const geladen = await ladeEinstellungenTeile();

    expect(geladen.map(t => t.id)).toEqual(['ber', 'ez', 'ea']);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('ber: read laedt die Einsatzzeitraeume in #tableVE, collect liest sie wieder aus', async () => {
    await ladeEinstellungenTeile();
    const ber = getEinstellungenTeile().find(t => t.id === 'ber')!.part;
    const vorgabenU: IVorgabenU = {
      ...VorgabenUMock,
      VorgabenB: { A: { Name: 'A' }, B: { Name: 'B' } } as unknown as IVorgabenU['VorgabenB'],
    };
    Storage.set('VorgabenU', vorgabenU);
    document.body.innerHTML = '<table id="tableVE"></table>';
    const tabelle = createCustomTable<IVorgabenUvorgabenB>('tableVE', {
      columns: [{ name: 'Name', title: 'Name' }],
      rows: [],
      sorting: { enabled: false },
    });
    expect(tabelle).toBeInstanceOf(CustomTable);

    ber.read(vorgabenU);

    expect(Object.keys(ber.collect(vorgabenU).VorgabenB ?? {})).toHaveLength(2);
  });

  it('ber: read wirft, wenn #tableVE fehlt (Abschnitt nicht gerendert)', async () => {
    await ladeEinstellungenTeile();
    const ber = getEinstellungenTeile().find(t => t.id === 'ber')!.part;
    expect(() => ber.read(VorgabenUMock)).toThrow('Tabelle nicht gefunden');
  });

  describe('ea: Pers-Feld Entgeltgruppe', () => {
    /** Rendert das Panel „Persönliche Daten“ und liefert Container und EA-Slot (sofern geladen). */
    async function zeichnePanel() {
      resetEinstellungenTeile();
      await ladeEinstellungenTeile();
      const container = document.createElement('div');
      document.body.appendChild(container);
      render(<PersoenlicheDatenPanel />, container);
      // DBInput setzt die `id` am <input> erst nach dem ersten Effekt.
      await new Promise(resolve => setTimeout(resolve, 0));
      return { container, ea: getEinstellungenTeile().find(t => t.id === 'ea')?.part };
    }

    it('steht im Panel direkt nach der Taetigkeit', async () => {
      const { container } = await zeichnePanel();
      const ids = [...container.querySelectorAll('input')].map(input => input.id);
      expect(ids.indexOf('Entgeltgruppe')).toBe(ids.indexOf('Taetigkeit') + 1);
      render(null, container);
    });

    it('read traegt den Wert ein (leer ohne gepflegten Wert), collect schreibt ihn nach Pers', async () => {
      const { container, ea: slot } = await zeichnePanel();
      const ea = slot!;
      const input = container.querySelector<HTMLInputElement>('#Entgeltgruppe')!;
      const mit = { ...VorgabenUMock, Pers: { ...VorgabenUMock.Pers, Entgeltgruppe: '105' } } as IVorgabenU;
      const ohne = {
        ...VorgabenUMock,
        Pers: { ...VorgabenUMock.Pers, Entgeltgruppe: undefined },
      } as unknown as IVorgabenU;

      ea.read(mit);
      expect(input.value).toBe('105');
      ea.read(ohne);
      expect(input.value).toBe('');

      input.value = '  104 ';
      expect(ea.collect(mit).Pers).toEqual({ ...mit.Pers, Entgeltgruppe: '104' });
      render(null, container);
    });

    it('collect wirft bei ungueltigen Zeichen und markiert das Feld', async () => {
      const { container, ea: slot } = await zeichnePanel();
      const ea = slot!;
      const input = container.querySelector<HTMLInputElement>('#Entgeltgruppe')!;
      input.value = '<105>';

      expect(() => ea.collect(VorgabenUMock)).toThrow('Persönliche Daten fehlerhaft');
      expect(input.getAttribute('data-custom-validity')).toBe('invalid');
      render(null, container);
    });

    it('EA abgewaehlt: Feld ausgeblendet, bleibt aber im DOM und wird weiter eingesammelt', async () => {
      const { container, ea: slot } = await zeichnePanel();
      const ea = slot!;
      const input = container.querySelector<HTMLInputElement>('#Entgeltgruppe')!;
      const zelle = () => container.querySelector('#Entgeltgruppe')!.closest('.sp-md-6')!;
      input.value = '105';

      updateTabVisibility(['bereitschaft', 'ewt', 'neben']);
      expect(zelle().classList.contains('d-none')).toBe(true);
      expect(ea.collect(VorgabenUMock).Pers?.Entgeltgruppe).toBe('105');

      updateTabVisibility(['bereitschaft', 'ewt', 'neben', 'ea']);
      expect(zelle().classList.contains('d-none')).toBe(false);
      resetFeatureTabsVisible();
      render(null, container);
    });

    it('ohne gerendertes Feld traegt ea nichts bei; ohne ea-Slot fehlt das Feld', async () => {
      const { container, ea: slot } = await zeichnePanel();
      const ea = slot!;
      render(null, container);
      expect(ea.collect(VorgabenUMock)).toEqual({});

      const original = featureRegistry.loadAll.bind(featureRegistry);
      vi.spyOn(featureRegistry, 'loadAll').mockImplementation(async part =>
        (await original(part)).filter(ergebnis => ergebnis.id !== 'ea'),
      );
      const ohneEa = await zeichnePanel();
      expect(ohneEa.container.querySelector('#Entgeltgruppe')).toBeNull();
      expect(ohneEa.container.querySelector('#Taetigkeit')).not.toBeNull();
      render(null, ohneEa.container);
    });
  });
});
