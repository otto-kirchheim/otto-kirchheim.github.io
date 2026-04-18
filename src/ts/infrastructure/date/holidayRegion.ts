import type { Region } from 'dayjs-feiertage';
import { isValidGermanAddress, normalizeGermanAddress } from '../validation/addressValidation';

/**
 * Mapping von OpenPLZ-API-Schlüssel (federalState.key) auf feiertagejs-Regionscode.
 * Quelle: https://openplzapi.org/swagger/index.html#/DE
 */
const FEDERAL_STATE_TO_REGION: Record<string, Region> = {
  '01': 'SH', // Schleswig-Holstein
  '02': 'HH', // Hamburg
  '03': 'NI', // Niedersachsen
  '04': 'HB', // Bremen
  '05': 'NW', // Nordrhein-Westfalen
  '06': 'HE', // Hessen
  '07': 'RP', // Rheinland-Pfalz
  '08': 'BW', // Baden-Württemberg
  '09': 'BY', // Bayern
  '10': 'SL', // Saarland
  '11': 'BE', // Berlin
  '12': 'BB', // Brandenburg
  '13': 'MV', // Mecklenburg-Vorpommern
  '14': 'SN', // Sachsen
  '15': 'ST', // Sachsen-Anhalt
  '16': 'TH', // Thüringen
};

/** Auswahloptionen für das UI-Dropdown – nur echte Bundesländer, kein BUND, ALL oder AUGSBURG. */
export const HOLIDAY_REGION_OPTIONS: Array<{ value: Region; label: string }> = [
  { value: 'BW', label: 'Baden-Württemberg' },
  { value: 'BY', label: 'Bayern' },
  { value: 'BE', label: 'Berlin' },
  { value: 'BB', label: 'Brandenburg' },
  { value: 'HB', label: 'Bremen' },
  { value: 'HH', label: 'Hamburg' },
  { value: 'HE', label: 'Hessen' },
  { value: 'MV', label: 'Mecklenburg-Vorpommern' },
  { value: 'NI', label: 'Niedersachsen' },
  { value: 'NW', label: 'Nordrhein-Westfalen' },
  { value: 'RP', label: 'Rheinland-Pfalz' },
  { value: 'SL', label: 'Saarland' },
  { value: 'SN', label: 'Sachsen' },
  { value: 'ST', label: 'Sachsen-Anhalt' },
  { value: 'SH', label: 'Schleswig-Holstein' },
  { value: 'TH', label: 'Thüringen' },
];

const VALID_REGIONS = new Set<string>(HOLIDAY_REGION_OPTIONS.map(o => o.value));

/** Extrahiert eine 5-stellige PLZ aus einem Freitext-Adressstring. */
function extractPlz(address: string): string | null {
  const match = /\b(\d{5})\b/.exec(address);
  return match ? match[1] : null;
}

type OpenPlzLocalityResponse = Array<{ federalState?: { key?: string } }>;

/**
 * Ermittelt die Feiertagsregion anhand der Adresse via OpenPLZ-API.
 * Gibt `null` zurück, wenn keine PLZ gefunden wird, die API nicht erreichbar ist
 * oder das Bundesland nicht zugeordnet werden kann.
 *
 * Diese Funktion ist **async** und eignet sich zur einmaligen Vorbesetzung in der
 * Einstellungen-UI. Für die Bereitschaftsberechnung → `resolveHolidayRegion` verwenden.
 */
export async function deriveHolidayRegionFromAddress(address: string): Promise<Region | null> {
  const normalizedAddress = normalizeGermanAddress(address);
  const plz = extractPlz(normalizedAddress);
  if (!plz) return null;

  try {
    const url = `https://openplzapi.org/de/Localities?postalCode=${encodeURIComponent(plz)}&pageSize=1`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = (await res.json()) as OpenPlzLocalityResponse;
    if (!data.length || !data[0].federalState?.key) return null;

    const region = FEDERAL_STATE_TO_REGION[data[0].federalState.key];
    return region ?? null;
  } catch {
    return null;
  }
}

type BundeslandAutoFillOptions = {
  addressSelector?: string;
  bundeslandSelector?: string;
};

/**
 * Bindet die automatische Bundesland-Ermittlung an das Einstellungsformular.
 * Vorhandene manuelle Auswahlen werden nicht überschrieben.
 */
export function setupBundeslandAutoFill(opts: BundeslandAutoFillOptions = {}): void {
  const { addressSelector = '#ErsteTkgStAdresse', bundeslandSelector = '#Bundesland' } = opts;
  const addressInput = document.querySelector<HTMLInputElement>(addressSelector);
  const bundeslandSelect = document.querySelector<HTMLSelectElement>(bundeslandSelector);

  if (!addressInput || !bundeslandSelect) return;

  const syncBundeslandFromAddress = async (): Promise<void> => {
    const normalizedAddress = normalizeGermanAddress(addressInput.value);
    addressInput.value = normalizedAddress;

    if (!normalizedAddress || !isValidGermanAddress(normalizedAddress)) return;

    const derivedRegion = await deriveHolidayRegionFromAddress(normalizedAddress);
    if (!derivedRegion) return;

    const currentValue = bundeslandSelect.value;
    const autoFilledValue = bundeslandSelect.dataset.autoFilledValue ?? '';
    const mayAutoUpdate = !currentValue || currentValue === autoFilledValue;

    if (!mayAutoUpdate) return;

    bundeslandSelect.value = derivedRegion;
    bundeslandSelect.dataset.autoFilledValue = derivedRegion;
  };

  if (addressInput.dataset.bundeslandAutoFillBound !== 'true') {
    addressInput.dataset.bundeslandAutoFillBound = 'true';
    addressInput.addEventListener('blur', () => {
      void syncBundeslandFromAddress();
    });
    addressInput.addEventListener('change', () => {
      void syncBundeslandFromAddress();
    });
  }

  if (!bundeslandSelect.value) {
    void syncBundeslandFromAddress();
  }
}

/**
 * Löst die Feiertagsregion aus dem gespeicherten Bundesland-Wert auf.
 * Gibt `'BUND'` zurück, wenn kein gültiger Regionscode gespeichert ist.
 *
 * Diese Funktion ist **synchron** und sicher für den Einsatz in der Bereitschaftsberechnung.
 */
export function resolveHolidayRegion(opts: { bundesland?: string | null }): Region {
  const { bundesland } = opts;
  if (bundesland && VALID_REGIONS.has(bundesland)) {
    return bundesland as Region;
  }
  return 'BUND';
}
