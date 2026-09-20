import { afterAll, afterEach, beforeEach, describe, expect, it, spyOn, vi } from 'bun:test';
import { clearAllEventListeners, publishEvent } from '@/core/events/appEvents';
import { featureLifecycleRegistry, featureRegistry } from '@/core/hooks';
import type { FeatureDefinition, FeatureMeta, FeaturePartName, FeatureResourceKey } from '@/core/hooks';
import { getHelpContent } from '@/core/help/helpContent';
import { resetFeatureTabSync, syncFeatureTabs } from '@/core/orchestration/syncFeatureTabs';
import calculateBerechnungRows from '@/features/Berechnung/calculateBerechnungRows';
import { ladeBerechnungsTeile } from '@/features/Berechnung/ladeBerechnungsTeile';
import { resourceKeys } from '@/infrastructure/data/resourceConfig';
import AppHeader from '@/infrastructure/ui/AppHeader';
import { ladeEinstellungenTeile, resetEinstellungenTeile } from '@/infrastructure/ui/einstellungenTeile';
import StartTab from '@/infrastructure/ui/StartTab';
import { VorgabenGeldMock, datenBerechungMock } from '@test/mockData';
import { render } from '@test/reactRender';

/**
 * Abnahme des Feature-Vertrags (P1h): (a) jedes Manifest-Feature erfuellt den Vertrag, (b) die App laeuft mit jeder
 * Teilmenge des Manifests, (c) ein neues Feature erscheint ohne Aenderung ausserhalb des Manifests, (d) Teile laden lazy.
 */

/** Definitionen des echten Manifests, in Manifest-Reihenfolge (Aufrufe von `featureRegistry.define`). */
const define = spyOn(featureRegistry, 'define');
await import('@/app/features');
const manifest: FeatureDefinition[] = define.mock.calls.map(call => call[0] as FeatureDefinition);
define.mockRestore();

/** Die vier Kern-Features; die Teilmengen in (b) beziehen sich darauf, damit weitere Features (Scaffold) den Test nicht brechen. */
const KERN = ['ber', 'ewt', 'ez', 'ea'];
const definitionenMit = (teil: FeaturePartName) => manifest.filter(definition => definition.parts[teil]);

/** Ersetzt die Registry-Inhalte durch die angegebenen Definitionen. */
function setzeManifest(definitionen: readonly FeatureDefinition[]): void {
  featureRegistry.clear();
  featureLifecycleRegistry.clearAll();
  clearAllEventListeners();
  resetEinstellungenTeile();
  resetFeatureTabSync();
  for (const definition of definitionen) featureRegistry.define(definition);
}

afterAll(() => setzeManifest(manifest));

