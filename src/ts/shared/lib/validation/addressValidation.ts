import { TB_VALUES } from '@otto-kirchheim/nebengeld-shared';

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
const VALID_TB_VALUES = new Set<string>(TB_VALUES);

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
  Taetigkeit: 'Tätigkeit / Stellenbezeichnung',
  Entgeltgruppe: 'Entgeltgruppe (Entgeltausgleich)',
} as const;

const DEFAULT_PERS_VALIDATION_SELECTORS = Object.keys(PERS_FIELD_LABELS).map(key => `#${key}`);

/**
 * Normalisiert eine Adresse: trimmt, setzt genau ein Leerzeichen nach Kommas und faltet Leerraum.
 *
 * @param value - Rohe Adresseingabe.
 * @returns Normalisierte Adresse.
 */
export function normalizeGermanAddress(value: string): string {
  return value
    .trim()
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s+/g, ' ');
}

/**
 * Trimmt und faltet aufeinanderfolgenden Leerraum zu einem Leerzeichen.
 *
 * @param value - Rohe Eingabe.
 * @returns Bereinigter Text.
 */
function normalizeTextValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Prueft das Adressformat "Straße [Hausnummer], 12345 Ort" (nach Normalisierung).
 *
 * @param value - Adresse, roh oder bereits normalisiert.
 * @returns `true` bei passendem Format; leere Werte sind ungueltig.
 */
export function isValidGermanAddress(value: string): boolean {
  const normalizedValue = normalizeGermanAddress(value);
  return normalizedValue.length > 0 && GERMAN_ADDRESS_REGEX.test(normalizedValue);
}

/**
 * Liefert das Fehlertext-Element zum Feld und legt es bei Bedarf an (samt `aria-describedby`). DB rendert
 * Meldungen als `db-infotext` innerhalb der Feldhuelle (`db-input`/`db-select`) -- dort landet der Text,
 * sonst direkt hinter dem Feld.
 *
 * @param input - Zu validierendes Feld.
 * @returns Das vorhandene oder neu erzeugte `db-infotext`-Element.
 */
function getOrCreateValidationFeedback(input: ValidatableElement): HTMLSpanElement {
  const feedbackId = `${input.id || 'field'}-feedback`;
  const describedBy = input.getAttribute('aria-describedby');
  const existingById = document.getElementById(feedbackId);
  if (existingById instanceof HTMLSpanElement) return existingById;

  const huelle = input.closest('.db-input, .db-select');
  const existingFeedback = (huelle ?? input.parentElement)?.querySelector<HTMLSpanElement>(
    `.db-infotext[data-for="${input.id}"]`,
  );
  if (existingFeedback) return existingFeedback;

  const feedback = document.createElement('span');
  feedback.id = feedbackId;
  feedback.dataset.for = input.id;
  feedback.className = 'db-infotext';
  feedback.dataset.semantic = 'critical';
  feedback.dataset.size = 'small';
  feedback.setAttribute('aria-live', 'polite');

  if (huelle) huelle.appendChild(feedback);
  else input.insertAdjacentElement('afterend', feedback);

  input.setAttribute(
    'aria-describedby',
    [describedBy, feedbackId]
      .filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index)
      .join(' '),
  );

  return feedback;
}

/**
 * Uebernimmt das Validierungsergebnis ins Feld: Custom-Validity, `data-custom-validity` und Fehlertext.
 *
 * @param input - Zu markierendes Feld.
 * @param isValid - `true` blendet den Fehlertext aus.
 * @param message - Fehlermeldung; leer bei gueltigem Wert.
 * @returns `isValid`, unveraendert durchgereicht.
 */
function setValidationState(input: ValidatableElement, isValid: boolean, message: string): boolean {
  const feedback = getOrCreateValidationFeedback(input);

  input.setCustomValidity(message);
  // DB faerbt Feld und Meldung ueber `data-custom-validity` am Feld.
  if (isValid) input.removeAttribute('data-custom-validity');
  else input.setAttribute('data-custom-validity', 'invalid');
  feedback.textContent = message;
  feedback.hidden = isValid;

  return isValid;
}

/**
 * Prueft eine Kilometer-Angabe auf Pflichtfeld, Zahl und Bereich.
 *
 * @param input - Feld; `min`/`max` bestimmen den Bereich (Default 1 bis 100).
 * @param label - Feldbezeichnung fuer die Meldung.
 * @returns Fehlermeldung oder '' bei gueltigem Wert.
 */
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

/**
 * Validiert ein Adressfeld und zeigt das Ergebnis am Feld an.
 *
 * @param input - Adressfeld.
 * @param opts - `optional`: leer erlaubt (Default: Feld nicht `required` oder `Adress2`).
 *   `normalize`: schreibt den normalisierten Wert ins Feld zurueck (Default `true`).
 * @returns `true`, wenn der Wert gueltig ist.
 */
