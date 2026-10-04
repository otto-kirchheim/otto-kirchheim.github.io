import { beforeAll, describe, expect, it, vi } from 'bun:test';
import { LreType, ZulageCategory } from '@otto-kirchheim/nebengeld-shared';
import {
  beispielWert,
  gruppiere,
  istBooleanFeld,
  katalogFelder,
  katalogZeilenFelder,
  listenVorlagen,
  vorlagenKategorie,
  werteAuswahl,
  zeilenQuellen,
  type FormularCode,
} from '@/pages/admin/ui/FormularEditor/datenKatalog';
import '@/app/features';
import { featureRegistry } from '@/shared/lib/feature';
import { ladeAdminFeatures, resetAdminFeatures } from '@/pages/admin/adminFeatures';

const FORMULARE: FormularCode[] = ['bereitschaft', 'ewt', 'ez', 'ea'];

/**
 * Regressionstest fuer die P1i-Umstellung (`datenKatalog.ts` setzt sich aus den Katalog-Beitraegen der Admin-Feature-Ordner
 * `pages/admin/features/<key>/katalog.ts` zusammen statt aus Records in einer Datei); haelt die bisherige, unveraenderte
 * Ausgabe fest.
 */
describe('datenKatalog: Zusammenfuehrung der Feature-Beitraege', () => {
  // Die Katalog-Beitraege kommen ueber die geladenen Admin-Anteile (`AdminFeature.formular.katalog`).
  beforeAll(async () => {
    resetAdminFeatures();
    await ladeAdminFeatures();
  });

  it('zeilenQuellen nennt genau die Zeilenlisten jedes Formulars', () => {
    expect(zeilenQuellen('bereitschaft').map(q => q.pfad)).toEqual(['Daten.BZ', 'Daten.BE']);
    expect(zeilenQuellen('ewt').map(q => q.pfad)).toEqual(['Daten.EWT']);
    expect(zeilenQuellen('ez').map(q => q.pfad)).toEqual(['Daten.N']);
    expect(zeilenQuellen('ea').map(q => q.pfad)).toEqual(['Daten.EA']);
  });

  it.each(FORMULARE)('katalogFelder("%s") liefert Basis- und Zeilenquellen-Eintraege', formular => {
    const felder = katalogFelder(formular);

    expect(felder.length).toBeGreaterThan(0);
    expect(felder.map(f => f.pfad)).toContain('Jahr');
    expect(felder.map(f => f.pfad)).toContain('VorgabenU.Pers.Vorname');
    for (const quelle of zeilenQuellen(formular)) expect(felder.map(f => f.pfad)).toContain(quelle.pfad);
  });

  it('Bereitschaftszulage-Basisfelder gibt es nur bei "bereitschaft"', () => {
    const istBereitschaftszulage = (pfad: string) => pfad.startsWith('Bereitschaftszulage.');

    expect(katalogFelder('bereitschaft').filter(f => istBereitschaftszulage(f.pfad)).length).toBe(7);
    for (const formular of ['ewt', 'ez', 'ea'] as const)
      expect(katalogFelder(formular).some(f => istBereitschaftszulage(f.pfad))).toBe(false);
  });

  it.each(FORMULARE)(
    'katalogZeilenFelder("%s") liefert die Zeilenfelder dieses Formulars, keine der anderen',
    formular => {
      const eigene = katalogZeilenFelder(formular);
      expect(eigene.length).toBeGreaterThan(0);

      for (const anderes of FORMULARE.filter(f => f !== formular)) {
        const fremd = new Set(katalogZeilenFelder(anderes).map(f => f.pfad));
        // "Tag"/"Beginn"/"Ende"/"Dauer"/"Auftragsnummer" kommen absichtlich in mehreren Formularen vor; nur formular-eigene Felder pruefen.
        const eigenständig = eigene.filter(f => !['Tag', 'Beginn', 'Ende', 'Dauer', 'Auftragsnummer'].includes(f.pfad));
        for (const feld of eigenständig)
          expect(fremd.has(feld.pfad), `${feld.pfad} sollte nicht bei "${anderes}" sein`).toBe(false);
      }
    },
  );

  it('Bereitschaft trennt Zeitraum- und Einsatz-Felder ueber "quelle"', () => {
    const bz = katalogZeilenFelder('bereitschaft', 'Daten.BZ');
    const be = katalogZeilenFelder('bereitschaft', 'Daten.BE');

    expect(bz.map(f => f.pfad)).toEqual(expect.arrayContaining(['Beginn', 'Ende', 'Pause', 'Dauer']));
    expect(be.map(f => f.pfad)).toEqual(expect.arrayContaining(['Beginn', 'Ende', 'Tag', 'LRE', 'PrivatKm', 'Dauer']));
    expect(bz.find(f => f.pfad === 'Dauer')?.label).not.toBe(be.find(f => f.pfad === 'Dauer')?.label);
  });

  it('listenVorlagen und vorlagenKategorie liefern die Zulagen-Listen nur bei "ez"', () => {
    expect(listenVorlagen('ez').map(v => v.name)).toEqual(['erschwernis', 'leistung', 'gkr']);
    for (const formular of ['bereitschaft', 'ewt', 'ea'] as const) expect(listenVorlagen(formular)).toEqual([]);

    expect(['erschwernis', 'leistung', 'gkr', 'unbekannt'].map(vorlagenKategorie)).toEqual([
      ZulageCategory.Erschwerniszulage,
      ZulageCategory.LeistungspramieUndFahrentschaedigung,
      ZulageCategory.Ganzkoerperreinigung,
      undefined,
    ]);
  });

  it('Entfernbarkeit: ohne den Admin-Anteil von ea hat dessen Formular einen leeren Katalog, die anderen bleiben', async () => {
    const original = featureRegistry.metas.bind(featureRegistry);
    const spion = vi
      .spyOn(featureRegistry, 'metas')
      .mockImplementation(() => original().filter(meta => meta.id !== 'ea'));
    resetAdminFeatures();
    await ladeAdminFeatures();

    expect(zeilenQuellen('ea')).toEqual([]);
    expect(katalogZeilenFelder('ea')).toEqual([]);
    expect(zeilenQuellen('ez').map(q => q.pfad)).toEqual(['Daten.N']);

    spion.mockRestore();
    resetAdminFeatures();
    await ladeAdminFeatures();
  });

  it('Entfernbarkeit: Werteliste (LRE, ber) und Ja/Nein-Felder (ewt) kommen aus dem Katalog ihres Features', async () => {
    const original = featureRegistry.metas.bind(featureRegistry);
    const spion = vi
      .spyOn(featureRegistry, 'metas')
      .mockImplementation(() => original().filter(meta => meta.id !== 'ber' && meta.id !== 'ewt'));
    resetAdminFeatures();
    await ladeAdminFeatures();

    expect(werteAuswahl('LRE')).toEqual([]);
    expect(istBooleanFeld('Wohnung8bis14')).toBe(false);

    spion.mockRestore();
    resetAdminFeatures();
    await ladeAdminFeatures();
  });

  it('beispielWert findet formular- und quellenspezifische Beispiele', () => {
    expect(beispielWert('bereitschaft', 'Bereitschaftszulage.TarifBeamter', 0)).toBe('Tarifkraft');
    expect(beispielWert('ez', 'Bereitschaftszulage.TarifBeamter', 0)).toBeUndefined();
    expect(beispielWert('bereitschaft', 'Dauer', 0, 'Daten.BZ')).toBe(450);
    expect(beispielWert('bereitschaft', 'Dauer', 0, 'Daten.BE')).toBe(45);
    expect(beispielWert('ea', 'unbekannterPfad', 0)).toBeUndefined();
  });

  it('werteAuswahl/istBooleanFeld/gruppiere bleiben unveraendert', () => {
    expect(werteAuswahl('LRE')).toEqual(Object.values(LreType));
    expect(werteAuswahl('unbekannt')).toEqual([]);
    expect(istBooleanFeld('Wohnung8bis14')).toBe(true);
    expect(istBooleanFeld('Buchungstag')).toBe(false);

    const gruppen = gruppiere(katalogZeilenFelder('ewt'));
    expect(gruppen.map(([gruppe]) => gruppe)).toEqual(['Zeile', 'Berechnet']);
  });
});
