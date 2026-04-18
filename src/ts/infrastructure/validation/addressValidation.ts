const GERMAN_ADDRESS_REGEX =
  /^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9 .,'’()/-]*,\s*\d{5}\s+[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß .,'’()/-]*$/u;
const NAME_REGEX = /^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß .'-]{1,49}$/u;
const PERSONAL_NUMBER_REGEX = /^\d{8}$/;
const PHONE_REGEX = /^(?=.*\d)\+?[0-9][0-9 +/().-]{5,29}$/;
const TEXT_REGEX = /^[A-Za-zÄÖÜäöüß0-9][A-Za-zÄÖÜäöüß0-9 .,'’()/-]{1,79}$/u;

const DEFAULT_GERMAN_ADDRESS_SELECTORS = ['#Adress1', '#Adress2', '#ErsteTkgStAdresse'] as const;
const VALID_BUNDESLAENDER = new Set([
  'BW',
  'BY',
  'BE',
  'BB',
  'HB',
  'HH',
  'HE',
  'MV',
  'NI',
  'NW',
  'RP',
  'SL',
  'SN',
  'ST',
  'SH',
  'TH',
]);
const VALID_TB_VALUES = new Set(['Tarifkraft', 'Besoldungsgruppe A 8', 'Besoldungsgruppe A 9']);

type ValidatableElement = HTMLInputElement | HTMLSelectElement;

export const GERMAN_ADDRESS_FORMAT_HINT = 'Format: Straße [Hausnummer], 12345 Ort';
export const PERS_FIELD_LABELS = {
  Vorname: 'Vorname',
  Nachname: 'Nachname',
  PNummer: 'Personalnummer',
  Telefon: 'Telefon',
  Adress1: 'Wohnsitz 1',
  Adress2: 'Wohnsitz 2',
  ErsteTkgSt: 'Erste Tätigkeitsstätte',
  ErsteTkgStAdresse: 'Adresse Erste Tätigkeitsstätte',
  Bundesland: 'Bundesland',
  Betrieb: 'Betrieb',
  OE: 'OE',
  Gewerk: 'Gewerk',
  kmArbeitsort: 'Entfernung zur Arbeitsstätte in km',
  nBhf: 'Nächster Bahnhof',
  kmnBhf: 'Entfernung zum nächsten Bahnhof in km',
  TB: 'Tarif / Beamter',
} as const;

const DEFAULT_PERS_VALIDATION_SELECTORS = Object.keys(PERS_FIELD_LABELS).map(key => `#${key}`);

export function normalizeGermanAddress(value: string): string {
  return value
    .trim()
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s+/g, ' ');
}

function normalizeTextValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function isValidGermanAddress(value: string): boolean {
  const normalizedValue = normalizeGermanAddress(value);
  return normalizedValue.length > 0 && GERMAN_ADDRESS_REGEX.test(normalizedValue);
}

function getOrCreateValidationFeedback(input: ValidatableElement): HTMLDivElement {
  const feedbackId = `${input.id || 'field'}-feedback`;
  const describedBy = input.getAttribute('aria-describedby');
  const existingById = document.getElementById(feedbackId);
  if (existingById instanceof HTMLDivElement) return existingById;

  const existingFeedback = input
    .closest('.input-group, .form-floating, .mb-3, .col, .row, form, div')
    ?.querySelector<HTMLDivElement>(`.invalid-feedback[data-for="${input.id}"]`);
  if (existingFeedback) return existingFeedback;

  const feedback = document.createElement('div');
  feedback.id = feedbackId;
  feedback.dataset.for = input.id;
  feedback.className = 'invalid-feedback';
  feedback.setAttribute('aria-live', 'polite');

  const inputGroup = input.closest('.input-group');
  if (inputGroup) inputGroup.classList.add('has-validation');

  const formFloating = input.closest('.form-floating');
  if (formFloating) formFloating.appendChild(feedback);
  else input.insertAdjacentElement('afterend', feedback);

  input.setAttribute(
    'aria-describedby',
    [describedBy, feedbackId]
      .filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index)
      .join(' '),
  );

  return feedback;
}

function setValidationState(input: ValidatableElement, isValid: boolean, message: string): boolean {
  const feedback = getOrCreateValidationFeedback(input);

  input.setCustomValidity(message);
  input.classList.toggle('is-invalid', !isValid);
  input.classList.toggle('is-valid', isValid && input.value.trim() !== '');
  feedback.textContent = message;
  feedback.classList.toggle('d-block', !isValid);

  return isValid;
}

function validateDistanceInput(input: HTMLInputElement, label: string): string {
  const normalizedValue = normalizeTextValue(input.value);
  if (normalizedValue === '') return `${label} ist erforderlich.`;

  const numericValue = Number(normalizedValue);
  if (!Number.isFinite(numericValue)) return `${label} muss eine Zahl sein.`;

  const min = input.min ? Number(input.min) : 1;
  const max = input.max ? Number(input.max) : 100;

  if (numericValue < min || numericValue > max) {
    return `${label} muss zwischen ${min} und ${max} liegen.`;
  }

  return '';
}

