import { useEffect, useState } from 'react';

/**
 * Liefert `value` erst, nachdem es `delayMs` unverändert geblieben ist.
 *
 * @typeParam T - Typ des Wertes.
 * @param value - Eingabewert.
 * @param delayMs - Wartezeit in ms.
 * @returns Verzögerter Wert (zunächst der Startwert).
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}

/**
 * Normalisiert für den OE-Vergleich: Kleinschreibung, nur `a-z0-9`.
 *
 * @param value - OE-Text oder Suchbegriff.
 * @returns Normalisierter Text.
 */
function normalizeOeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Prüft, ob eine Suchanfrage auf eine der OE-Zeichenketten passt. Kommagetrennte Gruppen sind ODER-, Begriffe innerhalb einer Gruppe UND-verknüpft; Vergleich per Teilstring.
 *
 * @param query - Suchtext; leer/ohne Begriffe passt auf alles (bei vorhandenen Kandidaten).
 * @param candidates - OE-Zeichenketten des Benutzers.
 * @returns `true` bei Treffer; `false`, wenn keine nichtleeren Kandidaten existieren.
 */
export function matchesOeQuery(query: string, candidates: string[]): boolean {
  const normalizedCandidates = candidates.map(normalizeOeToken).filter(Boolean);
  if (normalizedCandidates.length === 0) return false;

  const queryGroups = query
    .split(',')
    .map(group => group.trim())
    .filter(Boolean)
    .map(group => group.split(/\s+/).map(normalizeOeToken).filter(Boolean))
    .filter(group => group.length > 0);

  if (queryGroups.length === 0) return true;

  return queryGroups.some(groupTerms =>
    groupTerms.every(term => normalizedCandidates.some(candidate => candidate.includes(term))),
  );
}