describe('(a) Vertrag je Manifest-Feature', () => {
  beforeEach(() => setzeManifest(manifest));

  it('das Manifest enthaelt mindestens die vier Kern-Features', () => {
    expect(manifest.map(definition => definition.meta.id)).toEqual(expect.arrayContaining(KERN));
  });

  it('id, order, Ressourcen-Keys und alle DOM-Ids sind ueber die Features eindeutig', () => {
    const metas = manifest.map(definition => definition.meta);
    const eindeutig = (werte: string[]) => expect(new Set(werte).size).toBe(werte.length);

    eindeutig(metas.map(meta => meta.id));
    eindeutig(metas.map(meta => String(meta.order)));
    eindeutig(metas.flatMap(meta => meta.resources.map(resource => resource.key)));
    eindeutig(metas.flatMap(meta => meta.resources.map(resource => resource.storageKey)));
    eindeutig(metas.flatMap(meta => meta.resources.map(resource => resource.tableId)));
    for (const feld of ['lifecycleName', 'tabKey', 'paneId', 'rootId', 'navId', 'saveButtonId'] as const)
      eindeutig(metas.map(meta => meta.legacy[feld]));
    eindeutig(metas.filter(meta => meta.pdf).map(meta => meta.pdf!.modus));
    eindeutig(metas.filter(meta => meta.pdf).map(meta => meta.pdf!.formular));
  });

  it.each(manifest.map(definition => definition.meta.id))(
    '%s: deklarierte Teile passen zu meta und liefern die vertraglichen Formen',
    async id => {
      const { meta, parts } = manifest.find(definition => definition.meta.id === id)!;
      const geladen = async <P extends FeaturePartName>(teil: P) => featureRegistry.load(id, teil);

      // Jedes Feature hat Tab und Hilfe; pdf-Teil genau mit meta.pdf, events-Teil genau mit meta.wakeOn.
      expect(Object.keys(parts)).toContain('ui');
      expect(Object.keys(parts)).toContain('help');
      expect(Boolean(parts.pdf)).toBe(Boolean(meta.pdf));
      expect(Boolean(parts.events)).toBe(Boolean(meta.wakeOn?.length));

      const ui = await geladen('ui');
      expect([typeof ui.mount, typeof ui.unmount]).toEqual(['function', 'function']);

      if (parts.data) {
        const data = await geladen('data');
        expect(Object.keys(data.tableRows).sort()).toEqual(meta.resources.map(resource => resource.key).sort());
      }
      if (parts.pdf) expect(typeof (await geladen('pdf')).baueDaten).toBe('function');
      if (parts.events) expect(Object.keys(await geladen('events')).sort()).toEqual([...(meta.wakeOn ?? [])].sort());
      if (parts.berechnung) {
        const berechnung = await geladen('berechnung');
        expect(typeof berechnung.bucketKey).toBe('string');
        for (const funktion of ['aggregate', 'calc', 'hatDaten', 'tabelle', 'karte'] as const)
          expect(typeof berechnung[funktion]).toBe('function');
      }
      if (parts.einstellungen) {
        const einstellungen = await geladen('einstellungen');
        expect(einstellungen.sections.length).toBeGreaterThan(0);
        for (const funktion of ['read', 'collect'] as const) expect(typeof einstellungen[funktion]).toBe('function');
      }
    },
  );

  it('Abschnitts-Ids der Einstellungen und Berechnungs-Buckets sind ueber die Features eindeutig', async () => {
    const einstellungen = await featureRegistry.loadAll('einstellungen');
    const abschnitte = einstellungen.flatMap(ergebnis => (ergebnis.ok ? ergebnis.part.sections : []));
    expect(new Set(abschnitte.map(abschnitt => abschnitt.id)).size).toBe(abschnitte.length);
    expect(new Set(abschnitte.map(abschnitt => abschnitt.order)).size).toBe(abschnitte.length);

    const berechnung = await featureRegistry.loadAll('berechnung');
    const buckets = berechnung.flatMap(ergebnis => (ergebnis.ok ? [ergebnis.part.bucketKey] : []));
    expect(new Set(buckets).size).toBe(buckets.length);
  });
});

/** Alle Teilmengen des Manifests (Reihenfolge wie im Manifest), inklusive der leeren. */
function teilmengen<T>(liste: readonly T[]): T[][] {
  return liste.reduce<T[][]>((menge, eintrag) => [...menge, ...menge.map(teil => [...teil, eintrag])], [[]]);
}

