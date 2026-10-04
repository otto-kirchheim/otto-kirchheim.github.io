import { describe, expect, it } from 'bun:test';
import {
  type BackendUserProfile,
  type BackendVorgabe,
  flatMapDocs,
  userProfileFromBackend,
  userProfileToBackend,
  vorgabenFromBackend,
  vorgabenUFromServer,
} from '@/shared/lib/ressource/fieldMapper';
import type { IVorgabenU, IVorgabenUServer } from '@/shared/types';

describe('fieldMapper – UserProfile', () => {
  const backendProfile: BackendUserProfile = {
    _id: 'prof1',
    User: 'user123',
    Pers: {
      Vorname: 'Max',
      Nachname: 'Mustermann',
      PNummer: '12345',
      Telefon: '0123456789',
      Adress1: 'Musterstr. 1',
      Adress2: '',
      ErsteTkgSt: 'Berlin',
      ErsteTkgStAdresse: 'Berliner Str. 1',
      Bundesland: 'BE',
      Betrieb: 'DB Netz',
      OE: ['TEST', 'OE'],
      Gewerk: 'LST',
      kmArbeitsort: 15,
      nBhf: 'Berlin Hbf',
      kmnBhf: 5,
      TB: 'Tarifkraft',
    },
    Einstellungen: {} as BackendUserProfile['Einstellungen'],
    Fahrzeit: [{ key: 'fz1', text: 'Fahrzeit 1', value: '00:30' }],
    Arbeitszeit: {
      bT: '07:00',
      eT: '15:30',
      eTF: '15:00',
      bS: '14:00',
      eS: '22:00',
      bN: '22:00',
      eN: '06:00',
      bBN: '19:30',
      rZ: '00:15',
    } as unknown as BackendUserProfile['Arbeitszeit'],
    VorgabenB: [{ key: 'standard', value: { Name: 'Standard' } as Record<string, unknown> }],
  };

  it('userProfileFromBackend konvertiert korrekt', () => {
    const result = userProfileFromBackend(backendProfile);
    expect(result.Pers.Vorname).toBe('Max');
    expect(result.Pers.Nachname).toBe('Mustermann');
    expect(result.Pers.PNummer).toBe('12345');
    expect(result.Pers.TB).toBe('Tarifkraft');
    expect(result.Pers.kmArbeitsort).toBe(15);
    // Legacy aZ migrated to new format
    expect(result.Arbeitszeit.frueh.default.beginn).toBe('07:00');
    expect(result.Arbeitszeit.frueh.default.ende).toBe('15:30');
    expect(result.Arbeitszeit.frueh.overrides?.[5]?.ende).toBe('15:00'); // eTF !== eT
    expect(result.Arbeitszeit.fahrzeit).toBe('00:15');
    expect(result.Arbeitszeit.nacht?.default.beginn).toBe('22:00');
    expect(result.Arbeitszeit.sonder?.beginn).toBe('14:00');
    expect(result.Fahrzeit).toEqual([{ key: 'fz1', text: 'Fahrzeit 1', value: '00:30' }]);
    expect(result.VorgabenB).toMatchObject({ standard: { Name: 'Standard' } });
  });

  it('userProfileFromBackend migriert VorgabenB-Eintrag mit nacht=true ohne schichten', () => {
    const withNachtFlag: BackendUserProfile = {
      ...backendProfile,
      VorgabenB: [{ key: 'nachtwoche', value: { Name: 'Nachtwoche', nacht: true } as Record<string, unknown> }],
    };
    const result = userProfileFromBackend(withNachtFlag);
    expect(result.VorgabenB.nachtwoche).toMatchObject({ schichten: ['nacht'] });
  });

  it('userProfileFromBackend lässt VorgabenB-Eintrag ohne nacht=true unverändert', () => {
    const withoutNachtFlag: BackendUserProfile = {
      ...backendProfile,
      VorgabenB: [{ key: 'tagwoche', value: { Name: 'Tagwoche' } as Record<string, unknown> }],
    };
    const result = userProfileFromBackend(withoutNachtFlag);
    expect(result.VorgabenB.tagwoche).not.toHaveProperty('schichten');
  });

  it('userProfileFromBackend mit fehlenden optionalen Feldern', () => {
    const minimal: BackendUserProfile = {
      User: 'user2',
      Pers: { Vorname: 'Anna', Nachname: 'Test', PNummer: '999' } as BackendUserProfile['Pers'],
      Einstellungen: {} as BackendUserProfile['Einstellungen'],
      Fahrzeit: [],
      Arbeitszeit: undefined,
      VorgabenB: [],
    };
    const result = userProfileFromBackend(minimal);
    expect(result.Pers.Telefon).toBe('');
    expect(result.Pers.Adress1).toBe('');
    expect(result.Pers.kmArbeitsort).toBe(0);
    expect(result.Pers.kmnBhf).toBe(0);
    expect(result.Pers.TB).toBe('Tarifkraft');
    // Empty legacy → migrated to new format with empty strings
    expect(result.Arbeitszeit.frueh.default.beginn).toBe('');
    expect(result.Arbeitszeit.frueh.default.ende).toBe('');
    expect(result.Fahrzeit).toEqual([]);
    expect(result.VorgabenB).toEqual({});
  });

  it('userProfileToBackend konvertiert vorgabenB Map zu Array', () => {
    const frontendProfile: IVorgabenU = {
      // Im Frontend ist OE die Textfeld-Form, im Backend das Ebenen-Array.
      Pers: { ...backendProfile.Pers, OE: 'TEST.OE' } as IVorgabenU['Pers'],
      Arbeitszeit: {
        frueh: {
          aktiv: true,
          default: { beginn: '07:00', ende: '15:30', pause: 30 },
          overrides: { 5: { ende: '15:00', pause: 0 } },
        },
        spaet: { aktiv: false, default: { beginn: '14:00', ende: '22:00', pause: 30 } },
        nacht: { aktiv: false, default: { beginn: '22:00', ende: '06:00', pause: 45 } },
        sonder: { aktiv: false, beginn: '14:00', ende: '22:00', pause: 20 },
        fahrzeit: '00:15',
      },
      Einstellungen: {} as IVorgabenU['Einstellungen'],
      Fahrzeit: backendProfile.Fahrzeit.map(fz => ({ ...fz })),
      VorgabenB: { standard: { Name: 'Standard' } as IVorgabenU['VorgabenB'][string] },
    };
    const result = userProfileToBackend(frontendProfile);
    expect(result.Pers).toEqual({ ...frontendProfile.Pers, OE: ['TEST', 'OE'] });
    // aZ is passed through directly to backend
    expect(result.Arbeitszeit?.frueh.default.beginn).toBe('07:00');
    expect(result.Arbeitszeit?.frueh.default.ende).toBe('15:30');
    expect(result.Arbeitszeit?.frueh.overrides?.[5]?.ende).toBe('15:00');
    expect(result.Arbeitszeit?.fahrzeit).toBe('00:15');
    expect(result.Fahrzeit).toEqual(frontendProfile.Fahrzeit);
    expect(result.VorgabenB).toEqual([{ key: 'standard', value: { Name: 'Standard' } }]);
  });

  it('userProfileToBackend → userProfileFromBackend Roundtrip (Pers)', () => {
    const original = userProfileFromBackend(backendProfile);
    const backend = userProfileToBackend(original);
    expect(backend.Pers.Vorname).toBe(original.Pers.Vorname);
    expect(backend.Pers.Nachname).toBe(original.Pers.Nachname);
    // Backend Arbeitszeit is new format, verify key fields round-tripped
    expect(backend.Arbeitszeit?.frueh.default.beginn).toBe(original.Arbeitszeit.frueh.default.beginn);
    expect(backend.Arbeitszeit?.frueh.default.ende).toBe(original.Arbeitszeit.frueh.default.ende);
    expect(backend.Arbeitszeit?.fahrzeit).toBe(original.Arbeitszeit.fahrzeit);
  });
});

