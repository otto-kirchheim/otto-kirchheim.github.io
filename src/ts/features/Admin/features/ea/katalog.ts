import type { FeatureKatalog } from '../../components/FormularEditor/katalogTypen';
import { tag } from '../../components/FormularEditor/katalogTypen';

/** Katalog-Beitrag des Entgeltausgleichs (Formular `ea`): Rohfelder je Tag, keine Ableitung. */
const katalog: FeatureKatalog = {
  zeilenFelder: [
    { pfad: 'Tag', label: 'Tag', gruppe: 'Zeile', format: 'datum', beispiel: i => tag(i) },
    { pfad: 'Dauer', label: 'Dauer (HH:mm)', gruppe: 'Zeile', beispiel: '08:15' },
    { pfad: 'Taetigkeit', label: 'Tätigkeit (Tag)', gruppe: 'Zeile', beispiel: 'Teamleiter' },
    { pfad: 'Entgeltgruppe', label: 'Entgeltgruppe (Tag)', gruppe: 'Zeile', beispiel: '104' },
  ],
  zeilenQuellen: [{ pfad: 'Daten.EA', label: 'Entgeltausgleich-Einträge' }],
};

export default katalog;
