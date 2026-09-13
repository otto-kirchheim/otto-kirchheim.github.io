import { Role } from '@otto-kirchheim/nebengeld-shared';
import type { TUserRole } from '@/types';
import type { SemanticType } from '@db-ux/react-core-components';

export type UserEditState = {
  /** Textfeld-Form der OE; das Backend speichert sie als Ebenen-Array. */
  oe: string;
  role: TUserRole;
  adminForTeamOes: string[];
  adminForOrganizationOes: string[];
  canEditVorgabenGeld: boolean;
  canEditProfileTemplates: boolean;
  canEditOwnTeamTemplatesOnly: boolean;
  canCreateFormularVorlagen: boolean;
  canEditFormularVorlagen: boolean;
};

export const ROLE_LABELS: Record<TUserRole, { label: string; semantic: SemanticType }> = {
  [Role.MEMBER]: { label: 'Mitglied', semantic: 'neutral' },
  [Role.TEAM_ADMIN]: { label: 'Team-Admin', semantic: 'informational' },
  [Role.ORG_ADMIN]: { label: 'Org-Admin', semantic: 'warning' },
  [Role.SUPER_ADMIN]: { label: 'Super-Admin', semantic: 'critical' },
};
