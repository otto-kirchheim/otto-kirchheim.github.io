type MetaKey = `__${string}`;

/** Entfernt alle `__`-präfixierten Felder aus einem Objekt (für API/Download-Grenzen). */
export function stripMetaFields<T extends object>(obj: T): Omit<T, MetaKey & keyof T> {
  const result = { ...obj } as Record<string, unknown>;
  for (const key of Object.keys(result)) {
    if (key.startsWith('__')) delete result[key];
  }
  return result as Omit<T, MetaKey & keyof T>;
}

/** Gibt nur die `__`-präfixierten Felder eines Objekts zurück. */
export function extractMetaFields(obj: Record<string, unknown>): Record<string, unknown> {
  const meta: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('__')) meta[key] = value;
  }
  return meta;
}

/** Prüft ob Rows ungesyncte lokale Änderungen haben (Pending-New/Modified/Delete oder Error-State). */
export function hasPendingLocalChanges(rows: unknown[]): boolean {
  return rows.some(row => {
    if (typeof row !== 'object' || row === null) return false;
    const r = row as Record<string, unknown>;
    return (
      r.__localState === 'deleted' ||
      r.__localState === 'new' ||
      r.__localState === 'modified' ||
      Boolean(r.__errorMessage)
    );
  });
}