export function validateGermanAddressInput(
  input: HTMLInputElement,
  opts: { optional?: boolean; normalize?: boolean } = {},
): boolean {
  const normalizedValue = normalizeGermanAddress(input.value);
  const optional = opts.optional ?? (!input.required || input.id === 'Adress2');
  const isOptionalEmpty = optional && normalizedValue === '';
  const isValid = isOptionalEmpty || isValidGermanAddress(normalizedValue);
  const feedbackMessage = isValid ? '' : `${GERMAN_ADDRESS_FORMAT_HINT}. Hausnummer optional.`;

  // normalize: false während des Tippens, sonst löscht trim() gerade eingegebene Leerzeichen.
  if (opts.normalize ?? true) input.value = normalizedValue;
  return setValidationState(input, isValid, feedbackMessage);
}

/**
 * Validiert ein Feld der persoenlichen Daten anhand seiner Id (Schluessel aus `PERS_FIELD_LABELS`) und
 * zeigt das Ergebnis am Feld an. Felder mit unbekannter Id gelten als gueltig.
 *
 * @param input - Eingabe- oder Select-Feld.
 * @param opts - `normalize`: schreibt den bereinigten Wert ins Feld zurueck (Default `true`).
 * @returns `true`, wenn der Wert gueltig ist.
 */
export function validatePersInput(input: ValidatableElement, opts: { normalize?: boolean } = {}): boolean {
  const key = input.id as keyof typeof PERS_FIELD_LABELS;
  if (!(key in PERS_FIELD_LABELS)) return true;

  if (input instanceof HTMLInputElement && (key === 'Adress1' || key === 'Adress2' || key === 'ErsteTkgStAdresse')) {
    return validateGermanAddressInput(input, { optional: key === 'Adress2', normalize: opts.normalize });
  }

  const label = PERS_FIELD_LABELS[key];
  const normalizedValue = normalizeTextValue(input.value);
  // normalize: false während des Tippens, sonst löscht trim() gerade eingegebene Leerzeichen.
  if (opts.normalize ?? true) input.value = normalizedValue;

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

    // Optional (nur fuer Entgeltausgleich benoetigt) -- leer bleibt gueltig, sonst Zeichen pruefen.
    case 'Taetigkeit':
    case 'Entgeltgruppe':
      if (normalizedValue !== '' && !TEXT_REGEX.test(normalizedValue)) {
        validationMessage = `${label} enthält ungültige Zeichen.`;
      }
      break;

    default:
      if (normalizedValue === '' && input.required) validationMessage = `${label} ist erforderlich.`;
  }

  if (!validationMessage && !input.checkValidity()) {
    validationMessage = input.validationMessage || `${label} ist ungültig.`;
  }

  return setValidationState(input, validationMessage === '', validationMessage);
}

/**
 * Bindet die Adressvalidierung (input/change/blur) an die Felder; bereits gebundene Felder werden uebersprungen.
 *
 * @param selectors - CSS-Selektoren der Adressfelder (Default: `#Adress1`, `#Adress2`, `#ErsteTkgStAdresse`).
 */
export function setupGermanAddressValidation(selectors: readonly string[] = DEFAULT_GERMAN_ADDRESS_SELECTORS): void {
  for (const selector of selectors) {
    const input = document.querySelector<HTMLInputElement>(selector);
    if (!input || input.dataset.addressValidationBound === 'true') continue;

    input.dataset.addressValidationBound = 'true';

    /** Validiert mit Normalisierung (bei `change`/`blur`). */
    const syncValidationState = (): void => {
      validateGermanAddressInput(input);
    };

    input.addEventListener('input', () => validateGermanAddressInput(input, { normalize: false }));
    input.addEventListener('change', syncValidationState);
    input.addEventListener('blur', syncValidationState);
  }
}

/**
 * Bindet die Validierung der persoenlichen Daten (input/change/blur) an die Felder; bereits gebundene Felder
 * werden uebersprungen.
 *
 * @param selectors - CSS-Selektoren der Felder (Default: alle Schluessel aus `PERS_FIELD_LABELS`).
 */
export function setupPersValidation(selectors: readonly string[] = DEFAULT_PERS_VALIDATION_SELECTORS): void {
  for (const selector of selectors) {
    const input = document.querySelector<ValidatableElement>(selector);
    if (!input || input.dataset.persValidationBound === 'true') continue;

    input.dataset.persValidationBound = 'true';

    /** Validiert mit Normalisierung (bei `change`/`blur`). */
    const syncValidationState = (): void => {
      validatePersInput(input);
    };

    input.addEventListener('input', () => validatePersInput(input, { normalize: false }));
    input.addEventListener('change', syncValidationState);
    input.addEventListener('blur', syncValidationState);
  }
}
