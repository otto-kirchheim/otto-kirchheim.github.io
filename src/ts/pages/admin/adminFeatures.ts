import { useEffect, useSyncExternalStore } from 'react';
import { featureRegistry } from '@/shared/lib/feature';
import type { AdminStats } from './api/api';
import type { FormularCode } from './ui/FormularEditor/datenKatalog';

/**
 * Admin-Anteile der Features (Ressourcenbrowser, Dashboard, Formular-Upload). Jedes Feature hat einen eigenen Ordner unter
 * `pages/admin/features/<id>/` und meldet sich im Admin-Manifest unten an; die Feature-Module selbst enthalten keinen Admin-Code.
 * Der Admin (`mountAdminTab`) wird nur fuer Admins geladen, die Admin-Anteile aller Features dann gleichzeitig.
 */

/** Ressource im Admin-Ressourcenbrowser. */
export interface AdminResourceConfig {
  label: string;
  shortLabel: string;
  /** API-Pfad der Ressource (`admin/<endpoint>`). */
  endpoint: string;
  /** Spalten der Tabelle. */
  tableFields: string[];
  /** Weitere Felder in der Liste. */
  extraFields?: string[];
  /** Felder des Schemas (auch leere werden im Editor angezeigt). */
  schemaFields: string[];
}

/** Verweis eines Feldes auf eine andere Ressource; fehlt die Ziel-Ressource (Feature nicht angemeldet), entfaellt der Link. */
export interface AdminCrossRef {
  /** `endpoint` der Ziel-Ressource. */
  endpoint: string;
  isArray?: boolean;
}

/** Zeile der Karte "Ressourcenbestand" im Dashboard. */
export interface AdminStatsRow {
  label: string;
  countKey: keyof AdminStats['resources'];
  growthKey: keyof AdminStats['growth'];
}

/** Admin-Anteile eines Features. */
export interface AdminFeature {
  /** `meta.id` des Features. */
  id: string;
  resources: AdminResourceConfig[];
  /** Verweis-Felder (Feldname -> Ziel). */
  crossRefs?: Record<string, AdminCrossRef>;
  /** Felder mit festen Werten (Dropdown im Editor). */
  fieldEnums?: Record<string, string[]>;
  /** PDF-Formular des Features im Formular-Upload; `order` bestimmt die Reihenfolge der Auswahl. */
  formular?: { code: FormularCode; label: string; order: number };
  statsRows: AdminStatsRow[];
}

/** Admin-Manifest: die einzige Stelle, die die Admin-Ordner der Features kennt (Schluessel = `meta.id`). Hinzufuegen = Ordner plus eine Zeile. */
type AdminManifest = Record<string, () => Promise<{ default: AdminFeature }>>;

const ADMIN_MANIFEST: AdminManifest = {
  ber: () => import('./features/ber'),
  ewt: () => import('./features/ewt'),
  ez: () => import('./features/ez'),
  ea: () => import('./features/ea'),
};

interface AdminFeaturesState {
  features: readonly AdminFeature[];
  /** Ids der Admin-Ordner, die nicht geladen werden konnten. */
  fehler: readonly string[];
  geladen: boolean;
}

type Listener = () => void;

let state: AdminFeaturesState = { features: [], fehler: [], geladen: false };
let laufend: Promise<AdminFeaturesState> | null = null;
const listeners = new Set<Listener>();

/**
 * Laedt die Admin-Anteile aller im Feature-Manifest angemeldeten Features gleichzeitig (einmal, danach aus dem Cache). Ein
 * fehlgeschlagener Ordner blockiert die anderen nicht; ein Admin-Ordner ohne angemeldetes Feature wird ignoriert.
 * Ein Fehlschlag wird nicht gemerkt: der naechste Aufruf laedt ihn erneut.
 *
 * @param manifest - Admin-Manifest; Standard das echte (nur fuer Tests austauschbar).
 * @returns Der Zustand nach dem Laden.
 */
