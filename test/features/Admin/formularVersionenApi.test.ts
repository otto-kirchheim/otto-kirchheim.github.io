import { describe, expect, it, mock } from 'bun:test';

type Aufruf = { pfad: string; daten: unknown; methode: string };

/**
 * Lädt das API-Modul mit gemocktem `FetchRetry`. Frisch pro Test, damit sich die aufgezeichneten
 * Aufrufe nicht zwischen den Fällen vermischen.
 */
async function ladeApi(antwort: { success: boolean; statusCode: number; message?: string; data?: unknown }) {
  const aufrufe: Aufruf[] = [];
  mock.module('@/infrastructure/api/FetchRetry', () => ({
    FetchRetry: (pfad: string, daten: unknown, methode: string) => {
      aufrufe.push({ pfad, daten, methode });
      return Promise.resolve(antwort);
    },
    getServerUrl: () => Promise.resolve('https://example.test/api/v2'),
  }));
  mock.module('@/infrastructure/storage/Storage', () => ({
    default: { get: () => 'token' },
  }));

  const modul = await import('@/features/Admin/components/formularVersionenApi');
  return { modul, aufrufe };
}

describe('formularVersionenApi', () => {
  it('liefert die Versionsliste aus dem Envelope', async () => {
    const daten = [{ id: 'a1', version: 'v1', gueltigVon: '2026-01-01', gueltigBis: null }];
    const { modul, aufrufe } = await ladeApi({ success: true, statusCode: 200, data: daten });

    await expect(modul.holeVersionen('ez')).resolves.toEqual(daten as never);
    expect(aufrufe[0]).toMatchObject({ pfad: 'formulare/ez/versionen', methode: 'GET' });
  });

  it('wirft einen ApiFehler mit Statuscode, damit der Konflikt (409) erkennbar bleibt', async () => {
    const { modul } = await ladeApi({ success: false, statusCode: 409, message: 'Lücke oder Überlappung: ez: …' });

    const fehler = await modul.aendereVersion('ez', 'a1', {
      version: 'v1',
      gueltigVon: '2026-01-01',
      gueltigBis: null,
      vorlageId: 'b2',
      konfig: { seiten: [{ quelle: 0, bereiche: [], felder: {} }] },
      tabellen: {},
    }).catch((e: unknown) => e);

    expect(fehler).toBeInstanceOf(modul.ApiFehler);
    expect((fehler as InstanceType<typeof modul.ApiFehler>).statusCode).toBe(409);
  });

  it('hängt erzwingen nur an, wenn es angefordert wurde', async () => {
    const { modul, aufrufe } = await ladeApi({ success: true, statusCode: 200, data: { geloescht: true } });

    await modul.loescheVersion('ewt', 'a1');
    await modul.loescheVersion('ewt', 'a1', true);

    expect(aufrufe.map(a => a.pfad)).toEqual([
      'formulare/ewt/versionen/a1',
      'formulare/ewt/versionen/a1?erzwingen=true',
    ]);
    expect(aufrufe[0]!.methode).toBe('DELETE');
  });

  it('schickt beim Ändern das erzwingen-Flag im Body mit', async () => {
    const { modul, aufrufe } = await ladeApi({ success: true, statusCode: 200, data: {} });
    const daten = {
      version: 'v1',
      gueltigVon: '2026-01-01',
      gueltigBis: '2026-07-01',
      vorlageId: 'b2',
      konfig: { seiten: [{ quelle: 0, bereiche: [], felder: {} }] },
      tabellen: {},
    };

    await modul.aendereVersion('ez', 'a1', daten, true);

    expect(aufrufe[0]).toMatchObject({ pfad: 'formulare/ez/versionen/a1', methode: 'PUT' });
    expect(aufrufe[0]!.daten).toMatchObject({ ...daten, erzwingen: true });
  });
});
