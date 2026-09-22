import { afterEach, describe, expect, it, mock } from 'bun:test';

import {
  getOffenenAbschnitt,
  setOffenenAbschnitt,
  subscribeOffenenAbschnitt,
} from '@/shared/model/navigation/offenerAbschnittStore';

describe('offenerAbschnittStore', () => {
  afterEach(() => setOffenenAbschnitt(null));

  it('haelt genau einen offenen Abschnitt', () => {
    setOffenenAbschnitt('collapseTwo');
    expect(getOffenenAbschnitt()).toBe('collapseTwo');
    setOffenenAbschnitt('collapseFive');
    expect(getOffenenAbschnitt()).toBe('collapseFive');
  });

  it('null klappt alle Abschnitte zu', () => {
    setOffenenAbschnitt('collapseOne');
    setOffenenAbschnitt(null);
    expect(getOffenenAbschnitt()).toBeNull();
  });

  it('meldet Aenderungen, aber keinen unveraenderten Wert', () => {
    const listener = mock(() => {});
    const abmelden = subscribeOffenenAbschnitt(listener);

    setOffenenAbschnitt('collapseOne');
    setOffenenAbschnitt('collapseOne');
    expect(listener).toHaveBeenCalledTimes(1);

    abmelden();
    setOffenenAbschnitt('collapseTwo');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