describe('(b) Entfernbarkeit: jede Teilmenge des Manifests', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });
  afterEach(() => {
    render(null, container);
    container.remove();
  });
  afterAll(() => setzeManifest(manifest));

  it('hat 16 Teilmengen', () => {
    expect(teilmengen(KERN).length).toBe(16);
  });

  // Bewusst in einem Test je Teilmenge, damit der Name die fehlende Konfiguration nennt.
  for (const namen of teilmengen(KERN)) {
    it(`Nav, Start, Ressourcen, Berechnung, Einstellungen, Hilfe, PDF und Tab-Sync laufen mit [${namen.join(', ') || 'leer'}]`, async () => {
      const kern = manifest.filter(definition => KERN.includes(definition.meta.id));
      const aktiv = kern.filter(definition => namen.includes(definition.meta.id));
      const entfernt = kern.filter(definition => !namen.includes(definition.meta.id));
      setzeManifest(aktiv);

      // Shell aus meta: nur die vorhandenen Features haben Nav-Eintrag und Schnellzugriff.
      render(
        <>
          <AppHeader />
          <StartTab />
        </>,
        container,
      );
      for (const { meta } of aktiv) {
        expect(container.querySelector(`#${meta.legacy.navId}`), `Nav ${meta.id}`).not.toBeNull();
        expect(container.querySelector(`#quick-${meta.legacy.navId}`), `Schnellzugriff ${meta.id}`).not.toBeNull();
      }
      for (const { meta } of entfernt) {
        expect(container.querySelector(`#${meta.legacy.navId}`), `Nav ${meta.id}`).toBeNull();
        expect(container.querySelector(`#quick-${meta.legacy.navId}`), `Schnellzugriff ${meta.id}`).toBeNull();
      }

      // Ressourcen, PDF-Modus und Hilfe kommen nur von vorhandenen Features.
      expect(resourceKeys()).toEqual(aktiv.flatMap(definition => definition.meta.resources.map(r => r.key)));
      for (const { meta } of entfernt) {
        for (const resource of meta.resources)
          expect(featureRegistry.featureIdOfResource(resource.key)).toBeUndefined();
        expect(featureRegistry.metaByPdfModus(meta.pdf!.modus)).toBeUndefined();
        expect(await getHelpContent(`tab.${meta.legacy.tabKey}`)).toBeUndefined();
      }
      for (const { meta } of aktiv) {
        expect(featureRegistry.metaByPdfModus(meta.pdf!.modus)?.id).toBe(meta.id);
        expect(await getHelpContent(`tab.${meta.legacy.tabKey}`)).toBeDefined();
      }

      // Berechnung: Gruppen der fehlenden Features bleiben leer, die uebrigen rechnen weiter.
      const teile = await ladeBerechnungsTeile();
      expect(teile.map(teil => teil.id)).toEqual(namen);
      const ergebnisse = calculateBerechnungRows(datenBerechungMock, VorgabenGeldMock, 'Tarifkraft', teile);
      expect(ergebnisse.length).toBe(Object.keys(datenBerechungMock).length);
      const ergebnis = ergebnisse[0];
      expect(ergebnis.bereitschaftMinuten === null).toBe(!namen.includes('ber'));
      expect(ergebnis.summeEwt === null).toBe(!namen.includes('ewt'));
      expect(ergebnis.summeNebenbezuege === null).toBe(!namen.includes('ez'));
      expect(ergebnis.eaMinuten === null || namen.includes('ea')).toBe(true);
      expect(ergebnis.summeGesamt === null).toBe(!namen.some(id => id !== 'ea'));

      // Einstellungen: nur die vorhandenen Features liefern Abschnitte.
      const einstellungen = await ladeEinstellungenTeile();
      expect(einstellungen.map(teil => teil.id)).toEqual(namen.filter(id => id !== 'ea'));

      // Tab-Sync (Login, Speichern): mountet nur vorhandene Features, wirft nicht.
      await syncFeatureTabs(['bereitschaft', 'ewt', 'neben', 'ea']);
      await syncFeatureTabs(undefined);
    });
  }
});

/** Meta eines Dummy-Features "X", das nur Vertragsfelder nutzt. */
const dummyMeta: FeatureMeta = {
  id: 'x',
  label: 'Dummy',
  icon: 'document',
  order: 99,
  resources: [
    {
      key: 'X' as FeatureResourceKey,
      storageKey: 'dataX',
      tableId: 'tableX',
      beschreibung: 'Dummy-Zeile',
      monatOf: () => 1,
      periodOf: () => undefined,
      api: {} as never,
    },
  ],
  legacyDefaultOn: true,
  legacy: {
    lifecycleName: 'X',
    tabKey: 'x',
    paneId: 'X',
    rootId: 'x-root',
    navId: 'x-tab',
    saveButtonId: 'btnSaveX',
  },
  pdf: { modus: 'X' as never, formular: 'x', dateiPraefix: 'X' },
  wakeOn: ['ewt:deleted'],
  helpKeys: ['tab.x'],
};

