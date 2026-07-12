import { beforeEach, describe, expect, it } from 'bun:test';
import Storage from '@/infrastructure/storage/Storage';
import type { IVorgabenU, IVorgabenUPers } from '@/types';
import { capturePersSnapshot, validatePersoenlicheDaten } from '@/core/orchestration/onboarding/onboardingValidation';

const templatePers: IVorgabenUPers = {
  Vorname: 'Max',
  Nachname: 'Mustermann',
  PNummer: '01234567',
  Telefon: '0123 / 45678910',
  Adress1: 'Musterstraße 1, 12345 Musterstadt',
  Adress2: '',
  ErsteTkgSt: 'Kirchheim',
  ErsteTkgStAdresse: 'Beiersgraben, 36275 Kirchheim',
  Bundesland: 'HE',
  Betrieb: 'DB InfraGO AG',
  OE: 'V.IW-MI-M-KSL-IL 03',
  Gewerk: 'LST',
  kmArbeitsort: 10,
  nBhf: 'Bad Hersfeld',
  kmnBhf: 10,
  TB: 'Tarifkraft',
};

function setVorgabenU(pers: Partial<IVorgabenUPers>): void {
  Storage.set('VorgabenU', { pers: { ...templatePers, ...pers } } as IVorgabenU);
}

function renderPersInputs(values: Partial<Record<keyof IVorgabenUPers, string>> = {}): void {
  const fields: Array<keyof IVorgabenUPers> = ['Vorname', 'Nachname', 'PNummer', 'Telefon', 'Adress1'];
  document.body.innerHTML = fields.map(id => `<input id="${id}" value="${values[id] ?? ''}" />`).join('');
}

describe('onboardingValidation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    Storage.remove('VorgabenU');
    Storage.remove('OnboardingPersSnapshot');
  });

  describe('capturePersSnapshot', () => {
    it('stores a snapshot of the five relevant pers fields', () => {
      setVorgabenU({});

      capturePersSnapshot();

      expect(Storage.get<Record<string, string>>('OnboardingPersSnapshot')).toEqual({
        Vorname: 'Max',
        Nachname: 'Mustermann',
        PNummer: '01234567',
        Telefon: '0123 / 45678910',
        Adress1: 'Musterstraße 1, 12345 Musterstadt',
      });
    });

    it('does nothing when VorgabenU is not loaded yet and stays retryable', () => {
      capturePersSnapshot();
      expect(Storage.check('OnboardingPersSnapshot')).toBe(false);

      setVorgabenU({});
      capturePersSnapshot();
      expect(Storage.check('OnboardingPersSnapshot')).toBe(true);
    });

    it('does not overwrite an existing snapshot', () => {
      setVorgabenU({});
      capturePersSnapshot();

      setVorgabenU({ Vorname: 'Jan' });
      capturePersSnapshot();

      expect(Storage.get<Record<string, string>>('OnboardingPersSnapshot')?.Vorname).toBe('Max');
    });
  });

  describe('validatePersoenlicheDaten', () => {
    it('reports all fields as open when VorgabenU is missing', () => {
      renderPersInputs();
      const result = validatePersoenlicheDaten();

      expect(result.ok).toBe(false);
      expect(result.offeneFelder).toEqual(['Vorname', 'Nachname', 'Personalnummer', 'Telefon', 'Wohnsitz 1']);
    });

    it('allows valid visible values even when one of them matches the template', () => {
      setVorgabenU({});
      renderPersInputs({
        Vorname: 'Max',
        Nachname: 'Mustermann',
        PNummer: '01234567',
        Telefon: '0123 / 45678910',
        Adress1: 'Musterstraße 1, 12345 Musterstadt',
      });

      const result = validatePersoenlicheDaten();

      expect(result.ok).toBe(true);
      expect(result.offeneFelder).toEqual([]);
    });

    it('lists only the fields that are still empty', () => {
      setVorgabenU({});
      renderPersInputs({
        Vorname: 'Jan',
        Nachname: 'Otto',
        Telefon: '0661 / 123456',
        Adress1: 'Echte Straße 5, 36251 Bad Hersfeld',
      });

      const result = validatePersoenlicheDaten();

      expect(result.ok).toBe(false);
      expect(result.offeneFelder).toEqual(['Personalnummer']);
    });

    it('passes once all five fields are non-empty, even if one matches the template value', () => {
      setVorgabenU({});
      renderPersInputs({
        Vorname: 'Max',
        Nachname: 'Otto',
        PNummer: '76543210',
        Telefon: '0661 / 123456',
        Adress1: 'Echte Straße 5, 36251 Bad Hersfeld',
      });

      expect(validatePersoenlicheDaten()).toEqual({ ok: true, offeneFelder: [] });
    });

    it('flags empty fields even when they differ from the snapshot', () => {
      setVorgabenU({});
      renderPersInputs({ Vorname: 'Jan', Nachname: 'Otto', PNummer: '76543210', Telefon: '0661 / 1', Adress1: '   ' });

      const result = validatePersoenlicheDaten();

      expect(result.ok).toBe(false);
      expect(result.offeneFelder).toEqual(['Wohnsitz 1']);
    });

    it('only requires non-empty fields when no snapshot exists (existing users)', () => {
      setVorgabenU({});
      renderPersInputs({
        Vorname: 'Jan',
        Nachname: 'Otto',
        PNummer: '76543210',
        Telefon: '0661 / 1',
        Adress1: 'Echte Straße 5, 36251 Bad Hersfeld',
      });

      expect(validatePersoenlicheDaten()).toEqual({ ok: true, offeneFelder: [] });
    });
  });
});
