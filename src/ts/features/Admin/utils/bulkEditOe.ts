import { splitOeInput } from '@/infrastructure/data/oeLevels';
import type { BulkApplyCategory, BulkOeTargetField } from './api';

export type SimpleFieldKey = 'betrieb' | 'gewerk' | 'ersteTkgSt' | 'ersteTkgStAdresse';

/** Labels wie in AdminUserProfileEditor.tsx (Pers.Betrieb/Gewerk/ErsteTkgSt/ErsteTkgStAdresse). */
export const FIELD_LABELS: Record<SimpleFieldKey, string> = {
  betrieb: 'Betrieb',
  gewerk: 'Gewerk',
  ersteTkgSt: 'Erste TkgSt',
  ersteTkgStAdresse: 'TkgSt Adresse',
};

export const OE_TARGET_LABELS: Record<BulkOeTargetField, string> = {
  pers: 'Pers.OE',
  teamOes: 'Team-Admin-OEs',
  organizationOes: 'Org-Admin-OEs',
};

export const CATEGORY_LABELS: Record<BulkApplyCategory, string> = {
  Fahrzeit: 'Fahrzeiten',
  Arbeitszeit: 'Arbeitszeiten',
  VorgabenB: 'Bereitschafts-Vorgaben',
  Einstellungen: 'Einstellungen',
};

/**
 * Ermittelt je OE-Position den gemeinsamen Wert der Auswahl (case-sensitiv
 * exakt), sonst `null`. Dient als Vorbefüllung für den Ersetzen-Editor.
 */
export function computeCommonOeLevels(users: { oe: string[] }[], maxLevels: number): (string | null)[] {
  return Array.from({ length: maxLevels }, (_, index) => {
    const values = users.map(user => user.oe[index]);
    const [first] = values;
    if (first === undefined) return null;
    return values.every(value => value === first) ? first : null;
  });
}

/**
 * Gemeinsame Ebenen über eine Liste fertiger OE-Pfade (Team-/Org-Admin-OEs) —
 * dieselbe Logik wie `computeCommonOeLevels`, nur mit vorheriger Zerlegung.
 * Leere Liste ⇒ keine Vorbefüllung.
 */
export function computeCommonPathLevels(paths: string[], maxLevels: number): string[] {
  if (paths.length === 0) return [];
  return computeCommonOeLevels(
    paths.map(path => ({ oe: splitOeInput(path) })),
    maxLevels,
  ).map(value => value ?? '');
}

/**
 * Größte Ebenen-Tiefe über Pers.OE UND alle Team-/Org-Admin-OE-Einträge der
 * Auswahl — unabhängig davon, welches Ziel gerade angehakt ist, damit die
 * Box-Anzahl beim Umschalten der Ziel-Checkboxen nicht springt.
 */
export function computeMaxOeLevels(
  users: { oe: string[]; adminForTeamOes: string[]; adminForOrganizationOes: string[] }[],
): number {
  const depths = users.flatMap(user => [
    user.oe.length,
    ...user.adminForTeamOes.map(path => splitOeInput(path).length),
    ...user.adminForOrganizationOes.map(path => splitOeInput(path).length),
  ]);
  return Math.max(1, ...depths);
}
