import { describe, expect, it } from 'bun:test';
import { LreType } from '@otto-kirchheim/nebengeld-shared';
import dayjs from '@/infrastructure/date/configDayjs';
import {
  type BackendBereitschaftseinsatz,
  type BackendBereitschaftszeitraum,
  type BackendEWT,
  type BackendNebengeld,
  type BackendUserProfile,
  type BackendVorgabe,
  beFromBackend,
  beToBackend,
  bzFromBackend,
  bzToBackend,
  ewtFromBackend,
  ewtToBackend,
  flatMapDocs,
  nebengeldFromBackend,
  nebengeldToBackend,
  userProfileFromBackend,
  userProfileToBackend,
  vorgabenFromBackend,
  vorgabenUFromServer,
} from '@/infrastructure/data/fieldMapper';
import type { IDatenBE, IDatenBZ, IDatenEWT, IDatenN, IVorgabenU, IVorgabenUServer } from '@/core/types';

// ─── bzFromBackend / bzToBackend ─────────────────────────

describe('fieldMapper – BZ (Bereitschaftszeitraum)', () => {
  const backendBZ: BackendBereitschaftszeitraum = {
    _id: 'bz1',
    Monat: 4,
    Jahr: 2024,
    Beginn: '2024-04-12T13:45:00.000Z',
    Ende: '2024-04-19T05:00:00.000Z',
    Pause: 30,
  };

  it('bzFromBackend konvertiert korrekt', () => {
    const result = bzFromBackend(backendBZ);
    expect(result).toEqual({
      _id: 'bz1',
      Beginn: '2024-04-12T13:45:00.000Z',
      Ende: '2024-04-19T05:00:00.000Z',
      Pause: 30,
    });
  });

  it('bzFromBackend setzt Pause auf 0 wenn undefined', () => {
    const withoutPause = { ...backendBZ, Pause: undefined };
    const result = bzFromBackend(withoutPause);
    expect(result.Pause).toBe(0);
  });

  it('bzToBackend konvertiert korrekt', () => {
    const frontendBZ: IDatenBZ = {
      _id: 'bz1',
      Beginn: '2024-04-12T13:45:00.000Z',
      Ende: '2024-04-19T05:00:00.000Z',
      Pause: 30,
    };
    const result = bzToBackend(frontendBZ, 4, 2024);
    expect(result).toEqual({
      _id: 'bz1',
      Monat: 4,
      Jahr: 2024,
      Beginn: '2024-04-12T13:45:00.000Z',
      Ende: '2024-04-19T05:00:00.000Z',
      Pause: 30,
    });
  });

  it('bzToBackend fällt bei ungültigem Datum auf Monat/Jahr-Parameter zurück', () => {
    const frontendBZ: IDatenBZ = {
      _id: 'bz-invalid',
      Beginn: 'not-a-valid-date',
      Ende: '2024-04-19T05:00:00.000Z',
      Pause: 0,
    };
    const result = bzToBackend(frontendBZ, 7, 2025);
    expect(result.Monat).toBe(7);
    expect(result.Jahr).toBe(2025);
  });

  it('bzToBackend → bzFromBackend Roundtrip', () => {
    const original: IDatenBZ = {
      _id: 'rt1',
      Beginn: '2024-01-01T00:00:00Z',
      Ende: '2024-01-07T12:00:00Z',
      Pause: 15,
    };
    const backend = bzToBackend(original, 1, 2024);
    const roundtripped = bzFromBackend(backend);
    expect(roundtripped).toEqual(original);
  });
});

// ─── beFromBackend / beToBackend ─────────────────────────

