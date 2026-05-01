import submitBereitschaftsEinsatz from './submitBereitschaftsEinsatz';
import applyBereitschaftsVorgabe from './applyBereitschaftsVorgabe';
import calculateBereitschaftsZeiten from './calculateBereitschaftsZeiten';
import submitBereitschaftsZeiten from './submitBereitschaftsZeiten';
import getBereitschaftsEinsatzDaten from './getBereitschaftsEinsatzDaten';
import getBereitschaftsZeitraumDaten from './getBereitschaftsZeitraumDaten';
import updateBereitschaftsDatum from './updateBereitschaftsDatum';
import toggleBereitschaftsEigeneWerte from './toggleBereitschaftsEigeneWerte';
import hideBereitschaftsNachtfelder from './hideBereitschaftsNachtfelder';
import isSameBereitschaftsEinsatz from './isSameBereitschaftsEinsatz';
import type { CustomTable } from '@/infrastructure/table/CustomTable';
import type { IDatenBE, IDatenBZ } from '@/types';
import persistTableData from '@/infrastructure/data/persistTableData';

const persistBereitschaftsZeitraumTableData = (ft: CustomTable<IDatenBZ>) => persistTableData('BZ', ft);
const persistBereitschaftsEinsatzTableData = (ft: CustomTable<IDatenBE>) => persistTableData('BE', ft);

export {
  submitBereitschaftsEinsatz,
  applyBereitschaftsVorgabe,
  calculateBereitschaftsZeiten,
  submitBereitschaftsZeiten,
  getBereitschaftsEinsatzDaten,
  getBereitschaftsZeitraumDaten,
  updateBereitschaftsDatum,
  toggleBereitschaftsEigeneWerte,
  hideBereitschaftsNachtfelder,
  isSameBereitschaftsEinsatz,
  persistBereitschaftsEinsatzTableData,
  persistBereitschaftsZeitraumTableData,
};
