import type { IBerechnungMonatsErgebnis } from './calculateBerechnungRows';

/** Gruppen-Schlüssel identisch zu Einstellungen.aktivierteTabs (siehe updateTabVisibility.ts). */
export type BerechnungGruppe = 'bereitschaft' | 'ewt' | 'neben' | 'ea';

/**
 * Sichtbarkeitsregel für Berechnungs-Blöcke:
 * Ein Bereich ist sichtbar, wenn keine Einschränkung gesetzt ist, er global aktiviert ist,
 * oder – als Ausnahme – im geprüften Scope trotzdem Daten existieren (z. B. Altdaten
 * aus der Zeit vor der Deaktivierung).
 *
 * @param gruppe - Zu prüfender Bereich.
 * @param aktivierteTabs - Aktivierte Tabs aus den Einstellungen; leer/fehlend = keine Einschränkung.
 * @param hatDaten - `true`, wenn im geprüften Scope Daten für die Gruppe existieren.
 * @returns `true`, wenn der Block angezeigt werden soll.
 */
export function isGroupVisible(
  gruppe: BerechnungGruppe,
  aktivierteTabs: string[] | undefined,
  hatDaten: boolean,
): boolean {
  if (!aktivierteTabs || aktivierteTabs.length === 0) return true;
  if (aktivierteTabs.includes(gruppe)) return true;
  return hatDaten;
}

/**
 * Prüft, ob ein Monatsergebnis anzeigbare Werte für die jeweilige Gruppe enthält.
 *
 * @param gruppe - Zu prüfender Bereich.
 * @param ergebnis - Monatsergebnis der Berechnung.
 * @returns `true`, wenn mindestens ein Feld der Gruppe nicht `null` ist.
 */
export function gruppeHatDaten(gruppe: BerechnungGruppe, ergebnis: IBerechnungMonatsErgebnis): boolean {
  switch (gruppe) {
    case 'bereitschaft':
      return (
        ergebnis.bereitschaftMinuten !== null ||
        ergebnis.bereitschaftszulage !== null ||
        ergebnis.lre1 !== null ||
        ergebnis.lre2 !== null ||
        ergebnis.lre3 !== null ||
        ergebnis.privatPkw !== null ||
        ergebnis.summeBereitschaft !== null
      );
    case 'ewt':
      return (
        ergebnis.abwesenheiten !== null || ergebnis.steuerfreieAbwesenheiten !== null || ergebnis.summeEwt !== null
      );
    case 'neben':
      return ergebnis.summeNebenbezuege !== null;
    case 'ea':
      return ergebnis.eaMinuten !== null;
  }
}
