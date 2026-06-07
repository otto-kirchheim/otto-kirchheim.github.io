import { beforeEach, describe, expect, it, mock, vi } from 'bun:test';

const { storageGetMock } = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  storageGetMock: vi.fn(),
}));

async function loadNebenZulagenUtils() {
  mock.module('@/infrastructure/storage/Storage', () => ({
    default: {
      get: storageGetMock,
    },
  }));

  return import('@/features/Neben/utils/nebengeldZulagen');
}

describe('nebengeldZulagen', () => {
  beforeEach(() => {
    mock.restore();
    vi.clearAllMocks();
    storageGetMock.mockReturnValue({ Einstellungen: { benoetigteZulagen: ['811', '839'] } });
  });

  it('liefert nur die in Einstellungen ausgewählten Zulagen', async () => {
    const { getConfiguredNebenZulagen } = await loadNebenZulagenUtils();

    expect(getConfiguredNebenZulagen().map(item => item.code)).toEqual(['811', '839']);
  });

  it('normalisiert Legacy-040-Felder auf die neue Zulagenliste', async () => {
    const { normalizeNebengeldZulagen } = await loadNebenZulagenUtils();

    expect(normalizeNebengeldZulagen({ anzahl040N: 2 })).toEqual([{ code: '040', value: 2 }]);
  });

  it('validiert exklusive und minutenbasierte Zulagen', async () => {
    const { validateNebengeldZulagen } = await loadNebenZulagenUtils();

    expect(
      validateNebengeldZulagen([
        { code: '839', value: 90 },
        { code: '811', value: 120 },
      ]),
    ).toContain('839 darf innerhalb der Kategorie an diesem Tag nicht mit anderen Zulagen kombiniert werden.');

    expect(validateNebengeldZulagen([{ code: '811', value: 30 }])).toContain(
      '811 erfordert mindestens 60 Minuten pro Tag.',
    );
  });
});