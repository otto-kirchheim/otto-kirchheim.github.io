/**
 * Feature Bootstrap Orchestration
 *
 * Central place to invoke app-wide lifecycle stages across all registered features.
 * Import and call these functions from the relevant app flow points (e.g. loadUserDaten,
 * saveDaten) to let features react to app events without direct coupling.
 */

import { featureLifecycleRegistry } from '../hooks';

/** Call before user data is loaded (e.g. at start of loadUserDaten). */
export async function notifyBeforeLoad(): Promise<void> {
  await featureLifecycleRegistry.invokeLifecycle('beforeLoad');
}

/** Call after user data has been loaded successfully. */
export async function notifyAfterLoad(): Promise<void> {
  await featureLifecycleRegistry.invokeLifecycle('afterLoad');
}

/** Call before a save operation starts. */
export async function notifyBeforeSave(): Promise<void> {
  await featureLifecycleRegistry.invokeLifecycle('beforeSave');
}

/** Call after a save operation completes successfully. */
export async function notifyAfterSave(): Promise<void> {
  await featureLifecycleRegistry.invokeLifecycle('afterSave');
}

/** Call before a delete operation. */
export async function notifyBeforeDelete(): Promise<void> {
  await featureLifecycleRegistry.invokeLifecycle('beforeDelete');
}
