export default function storageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
  const quotaErrorNames = new Set(['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED']);
  let storage: Storage | undefined;

  try {
    storage = window[type];
    const x = '__storage_test__';
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e: unknown) {
    if (!storage || !(e instanceof DOMException)) return false;

    // Quota-Errors gelten nur dann als "verfügbar", wenn bereits Daten im Storage existieren.
    return quotaErrorNames.has(e.name) && storage.length !== 0;
  }
}
