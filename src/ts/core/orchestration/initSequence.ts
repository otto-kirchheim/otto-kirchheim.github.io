/**
 * Login Init Sequence
 *
 * Documents the mandatory initialization order after successful login.
 * Steps are intentionally explicit so that future changes to the sequence
 * remain visible and reviewable.
 *
 * Dependency graph: see DEPENDENCIES.md in this directory.
 */

export interface InitStep {
  name: string;
  description: string;
  dependsOn: string[];
}

/** Canonical initialization order after userLoginSuccess. */
export const LOGIN_INIT_SEQUENCE: InitStep[] = [
  {
    name: 'storage:user',
    description: 'Store Benutzer, BenutzerRolle, BenutzerEmail and Version in localStorage',
    dependsOn: [],
  },
  {
    name: 'ui:year-month',
    description: 'Set Jahr/Monat inputs to current year/month',
    dependsOn: ['storage:user'],
  },
  {
    name: 'feature:lifecycle',
    description: 'Initialize all registered features via featureLifecycleRegistry.initializeAll()',
    dependsOn: ['storage:user'],
  },
  {
    name: 'ui:autoSaveIndicator',
    description: 'Initialize AutoSave status indicator',
    dependsOn: ['feature:lifecycle'],
  },
  {
    name: 'data:selectYear',
    description: 'Trigger selectYear to load user data for the current year',
    dependsOn: ['ui:autoSaveIndicator'],
  },
];

/**
 * Validate that all declared dependencies exist in the sequence.
 * Throws if the sequence contains dangling references.
 */
export function validateInitSequence(sequence: InitStep[] = LOGIN_INIT_SEQUENCE): void {
  const names = new Set(sequence.map(s => s.name));
  for (const step of sequence) {
    for (const dep of step.dependsOn) {
      if (!names.has(dep)) {
        throw new Error(`InitStep '${step.name}' depends on unknown step '${dep}'`);
      }
    }
  }
}
