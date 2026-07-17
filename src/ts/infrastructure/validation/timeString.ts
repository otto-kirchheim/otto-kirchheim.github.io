const TIME_REGEX = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;

/**
 * Normalisiert Zeitangaben auf "HH:mm" (dayjs-kompatibel), z. B. "0:30" → "00:30".
 * Sekundenanteile werden verworfen; ungültige Werte ergeben ''.
 */
export function normalizeTimeString(value: string): string {
  const match = TIME_REGEX.exec(value.trim());
  if (!match) return '';

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return '';

  return `${String(hours).padStart(2, '0')}:${match[2]}`;
}
