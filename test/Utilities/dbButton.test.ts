import { describe, expect, it } from 'bun:test';
import { buttonLook } from '@/infrastructure/ui/dbButton';

describe('buttonLook', () => {
  it('uebersetzt die Bootstrap-Varianten in DB-Props', () => {
    expect(buttonLook('btn btn-primary')).toMatchObject({ variant: 'brand', rest: '' });
    expect(buttonLook('btn btn-danger')).toMatchObject({ variant: 'filled', color: 'critical' });
    expect(buttonLook('btn btn-outline-info')).toMatchObject({ variant: 'outlined', color: 'informational' });
    expect(buttonLook('btn btn-link')).toMatchObject({ variant: 'ghost' });
  });

  it('uebersetzt Groesse und Breite und reicht unbekannte Klassen weiter', () => {
    expect(buttonLook('btn btn-secondary btn-lg text-start w-100')).toMatchObject({
      variant: 'filled',
      size: 'medium',
      width: 'full',
      rest: 'text-start',
    });
    expect(buttonLook('btn btn-sm')).toMatchObject({ size: 'small' });
  });
});