describe('(c) Erweiterbarkeit: neues Feature ohne Aenderung ausserhalb des Manifests', () => {
  let container: HTMLDivElement;
  const mount = vi.fn();
  const unmount = vi.fn();
  const beiEwtGeloescht = vi.fn();

  const dummy: FeatureDefinition = {
    meta: dummyMeta,
    parts: {
      ui: async () => ({ default: { mount, unmount } }),
      help: async () => ({
        default: { 'tab.x': { title: 'Dummy', kurzbeschreibung: 'Ein Dummy.', wasKannIchHierMachen: ['Nichts'] } },
      }),
      einstellungen: async () => ({
        default: {
          sections: [
            {
              id: 'collapseX',
              titel: 'Dummy',
              order: 90,
              Component: () => null,
              onboarding: { titel: 'Dummy prüfen', beschreibung: 'Dummy-Schritt.' },
            },
          ],
          read: () => undefined,
          collect: () => ({}),
        },
      }),
      events: async () => ({ default: { 'ewt:deleted': beiEwtGeloescht } }),
    },
  };

  beforeEach(() => {
    setzeManifest([...manifest, dummy]);
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.clearAllMocks();
  });
  afterEach(() => {
    render(null, container);
    container.remove();
    setzeManifest(manifest);
  });

  it('erscheint in Nav, Schnellzugriff, Ressourcen, PDF-Modus, Hilfe und Einstellungen', async () => {
    render(
      <>
        <AppHeader />
        <StartTab />
      </>,
      container,
    );
    expect(container.querySelector('#x-tab')?.textContent).toBe('Dummy');
    expect(container.querySelector('#quick-x-tab [data-jump-tab="x-tab"]')).not.toBeNull();

    expect(resourceKeys()).toContain('X' as FeatureResourceKey);
    expect(featureRegistry.featureIdOfResource('X' as FeatureResourceKey)).toBe('x');
    expect(featureRegistry.metaByPdfModus('X' as never)?.id).toBe('x');
    expect((await getHelpContent('tab.x'))?.title).toBe('Dummy');

    const einstellungen = await ladeEinstellungenTeile();
    expect(einstellungen.map(teil => teil.id)).toEqual([...definitionenMit('einstellungen').map(d => d.meta.id), 'x']);
    expect(einstellungen.at(-1)?.part.sections[0].onboarding?.titel).toBe('Dummy prüfen');
  });

  it('wird mit den Tabs gemountet und bekommt Wake-Events auch ohne Tab', async () => {
    await syncFeatureTabs(['x']);
    expect(mount).toHaveBeenCalledTimes(1);

    publishEvent('ewt:deleted', { ids: ['e1'] });
    await featureRegistry.load('x', 'events');
    publishEvent('ewt:deleted', { ids: ['e2'] });
    expect(beiEwtGeloescht.mock.calls.map(call => (call[0] as { ids: string[] }).ids)).toEqual([['e1'], ['e2']]);
  });

  it('Berechnung und die bisherigen Features bleiben vom Dummy unberuehrt', async () => {
    const teile = await ladeBerechnungsTeile();
    expect(teile.map(teil => teil.id)).toEqual(definitionenMit('berechnung').map(d => d.meta.id));
  });
});

describe('(d) Lazy: Teile werden erst bei Bedarf und je Teil einmal geladen', () => {
  const loaderAufrufe = new Map<string, number>();

  /** Kopie des Manifests, deren Lader die Aufrufe zaehlen und dann an den echten Chunk weiterreichen. */
  function gezaehlt(): FeatureDefinition[] {
    loaderAufrufe.clear();
    return manifest.map(definition => ({
      meta: definition.meta,
      parts: Object.fromEntries(
        Object.entries(definition.parts).map(([teil, lader]) => [
          teil,
          () => {
            const name = `${definition.meta.id}:${teil}`;
            loaderAufrufe.set(name, (loaderAufrufe.get(name) ?? 0) + 1);
            return (lader as () => Promise<unknown>)();
          },
        ]),
      ),
    }));
  }

  beforeEach(() => setzeManifest(gezaehlt()));
  afterAll(() => setzeManifest(manifest));

  /** Aufrufe ohne den `events`-Teil: den laden Features mit `wakeOn` bewusst schon beim Anmelden (Wake-Events duerfen nicht verloren gehen). */
  const ohneEvents = () => Object.fromEntries([...loaderAufrufe].filter(([name]) => !name.endsWith(':events')));

  it('define und Metadaten laden keinen Teil ausser dem events-Teil der Features mit wakeOn', () => {
    featureRegistry.metas();
    featureRegistry.resources();
    expect(ohneEvents()).toEqual({});
    expect([...loaderAufrufe.keys()].sort()).toEqual(
      definitionenMit('events')
        .map(d => `${d.meta.id}:events`)
        .sort(),
    );
  });

  it('loadAll(help) laedt genau den help-Teil jedes Features, auch bei Wiederholung', async () => {
    await Promise.all([featureRegistry.loadAll('help'), featureRegistry.loadAll('help')]);
    await featureRegistry.loadAll('help');

    expect(ohneEvents()).toEqual(Object.fromEntries(definitionenMit('help').map(d => [`${d.meta.id}:help`, 1])));
  });

  it('PDF eines Modus laedt nur den pdf-Teil dieses Features', async () => {
    await featureRegistry.load(featureRegistry.metaByPdfModus('E')!.id, 'pdf');

    expect(ohneEvents()).toEqual({ 'ewt:pdf': 1 });
  });

  it('jeder deklarierte Teil ist ein eigener Lader (kein Teil laedt einen anderen mit)', async () => {
    for (const { meta, parts } of manifest)
      for (const teil of Object.keys(parts) as FeaturePartName[]) await featureRegistry.load(meta.id, teil);

    const erwartet = manifest.flatMap(({ meta, parts }) => Object.keys(parts).map(teil => `${meta.id}:${teil}`));
    expect([...loaderAufrufe.keys()].sort()).toEqual(erwartet.sort());
    expect([...loaderAufrufe.values()].every(anzahl => anzahl === 1)).toBe(true);
  });
});
