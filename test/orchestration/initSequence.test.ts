import { describe, expect, it } from 'bun:test';
import {
  LOGIN_INIT_SEQUENCE,
  validateAllSequences,
  validateInitSequence,
} from '@/core/orchestration/initSequence';

describe('initSequence', () => {
  it('LOGIN_INIT_SEQUENCE has no dangling dependencies', () => {
    const known = new Set<string>([...LOGIN_INIT_SEQUENCE.map(s => s.name), 'cookie:check']);
    expect(() => validateInitSequence(LOGIN_INIT_SEQUENCE, known)).not.toThrow();
  });

  it('sequence contains expected step names', () => {
    const names = LOGIN_INIT_SEQUENCE.map(s => s.name);
    expect(names).toContain('storage:user');
    expect(names).toContain('feature:lifecycle');
    expect(names).toContain('ui:autoSaveIndicator');
    expect(names).toContain('data:selectYear');
  });

  it('data:selectYear depends on ui:autoSaveIndicator', () => {
    const step = LOGIN_INIT_SEQUENCE.find(s => s.name === 'data:selectYear');
    expect(step?.dependsOn).toContain('ui:autoSaveIndicator');
  });

  it('validateInitSequence throws on dangling dependency', () => {
    const broken = [{ name: 'step-a', description: '', dependsOn: ['step-b'] }];
    expect(() => validateInitSequence(broken)).toThrow("depends on unknown step 'step-b'");
  });

  it('validateAllSequences allows cross-sequence dependency references', () => {
    expect(() => validateAllSequences()).not.toThrow();
  });
});
