import { describe, expect, it } from 'bun:test';
import dayjs from '../../src/ts/infrastructure/date/configDayjs';
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
  nebengeldFromBackend,
  nebengeldToBackend,
  userProfileFromBackend,
  userProfileToBackend,
  vorgabenFromBackend,
  vorgabenUFromServer,
} from '../../src/ts/infrastructure/data/fieldMapper';
import type { IDatenBE, IDatenBZ, IDatenEWT, IDatenN, IVorgabenU, IVorgabenUServer } from '../../src/ts/core/types';

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
      beginB: '2024-04-12T13:45:00.000Z',
      endeB: '2024-04-19T05:00:00.000Z',
      pauseB: 30,
    });
  });

  it('bzFromBackend setzt Pause auf 0 wenn undefined', () => {
    const withoutPause = { ...backendBZ, Pause: undefined };
    const result = bzFromBackend(withoutPause);
    expect(result.pauseB).toBe(0);
  });

  it('bzToBackend konvertiert korrekt', () => {
    const frontendBZ: IDatenBZ = {
      _id: 'bz1',
      beginB: '2024-04-12T13:45:00.000Z',
      endeB: '2024-04-19T05:00:00.000Z',
      pauseB: 30,
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

  it('bzToBackend → bzFromBackend Roundtrip', () => {
    const original: IDatenBZ = {
      _id: 'rt1',
      beginB: '2024-01-01T00:00:00Z',
      endeB: '2024-01-07T12:00:00Z',
      pauseB: 15,
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
    LRE: 'LRE 1',
    PrivatKm: 25,
  };

  it('beFromBackend konvertiert korrekt', () => {
    const result = beFromBackend(backendBE);
    expect(result._id).toBe('be1');
    expect(result.tagBE).toBe(dayjs('2024-04-15T00:00:00.000Z').format('DD.MM.YYYY'));
    expect(result.auftragsnummerBE).toBe('AUF-123');
    expect(result.beginBE).toBe('08:00');
    expect(result.endeBE).toBe('16:30');
    expect(result.lreBE).toBe('LRE 1');
    expect(result.privatkmBE).toBe(25);
  });

  it('beToBackend konvertiert Tag ins ISO-Format', () => {
    const frontendBE: IDatenBE = {
      _id: 'be1',
      tagBE: '15.04.2024',
      auftragsnummerBE: 'AUF-123',
      beginBE: '08:00',
      endeBE: '16:30',
      lreBE: 'LRE 1',
      privatkmBE: 25,
    };
    const result = beToBackend(frontendBE, 4, 2024);
    expect(result._id).toBe('be1');
    expect(result.Monat).toBe(4);
    expect(result.Jahr).toBe(2024);
    expect(result.Auftragsnummer).toBe('AUF-123');
    expect(result.Beginn).toBe('08:00');
    expect(result.Ende).toBe('16:30');
    expect(result.LRE).toBe('LRE 1');
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
    expect(result.tagE).toBe(dayjs('2024-04-10T00:00:00.000Z').format('YYYY-MM-DD'));
    expect(result.buchungstagE).toBe(dayjs('2024-04-11T00:00:00.000Z').format('YYYY-MM-DD'));
    expect(result.eOrtE).toBe('Frankfurt');
    expect(result.schichtE).toBe('Tag');
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
    expect(result.eOrtE).toBe('');
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
      tagE: '2024-04-10',
      buchungstagE: '2024-04-11',
      eOrtE: 'Frankfurt',
      schichtE: 'Tag',
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
      tagE: '2026-03-31',
      buchungstagE: '2026-04-01',
      eOrtE: 'Fulda',
      schichtE: 'N',
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

  it('ewtToBackend setzt leere Strings auf undefined', () => {
    const frontendEWT: IDatenEWT = {
      tagE: '2024-04-10',
      buchungstagE: '2024-04-10',
      eOrtE: '',
      schichtE: 'Nacht',
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
    expect(result.Einsatzort).toBeUndefined();
    expect(result.abWE).toBeUndefined();
    expect(result.ab1E).toBeUndefined();
    expect(result.anEE).toBeUndefined();
    expect(result.beginE).toBeUndefined();
    expect(result.endeE).toBeUndefined();
    expect(result.abEE).toBeUndefined();
    expect(result.an1E).toBeUndefined();
    expect(result.anWE).toBeUndefined();
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
    expect(result.tagN).toBe(dayjs('2024-03-20T00:00:00.000Z').format('DD.MM.YYYY'));
    expect(result.beginN).toBe('18:00');
    expect(result.endeN).toBe('06:00');
    expect(result.anzahl040N).toBe(3);
    expect(result.auftragN).toBe('NB-456');
  });

  it('nebengeldFromBackend ohne Zulage 040', () => {
    const withoutZulage = { ...backendN, Zulagen: [{ Typ: '050', Wert: 1 }] };
    const result = nebengeldFromBackend(withoutZulage);
    expect(result.anzahl040N).toBe(0);
  });

  it('nebengeldFromBackend ohne Auftragsnummer', () => {
    const withoutAuftrag = { ...backendN, Auftragsnummer: undefined };
    const result = nebengeldFromBackend(withoutAuftrag);
    expect(result.auftragN).toBe('');
  });

  it('nebengeldToBackend konvertiert korrekt', () => {
    const frontendN: IDatenN = {
      _id: 'n1',
      tagN: '20.03.2024',
      beginN: '18:00',
      endeN: '06:00',
      anzahl040N: 3,
      auftragN: 'NB-456',
    };
    const result = nebengeldToBackend(frontendN, 3, 2024);
    expect(result._id).toBe('n1');
    expect(result.Monat).toBe(3);
    expect(result.Jahr).toBe(2024);
    expect(result.Beginn).toBe('18:00');
    expect(result.Ende).toBe('06:00');
    expect(result.Auftragsnummer).toBe('NB-456');
    expect(result.Zulagen).toEqual([{ Typ: '040', Wert: 3 }]);
    expect(dayjs(result.Tag).isValid()).toBe(true);
    expect(dayjs(result.Tag).date()).toBe(20);
    expect(dayjs(result.Tag).month()).toBe(2); // 0-indexed
    expect(dayjs(result.Tag).year()).toBe(2024);
  });

  it('nebengeldToBackend setzt leere Auftragsnummer auf undefined', () => {
    const frontendN: IDatenN = {
      tagN: '15.03.2024',
      beginN: '20:00',
      endeN: '04:00',
      anzahl040N: 0,
      auftragN: '',
    };
    const result = nebengeldToBackend(frontendN, 3, 2024);
    expect(result.Auftragsnummer).toBeUndefined();
  });

  it('nebengeldToBackend mit anzahl040N = 0 setzt Fallback-Zulage', () => {
    const frontendN: IDatenN = {
      tagN: '10.03.2024',
      beginN: '19:00',
      endeN: '05:00',
      anzahl040N: 0,
      auftragN: '',
    };
    const result = nebengeldToBackend(frontendN, 3, 2024);
    expect(result.Zulagen).toEqual([{ Typ: '040', Wert: 0 }]);
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
    },
    VorgabenB: [{ key: 'standard', value: { Name: 'Standard' } as Record<string, unknown> }],
  };

  it('userProfileFromBackend konvertiert korrekt', () => {
    const result = userProfileFromBackend(backendProfile);
    expect(result.pers.Vorname).toBe('Max');
    expect(result.pers.Nachname).toBe('Mustermann');
    expect(result.pers.PNummer).toBe('12345');
    expect(result.pers.TB).toBe('Tarifkraft');
    expect(result.pers.kmArbeitsort).toBe(15);
    expect(result.aZ.bT).toBe('07:00');
    expect(result.aZ.eT).toBe('15:30');
    expect(result.aZ.rZ).toBe('00:15');
    expect(result.fZ).toEqual([{ key: 'fz1', text: 'Fahrzeit 1', value: '00:30' }]);
    expect(result.vorgabenB).toMatchObject({ standard: { Name: 'Standard' } });
  });

  it('userProfileFromBackend mit fehlenden optionalen Feldern', () => {
    const minimal: BackendUserProfile = {
      User: 'user2',
      Pers: { Vorname: 'Anna', Nachname: 'Test', PNummer: '999' } as BackendUserProfile['Pers'],
      Einstellungen: {} as BackendUserProfile['Einstellungen'],
      Fahrzeit: [],
      Arbeitszeit: {} as BackendUserProfile['Arbeitszeit'],
      VorgabenB: [],
    };
    const result = userProfileFromBackend(minimal);
    expect(result.pers.Telefon).toBe('');
    expect(result.pers.Adress1).toBe('');
    expect(result.pers.kmArbeitsort).toBe(0);
    expect(result.pers.kmnBhf).toBe(0);
    expect(result.pers.TB).toBe('Tarifkraft');
    expect(result.aZ.bT).toBe('');
    expect(result.aZ.eT).toBe('');
    expect(result.fZ).toEqual([]);
    expect(result.vorgabenB).toEqual({});
  });

  it('userProfileToBackend konvertiert vorgabenB Map zu Array', () => {
    const frontendProfile: IVorgabenU = {
      pers: backendProfile.Pers as IVorgabenU['pers'],
      aZ: backendProfile.Arbeitszeit as IVorgabenU['aZ'],
      Einstellungen: {} as IVorgabenU['Einstellungen'],
      fZ: backendProfile.Fahrzeit,
      vorgabenB: { standard: { Name: 'Standard' } as IVorgabenU['vorgabenB'][string] },
    };
    const result = userProfileToBackend(frontendProfile);
    expect(result.Pers).toEqual(frontendProfile.pers);
    expect(result.Arbeitszeit).toEqual(frontendProfile.aZ);
    expect(result.Fahrzeit).toEqual(frontendProfile.fZ);
    expect(result.VorgabenB).toEqual([{ key: 'standard', value: { Name: 'Standard' } }]);
  });

  it('userProfileToBackend → userProfileFromBackend Roundtrip (Pers)', () => {
    const original = userProfileFromBackend(backendProfile);
    const backend = userProfileToBackend(original);
    expect(backend.Pers.Vorname).toBe(original.pers.Vorname);
    expect(backend.Pers.Nachname).toBe(original.pers.Nachname);
    expect(backend.Arbeitszeit).toEqual(original.aZ);
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
    const server: IVorgabenUServer = {
      pers: { Vorname: 'Test', Nachname: 'User', PNummer: '1' } as IVorgabenUServer['pers'],
      aZ: { bT: '07:00' } as IVorgabenUServer['aZ'],
      Einstellungen: {} as IVorgabenUServer['Einstellungen'],
      fZ: [],
      vorgabenB: [
        { key: 'woche1', value: { Name: 'Woche 1' } as IVorgabenUServer['vorgabenB'][0]['value'] },
        { key: 'woche2', value: { Name: 'Woche 2' } as IVorgabenUServer['vorgabenB'][0]['value'] },
      ],
    };
    const result = vorgabenUFromServer(server);
    expect(result.vorgabenB).toMatchObject({
      woche1: { Name: 'Woche 1' },
      woche2: { Name: 'Woche 2' },
    });
    expect(result.pers).toBe(server.pers);
    expect(result.aZ).toBe(server.aZ);
    expect(result.fZ).toBe(server.fZ);
  });
});
