/**
 * Vereinheitlicht Ressourcendaten zu einem flachen Array: Arrays bleiben, bei einem Objekt werden dessen Array-Werte zusammengeführt.
 *
 * @typeParam T - Zeilentyp.
 * @param data - Array oder Objekt mit Arrays als Werten.
 * @returns Zeilen; leer bei allem anderen.
 */
export default function normalizeResourceRows<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    return Object.values(data as Record<string, T[]>)
      .filter(Array.isArray)
      .flat();
  }
  return [];
}
