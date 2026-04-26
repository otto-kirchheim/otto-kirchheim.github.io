/**
 * Initialization Sequence Registry
 *
 * Declares and validates the mandatory initialization order for all three
 * initialization paths: boot, session-restore, and login.
 *
 * Dependency graph: see DEPENDENCIES.md in this directory.
 */

export interface InitStep {
  name: string;
  description: string;
  dependsOn: readonly string[];
  /** App-Events die dieser Step abonniert. */
  subscribes?: readonly string[];
  /** App-Events die dieser Step auslösen kann. */
  publishes?: readonly string[];
}

export const BOOT_SEQUENCE = [
  {
    name: 'boot:bereitschaft',
    description: 'Bereitschaft: tableBZ + tableBE init',
    dependsOn: [],
    publishes: ['data:changed'],
  },
  {
    name: 'boot:ewt',
    description: 'EWT: tableEWT init',
    dependsOn: [],
    publishes: ['ewt:persisted', 'data:changed'],
  },
  {
    name: 'boot:neben',
    description: 'Neben: ewt:persisted listener + tableN init',
    dependsOn: [],
    subscribes: ['ewt:persisted'],
    publishes: ['data:changed'],
  },
  {
    name: 'boot:berechnung',
    description: 'Berechnung: data:changed listener + initial render',
    dependsOn: [],
    subscribes: ['data:changed'],
  },
  {
    name: 'boot:einstellungen',
    description: 'Einstellungen: Monat/Jahr listeners + passkey buttons',
    dependsOn: [],
  },
  {
    name: 'boot:auth',
    description: 'Auth: login button, actAs listeners, cookie check + session restore if logged in',
    dependsOn: ['boot:berechnung', 'boot:bereitschaft', 'boot:ewt', 'boot:neben', 'boot:einstellungen'],
    publishes: ['data:changed'],
  },
  {
    name: 'boot:main-ui',
    description: 'main.ts: Bootstrap widgets, color mode toggle, version check',
    dependsOn: ['boot:auth'],
  },
] as const satisfies ReadonlyArray<InitStep>;

export const SESSION_RESTORE_SEQUENCE = [
  {
    name: 'sr:ui-welcome',
    description: 'Hide login button, show welcome message, restore Jahr/Monat from storage',
    dependsOn: ['cookie:check'],
  },
  {
    name: 'sr:tab-visibility',
    description: 'updateTabVisibility based on Einstellungen.aktivierteTabs',
    dependsOn: ['sr:ui-welcome'],
  },
  {
    name: 'sr:admin-toggle',
    description: 'Show/hide admin tab, mount admin tab if isAdmin',
    dependsOn: ['sr:tab-visibility'],
  },
  {
    name: 'sr:nav-visible',
    description: 'Show monatEl, navmenu, btnNavmenu',
    dependsOn: ['sr:admin-toggle'],
  },
  {
    name: 'sr:autosave-listener',
    description: 'initAutoSaveEventListener()',
    dependsOn: ['sr:nav-visible'],
  },
  {
    name: 'sr:autosave-indicator',
    description: 'initAutoSaveIndicator()',
    dependsOn: ['sr:autosave-listener'],
  },
  {
    name: 'sr:select-year',
    description: 'selectYear() — loads user data for the current year',
    dependsOn: ['sr:autosave-indicator'],
  },
] as const satisfies ReadonlyArray<InitStep>;

export const AUTH_GATE_SEQUENCE = [
  {
    name: 'cookie:check',
    description: 'Cookie + Storage check decides session-restore vs idle/login path',
    dependsOn: ['boot:auth'],
  },
] as const satisfies ReadonlyArray<InitStep>;

export const LOGIN_INIT_SEQUENCE = [
  {
    name: 'storage:user',
    description: 'Store Benutzer, BenutzerRolle, BenutzerEmail and Version in localStorage',
    dependsOn: ['cookie:check'],
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
] as const satisfies ReadonlyArray<InitStep>;

export const SEQUENCES = {
  boot: BOOT_SEQUENCE,
  'auth-gate': AUTH_GATE_SEQUENCE,
  login: LOGIN_INIT_SEQUENCE,
  'session-restore': SESSION_RESTORE_SEQUENCE,
} satisfies Record<string, ReadonlyArray<InitStep>>;

export type SequenceName = keyof typeof SEQUENCES;
export type StepNameFor<S extends SequenceName> = (typeof SEQUENCES)[S][number]['name'];

const executedStepsMap = new Map<SequenceName, string[]>();

export function markStep<S extends SequenceName>(sequence: S, step: StepNameFor<S>): void {
  const existing = executedStepsMap.get(sequence);
  console.info(step);
  if (existing) {
    existing.push(step as string);
  } else {
    executedStepsMap.set(sequence, [step as string]);
  }
}

export function getSteps<S extends SequenceName>(sequence: S): readonly StepNameFor<S>[] {
  return (executedStepsMap.get(sequence) ?? []) as StepNameFor<S>[];
}

export function resetSteps(sequence?: SequenceName): void {
  if (sequence) {
    executedStepsMap.delete(sequence);
  } else {
    executedStepsMap.clear();
  }
}

/**
 * Validate that all declared dependencies are declared before the step that references them.
 * Throws if the sequence contains dangling or forward references.
 */
export function validateInitSequence(sequence: ReadonlyArray<InitStep>, declaredStepNames?: ReadonlySet<string>): void {
  const knownStepNames = declaredStepNames ?? new Set(sequence.map(step => step.name));
  const sequenceStepNames = new Set(sequence.map(step => step.name));
  const seen = new Set<string>();
  for (const step of sequence) {
    for (const dep of step.dependsOn) {
      if (!knownStepNames.has(dep)) throw new Error(`InitStep '${step.name}' depends on unknown step '${dep}'`);
      if (sequenceStepNames.has(dep) && !seen.has(dep))
        throw new Error(`InitStep '${step.name}' depends on '${dep}' which is not declared before it`);
    }
    seen.add(step.name);
  }
}

export function validateAllSequences(): void {
  const knownStepNames = new Set(Object.values(SEQUENCES).flatMap(sequence => sequence.map(step => step.name)));
  for (const sequence of Object.values(SEQUENCES)) {
    validateInitSequence(sequence, knownStepNames);
  }
}
