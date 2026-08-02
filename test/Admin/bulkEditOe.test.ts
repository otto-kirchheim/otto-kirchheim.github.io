import { describe, expect, it } from 'bun:test';
import { computeCommonOeLevels, computeMaxOeLevels } from '@/features/Admin/utils/bulkEditOe';

describe('computeCommonOeLevels()', () => {
  it('befüllt Positionen, an denen alle Benutzer denselben Wert haben', () => {
    const users = [{ oe: ['V', 'IW', 'MI'] }, { oe: ['V', 'IW', 'N'] }];

    expect(computeCommonOeLevels(users, 3)).toEqual(['V', 'IW', null]);
  });

  it('liefert null bei abweichenden Werten', () => {
    const users = [{ oe: ['V', 'IW'] }, { oe: ['X', 'IW'] }];

    expect(computeCommonOeLevels(users, 2)).toEqual([null, 'IW']);
  });

  it('liefert null für Positionen, die nicht alle Benutzer besitzen', () => {
    const users = [{ oe: ['V', 'IW', 'MI'] }, { oe: ['V', 'IW'] }];

    expect(computeCommonOeLevels(users, 3)).toEqual(['V', 'IW', null]);
  });

  it('befüllt bei einem einzelnen Benutzer jede vorhandene Ebene', () => {
    const users = [{ oe: ['V', 'IW', 'MI'] }];

    expect(computeCommonOeLevels(users, 3)).toEqual(['V', 'IW', 'MI']);
  });

  it('liefert ein leeres Ergebnis bei maxLevels=0', () => {
    expect(computeCommonOeLevels([{ oe: ['V'] }], 0)).toEqual([]);
  });

  it('kommt mit leerer Benutzerliste zurecht', () => {
    expect(computeCommonOeLevels([], 3)).toEqual([null, null, null]);
  });
});

describe('computeMaxOeLevels()', () => {
  it('nimmt die größte Tiefe über Pers.OE aller Benutzer', () => {
    const users = [
      { oe: ['V', 'IW'], adminForTeamOes: [], adminForOrganizationOes: [] },
      { oe: ['V', 'IW', 'MI', 'N'], adminForTeamOes: [], adminForOrganizationOes: [] },
    ];
    expect(computeMaxOeLevels(users)).toBe(4);
  });

  it('berücksichtigt auch Team-/Org-Admin-OE-Einträge', () => {
    const users = [
      { oe: ['V'], adminForTeamOes: ['V.IW-MI-N-KSL'], adminForOrganizationOes: [] },
      { oe: ['V'], adminForTeamOes: [], adminForOrganizationOes: ['V.IW'] },
    ];
    expect(computeMaxOeLevels(users)).toBe(5);
  });

  it('liefert mindestens 1', () => {
    expect(computeMaxOeLevels([{ oe: [], adminForTeamOes: [], adminForOrganizationOes: [] }])).toBe(1);
    expect(computeMaxOeLevels([])).toBe(1);
  });
});
