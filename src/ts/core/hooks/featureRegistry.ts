/**
 * Feature-Registry: steckbare, lazy ladbare Feature-Module (Bereitschaft, EWT, Neben/EZ, EA).
 *
 * Ein Feature besteht aus `meta` (eager, rein deklarativ) und `parts` (je Teil ein eigener Chunk, per
 * `import()` erst bei Bedarf geladen). Nur `app/features.ts` kennt die Features; globale Bereiche fragen
 * die Registry. Plan: `tasks/plan-fsd-feature-module.md`.
 */

import { onEvent } from '@/core/events/appEvents';
import type { EventChannel, EventChannels } from '@/core/events/types';
import { featureLifecycleRegistry } from './featureLifecycle';

/** Eager gehaltene, rein deklarative Beschreibung eines Features (klein halten, kein Feature-Code importieren). */
export interface FeatureMeta {
  /** Schluessel des Features (Ordner, Manifest), z. B. `ea`. */
  id: string;
  /** Anzeigename. */
  label: string;
  /** Sortierung der Features untereinander (Nav, Tabs). */
  order: number;
  /**
   * Heutige, persistierte oder vertragliche Werte, die sich nicht aendern (siehe Plan, Namenskonvention).
   * `lifecycleName` ist der Name in `featureLifecycleRegistry`, `tabKey` der Wert in `aktivierteTabs`.
   */
  legacy: { lifecycleName: string; tabKey: string };
  /** Events, die das Feature auch ohne gemounteten Tab verarbeiten muss (Teil `events` wird dafuer geladen). */
  wakeOn?: readonly EventChannel[];
}

/** Handler je Event fuer das Feature (Teil `events`). */
export type FeatureEventHandlers = { [K in EventChannel]?: (data: EventChannels[K]) => void };

/** Alle bekannten Feature-Teile; jede Phase des Umbaus ergaenzt hier weitere Teile. */
export interface FeatureParts {
  /** Tab-Inhalt mounten/unmounten. */
  ui: { mount(): void; unmount(): void };
  /** Event-Handler fuer `meta.wakeOn`. */
  events: FeatureEventHandlers;
}

export type FeaturePartName = keyof FeatureParts;

/** Lader je Teil; ein Teil ohne Lader gilt als nicht vorhanden. */
export type FeaturePartLoaders = { [P in FeaturePartName]?: () => Promise<{ default: FeatureParts[P] }> };

export interface FeatureDefinition {
  meta: FeatureMeta;
  parts: FeaturePartLoaders;
}

/** Ergebnis von `loadMany`/`loadAll`: je Feature der Teil oder der Fehler (ein Ausfall blockiert die anderen nicht). */
export type FeaturePartResult<P extends FeaturePartName> =
  { id: string; ok: true; part: FeatureParts[P] } | { id: string; ok: false; error: Error };

class FeatureRegistry {
  private definitions = new Map<string, FeatureDefinition>();
  private pending = new Map<string, Promise<unknown>>();
  private loaded = new Map<string, unknown>();

  /**
   * Meldet ein Feature an: Lifecycle-Registrierung (Tab mounten/unmounten) und Wake-Events.
   * Ein bereits vorhandener `id` bleibt bestehen; das Duplikat wird mit Warnung uebersprungen.
   *
   * @param definition - `meta` und Teil-Lader.
   */
  define(definition: FeatureDefinition): void {
    const { meta } = definition;
    if (this.definitions.has(meta.id)) {
      console.warn(`Feature '${meta.id}' already defined, skipping duplicate`);
      return;
    }
    this.definitions.set(meta.id, definition);

    featureLifecycleRegistry.registerFeature({
      name: meta.legacy.lifecycleName,
      register: async () => {
        const ui = await this.load(meta.id, 'ui');
        ui.mount();
      },
      unregister: async () => {
        // Nie geladen heisst nie gemountet: nichts zu unmounten (und keinen Chunk dafuer laden).
        (this.loaded.get(this.key(meta.id, 'ui')) as FeatureParts['ui'] | undefined)?.unmount();
      },
    });

    for (const channel of meta.wakeOn ?? []) this.wake(meta.id, channel);
  }

