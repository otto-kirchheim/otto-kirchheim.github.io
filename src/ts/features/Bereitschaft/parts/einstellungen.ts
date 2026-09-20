import type { FeatureParts } from '@/core/hooks';
import BereitschaftAbschnitt from '../components/BereitschaftEinstellungenAbschnitt';
import { CustomTable } from '@/infrastructure/table/CustomTable';
import type { CustomHTMLTableElement, IVorgabenUvorgabenB } from '@/types';
import { default as tableToArray } from '@/infrastructure/data/tableToArray';
import generateEingabeTabelleEinstellungenVorgabenB from '@/features/Einstellungen/utils/generateEingabeTabelleEinstellungenVorgabenB';
import saveTableDataVorgabenU from '@/features/Einstellungen/utils/saveTableDataVorgabenU';
import { BereitschaftsEinsatzZeiträume } from '../utils/constants';

/**
 * Einstellungen-Slot der Bereitschaft: Abschnitt mit den Einsatzzeiträumen (`VorgabenB`, Tabelle `#tableVE`).
 * Ohne gespeicherte `VorgabenB` gelten die Standard-Einsatzzeiträume.
 */
const einstellungen: FeatureParts['einstellungen'] = {
  sections: [{ id: 'collapseThree', titel: 'Bereitschaft', order: 40, Component: BereitschaftAbschnitt }],

  /**
   * Laedt die Einsatzzeiträume in die Tabelle und uebernimmt sie in `VorgabenU`.
   *
   * @param vorgabenU - Benutzer-Vorgaben.
   * @throws {Error} Wenn `#tableVE` fehlt.
   */
  read(vorgabenU) {
    const VorgabenB = vorgabenU.VorgabenB ?? BereitschaftsEinsatzZeiträume;

    const table = document.querySelector<CustomHTMLTableElement<IVorgabenUvorgabenB>>('#tableVE');
    if (!table) throw new Error('Tabelle nicht gefunden');
    const ftVE = table.instance;

    if (ftVE instanceof CustomTable) {
      // rows.load() ist synchron (siehe Rows.ts) -- saveTableDataVorgabenU() liest danach
      // garantiert den frisch geladenen State, kein Race moeglich.
      ftVE.rows.load([...Object.values(VorgabenB)]);
      saveTableDataVorgabenU(ftVE);
    } else generateEingabeTabelleEinstellungenVorgabenB(VorgabenB);
  },

  collect: () => ({
    VorgabenB: Object.fromEntries(tableToArray('tableVE').entries()) as { [key: string]: IVorgabenUvorgabenB },
  }),
};

export default einstellungen;