// ─── vorgabenFromBackend ─────────────────────────────────

describe('fieldMapper – Vorgaben', () => {
  it('vorgabenFromBackend konvertiert korrekt', () => {
    const doc: BackendVorgabe = {
      _id: 2024,
      Vorgaben: [
        { key: 1, value: { Tarifkraft: 2.58, TE8: 4.09 } },
        { key: 6, value: { Tarifkraft: 2.65, TE8: 4.15, Fahrentsch: undefined } },
      ],
    };
    const result = vorgabenFromBackend(doc);
    expect(result[1]).toEqual({ Tarifkraft: 2.58, TE8: 4.09 });
    expect(result[6]).toEqual({ Tarifkraft: 2.65, TE8: 4.15 });
    expect(result[6]).not.toHaveProperty('Fahrentsch');
  });

  it('vorgabenFromBackend mit leerem Vorgaben-Array', () => {
    const doc: BackendVorgabe = { _id: 2024, Vorgaben: [] };
    const result = vorgabenFromBackend(doc);
    expect(result).toEqual({});
  });

  it('vorgabenFromBackend mit null/undefined Vorgaben', () => {
    const doc = { _id: 2024 } as BackendVorgabe;
    const result = vorgabenFromBackend(doc);
    expect(result).toEqual({});
  });
});

