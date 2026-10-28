import { Role } from '@otto-kirchheim/nebengeld-shared';
import type { TUserRole } from '@/types';
import type { SemanticType } from '@db-ux/react-core-components';

export type UserEditState = {
  /** Textfeld-Form der OE; das Backend speichert sie als Ebenen-Array. */
  oe: string;
  role: TUserRole;
  adminForTeamOes: string[];
  adminForOrganizationOes: string[];
  /** Zusätzliche Einschränkung für Team-Admin: nur Zugriff auf diese Stützpunkte (Pers.ErsteTkgSt). */
  adminForStuetzpunkte: string[];
  canEditVorgabenGeld: boolean;
  canEditProfileTemplates: boolean;
  canEditOwnTeamTemplatesOnly: boolean;
  canCreateFormularVorlagen: boolean;
  canEditFormularVorlagen: boolean;
};

/**
 * Welche Zuständigkeits-/Berechtigungsblöcke für eine Rolle angezeigt werden. Super-Admin umgeht jede
 * Flag-/Scope-Prüfung im Backend, Mitglied hat keine -- beide bekommen nichts Zusätzliches. Org-Admin
 * sieht zusätzlich die Team-Blöcke, weil er für einen Bereich org-weit und für einen anderen nur
 * team-weit (ggf. mit Stützpunkt) zuständig sein kann.
 *
 * @param role - (ggf. noch ungespeicherte) Rolle.
 * @returns Sichtbarkeit von Team-Scope (Team-OE + Stützpunkt), Org-Scope und Berechtigungen.
 */
export function sichtbareBloecke(role: TUserRole): { team: boolean; org: boolean; berechtigungen: boolean } {
  const istAdmin = role === Role.TEAM_ADMIN || role === Role.ORG_ADMIN;
  return { team: istAdmin, org: role === Role.ORG_ADMIN, berechtigungen: istAdmin };
}

export const ROLE_LABELS: Record<TUserRole, { label: string; semantic: SemanticType }> = {
  [Role.MEMBER]: { label: 'Mitglied', semantic: 'neutral' },
  [Role.TEAM_ADMIN]: { label: 'Team-Admin', semantic: 'informational' },
  [Role.ORG_ADMIN]: { label: 'Org-Admin', semantic: 'warning' },
  [Role.SUPER_ADMIN]: { label: 'Super-Admin', semantic: 'critical' },
};
