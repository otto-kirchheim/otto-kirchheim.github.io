import '../setupBun';
import { describe, expect, it } from 'bun:test';
import {
  isValidGermanAddress,
  normalizeGermanAddress,
  setupGermanAddressValidation,
  setupPersValidation,
  validateGermanAddressInput,
  validatePersInput,
} from '@/infrastructure/validation/addressValidation';

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

  it('rejects address starting with digit', () => {
    expect(isValidGermanAddress('1Straße, 12345 Ort')).toBe(false);
  });

  it('accepts address with umlauts in street and city', () => {
    expect(isValidGermanAddress('Gänseweg 3, 80331 München')).toBe(true);
  });

  it('accepts address with parentheses in city', () => {
    expect(isValidGermanAddress('Hauptstr. 1, 12345 Frankfurt (Oder)')).toBe(true);
  });

  it('rejects address with wrong PLZ length', () => {
    expect(isValidGermanAddress('Musterstraße 1, 1234 Berlin')).toBe(false);
    expect(isValidGermanAddress('Musterstraße 1, 123456 Berlin')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidGermanAddress('')).toBe(false);
  });

  it('normalizes before validating', () => {
    expect(isValidGermanAddress('  Musterstraße 1 ,  12345  Berlin  ')).toBe(true);
  });

  it('validates PNummer with exact 8 digits', () => {
    document.body.innerHTML = '<div class="mb-3"><input id="PNummer" required value="12345678" /></div>';
    const input = document.querySelector<HTMLInputElement>('#PNummer')!;
    expect(validatePersInput(input)).toBe(true);
  });

  it('rejects PNummer with wrong length', () => {
    document.body.innerHTML = '<div class="mb-3"><input id="PNummer" required value="1234567" /></div>';
    const input = document.querySelector<HTMLInputElement>('#PNummer')!;
    expect(validatePersInput(input)).toBe(false);
    expect(input.validationMessage).toContain('8-stellig');
  });

  it('validates phone number', () => {
    document.body.innerHTML = '<div class="mb-3"><input id="Telefon" required value="+49 123 456 789" /></div>';
    const input = document.querySelector<HTMLInputElement>('#Telefon')!;
    expect(validatePersInput(input)).toBe(true);
  });

  it('rejects invalid phone number', () => {
    document.body.innerHTML = '<div class="mb-3"><input id="Telefon" required value="abc" /></div>';
    const input = document.querySelector<HTMLInputElement>('#Telefon')!;
    expect(validatePersInput(input)).toBe(false);
  });

  it('validates Bundesland from valid set', () => {
    document.body.innerHTML =
      '<div class="mb-3"><select id="Bundesland"><option value="HE">Hessen</option></select></div>';
    const input = document.querySelector<HTMLSelectElement>('#Bundesland')!;
    input.value = 'HE';
    expect(validatePersInput(input)).toBe(true);
  });

  it('rejects invalid Bundesland', () => {
    document.body.innerHTML = '<div class="mb-3"><select id="Bundesland"><option value="XX">XX</option></select></div>';
    const input = document.querySelector<HTMLSelectElement>('#Bundesland')!;
    input.value = 'XX';
    expect(validatePersInput(input)).toBe(false);
  });

  it('validates TB with valid values', () => {
    document.body.innerHTML =
      '<div class="mb-3"><select id="TB"><option value="Tarifkraft">Tarifkraft</option></select></div>';
    const input = document.querySelector<HTMLSelectElement>('#TB')!;
    input.value = 'Tarifkraft';
    expect(validatePersInput(input)).toBe(true);
  });

  it('validates distance input within range', () => {
    document.body.innerHTML =
      '<div class="mb-3"><input id="kmArbeitsort" required value="25" min="1" max="100" /></div>';
    const input = document.querySelector<HTMLInputElement>('#kmArbeitsort')!;
    expect(validatePersInput(input)).toBe(true);
  });

  it('rejects distance input out of range', () => {
    document.body.innerHTML =
      '<div class="mb-3"><input id="kmArbeitsort" required value="200" min="1" max="100" /></div>';
    const input = document.querySelector<HTMLInputElement>('#kmArbeitsort')!;
    expect(validatePersInput(input)).toBe(false);
    expect(input.validationMessage).toContain('zwischen');
  });

  it('rejects empty required text fields', () => {
    document.body.innerHTML = '<div class="mb-3"><input id="Betrieb" required value="" /></div>';
    const input = document.querySelector<HTMLInputElement>('#Betrieb')!;
    expect(validatePersInput(input)).toBe(false);
    expect(input.validationMessage).toContain('erforderlich');
  });

  it('Adress2 is optional by default', () => {
    document.body.innerHTML =
      '<div class="form-floating"><input id="Adress2" value="" /><label for="Adress2">Wohnsitz 2</label></div>';
    const input = document.querySelector<HTMLInputElement>('#Adress2')!;
    expect(validateGermanAddressInput(input)).toBe(true);
  });

  it('falls back to native browser validation when the switch-case leaves no custom error but checkValidity() fails', () => {
    document.body.innerHTML = '<div class="mb-3"><input id="OE" required pattern="^[0-9]+$" value="ABC" /></div>';
    const input = document.querySelector<HTMLInputElement>('#OE')!;

    // 'OE' hat im switch nur eine required-Prüfung; ein nicht-leerer Wert erzeugt dort keine
    // validationMessage. Das native `pattern`-Attribut lässt checkValidity() dennoch fehlschlagen.
    expect(input.checkValidity()).toBe(false);
    expect(validatePersInput(input)).toBe(false);
    expect(input.validationMessage).not.toBe('');
  });

  it('keeps a trailing space while typing (input event) but trims it on blur', () => {
    document.body.innerHTML = `
      <div class="mb-3">
        <input id="Nachname" required value="" />
        <label for="Nachname">Nachname</label>
      </div>
    `;
    const input = document.querySelector<HTMLInputElement>('#Nachname')!;

    setupPersValidation(['#Nachname']);

    // Doppelname tippen: Nach "Müller " darf das Leerzeichen nicht sofort entfernt werden.
    input.value = 'Müller ';
    input.dispatchEvent(new Event('input'));
    expect(input.value).toBe('Müller ');

    input.value = 'Müller Meier ';
    input.dispatchEvent(new Event('input'));
    expect(input.value).toBe('Müller Meier ');

    input.dispatchEvent(new Event('blur'));
    expect(input.value).toBe('Müller Meier');
    expect(input.classList.contains('is-invalid')).toBe(false);
  });

  it('keeps a trailing space in address fields while typing', () => {
    document.body.innerHTML = `
      <div class="form-floating">
        <input id="Adress1" required value="" />
        <label for="Adress1">Wohnsitz 1</label>
      </div>
    `;
    const input = document.querySelector<HTMLInputElement>('#Adress1')!;

    setupGermanAddressValidation();

    input.value = 'Musterstraße ';
    input.dispatchEvent(new Event('input'));
    expect(input.value).toBe('Musterstraße ');

    input.value = 'Musterstraße 17, 12345 Musterstadt ';
    input.dispatchEvent(new Event('blur'));
    expect(input.value).toBe('Musterstraße 17, 12345 Musterstadt');
    expect(input.classList.contains('is-invalid')).toBe(false);
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
