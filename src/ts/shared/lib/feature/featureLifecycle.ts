/**
 * Feature-Lifecycle-Registry: zentrale Initialisierung und Abbau der Features.
 *
 * Features koennen optional Lifecycle-Hooks (beforeLoad, afterLoad, ...) mitbringen, die die
 * Orchestrierung an passenden Stellen des App-Lebenszyklus aufruft.
 */

export interface FeatureContext {
  isAdmin: boolean;
  userName: string;
}

export interface FeatureLifecycleHooks {
  beforeLoad?(): Promise<void> | void;
  afterLoad?(): Promise<void> | void;
  beforeSave?(): Promise<void> | void;
  afterSave?(): Promise<void> | void;
  beforeDelete?(): Promise<void> | void;
  onError?(error: Error): Promise<void> | void;
}

export interface FeatureRegistration {
  name: string;
  register(ctx: FeatureContext): Promise<void>;
  unregister?(): Promise<void>;
  /** Optionale app-weite Lifecycle-Callbacks dieses Features. */
  lifecycle?: FeatureLifecycleHooks;
}

export type LifecycleStage = keyof FeatureLifecycleHooks;

class FeatureLifecycleRegistry {
  private features: Map<string, FeatureRegistration> = new Map();

  /**
   * Registriert ein Feature samt Lifecycle-Hooks. Ein bereits unter demselben Namen
   * registriertes Feature bleibt bestehen; das Duplikat wird nur per Warnung uebersprungen.
   *
   * @param feature - Registrierung mit eindeutigem `name`.
   */
  registerFeature(feature: FeatureRegistration): void {
    if (this.features.has(feature.name)) {
      console.warn(`Feature '${feature.name}' already registered, skipping duplicate`);
      return;
    }
    this.features.set(feature.name, feature);
  }

  /**
   * Ruft `register` aller Features nacheinander in Registrierungsreihenfolge auf. Ein Fehler
   * wird geloggt und abgebrochen weitergereicht; spaetere Features bleiben dann uninitialisiert.
   *
   * @param ctx - Kontext (Admin-Flag, Benutzername), der an jedes Feature geht.
   * @throws {Error} Wenn `register` eines Features wirft.
   */
  async initializeAll(ctx: FeatureContext): Promise<void> {
    const features = Array.from(this.features.values());
    if (features.length === 0) {
      console.warn('No features registered to initialize');
      return;
    }
    for (const feature of features) {
      try {
        await feature.register(ctx);
      } catch (error) {
        console.error(`Feature '${feature.name}' initialization failed:`, error);
        throw error;
      }
    }
  }

  /**
   * Ruft `unregister` aller Features in umgekehrter Registrierungsreihenfolge auf. Fehler
   * einzelner Features werden geloggt und stoppen den Abbau der uebrigen nicht.
   */
  async teardownAll(): Promise<void> {
    const features = Array.from(this.features.values()).reverse();
    if (features.length === 0) {
      console.warn('No features registered to teardown');
      return;
    }
    for (const feature of features) {
      try {
        await feature.unregister?.();
      } catch (error) {
        console.error(`Feature '${feature.name}' teardown failed:`, error);
      }
    }
  }

  /**
   * Ruft die Lifecycle-Stufe bei allen Features auf, die sie deklarieren. Fehler einzelner
   * Features werden geloggt und an deren `onError`-Hook gemeldet, die uebrigen laufen weiter.
   *
   * @param stage - Stufe (ausser `onError`, das ueber `invokeOnError` laeuft).
   */
  async invokeLifecycle(stage: Exclude<LifecycleStage, 'onError'>): Promise<void> {
    const features = Array.from(this.features.values());
    if (features.length === 0) {
      console.warn(`No features registered to invoke lifecycle stage '${stage}'`);
      return;
    }
    for (const feature of features) {
      const hook = feature.lifecycle?.[stage];
      if (!hook) continue;
      try {
        await hook();
      } catch (error) {
        console.error(`Feature '${feature.name}' lifecycle '${stage}' failed:`, error);
        await this.invokeOnError(feature.name, error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  /**
   * Ruft den `onError`-Hook eines Features auf; wirft der Hook selbst, wird nur geloggt.
   *
   * @param featureName - Name des betroffenen Features; unbekannt oder ohne Hook wirkungslos.
   * @param error - Der aufgetretene Fehler.
   */
  async invokeOnError(featureName: string, error: Error): Promise<void> {
    const hook = this.features.get(featureName)?.lifecycle?.onError;
    if (!hook) return;
    try {
      await hook(error);
    } catch (e) {
      console.error(`Feature '${featureName}' onError handler threw:`, e);
    }
  }

  /**
   * Liefert ein registriertes Feature.
   *
   * @param name - Feature-Name.
   * @returns Die Registrierung oder `undefined`.
   */
  getFeature(name: string): FeatureRegistration | undefined {
    return this.features.get(name);
  }

  /**
   * Prueft, ob ein Feature registriert ist.
   *
   * @param name - Feature-Name.
   * @returns `true`, wenn unter `name` eine Registrierung existiert.
   */
  isFeatureRegistered(name: string): boolean {
    return this.features.has(name);
  }

  /** Entfernt alle Features (nur fuer Tests). */
  clearAll(): void {
    this.features.clear();
  }
}

export const featureLifecycleRegistry = new FeatureLifecycleRegistry();
