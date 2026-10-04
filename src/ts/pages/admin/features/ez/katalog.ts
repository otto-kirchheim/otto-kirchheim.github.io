import {
  ZULAGEN_CATALOG,
  ZULAGEN_CATEGORY_MAX_SELECTIONS,
  ZulageCategory,
  type ListenGruppe,
} from '@otto-kirchheim/nebengeld-shared';
import type { FeatureKatalog, ListenVorlage } from '../../ui/FormularEditor/katalogTypen';
import { tag } from '../../ui/FormularEditor/katalogTypen';

/**
 * Baut die Listen-Gruppe `Zulagen` fuer eine Zulagen-Kategorie: die Codes und ihre Anzahl kommen aus dem
 * gemeinsamen Zulagen-Katalog. Ohne `beschriftungen` steht der Code selbst über der Spalte, wie auf dem Zettel.
 *
 * @param kategorie - Zulagen-Kategorie.
 * @returns Listen-Gruppe mit allen Codes der Kategorie als Auswahl.
 */
function zulagenGruppe(kategorie: ZulageCategory): ListenGruppe {
  const codes = ZULAGEN_CATALOG.filter(z => z.category === kategorie).map(z => z.code);
  return { quelle: 'Zulagen', schluessel: 'Typ', wert: 'Wert', auswahl: [...codes] };
}

const LISTEN_VORLAGEN: ListenVorlage[] = [
  {
    name: 'erschwernis',
    label: 'Erschwerniszulagen',
    plaetze: ZULAGEN_CATEGORY_MAX_SELECTIONS[ZulageCategory.Erschwerniszulage],
    gruppe: zulagenGruppe(ZulageCategory.Erschwerniszulage),
  },
  {
    name: 'leistung',
    label: 'Leistungsprämie / Fahrentschädigung',
    plaetze: ZULAGEN_CATEGORY_MAX_SELECTIONS[ZulageCategory.LeistungspramieUndFahrentschaedigung],
    gruppe: zulagenGruppe(ZulageCategory.LeistungspramieUndFahrentschaedigung),
  },
  {
    name: 'gkr',
    label: 'Ganzkörperreinigung',
    plaetze: ZULAGEN_CATEGORY_MAX_SELECTIONS[ZulageCategory.Ganzkoerperreinigung],
    gruppe: zulagenGruppe(ZulageCategory.Ganzkoerperreinigung),
  },
];

/** Katalog-Beitrag der Erschwerniszulagen (Formular `ez`): Rohfelder je Zeile plus die Zulagen-Listen-Vorlagen. */
const katalog: FeatureKatalog = {
  zeilenFelder: [
    { pfad: 'Tag', label: 'Tag', gruppe: 'Zeile', format: 'datum', beispiel: i => tag(i) },
    { pfad: 'Beginn', label: 'Beginn (HH:mm)', gruppe: 'Zeile', beispiel: '07:00' },
    { pfad: 'Ende', label: 'Ende (HH:mm)', gruppe: 'Zeile', beispiel: '15:45' },
    { pfad: 'Auftragsnummer', label: 'Auftragsnummer', gruppe: 'Zeile', beispiel: i => `1234567${23 + i}` },
    { pfad: 'Zulagen', label: 'Zulagen (Liste)', gruppe: 'Zeile', format: 'liste', beispiel: ['NZ', 'SoZ'] },
    // Vorberechnet (`ezAbgeleiteteWerte`): `Spalte` kann Beginn/Ende nicht wie `Feld.quellen` verketten.
    { pfad: 'Arbeitszeit', label: 'Arbeitszeit (HH:mm-HH:mm)', gruppe: 'Berechnet', beispiel: '07:00-15:45' },
  ],
  zeilenQuellen: [{ pfad: 'Daten.N', label: 'Nebengeld-Einträge' }],
  listenVorlagen: LISTEN_VORLAGEN,
  vorlagenKategorie: {
    erschwernis: ZulageCategory.Erschwerniszulage,
    leistung: ZulageCategory.LeistungspramieUndFahrentschaedigung,
    gkr: ZulageCategory.Ganzkoerperreinigung,
  },
};

export default katalog;
