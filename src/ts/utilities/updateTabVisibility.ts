/** Mapping: aktivierteTabs-Wert → HTML-Tab-Button-ID */
const TAB_MAP: Record<string, string> = {
  bereitschaft: 'bereitschaft-tab',
  ewt: 'ewt-tab',
  neben: 'neben-tab',
};

/** Alle steuerbaren Tab-IDs */
const ALL_TAB_IDS = Object.values(TAB_MAP);

/**
 * Zeigt/Versteckt Feature-Tabs basierend auf `aktivierteTabs`.
 * Wenn `aktivierteTabs` leer oder nicht gesetzt ist, werden alle Tabs angezeigt.
 */
export default function updateTabVisibility(aktivierteTabs?: string[]): void {
  if (!aktivierteTabs || aktivierteTabs.length === 0) {
    // Keine Einschränkung → alle Tabs anzeigen
    for (const tabId of ALL_TAB_IDS) {
      document.querySelector<HTMLButtonElement>(`#${tabId}`)?.parentElement?.classList.remove('d-none');
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
