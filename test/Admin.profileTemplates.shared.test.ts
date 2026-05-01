import { describe, expect, it } from 'bun:test';
import { PERS_FIELDS } from '@/features/Admin/components/profileTemplates.shared';

describe('profileTemplates.shared', () => {
  it('exposes Bundesland as editable select field for profile templates', () => {
    const bundeslandField = PERS_FIELDS.find(field => field.key === 'Bundesland');

    expect(bundeslandField).toBeDefined();
    expect(bundeslandField?.label).toBe('Bundesland');
    expect(bundeslandField?.type).toBe('select');
    expect(bundeslandField?.options?.some(option => option.value === 'HE' && option.label === 'Hessen')).toBe(true);
  });
});
