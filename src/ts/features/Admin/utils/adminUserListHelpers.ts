import { useEffect, useState } from 'preact/hooks';

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}

function normalizeOeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

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

  // Query groups are OR-linked, terms within a group are AND-linked.
  return queryGroups.some(groupTerms =>
    groupTerms.every(term => normalizedCandidates.some(candidate => candidate.includes(term))),
  );
}
