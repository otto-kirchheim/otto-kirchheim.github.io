import { describe, expect, it, mock } from 'bun:test';
import { render } from '@test/reactRender';

const legeVersionAn = mock(async () => undefined);
const aendereVersion = mock(async () => undefined);
const ladeVorlagenHoch = mock(async () => 'neu');

const versionMitAltemFormat = {
  id: 'v1',
  version: '1',
  gueltigVon: '2026-01-01',
  gueltigBis: null,
  vorlageId: 'vor-1',
  konfig: {
    seiten: [
      {
        quelle: 0,
        bereiche: [],
        felder: {
          Datum: { x: 0, y: 0, size: 9, format: 'datum' },
          Kopf: { x: 0, y: 0, size: 9, text: '{Zeit:HH:00}' },
        },
      },
    ],
  },
  tabellen: {},
};

mock.module('@/pages/admin/api/formularVersionenApi', () => ({
  ApiFehler: class ApiFehler extends Error {},
  holeVersionen: async () => [versionMitAltemFormat],
  holeVorlageAlsDatei: async () => new File(['%PDF'], 'vorlage.pdf', { type: 'application/pdf' }),
  ladeVorlagenHoch,
  legeVersionAn,
  aendereVersion,
  loescheVersion: mock(async () => undefined),
}));
// Der echte Editor zieht pdf.js nach -- für die Speichersperre reicht die Konfiguration im State.
mock.module('@/pages/admin/ui/FormularEditor/FormularEditor', () => ({ FormularEditor: () => null }));

const { FormularUpload } = await import('@/pages/admin/ui/FormularUpload');

const takt = () => new Promise(resolve => setTimeout(resolve, 20));

describe('FormularUpload – ungültige Formate', () => {
  it('listet die Fehler, sperrt Speichern und ruft weder Upload noch API auf', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    render(<FormularUpload />, container);
    await takt();

    const bearbeiten = [...container.querySelectorAll('button')].find(b => b.textContent === 'Bearbeiten');
    expect(bearbeiten).toBeDefined();
    bearbeiten!.click();
    await takt();

    expect(container.textContent).toContain('2 ungültige Formate');
    expect(container.textContent).toContain('Altes Format "datum" – neu: DD.MM.YYYY');
    expect(container.textContent).toContain('seiten[0].felder.Kopf.text');

    const speichern = container.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(speichern.disabled).toBe(true);

    container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await takt();
    expect(ladeVorlagenHoch).not.toHaveBeenCalled();
    expect(aendereVersion).not.toHaveBeenCalled();
    expect(legeVersionAn).not.toHaveBeenCalled();
  });
});
