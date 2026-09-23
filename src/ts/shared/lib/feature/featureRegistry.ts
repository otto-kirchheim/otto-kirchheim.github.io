/**
 * Feature-Registry: steckbare, lazy ladbare Feature-Module (Bereitschaft, EWT, Neben/EZ, EA).
 *
 * Ein Feature besteht aus `meta` (eager, rein deklarativ) und `parts` (je Teil ein eigener Chunk, per
 * `import()` erst bei Bedarf geladen). Nur `app/features.ts` kennt die Features; globale Bereiche fragen
 * die Registry. Plan: `tasks/plan-fsd-feature-module.md`.
 */

import { onEvent } from '@/shared/lib/events/appEvents';
import type { EventChannel, EventChannels } from '@/shared/lib/events/types';
import type { HelpContent } from '@/shared/lib/help/helpContent';
import type { IFeatureBerechnung, IFeatureEinstellungen, IVorgabenGeldType, IVorgabenU, TResourceKey } from '@/types';
import { featureLifecycleRegistry } from './featureLifecycle';

/** Ressourcen-Schluessel der Features (alle ausser den Einstellungen). */
export type FeatureResourceKey = Exclude<TResourceKey, 'settings'>;

/** Antwort eines Bulk-Requests (Form wie `BulkResponse` in `infrastructure/api`, hier ohne Import aus der Infrastruktur). */
export interface FeatureBulkResult {
  created: unknown[];
  updated: unknown[];
  deleted: string[];
  createdReferences?: { _id: string; clientRequestId: string }[];
  errors: {
    operation: 'create' | 'update' | 'delete';
    index?: number;
    id?: string;
    clientRequestId?: string;
    message: string;
    label?: string;
  }[];
}

/** Backend-Adapter einer Ressource (Mapping und Requests), aufgerufen von Laden und AutoSave. */
export interface FeatureResourceApi {
  /** Backend-Dokument ins Frontend-Format; kann bei unvollstaendigen Dokumenten werfen. */
  fromBackend(doc: unknown): unknown;
  /** Alle Zeilen eines Jahres und der juengste `updatedAt` (`null` ohne Zeitstempel). */
  loadYear(year: number): Promise<{ data: unknown[]; updatedAt: string | null }>;
  /** Sendet neue (mit `clientRequestId`), geaenderte und geloeschte Zeilen fuer einen Monat/ein Jahr gebuendelt. */
  bulk(
    items: { create: unknown[]; update: unknown[]; delete: string[] },
    monat: number,
    jahr: number,
  ): Promise<FeatureBulkResult>;
}

/**
 * Eine Datenressource eines Features (rein deklarativ). Ersetzt die frueher ueber die App verstreuten Tabellen
 * (Storage-Key, Tabellen-Id, Monatsermittlung, Jahres-Gates); Lese-Helfer stehen in `shared/lib/ressource/resourceConfig`.
 */
export interface FeatureResource {
  /** Ressourcen-Schluessel (`BZ`, `BE`, `EWT`, `N`, `EA`). */
  key: FeatureResourceKey;
  /** Storage-Key der Zeilen (`TStorageData`, z. B. `dataBZ`); bewusst `string`, damit `core` keine Infrastruktur importiert. */
  storageKey: string;
  /** Id des `<table>`-Elements im Tab (Vertrag mit den Tab-Komponenten). */
  tableId: string;
  /** Anzeigename in der Konfliktmeldung beim Laden (`Unterschiede erkannt`). */
  beschreibung: string;
  /** Monat (1-12) einer Zeile; `<= 0` = kein erkennbarer Monat. Fuer Zaehlung und Konfliktabgleich. */
  monatOf(row: unknown): number;
  /** Ob die Zeile in den Monat faellt (Tabellenfilter); ohne Angabe gilt `monatOf(row) === monat`. */
  inMonat?(row: unknown, monat: number): boolean;
  /** Monat und Jahr, zu dem eine Zeile beim Speichern gehoert (Datumsfeld je Ressource); `undefined` bei ungueltigem Datum. */
  periodOf(row: unknown): { monat: number; jahr: number } | undefined;
  /** Zeilenfelder, die den Inhalts-Abgleich neuer Zeilen mit Serverdokumenten nicht stoeren (serverseitig ergaenzt, z. B. `EWT`-Verknuepfung). */
  signatureOmitKeys?: readonly string[];
  /** Backend-Adapter der Ressource. */
  api: FeatureResourceApi;
  /** Tabelle zeigt beim Laden (`loadUserDaten`) Zeilen erst ab diesem Jahr; ohne Angabe immer. */
  minYear?: number;
  /** Wie `minYear`, aber fuer den Monatswechsel (`changeMonatJahr`); weicht bei EA heute bewusst ab (Latent-Bug, spaeter angleichen). */
  filterMinYear?: number;
}

