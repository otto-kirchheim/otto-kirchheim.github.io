/**
 * Sichtbarkeitsregel für Berechnungs-Blöcke:
 * Ein Bereich ist sichtbar, wenn keine Einschränkung gesetzt ist, er global aktiviert ist,
 * oder – als Ausnahme – im geprüften Scope trotzdem Daten existieren (z. B. Altdaten
 * aus der Zeit vor der Deaktivierung). Ob Daten existieren, sagt der Slot `berechnung` des Features (`hatDaten`).
 *
 * @param gruppe - Zu prüfender Bereich (`meta.legacy.tabKey`, identisch zu `Einstellungen.aktivierteTabs`).
 * @param aktivierteTabs - Aktivierte Tabs aus den Einstellungen; leer/fehlend = keine Einschränkung.
 * @param hatDaten - `true`, wenn im geprüften Scope Daten für die Gruppe existieren.
 * @returns `true`, wenn der Block angezeigt werden soll.
 */
export function isGroupVisible(gruppe: string, aktivierteTabs: string[] | undefined, hatDaten: boolean): boolean {
  if (!aktivierteTabs || aktivierteTabs.length === 0) return true;
  if (aktivierteTabs.includes(gruppe)) return true;
  return hatDaten;
}
