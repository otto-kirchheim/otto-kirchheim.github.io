/**
 * Formatiert Minuten als "H:mm".
 *
 * @param num - Dauer in Minuten.
 * @returns Stunden ohne führende Null, Minuten zweistellig (z. B. 90 -> "1:30").
 */
export const timeConvert = (num: number): string => {
  const hours = Math.floor(num / 60);
  const minutes = Math.round(num % 60);
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Kehrfunktion zu `timeConvert`: parst eine "HH:mm"-Zeitspanne in Gesamtminuten.
 *
 * @param value - Zeitspanne im Format "HH:mm".
 * @returns Gesamtminuten; 0, wenn Stunden oder Minuten keine Zahl sind.
 */
export const parseDauerToMinutes = (value: string): number => {
  const [stunden, minuten] = value.split(':').map(Number);
  if (!Number.isFinite(stunden) || !Number.isFinite(minuten)) return 0;
  return stunden * 60 + minuten;
};

/**
 * Formatiert einen Betrag als Euro-Betrag im deutschen Format.
 *
 * @param value - Betrag in Euro.
 * @returns Formatierter String (z. B. "1.234,50 €").
 */
export const formatCurrency = (value: number): string =>
  value.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  });

/**
 * Zellwert für die Schwellen-Zeilen: `null` wird zu einem geschützten Leerzeichen (U+00A0), damit die Zeile Höhe behält.
 *
 * @param wert - Anzahl oder `null`.
 * @returns Der Wert bzw. ein geschütztes Leerzeichen bei `null`.
 */
export const anzeige = (wert: number | null): number | string => (wert === null ? '\u00a0' : wert);

/**
 * Formatiert einen Euro-Betrag für die Tabelle.
 *
 * @param wert - Betrag oder `null`.
 * @returns Formatierter Betrag; leerer String bei `null`.
 */
export const currency = (wert: number | null): string => (wert === null ? '' : formatCurrency(wert));