/** Formular-Modus des PDF-Downloads (Schluessel in `generatePDF`). */
export type FeaturePdfModus = 'B' | 'E' | 'N' | 'EA';

/** Deklaration des PDF-Formulars eines Features (Teil von `FeatureMeta`; der Datenaufbau liegt im lazy Teil `pdf`). */
export interface FeaturePdfMeta {
  /** Schluessel des Formulars, wie ihn die Download-Buttons an `generatePDF` uebergeben. */
  modus: FeaturePdfModus;
  /** Formular-Code der Vorlage (`GET /formulare/<formular>`; Backend-Vertrag, unveraendert). */
  formular: string;
  /** Anfang des Dateinamens, z. B. `RB` oder `Verpf.`. */
  dateiPraefix: string;
}

/** Kontext, den `generatePDF` dem Feature fuer den Datenaufbau uebergibt. */
export interface FeaturePdfContext {
  /** Exportmonat (1-12). */
  monat: number;
  /** Exportjahr. */
  jahr: number;
  /** Persoenliche Vorgaben des Benutzers. */
  vorgabenU: IVorgabenU;
  /** Geld-Vorgaben des Exportmonats. */
  vorgabenGeld: IVorgabenGeldType;
}

/** Eager gehaltene, rein deklarative Beschreibung eines Features (klein halten, kein Feature-Code importieren). */
export interface FeatureMeta {
  /** Schluessel des Features (Ordner, Manifest), z. B. `ea`. */
  id: string;
  /** Kurzer Anzeigename fuer Nav, Schnellzugriff und Tabs (Platz knapp). */
  label: string;
  /** Langer Anzeigename fuer Fliesstext; ohne Angabe gilt `label`. */
  longLabel?: string;
  /** Icon-Name (DB-UX-Iconset) fuer den Schnellzugriff auf der Startseite. */
  icon: string;
  /** Sortierung der Features untereinander (Nav, Tabs). */
  order: number;
  /** Ressourcen des Features; vor dem Abbau des Tabs auf ungesyncte Aenderungen geprueft. */
  resources: readonly FeatureResource[];
  /** `true`: Tab ist bei leerem `aktivierteTabs` (Alt-User ohne explizite Einstellung) an. */
  legacyDefaultOn: boolean;
  /**
   * Heutige, persistierte oder vertragliche Werte und DOM-Ids, die sich nicht aendern (siehe Plan, Namenskonvention).
   * `lifecycleName`: Name in `featureLifecycleRegistry`; `tabKey`: Wert in `aktivierteTabs`; `paneId`: Tab-Pane und
   * `data-tab-target`; `rootId`: React-Mount-Punkt in der Pane; `navId`: Id des Nav-Eintrags (`quick-<navId>` = Schnellzugriff);
   * `saveButtonId`: Id des Speichern-Buttons im Tab (bestimmt die Ressourcen, die er speichert).
   */
  legacy: {
    lifecycleName: string;
    tabKey: string;
    paneId: string;
    rootId: string;
    navId: string;
    saveButtonId: string;
  };
  /** PDF-Formular des Features; ohne Angabe hat es keinen PDF-Download. */
  pdf?: FeaturePdfMeta;
  /** Events, die das Feature auch ohne gemounteten Tab verarbeiten muss (Teil `events` wird dafuer geladen). */
  wakeOn?: readonly EventChannel[];
  /** Hilfe-Schluessel des Features (`tab.<tabKey>`, `modal.…`); die Texte liefert der lazy Teil `help`. Bestimmt, welches Feature einen Schluessel besitzt. */
  helpKeys?: readonly string[];
}