  /**
   * Laedt einen Teil eines Features (einmal, danach aus dem Cache). Ein Fehler wird nicht gecacht: der naechste Aufruf versucht es erneut.
   *
   * @param id - Feature-`id`.
   * @param part - Teil-Name.
   * @returns Der Teil (`default`-Export des Chunks).
   * @throws {Error} Bei unbekanntem Feature, fehlendem Teil oder fehlgeschlagenem Chunk-Laden.
   */
  async load<P extends FeaturePartName>(id: string, part: P): Promise<FeatureParts[P]> {
    const key = this.key(id, part);
    if (this.loaded.has(key)) return this.loaded.get(key) as FeatureParts[P];
    const existing = this.pending.get(key);
    if (existing) return existing as Promise<FeatureParts[P]>;

    const loader = this.definitions.get(id)?.parts[part] as (() => Promise<{ default: FeatureParts[P] }>) | undefined;
    if (!loader) throw new Error(`Feature '${id}' hat keinen Teil '${part}'`);

    const promise = loader()
      .then(module => {
        this.loaded.set(key, module.default);
        return module.default;
      })
      .finally(() => this.pending.delete(key));
    this.pending.set(key, promise);
    return promise;
  }

  /**
   * Laedt einen Teil fuer mehrere Features parallel; ein fehlgeschlagener Teil blockiert die anderen nicht.
   *
   * @param ids - Feature-`id`s.
   * @param part - Teil-Name.
   * @returns Je Feature Erfolg oder Fehler, in der Reihenfolge von `ids`.
   */
  async loadMany<P extends FeaturePartName>(ids: readonly string[], part: P): Promise<FeaturePartResult<P>[]> {
    return Promise.all(
      ids.map(async (id): Promise<FeaturePartResult<P>> => {
        try {
          return { id, ok: true, part: await this.load(id, part) };
        } catch (error) {
          return { id, ok: false, error: error instanceof Error ? error : new Error(String(error)) };
        }
      }),
    );
  }

  /**
   * Laedt einen Teil fuer alle definierten Features (nach `meta.order`).
   *
   * @param part - Teil-Name.
   */
  loadAll<P extends FeaturePartName>(part: P): Promise<FeaturePartResult<P>[]> {
    return this.loadMany(
      this.metas().map(meta => meta.id),
      part,
    );
  }

  /**
   * Liefert die Metadaten aller Features, sortiert nach `order`.
   *
   * @returns Kopie der Metadaten.
   */
  metas(): FeatureMeta[] {
    return Array.from(this.definitions.values(), definition => definition.meta).sort((a, b) => a.order - b.order);
  }

  /**
   * Liefert die Metadaten eines Features.
   *
   * @param id - Feature-`id`.
   * @returns Die Metadaten oder `undefined`.
   */
  meta(id: string): FeatureMeta | undefined {
    return this.definitions.get(id)?.meta;
  }

  /** Entfernt alle Definitionen und Caches (nur fuer Tests; die Lifecycle-Registry raeumt der Test selbst). */
  clear(): void {
    this.definitions.clear();
    this.pending.clear();
    this.loaded.clear();
  }

  private key(id: string, part: FeaturePartName): string {
    return `${id}:${part}`;
  }

  /**
   * Abonniert ein Wake-Event stellvertretend fuer das Feature. Ist der Teil `events` schon geladen, laeuft der
   * Handler synchron wie ein direkter `onEvent`; sonst wird er geladen und die Events kommen in Eingangsreihenfolge an.
   */
  private wake<K extends EventChannel>(id: string, channel: K): void {
    const deliver = (handlers: FeatureEventHandlers, data: EventChannels[K]): void => {
      (handlers[channel] as ((data: EventChannels[K]) => void) | undefined)?.(data);
    };
    onEvent(channel, data => {
      const ready = this.loaded.get(this.key(id, 'events')) as FeatureEventHandlers | undefined;
      if (ready) {
        deliver(ready, data);
        return;
      }
      this.load(id, 'events')
        .then(handlers => deliver(handlers, data))
        .catch(error => console.error(`Feature '${id}' konnte Event '${channel}' nicht verarbeiten:`, error));
    });
    // Frueh laden, damit spaetere Events synchron zugestellt werden (Nachricht bei Fehler: erstes Event versucht es erneut).
    this.load(id, 'events').catch(() => undefined);
  }
}

export const featureRegistry = new FeatureRegistry();