export function ladeAdminFeatures(manifest: AdminManifest = ADMIN_MANIFEST): Promise<AdminFeaturesState> {
  if (state.geladen && state.fehler.length === 0) return Promise.resolve(state);
  laufend ??= (async () => {
    const ids = featureRegistry
      .metas()
      .map(meta => meta.id)
      .filter(id => manifest[id]);
    const ergebnisse = await Promise.allSettled(ids.map(async id => ({ id, feature: (await manifest[id]()).default })));
    const features: AdminFeature[] = [];
    const fehler: string[] = [];
    ergebnisse.forEach((ergebnis, index) => {
      const id = ids[index];
      if (ergebnis.status === 'fulfilled') features.push(ergebnis.value.feature);
      else {
        console.error(`Admin-Anteil von '${id}' konnte nicht geladen werden:`, ergebnis.reason);
        fehler.push(id);
      }
    });
    state = { features, fehler, geladen: true };
    for (const listener of listeners) listener();
    return state;
  })().finally(() => {
    laufend = null;
  });
  return laufend;
}

/**
 * Liefert den aktuellen Zustand der geladenen Admin-Anteile.
 *
 * @returns Zustand; die Referenz aendert sich nur nach einem Ladevorgang.
 */
export function getAdminFeaturesState(): AdminFeaturesState {
  return state;
}

/**
 * Reaktiver Zugriff auf die Admin-Anteile; stoesst das Laden an, falls noch nicht geschehen.
 *
 * @returns Zustand mit `features` (nach `meta.order`), `fehler` (Ids) und `geladen`.
 */
export function useAdminFeatures(): AdminFeaturesState {
  const snapshot = useSyncExternalStore(listener => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, getAdminFeaturesState);
  useEffect(() => {
    if (!snapshot.geladen || snapshot.fehler.length > 0) void ladeAdminFeatures();
  }, [snapshot]);
  return snapshot;
}

/** Setzt den Zustand zurueck (nur fuer Tests). */
export function resetAdminFeatures(): void {
  state = { features: [], fehler: [], geladen: false };
  laufend = null;
  for (const listener of listeners) listener();
}

/**
 * Liefert die Ressourcen aller geladenen Admin-Anteile (Reihenfolge: Features nach `meta.order`, je Feature wie deklariert).
 *
 * @returns Flache Liste; vor dem Laden leer.
 */
export function adminResources(): AdminResourceConfig[] {
  return state.features.flatMap(feature => feature.resources);
}

/**
 * Sucht eine Ressource ueber ihren `endpoint`.
 *
 * @param endpoint - API-Pfad der Ressource.
 * @returns Die Ressource oder `undefined` (Feature nicht angemeldet oder nicht geladen).
 */
export function adminResourceByEndpoint(endpoint: string): AdminResourceConfig | undefined {
  return adminResources().find(resource => resource.endpoint === endpoint);
}

/**
 * Liefert den Verweis eines Feldes auf eine andere Ressource, sofern deren Feature geladen ist.
 *
 * @param fieldName - Feldname.
 * @returns Der Verweis oder `undefined` (kein Verweis oder Ziel fehlt: dann entfaellt der Link).
 */
export function adminCrossRef(fieldName: string): AdminCrossRef | undefined {
  for (const feature of state.features) {
    const ref = feature.crossRefs?.[fieldName];
    if (ref && adminResourceByEndpoint(ref.endpoint)) return ref;
  }
  return undefined;
}

/**
 * Liefert die festen Werte eines Feldes (Dropdown im Editor).
 *
 * @param fieldName - Feldname.
 * @returns Die Werte oder `undefined`.
 */
export function adminFieldEnum(fieldName: string): string[] | undefined {
  for (const feature of state.features) {
    const values = feature.fieldEnums?.[fieldName];
    if (values) return values;
  }
  return undefined;
}

/**
 * Liefert die Schema-Felder einer Ressource.
 *
 * @param endpoint - API-Pfad der Ressource.
 * @returns Die Schema-Felder; leer bei unbekanntem `endpoint`.
 */
export function adminSchemaFields(endpoint: string): string[] {
  return adminResourceByEndpoint(endpoint)?.schemaFields ?? [];
}
