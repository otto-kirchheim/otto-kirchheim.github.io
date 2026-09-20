import getNebengeldDaten from './getNebengeldDaten';
import addNebengeldTag from './addNebengeldTag';
import type { CustomTable } from '@/infrastructure/table/CustomTable';
import type { IDatenN } from '@/types';
import persistTableData from '@/infrastructure/data/persistTableData';

/**
 * Schreibt die sichtbaren Zeilen der Neben-Tabelle in den Storage.
 *
 * @param ft - Neben-Tabelle.
 * @returns Zeilen, wie sie im Storage stehen.
 */
const persistNebengeldTableData = (ft: CustomTable<IDatenN>) => persistTableData('N', ft);

export { addNebengeldTag, getNebengeldDaten, persistNebengeldTableData };
export { default as applySelectOptions } from './applySelectOptions';
export { default as syncNebengeldTimesFromEwtRows } from './syncEwtToNeben';
export {
  formatNebengeldZulagen,
  getConfiguredNebenZulagen,
  hydrateNebengeldRow,
  hydrateNebengeldRows,
  normalizeNebengeldZulagen,
  readNebengeldZulagenFromForm,
  validateNebengeldZulagen,
} from './nebengeldZulagen';
