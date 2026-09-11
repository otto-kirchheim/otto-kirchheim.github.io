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
  member: { label: 'Mitglied', semantic: 'neutral' },
  'team-admin': { label: 'Team-Admin', semantic: 'informational' },
  'org-admin': { label: 'Org-Admin', semantic: 'warning' },
  'super-admin': { label: 'Super-Admin', semantic: 'critical' },
};