/** Handler je Event fuer das Feature (Teil `events`). */
export type FeatureEventHandlers = { [K in EventChannel]?: (data: EventChannels[K]) => void };

/** Alle bekannten Feature-Teile; jede Phase des Umbaus ergaenzt hier weitere Teile. */
export interface FeatureParts {
  /** Tab-Inhalt mounten/unmounten. */
  ui: { mount(): void; unmount(): void };
  /** Daten-Aufbereitung je Ressource: macht aus Rohzeilen (Storage/Server) die Zeilen der Tabelle (alle Monate). */
  data: { tableRows: { [K in FeatureResourceKey]?: (rows: unknown[]) => unknown[] } };
  /** Event-Handler fuer `meta.wakeOn`. */
  events: FeatureEventHandlers;
  /**
   * Baut den Nutzdaten-Teil des PDFs (`Daten` und ggf. Top-Level-Felder wie `Bereitschaftszulage`) aus den Tabellen des
   * Features inklusive vorberechneter Werte; wird in die Basisdaten von `generatePDF` gemischt. Darf werfen.
   */
  pdf: { baueDaten(context: FeaturePdfContext): Record<string, unknown> };
  /** Berechnungs-Slot: Aggregation, Formeln und Darstellung der Gruppe des Features in der Berechnung. */
  berechnung: IFeatureBerechnung;
  /** Einstellungen-Slot: Abschnitte im Akkordeon sowie Befuellen und Einsammeln der Felder des Features. */
  einstellungen: IFeatureEinstellungen;
  /** Hilfetexte je Schluessel aus `meta.helpKeys` (Tab-Hilfe, Hilfe der Dialoge). */
  help: Record<string, HelpContent>;
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
   * Laedt einen Teil fuer alle definierten Features, die ihn haben (nach `meta.order`); Features ohne diesen Teil werden uebersprungen.
   *
   * @param part - Teil-Name.
   */
  loadAll<P extends FeaturePartName>(part: P): Promise<FeaturePartResult<P>[]> {
    return this.loadMany(
      this.metas()
        .filter(meta => this.definitions.get(meta.id)?.parts[part])
        .map(meta => meta.id),
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
   * Liefert die Ressourcen aller Features in `meta.order` (innerhalb eines Features in Deklarationsreihenfolge).
   *
   * @returns Flache Liste; ohne Features leer.
   */
  resources(): FeatureResource[] {
    return this.metas().flatMap(meta => meta.resources);
  }

  /**
   * Liefert die `id` des Features, das eine Ressource besitzt.
   *
   * @param key - Ressourcen-Schluessel.
   * @returns Feature-`id` oder `undefined`, wenn kein Feature die Ressource anmeldet.
   */
  featureIdOfResource(key: FeatureResourceKey): string | undefined {
    return this.metas().find(meta => meta.resources.some(resource => resource.key === key))?.id;
  }

  /**
   * Liefert das Feature, dessen PDF-Formular zum Modus gehoert.
   *
   * @param modus - Formular-Modus (`B`, `E`, `N`, `EA`).
   * @returns Metadaten mit `pdf` oder `undefined`, wenn kein Feature den Modus anmeldet.
   */
  metaByPdfModus(modus: FeaturePdfModus): (FeatureMeta & { pdf: FeaturePdfMeta }) | undefined {
    return this.metas().find((meta): meta is FeatureMeta & { pdf: FeaturePdfMeta } => meta.pdf?.modus === modus);
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
