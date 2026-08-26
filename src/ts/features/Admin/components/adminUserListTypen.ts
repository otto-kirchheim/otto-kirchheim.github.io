import type { TUserRole } from '@/types';

export type UserEditState = {
  /** Textfeld-Form der OE; das Backend speichert sie als Ebenen-Array. */
  oe: string;
  role: TUserRole;
  adminForTeamOes: string[];
  adminForOrganizationOes: string[];
  canEditVorgabenGeld: boolean;
  canEditProfileTemplates: boolean;
  canEditOwnTeamTemplatesOnly: boolean;
};

export const ROLE_LABELS: Record<TUserRole, { label: string; color: string }> = {
  member: { label: 'Mitglied', color: 'secondary' },
  'team-admin': { label: 'Team-Admin', color: 'info' },
  'org-admin': { label: 'Org-Admin', color: 'warning' },
  'super-admin': { label: 'Super-Admin', color: 'danger' },
};
