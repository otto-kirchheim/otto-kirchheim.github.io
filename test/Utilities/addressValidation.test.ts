import '../setupBun';
import { describe, expect, it } from 'bun:test';
import {
  isValidGermanAddress,
  normalizeGermanAddress,
  setupGermanAddressValidation,
  validateGermanAddressInput,
  validatePersInput,
} from '../../src/ts/infrastructure/validation/addressValidation';

describe('addressValidation', () => {
  it('accepts German addresses with house number', () => {
    expect(isValidGermanAddress('Weingarten 7, 36272 Niederaula')).toBe(true);
  });

  it('accepts German addresses without house number', () => {
    expect(isValidGermanAddress('Beiersgraben, 36275 Kirchheim')).toBe(true);
  });

  it('rejects addresses without comma and postal code/city block', () => {
    expect(isValidGermanAddress('Beiersgraben 36275 Kirchheim')).toBe(false);
    expect(isValidGermanAddress('Beiersgraben, Kirchheim')).toBe(false);
  });

  it('normalizes extra whitespace to German schema', () => {
    expect(normalizeGermanAddress('  Musterstraße 17 ,   12345   Musterstadt  ')).toBe(
      'Musterstraße 17, 12345 Musterstadt',
    );
  });

  it('shows Bootstrap feedback and clears it again after the address is corrected', () => {
    document.body.innerHTML = `
      <div class="input-group">
        <div class="form-floating">
          <input id="Adress1" value="Musterstraße 17 12345 Musterstadt" />
          <label for="Adress1">Wohnsitz 1</label>
        </div>
      </div>
    `;
    const input = document.querySelector<HTMLInputElement>('#Adress1');
    if (!input) throw new Error('Adress1 fehlt');

    setupGermanAddressValidation();

    expect(validateGermanAddressInput(input)).toBe(false);
    expect(input.validationMessage).not.toBe('');
    expect(input.classList.contains('is-invalid')).toBe(true);
    expect(document.querySelector('.invalid-feedback')?.classList.contains('d-block')).toBe(true);
    expect(document.querySelector('.invalid-feedback')?.textContent).toContain('Format: Straße');

    input.value = 'Musterstraße 17, 12345 Musterstadt';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));

    expect(input.validationMessage).toBe('');
    expect(input.classList.contains('is-invalid')).toBe(false);
    expect(document.querySelector('.invalid-feedback')?.classList.contains('d-block')).toBe(false);
    expect(document.querySelector('.invalid-feedback')?.textContent).toBe('');
    expect(input.checkValidity()).toBe(true);
  });

  it('clears a previous custom validation error after a personal field is corrected', () => {
    document.body.innerHTML = `
      <div class="mb-3">
        <input id="Vorname" required value="1" />
        <label for="Vorname">Vorname</label>
      </div>
    `;

    const input = document.querySelector<HTMLInputElement>('#Vorname');
    if (!input) throw new Error('Vorname fehlt');

    expect(validatePersInput(input)).toBe(false);
    expect(input.validationMessage).toContain('ungültige Zeichen');
    expect(input.classList.contains('is-invalid')).toBe(true);

    input.value = 'Max';

    expect(validatePersInput(input)).toBe(true);
    expect(input.validationMessage).toBe('');
    expect(input.classList.contains('is-invalid')).toBe(false);
    expect(input.checkValidity()).toBe(true);
  });
});