describe('fieldMapper – BE (Bereitschaftseinsatz)', () => {
  const backendBE: BackendBereitschaftseinsatz = {
    _id: 'be1',
    Monat: 4,
    Jahr: 2024,
    Tag: '2024-04-15T00:00:00.000Z',
    Auftragsnummer: 'AUF-123',
    Beginn: '08:00',
    Ende: '16:30',
    LRE: LreType.LRE_1,
    PrivatKm: 25,
  };

  it('beFromBackend konvertiert korrekt', () => {
    const result = beFromBackend(backendBE);
    expect(result._id).toBe('be1');
    expect(result.Tag).toBe(dayjs('2024-04-15T00:00:00.000Z').format('DD.MM.YYYY'));
    expect(result.Auftragsnummer).toBe('AUF-123');
    expect(result.Beginn).toBe('08:00');
    expect(result.Ende).toBe('16:30');
    expect(result.LRE).toBe(LreType.LRE_1);
    expect(result.PrivatKm).toBe(25);
  });

  it('beToBackend konvertiert Tag ins ISO-Format', () => {
    const frontendBE: IDatenBE = {
      _id: 'be1',
      Tag: '15.04.2024',
      Auftragsnummer: 'AUF-123',
      Beginn: '08:00',
      Ende: '16:30',
      LRE: LreType.LRE_1,
      PrivatKm: 25,
    };
    const result = beToBackend(frontendBE, 4, 2024);
    expect(result._id).toBe('be1');
    expect(result.Monat).toBe(4);
    expect(result.Jahr).toBe(2024);
    expect(result.Auftragsnummer).toBe('AUF-123');
    expect(result.Beginn).toBe('08:00');
    expect(result.Ende).toBe('16:30');
    expect(result.LRE).toBe(LreType.LRE_1);
    expect(result.PrivatKm).toBe(25);
    // Tag sollte ein ISO-String sein
    expect(dayjs(result.Tag).isValid()).toBe(true);
  });
});

// ─── ewtFromBackend / ewtToBackend ───────────────────────

