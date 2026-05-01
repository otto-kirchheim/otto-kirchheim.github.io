/**
 * Feature Lifecycle Registry
 *
 * Centralizes feature initialization and teardown via a formal registry pattern.
 * Replaces ad-hoc mount/unmount calls with declarative feature registration.
 *
 * Features can optionally provide lifecycle hooks (beforeLoad, afterLoad, etc.)
 * that the orchestration layer invokes at appropriate points in the app lifecycle.
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
  /** Optional app-wide lifecycle callbacks for this feature. */
  lifecycle?: FeatureLifecycleHooks;
}

export type LifecycleStage = keyof FeatureLifecycleHooks;

class FeatureLifecycleRegistry {
  private features: Map<string, FeatureRegistration> = new Map();

  /**
   * Register a feature with lifecycle hooks.
   * Silently skips if a feature with the same name is already registered.
   */
  registerFeature(feature: FeatureRegistration): void {
    if (this.features.has(feature.name)) {
      console.warn(`Feature '${feature.name}' already registered, skipping duplicate`);
      return;
    }
    this.features.set(feature.name, feature);
  }

  /** Initialize all registered features. */
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

  /** Teardown all registered features in reverse order. */
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
   * Invoke a lifecycle stage across all features that declare it.
   * Errors in individual features are caught and reported but do not
   * prevent other features from running.
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

  /** Invoke the onError lifecycle hook for a specific feature. */
  async invokeOnError(featureName: string, error: Error): Promise<void> {
    const hook = this.features.get(featureName)?.lifecycle?.onError;
    if (!hook) return;
    try {
      await hook(error);
    } catch (e) {
      console.error(`Feature '${featureName}' onError handler threw:`, e);
    }
  }

  /** Get a registered feature by name. */
  getFeature(name: string): FeatureRegistration | undefined {
    return this.features.get(name);
  }

  /** Check if a feature is registered. */
  isFeatureRegistered(name: string): boolean {
    return this.features.has(name);
  }

  /** Remove all features (for testing). */
  clearAll(): void {
    this.features.clear();
  }
}

export const featureLifecycleRegistry = new FeatureLifecycleRegistry();
