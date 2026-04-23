import getNebengeldDaten from './getNebengeldDaten';
import addNebengeldTag from './addNebengeldTag';
import type { CustomTable } from '../../../class/CustomTable';
import type { IDatenN } from '../../../interfaces';
import persistTableData from '../../../infrastructure/data/persistTableData';

const persistNebengeldTableData = (ft: CustomTable<IDatenN>) => persistTableData('N', ft);

export { addNebengeldTag, getNebengeldDaten, persistNebengeldTableData };
export { default as syncNebengeldTimesFromEwtRows } from './syncEwtToNeben';