describe('fieldMapper – EWT (Einsatzwechseltätigkeit)', () => {
  const backendEWT: BackendEWT = {
    _id: 'ewt1',
    Monat: 4,
    Jahr: 2024,
    Tag: '2024-04-10T00:00:00.000Z',
    Buchungstag: '2024-04-11T00:00:00.000Z',
    Einsatzort: 'Frankfurt',
    Schicht: 'Tag',
    abWE: '06:00',
    ab1E: '06:30',
    anEE: '07:15',
    beginE: '07:30',
    endeE: '16:00',
    abEE: '16:15',
    an1E: '17:00',
    anWE: '17:30',
    berechnen: true,
  };

  it('ewtFromBackend konvertiert korrekt', () => {
    const result = ewtFromBackend(backendEWT);
    expect(result._id).toBe('ewt1');
    expect(result.Tag).toBe(dayjs('2024-04-10T00:00:00.000Z').format('YYYY-MM-DD'));
    expect(result.Buchungstag).toBe(dayjs('2024-04-11T00:00:00.000Z').format('YYYY-MM-DD'));
    expect(result.Einsatzort).toBe('Frankfurt');
    expect(result.Schicht).toBe('Tag');
    expect(result.abWE).toBe('06:00');
    expect(result.berechnen).toBe(true);
  });

  it('ewtFromBackend setzt optionale Felder auf Defaults', () => {
    const minimal: BackendEWT = {
      _id: 'ewt2',
      Monat: 1,
      Jahr: 2024,
      Tag: '2024-01-05T00:00:00.000Z',
      Buchungstag: '2024-01-05T00:00:00.000Z',
      Schicht: 'Spät',
    };
    const result = ewtFromBackend(minimal);
    expect(result.Einsatzort).toBe('');
    expect(result.abWE).toBe('');
    expect(result.ab1E).toBe('');
    expect(result.anEE).toBe('');
    expect(result.beginE).toBe('');
    expect(result.endeE).toBe('');
    expect(result.abEE).toBe('');
    expect(result.an1E).toBe('');
    expect(result.anWE).toBe('');
    expect(result.berechnen).toBe(true);
  });

  it('ewtFromBackend mit berechnen=false', () => {
    const doc = { ...backendEWT, berechnen: false };
    expect(ewtFromBackend(doc).berechnen).toBe(false);
  });

  it('ewtToBackend konvertiert korrekt', () => {
    const frontendEWT: IDatenEWT = {
      _id: 'ewt1',
      Tag: '2024-04-10',
      Buchungstag: '2024-04-11',
      Einsatzort: 'Frankfurt',
      Schicht: 'Tag',
      abWE: '06:00',
      ab1E: '06:30',
      anEE: '07:15',
      beginE: '07:30',
      endeE: '16:00',
      abEE: '16:15',
      an1E: '17:00',
      anWE: '17:30',
      berechnen: true,
    };
    const result = ewtToBackend(frontendEWT, 4, 2024);
    expect(result._id).toBe('ewt1');
    expect(result.Monat).toBe(4);
    expect(result.Jahr).toBe(2024);
    expect(result.Einsatzort).toBe('Frankfurt');
    expect(result.Schicht).toBe('Tag');
    expect(result.abWE).toBe('06:00');
    expect(dayjs(result.Tag).isValid()).toBe(true);
    expect(dayjs(result.Buchungstag).isValid()).toBe(true);
    expect(dayjs(result.Buchungstag).date()).toBe(11);
  });

  it('ewtToBackend leitet Monat beim Monatswechsel aus dem Starttag statt aus Buchungstag/UI-Filter ab', () => {
    const frontendEWT: IDatenEWT = {
      Tag: '2026-03-31',
      Buchungstag: '2026-04-01',
      Einsatzort: 'Fulda',
      Schicht: 'N',
      abWE: '21:30',
      ab1E: '',
      anEE: '',
      beginE: '22:00',
      endeE: '02:30',
      abEE: '',
      an1E: '',
      anWE: '',
      berechnen: true,
    };

    const result = ewtToBackend(frontendEWT, 5, 2026);

    expect(result.Monat).toBe(3);
    expect(result.Jahr).toBe(2026);
    expect(dayjs(result.Tag).format('YYYY-MM-DD')).toBe('2026-03-31');
    expect(dayjs(result.Buchungstag).format('YYYY-MM-DD')).toBe('2026-04-01');
  });

  it('ewtToBackend sendet leere Strings explizit mit (damit Updates gelöschte Zeiten überschreiben)', () => {
    const frontendEWT: IDatenEWT = {
      Tag: '2024-04-10',
      Buchungstag: '2024-04-10',
      Einsatzort: '',
      Schicht: 'Nacht',
      abWE: '',
      ab1E: '',
      anEE: '',
      beginE: '',
      endeE: '',
      abEE: '',
      an1E: '',
      anWE: '',
      berechnen: true,
    };
    const result = ewtToBackend(frontendEWT, 4, 2024);
    expect(result.Einsatzort).toBe('');
    expect(result.abWE).toBe('');
    expect(result.ab1E).toBe('');
    expect(result.anEE).toBe('');
    expect(result.beginE).toBe('');
    expect(result.endeE).toBe('');
    expect(result.abEE).toBe('');
    expect(result.an1E).toBe('');
    expect(result.anWE).toBe('');
  });
});

// ─── nebengeldFromBackend / nebengeldToBackend ───────────

