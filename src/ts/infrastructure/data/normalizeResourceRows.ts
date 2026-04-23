export default function normalizeResourceRows<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    return Object.values(data as Record<string, T[]>)
      .filter(Array.isArray)
      .flat();
  }
  return [];
}