export function validateGermanAddressInput(input: HTMLInputElement, opts: { optional?: boolean } = {}): boolean {
  const normalizedValue = normalizeGermanAddress(input.value);
  const optional = opts.optional ?? (!input.required || input.id === 'Adress2');
  const isOptionalEmpty = optional && normalizedValue === '';
  const isValid = isOptionalEmpty || isValidGermanAddress(normalizedValue);
  const feedbackMessage = isValid ? '' : `${GERMAN_ADDRESS_FORMAT_HINT}. Hausnummer optional.`;

  input.value = normalizedValue;
  return setValidationState(input, isValid, feedbackMessage);
}

export function validatePersInput(input: ValidatableElement): boolean {
  const key = input.id as keyof typeof PERS_FIELD_LABELS;
  if (!(key in PERS_FIELD_LABELS)) return true;

  if (input instanceof HTMLInputElement && (key === 'Adress1' || key === 'Adress2' || key === 'ErsteTkgStAdresse')) {
    return validateGermanAddressInput(input, { optional: key === 'Adress2' });
  }

  const label = PERS_FIELD_LABELS[key];
  const normalizedValue = normalizeTextValue(input.value);
  input.value = normalizedValue;

  // Vorherige Custom-Fehler erst zurücksetzen, damit `checkValidity()` den aktuellen Zustand prüft.
  input.setCustomValidity('');

  let validationMessage = '';

  switch (key) {
    case 'Vorname':
    case 'Nachname':
      if (normalizedValue === '') validationMessage = `${label} ist erforderlich.`;
      else if (!NAME_REGEX.test(normalizedValue)) validationMessage = `${label} enthält ungültige Zeichen.`;
      break;

    case 'PNummer':
      if (normalizedValue === '') validationMessage = `${label} ist erforderlich.`;
      else if (!PERSONAL_NUMBER_REGEX.test(normalizedValue)) {
        validationMessage = `${label} muss genau 8-stellig und nur aus Zahlen bestehen.\nFührende Nullen sind erlaubt.`;
      }
      break;

    case 'Telefon':
      if (normalizedValue === '') validationMessage = `${label} ist erforderlich.`;
      else if (!PHONE_REGEX.test(normalizedValue)) validationMessage = `${label} ist ungültig.`;
      break;

    case 'ErsteTkgSt':
    case 'Betrieb':
    case 'Gewerk':
    case 'nBhf':
      if (normalizedValue === '') validationMessage = `${label} ist erforderlich.`;
      else if (!TEXT_REGEX.test(normalizedValue)) validationMessage = `${label} enthält ungültige Zeichen.`;
      break;

    case 'OE':
      if (normalizedValue === '') validationMessage = `${label} ist erforderlich.`;
      break;

    case 'Bundesland':
      if (!VALID_BUNDESLAENDER.has(normalizedValue)) validationMessage = `${label} bitte auswählen.`;
      break;

    case 'kmArbeitsort':
    case 'kmnBhf':
      if (input instanceof HTMLInputElement) validationMessage = validateDistanceInput(input, label);
      break;

    case 'TB':
      if (!VALID_TB_VALUES.has(normalizedValue)) validationMessage = `${label} bitte auswählen.`;
      break;

    default:
      if (normalizedValue === '' && input.required) validationMessage = `${label} ist erforderlich.`;
  }

  if (!validationMessage && !input.checkValidity()) {
    validationMessage = input.validationMessage || `${label} ist ungültig.`;
  }

  return setValidationState(input, validationMessage === '', validationMessage);
}

export function setupGermanAddressValidation(selectors: readonly string[] = DEFAULT_GERMAN_ADDRESS_SELECTORS): void {
  for (const selector of selectors) {
    const input = document.querySelector<HTMLInputElement>(selector);
    if (!input || input.dataset.addressValidationBound === 'true') continue;

    input.dataset.addressValidationBound = 'true';

    const syncValidationState = (): void => {
      validateGermanAddressInput(input);
    };

    input.addEventListener('input', syncValidationState);
    input.addEventListener('change', syncValidationState);
    input.addEventListener('blur', syncValidationState);
  }
}

export function setupPersValidation(selectors: readonly string[] = DEFAULT_PERS_VALIDATION_SELECTORS): void {
  for (const selector of selectors) {
    const input = document.querySelector<ValidatableElement>(selector);
    if (!input || input.dataset.persValidationBound === 'true') continue;

    input.dataset.persValidationBound = 'true';

    const syncValidationState = (): void => {
      validatePersInput(input);
    };

    input.addEventListener('input', syncValidationState);
    input.addEventListener('change', syncValidationState);
    input.addEventListener('blur', syncValidationState);
  }
}
