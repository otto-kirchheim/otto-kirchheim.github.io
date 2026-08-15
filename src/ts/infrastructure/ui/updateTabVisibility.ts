/** Mapping: aktivierteTabs-Wert → HTML-Tab-Button-ID */
const TAB_MAP: Record<string, string> = {
  bereitschaft: 'bereitschaft-tab',
  ewt: 'ewt-tab',
  neben: 'neben-tab',
  ea: 'ea-tab',
};

/** Alle steuerbaren Tab-IDs */
const ALL_TAB_IDS = Object.values(TAB_MAP);

/**
 * Tab-IDs, die bei leerem aktivierteTabs (Alt-User ohne explizite Einstellung) weiterhin
 * automatisch sichtbar sind — deckungsgleich mit LEGACY_DEFAULT_ON_KEYS in syncFeatureTabs.ts.
 * 'ea-tab' ist bewusst NICHT enthalten, damit der Entgeltausgleich-Tab nicht ungewollt
 * standardmäßig für alle Bestands-/Neu-User sichtbar wird (er würde sonst als Nav-Eintrag
 * erscheinen, obwohl syncFeatureTabs.ts das zugehörige Feature dafür gar nicht mountet).
 */
const LEGACY_DEFAULT_ON_TAB_IDS = new Set(['bereitschaft-tab', 'ewt-tab', 'neben-tab']);

/**
 * Zeigt/Versteckt Feature-Tabs basierend auf `aktivierteTabs`.
 * Wenn `aktivierteTabs` leer oder nicht gesetzt ist, werden nur die Legacy-Default-Tabs angezeigt.
 */
export default function updateTabVisibility(aktivierteTabs?: string[]): void {
  if (!aktivierteTabs || aktivierteTabs.length === 0) {
    for (const tabId of ALL_TAB_IDS) {
      const parentLi = document.querySelector<HTMLButtonElement>(`#${tabId}`)?.parentElement;
      if (!parentLi) continue;
      if (LEGACY_DEFAULT_ON_TAB_IDS.has(tabId)) parentLi.classList.remove('d-none');
      else parentLi.classList.add('d-none');
    }
    return;
  }

  const activeIds = new Set(aktivierteTabs.map(tab => TAB_MAP[tab]).filter(Boolean));

  for (const tabId of ALL_TAB_IDS) {
    const parentLi = document.querySelector<HTMLButtonElement>(`#${tabId}`)?.parentElement;
    if (!parentLi) continue;

    if (activeIds.has(tabId)) {
      parentLi.classList.remove('d-none');
    } else {
      parentLi.classList.add('d-none');
    }
  }
}

/**
 * Versteckt alle Feature-Tabs (z. B. beim logoutUser).
 */
export function hideAllFeatureTabs(): void {
  for (const tabId of ALL_TAB_IDS) {
    document.querySelector<HTMLButtonElement>(`#${tabId}`)?.parentElement?.classList.add('d-none');
  }
}