// ─── vorgabenUFromServer ─────────────────────────────────

describe('fieldMapper – vorgabenUFromServer', () => {
  it('konvertiert Array-Format zu Map-Format', () => {
    const newAz: IVorgabenUServer['Arbeitszeit'] = {
      frueh: { aktiv: true, default: { beginn: '07:00', ende: '15:45', pause: 30 } },
      spaet: { aktiv: false, default: { beginn: '14:00', ende: '22:00', pause: 30 } },
      nacht: { aktiv: false, default: { beginn: '19:45', ende: '06:15', pause: 45 } },
      sonder: { aktiv: false, beginn: '20:15', ende: '07:00', pause: 20 },
      fahrzeit: '00:15',
    };
    const server: IVorgabenUServer = {
      Pers: { Vorname: 'Test', Nachname: 'User', PNummer: '1' } as IVorgabenUServer['Pers'],
      Arbeitszeit: newAz,
      Einstellungen: {} as IVorgabenUServer['Einstellungen'],
      Fahrzeit: [],
      VorgabenB: [
        { key: 'woche1', value: { Name: 'Woche 1' } as IVorgabenUServer['VorgabenB'][0]['value'] },
        { key: 'woche2', value: { Name: 'Woche 2' } as IVorgabenUServer['VorgabenB'][0]['value'] },
      ],
    };
    const result = vorgabenUFromServer(server);
    expect(result.VorgabenB).toMatchObject({
      woche1: { Name: 'Woche 1' },
      woche2: { Name: 'Woche 2' },
    });
    expect(result.Pers).toBe(server.Pers);
    expect(result.Arbeitszeit).toEqual(server.Arbeitszeit);
    expect(result.Fahrzeit).toBe(server.Fahrzeit);
  });
});

// ─── flatMapDocs ──────────────────────────────────────────

describe('fieldMapper – flatMapDocs', () => {
  it('mappt Dokumente und ermittelt das späteste updatedAt', () => {
    const docs = [
      { id: 1, updatedAt: '2024-01-01T00:00:00.000Z' },
      { id: 2, updatedAt: '2024-03-01T00:00:00.000Z' },
      { id: 3, updatedAt: '2024-02-01T00:00:00.000Z' },
    ];
    const result = flatMapDocs(docs, doc => ({ mappedId: doc.id }));
    expect(result.data).toEqual([{ mappedId: 1 }, { mappedId: 2 }, { mappedId: 3 }]);
    expect(result.maxUpdatedAt).toBe('2024-03-01T00:00:00.000Z');
  });

  it('liefert maxUpdatedAt=null, wenn kein Dokument updatedAt hat', () => {
    const docs: { id: number; updatedAt?: string }[] = [{ id: 1 }, { id: 2 }];
    const result = flatMapDocs(docs, doc => ({ mappedId: doc.id }));
    expect(result.data).toEqual([{ mappedId: 1 }, { mappedId: 2 }]);
    expect(result.maxUpdatedAt).toBeNull();
  });

  it('liefert leeres data-Array und maxUpdatedAt=null bei leerer Eingabe', () => {
    const result = flatMapDocs([] as { updatedAt?: string }[], doc => doc);
    expect(result.data).toEqual([]);
    expect(result.maxUpdatedAt).toBeNull();
  });
});
