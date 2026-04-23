import { beforeEach, describe, expect, it, vi } from 'bun:test';

const { mockFetchRetry, mockCreateSnackBar, mockNotifyActAsStateChanged } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  mockFetchRetry: vi.fn(),
  mockCreateSnackBar: vi.fn(),
  mockNotifyActAsStateChanged: vi.fn(),
}));

vi.mock('../../src/ts/infrastructure/api/FetchRetry', () => ({
  FetchRetry: mockFetchRetry,
  getServerUrl: vi.fn(),
}));

vi.mock('../../src/ts/class/CustomSnackbar', () => ({
  createSnackBar: mockCreateSnackBar,
}));

vi.mock('../../src/ts/infrastructure/ui/actAsStatus', () => ({
  notifyActAsStateChanged: mockNotifyActAsStateChanged,
}));

import {
  createProfileTemplate,
  deleteProfileTemplate,
  deleteUser,
  deleteVorgabeByYear,
  fetchAdminUsers,
  fetchCurrentAdminCapabilities,
  fetchProfileTemplates,
  fetchVorgabeByYear,
  fetchVorgabenYears,
  setActAsUser,
  updateProfileTemplate,
  updateUserOe,
  updateUserPassword,
  updateUserRole,
  updateUserScopes,
  upsertVorgabeByYear,
} from '../../src/ts/features/Admin/utils/api';
import Storage from '../../src/ts/infrastructure/storage/Storage';

function mockSuccess<T>(data: T) {
  mockFetchRetry.mockResolvedValueOnce({ success: true, data });
}

function mockError(message = 'API-Fehler') {
  mockFetchRetry.mockResolvedValueOnce({ success: false, message });
}

