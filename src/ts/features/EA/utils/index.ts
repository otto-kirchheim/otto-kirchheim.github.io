import getEaDaten from './getEaDaten';
import type { CustomTable } from '@/infrastructure/table/CustomTable';
import type { IDatenEA } from '@/types';
import persistTableData from '@/infrastructure/data/persistTableData';

/**
 * Schreibt die aktuellen EA-Tabellenzeilen per `persistTableData` in den Storage.
 *
 * @param ft - EA-Tabelle.
 */
const persistEaTableData = (ft: CustomTable<IDatenEA>) => persistTableData('EA', ft);

export { getEaDaten, persistEaTableData };
export { default as calculateEaDauerFromEwt } from './calculateEaDauerFromEwt';
export { default as syncEaDurationFromEwtRows } from './syncEwtToEa';
export { default as addEaTag } from './addEaTag';
export { TAETIGKEIT_VORSCHLAEGE } from './taetigkeitVorschlaege';
