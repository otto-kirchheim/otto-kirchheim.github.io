import { describe, expect, it } from 'bun:test';
import applySelectOptions from '@/features/Neben/utils/applySelectOptions';

function createSelect(): HTMLSelectElement {
  return document.createElement('select');
}

describe('applySelectOptions', () => {
  it('baut die Optionen aus dem Array auf', () => {
    const select = createSelect();

    applySelectOptions(select, [
      { value: 'a', text: 'Option A' },
      { value: 'b', text: 'Option B', disabled: true },
    ]);

    expect(select.options.length).toBe(2);
    expect(select.options[0].value).toBe('a');
    expect(select.options[0].textContent).toBe('Option A');
    expect(select.options[0].disabled).toBe(false);
    expect(select.options[1].disabled).toBe(true);
  });

  it('behält die vorherige Auswahl, wenn sie unter den neuen Optionen noch existiert', () => {
    const select = createSelect();
    applySelectOptions(select, [
      { value: 'a', text: 'A' },
      { value: 'b', text: 'B' },
    ]);
    select.value = 'b';

    applySelectOptions(select, [
      { value: 'a', text: 'A' },
      { value: 'b', text: 'B neu' },
      { value: 'c', text: 'C' },
    ]);

    expect(select.value).toBe('b');
  });

  it('fällt auf die als selected markierte Option zurück, wenn die vorherige Auswahl weggefallen ist', () => {
    const select = createSelect();
    applySelectOptions(select, [{ value: 'a', text: 'A' }]);
    select.value = 'a';

    applySelectOptions(select, [
      { value: 'x', text: 'X' },
      { value: 'y', text: 'Y', selected: true },
    ]);

    expect(select.value).toBe('y');
  });

  it('behandelt fehlenden value als leeren String', () => {
    const select = createSelect();

    applySelectOptions(select, [{ text: 'Ohne Value' }]);

    expect(select.options[0].value).toBe('');
  });

  it('bleibt ohne Fallback bei der (leeren) Browser-Default-Auswahl, wenn nichts passt', () => {
    const select = createSelect();
    applySelectOptions(select, [{ value: 'a', text: 'A' }]);
    select.value = 'a';

    applySelectOptions(select, [{ value: 'x', text: 'X' }]);

    expect(select.value).toBe('x');
  });
});