describe('Admin API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('fetchAdminUsers', () => {
    it('gibt gemappte User-Zeilen mit Profildaten zurück', async () => {
      mockFetchRetry
        .mockResolvedValueOnce({
          success: true,
          data: [{ _id: 'u1', userName: 'max', role: 'member', adminForTeamOes: [], adminForOrganizationOes: [] }],
        })
        .mockResolvedValueOnce({
          success: true,
          data: { Pers: { OE: 'I.NA', Vorname: 'Max', Nachname: 'Mustermann' } },
        });

      const result = await fetchAdminUsers({});
      expect(result).toHaveLength(1);
      expect(result[0].userName).toBe('max');
      expect(result[0].fullName).toBe('Max Mustermann');
      expect(result[0].oe).toBe('I.NA');
    });

    it('übergibt search- und role-Filter als Query-Parameter', async () => {
      mockFetchRetry.mockResolvedValueOnce({ success: true, data: [] });
      await fetchAdminUsers({ name: 'otto', role: 'member' });
      const calledPath = mockFetchRetry.mock.calls[0][0] as string;
      expect(calledPath).toContain('search=otto');
      expect(calledPath).toContain('role=member');
    });

    it('fällt auf leere Strings zurück wenn Profil-Fetch fehlschlägt', async () => {
      mockFetchRetry
        .mockResolvedValueOnce({
          success: true,
          data: [{ _id: 'u2', userName: 'err', role: 'member', adminForTeamOes: [], adminForOrganizationOes: [] }],
        })
        .mockResolvedValueOnce(new Error('not found'));

      const result = await fetchAdminUsers({});
      expect(result[0].fullName).toBe('');
      expect(result[0].oe).toBe('');
    });
  });

  describe('updateUserScopes', () => {
    it('sendet PUT-Request mit Scope-Daten', async () => {
      mockSuccess({ _id: 'u1', userName: 'max', role: 'member' });
      await updateUserScopes('u1', { adminForTeamOes: ['OE1'], adminForOrganizationOes: [] });
      expect(mockFetchRetry).toHaveBeenCalledWith(
        'users/u1',
        { adminForTeamOes: ['OE1'], adminForOrganizationOes: [] },
        'PUT',
      );
    });
  });

  describe('fetchCurrentAdminCapabilities', () => {
    it('super-admin erhält volle Berechtigungen', async () => {
      mockSuccess({ _id: 'u1', userName: 'admin', role: 'super-admin', canEditVorgabenGeld: false, canEditProfileTemplates: false, canEditOwnTeamTemplatesOnly: true });
      const result = await fetchCurrentAdminCapabilities();
      expect(result.canEditVorgabenGeld).toBe(true);
      expect(result.canEditProfileTemplates).toBe(true);
      expect(result.canEditOwnTeamTemplatesOnly).toBe(false);
    });

    it('team-admin mit gewährten Berechtigungen', async () => {
      mockSuccess({ _id: 'u1', userName: 'ta', role: 'team-admin', canEditVorgabenGeld: true, canEditProfileTemplates: true, canEditOwnTeamTemplatesOnly: true });
      const result = await fetchCurrentAdminCapabilities();
      expect(result.canEditVorgabenGeld).toBe(true);
      expect(result.canEditProfileTemplates).toBe(true);
      expect(result.canEditOwnTeamTemplatesOnly).toBe(true);
    });

    it('org-admin mit canEditProfileTemplates=false', async () => {
      mockSuccess({ _id: 'u1', userName: 'oa', role: 'org-admin', canEditVorgabenGeld: true, canEditProfileTemplates: false, canEditOwnTeamTemplatesOnly: false });
      const result = await fetchCurrentAdminCapabilities();
      expect(result.canEditVorgabenGeld).toBe(true);
      expect(result.canEditProfileTemplates).toBe(false);
    });

    it('normaler Member erhält keine Berechtigungen', async () => {
      mockSuccess({ _id: 'u1', userName: 'user', role: 'member', canEditVorgabenGeld: false, canEditProfileTemplates: false, canEditOwnTeamTemplatesOnly: false });
      const result = await fetchCurrentAdminCapabilities();
      expect(result.canEditVorgabenGeld).toBe(false);
      expect(result.canEditProfileTemplates).toBe(false);
      expect(result.canEditOwnTeamTemplatesOnly).toBe(false);
    });
  });

  describe('updateUserRole', () => {
    it('sendet PATCH mit neuer Rolle', async () => {
      mockSuccess({ _id: 'u1', userName: 'max', role: 'team-admin' });
      await updateUserRole('u1', 'team-admin');
      expect(mockFetchRetry).toHaveBeenCalledWith('users/u1/role', { role: 'team-admin' }, 'PATCH');
    });
  });

  describe('updateUserOe', () => {
    it('sendet PUT mit neuer OE', async () => {
      mockSuccess({});
      await updateUserOe('u1', 'I.NA-New');
      expect(mockFetchRetry).toHaveBeenCalledWith('user-profiles/user/u1', { Pers: { OE: 'I.NA-New' } }, 'PUT');
    });
  });

  describe('updateUserPassword', () => {
    it('sendet PATCH und zeigt Erfolgs-Snackbar', async () => {
      mockSuccess({});
      await updateUserPassword('u1', 'newPass123');
      expect(mockFetchRetry).toHaveBeenCalledWith('users/u1/password', { newPassword: 'newPass123' }, 'PATCH');
      expect(mockCreateSnackBar).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    });
  });

  describe('deleteUser', () => {
    it('sendet DELETE und zeigt Erfolgs-Snackbar', async () => {
      mockSuccess({});
      await deleteUser('u1');
      expect(mockFetchRetry).toHaveBeenCalledWith('users/u1', undefined, 'DELETE');
      expect(mockCreateSnackBar).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    });
  });

  describe('setActAsUser', () => {
    it('speichert userId und userName in Storage', () => {
      setActAsUser('u1', 'Max');
      expect(Storage.check('actAsUserId')).toBe(true);
      expect(Storage.get<string>('actAsUserId', true)).toBe('u1');
      expect(Storage.get<string>('actAsUserName', true)).toBe('Max');
      expect(mockNotifyActAsStateChanged).toHaveBeenCalled();
    });

    it('entfernt actAs-Keys bei null', () => {
      Storage.set('actAsUserId', 'u1');
      Storage.set('actAsUserName', 'Max');
      setActAsUser(null);
      expect(Storage.check('actAsUserId')).toBe(false);
      expect(Storage.check('actAsUserName')).toBe(false);
      expect(mockNotifyActAsStateChanged).toHaveBeenCalled();
    });
  });

  describe('Vorgaben API', () => {
    it('fetchVorgabenYears gibt Liste zurück', async () => {
      mockSuccess([{ _id: 2024, Vorgaben: [] }]);
      const result = await fetchVorgabenYears();
      expect(result).toHaveLength(1);
      expect(mockFetchRetry).toHaveBeenCalledWith('vorgaben', undefined, 'GET');
    });

    it('fetchVorgabeByYear gibt Einzeljahr zurück', async () => {
      mockSuccess({ _id: 2024, Vorgaben: [{ key: 1, value: {} }] });
      const result = await fetchVorgabeByYear(2024);
      expect(result._id).toBe(2024);
      expect(mockFetchRetry).toHaveBeenCalledWith('vorgaben/2024', undefined, 'GET');
    });

    it('upsertVorgabeByYear sendet PUT und zeigt Snackbar', async () => {
      mockSuccess({ _id: 2024, Vorgaben: [] });
      await upsertVorgabeByYear(2024, []);
      expect(mockFetchRetry).toHaveBeenCalledWith('vorgaben/2024', { Vorgaben: [] }, 'PUT');
      expect(mockCreateSnackBar).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    });

    it('deleteVorgabeByYear sendet DELETE und zeigt Snackbar', async () => {
      mockSuccess({});
      await deleteVorgabeByYear(2024);
      expect(mockFetchRetry).toHaveBeenCalledWith('vorgaben/2024', undefined, 'DELETE');
      expect(mockCreateSnackBar).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    });

    it('wirft bei API-Fehler', async () => {
      mockError('Nicht gefunden');
      await expect(fetchVorgabeByYear(2025)).rejects.toThrow('Nicht gefunden');
    });
  });

  describe('Profile Templates API', () => {
    it('fetchProfileTemplates gibt Liste zurück', async () => {
      mockSuccess([{ _id: 'tpl1', code: 'LST', name: 'LST-Vorlage', active: true }]);
      const result = await fetchProfileTemplates();
      expect(result).toHaveLength(1);
      expect(mockFetchRetry).toHaveBeenCalledWith('profile-templates', undefined, 'GET');
    });

    it('createProfileTemplate sendet POST und zeigt Snackbar', async () => {
      mockSuccess({ _id: 'tpl2', code: 'EWT', name: 'EWT-Vorlage', active: true });
      await createProfileTemplate({ code: 'EWT', name: 'EWT-Vorlage', active: true });
      expect(mockFetchRetry).toHaveBeenCalledWith(
        'profile-templates',
        expect.objectContaining({ code: 'EWT' }),
        'POST',
      );
      expect(mockCreateSnackBar).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    });

    it('updateProfileTemplate sendet PUT und zeigt Snackbar', async () => {
      mockSuccess({ _id: 'tpl1', code: 'LST', name: 'Updated', active: false });
      await updateProfileTemplate('tpl1', { name: 'Updated', active: false });
      expect(mockFetchRetry).toHaveBeenCalledWith(
        'profile-templates/tpl1',
        { name: 'Updated', active: false },
        'PUT',
      );
      expect(mockCreateSnackBar).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    });

    it('deleteProfileTemplate sendet DELETE und zeigt Snackbar', async () => {
      mockSuccess({});
      await deleteProfileTemplate('tpl1');
      expect(mockFetchRetry).toHaveBeenCalledWith('profile-templates/tpl1', undefined, 'DELETE');
      expect(mockCreateSnackBar).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    });
  });
});
