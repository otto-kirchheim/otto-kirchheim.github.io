import { describe, expect, it } from 'bun:test';

import { vorlagenAbschnitte, vorlagenPersFelder } from '@/pages/admin/adminFeatures';
import {
  buildTemplatePayload,
  normalizeTemplateContent,
  serializeDraft,
} from '@/pages/admin/ui/adminProfileTemplatesManagerGemeinsam';
import type { BackendProfileTemplate } from '@/pages/admin/api/api';
import berAdmin from '@/pages/admin/features/ber';
import eaAdmin from '@/pages/admin/features/ea';
import ewtAdmin from '@/pages/admin/features/ewt';
import ezAdmin from '@/pages/admin/features/ez';

/** Abschnitte aller vier Admin-Anteile. */
const ALLE = vorlagenAbschnitte([berAdmin, ewtAdmin, ezAdmin, eaAdmin]);

/** Vorlage mit Inhalt in allen Feature-Abschnitten. */
const VORLAGE = {
  Pers: { Vorname: 'Max' },
  Fahrzeit: [{ key: 'Kirchheim', text: 'km 196,5', value: '00:10' }],
  VorgabenB: [
    {
      key: '1',
      value: {
        Name: 'Woche',
        beginnB: { tag: 1, zeit: '15:00' },
        endeB: { tag: 1, zeit: '07:00', Nwoche: true },
        schichten: ['frueh'],
        nacht: false,
        beginnN: { tag: 1, zeit: '', Nwoche: false },
        endeN: { tag: 1, zeit: '', Nwoche: false },
        standard: true,
        eigenesFeld: 'bleibt',
      },
    },
  ],
  Einstellungen: { aktivierteTabs: ['bereitschaft', 'ewt'], benoetigteZulagen: ['040', '010'] },
} as unknown as BackendProfileTemplate['template'];

describe('Profil-Vorlage: Abschnitte der Features', () => {
  it('die Admin-Anteile melden VorgabenB (ber), Fahrzeit (ewt), Zulagen (ez) in Feature-Reihenfolge', () => {
    expect(ALLE.map(abschnitt => abschnitt.id)).toEqual(['VorgabenB', 'Fahrzeit', 'Zulagen']);
  });

  it('EA steuert seine Pers-Felder bei, nicht die globale Liste', () => {
    expect(vorlagenPersFelder([eaAdmin]).map(feld => feld.key)).toEqual(['Taetigkeit', 'Entgeltgruppe']);
  });

  it('liest jeden Abschnitt in seinen Entwurf', () => {
    const entwurf = normalizeTemplateContent(VORLAGE, ALLE);

    expect(entwurf.Einstellungen).toEqual({ aktivierteTabs: ['bereitschaft', 'ewt'] });
    expect(entwurf.abschnitte.Zulagen).toEqual(['010', '040']);
    expect(entwurf.abschnitte.Fahrzeit).toEqual([{ key: 'Kirchheim', text: 'km 196,5', value: '00:10' }]);
    expect((entwurf.abschnitte.VorgabenB as { value: { Name: string } }[])[0].value.Name).toBe('Woche');
  });

  it('schreibt einen unveraenderten Entwurf inhaltsgleich zurueck (unbekannte Felder bleiben)', () => {
    const payload = buildTemplatePayload(VORLAGE, normalizeTemplateContent(VORLAGE, ALLE), ALLE) as Record<
      string,
      unknown
    >;

    expect(payload.Fahrzeit).toEqual(VORLAGE?.Fahrzeit);
    expect(payload.Einstellungen).toEqual({
      aktivierteTabs: ['bereitschaft', 'ewt'],
      benoetigteZulagen: ['010', '040'],
    });
    const vorgabe = (payload.VorgabenB as { key: string; value: Record<string, unknown> }[])[0];
    expect(vorgabe.key).toBe('1');
    expect(vorgabe.value.eigenesFeld).toBe('bleibt');
    expect(vorgabe.value.standard).toBe(true);
  });

  it('fehlt ein Feature, bleiben seine Daten in der Vorlage erhalten (kein Loeschen)', () => {
    const ohneBerUndEz = vorlagenAbschnitte([ewtAdmin, eaAdmin]);
    const payload = buildTemplatePayload(
      VORLAGE,
      normalizeTemplateContent(VORLAGE, ohneBerUndEz),
      ohneBerUndEz,
    ) as Record<string, unknown>;

    expect(payload.VorgabenB).toEqual(VORLAGE?.VorgabenB);
    expect((payload.Einstellungen as Record<string, unknown>).benoetigteZulagen).toEqual(['040', '010']);
  });

  it('leere Abschnitte fallen weg, auch die Einstellungen', () => {
    const entwurf = normalizeTemplateContent(VORLAGE, ALLE);
    entwurf.abschnitte = { VorgabenB: [], Fahrzeit: [], Zulagen: [] };
    entwurf.Einstellungen = { aktivierteTabs: [] };

    const payload = buildTemplatePayload(VORLAGE, entwurf, ALLE) as Record<string, unknown>;

    expect(payload).not.toHaveProperty('VorgabenB');
    expect(payload).not.toHaveProperty('Fahrzeit');
    expect(payload).not.toHaveProperty('Einstellungen');
  });

  it('Zulage an- und wieder abwaehlen ergibt keinen geaenderten Entwurf', () => {
    const quelle = normalizeTemplateContent(VORLAGE, ALLE);
    const zulagen = ALLE.find(abschnitt => abschnitt.id === 'Zulagen')!;
    const zurueck = { ...quelle, abschnitte: { ...quelle.abschnitte, Zulagen: ['040', '010'].sort() } };

    expect(zulagen.hatDaten(quelle.abschnitte.Zulagen)).toBe(true);
    expect(serializeDraft(zurueck)).toBe(serializeDraft(quelle));
  });
});