describe('fieldMapper – Nebengeld', () => {
  const backendN: BackendNebengeld = {
    _id: 'n1',
    Monat: 3,
    Jahr: 2024,
    Tag: '2024-03-20T00:00:00.000Z',
    Beginn: '18:00',
    Ende: '06:00',
    Auftragsnummer: 'NB-456',
    Zulagen: [{ Typ: '040', Wert: 3 }],
  };

  it('nebengeldFromBackend konvertiert korrekt', () => {
    const result = nebengeldFromBackend(backendN);
    expect(result._id).toBe('n1');
    expect(result.Tag).toBe(dayjs('2024-03-20T00:00:00.000Z').format('DD.MM.YYYY'));
    expect(result.Beginn).toBe('18:00');
    expect(result.Ende).toBe('06:00');
    expect(result.Zulagen).toEqual([{ Typ: '040', Wert: 3 }]);
    expect(result.zulagenAnzeigeN).toBe('040 Fahrentsch. × 3');
    expect(result.Auftragsnummer).toBe('NB-456');
  });

  it('nebengeldFromBackend ohne Zulage 040', () => {
    const withoutZulage = { ...backendN, Zulagen: [{ Typ: '050', Wert: 1 }] };
    const result = nebengeldFromBackend(withoutZulage);
    expect(result.Zulagen).toEqual([{ Typ: '050', Wert: 1 }]);
  });

  it('nebengeldFromBackend ohne Auftragsnummer', () => {
    const withoutAuftrag = { ...backendN, Auftragsnummer: undefined };
    const result = nebengeldFromBackend(withoutAuftrag);
    expect(result.Auftragsnummer).toBe('');
  });

  it('nebengeldToBackend konvertiert korrekt', () => {
    const frontendN: IDatenN = {
      _id: 'n1',
      Tag: '20.03.2024',
      Beginn: '18:00',
      Ende: '06:00',
      Zulagen: [
        { Typ: '040', Wert: 3 },
        { Typ: '811', Wert: 120 },
      ],
      Auftragsnummer: 'NB-456',
    };
    const result = nebengeldToBackend(frontendN, 3, 2024);
    expect(result._id).toBe('n1');
    expect(result.Monat).toBe(3);
    expect(result.Jahr).toBe(2024);
    expect(result.Beginn).toBe('18:00');
    expect(result.Ende).toBe('06:00');
    expect(result.Auftragsnummer).toBe('NB-456');
    expect(result.Zulagen).toEqual([
      { Typ: '040', Wert: 3 },
      { Typ: '811', Wert: 120 },
    ]);
    expect(dayjs(result.Tag).isValid()).toBe(true);
    expect(dayjs(result.Tag).date()).toBe(20);
    expect(dayjs(result.Tag).month()).toBe(2); // 0-indexed
    expect(dayjs(result.Tag).year()).toBe(2024);
  });

  it('nebengeldFromBackend mit EWT null liefert EWT undefined', () => {
    const withNullEwt = { ...backendN, EWT: null };
    const result = nebengeldFromBackend(withNullEwt);
    expect(result.EWT).toBeUndefined();
  });

  it('nebengeldToBackend sendet gesetzte EWT als EWT', () => {
    const frontendN: IDatenN = {
      Tag: '15.03.2024',
      Beginn: '20:00',
      Ende: '04:00',
      Auftragsnummer: '',
      EWT: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    };
    const result = nebengeldToBackend(frontendN, 3, 2024);
    expect(result.EWT).toBe('aaaaaaaaaaaaaaaaaaaaaaaa');
  });

  it('nebengeldToBackend sendet fehlende EWT als EWT null (Unlink-Signal für den Server)', () => {
    const frontendN: IDatenN = {
      Tag: '15.03.2024',
      Beginn: '20:00',
      Ende: '04:00',
      Auftragsnummer: '',
    };
    const result = nebengeldToBackend(frontendN, 3, 2024);
    expect(result.EWT).toBeNull();
  });

  it('nebengeldToBackend sendet leere Auftragsnummer explizit mit (damit Updates sie serverseitig leeren)', () => {
    const frontendN: IDatenN = {
      Tag: '15.03.2024',
      Beginn: '20:00',
      Ende: '04:00',
      Auftragsnummer: '',
    };
    const result = nebengeldToBackend(frontendN, 3, 2024);
    expect(result.Auftragsnummer).toBe('');
  });

  it('nebengeldToBackend ohne Zulagen erzeugt ein leeres Zulagen-Array', () => {
    const frontendN: IDatenN = {
      Tag: '10.03.2024',
      Beginn: '19:00',
      Ende: '05:00',
      Auftragsnummer: '',
    };
    const result = nebengeldToBackend(frontendN, 3, 2024);
    expect(result.Zulagen).toEqual([]);
  });
});

// ─── userProfileFromBackend / userProfileToBackend ───────

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
      Betrieb: 'DB Netz',
      OE: 'TEST-OE',
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
      Pers: backendProfile.Pers as IVorgabenU['Pers'],
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
    expect(result.Pers).toEqual(frontendProfile.Pers);
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
