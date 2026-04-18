/**
 * Compatibility barrel – re-exports from infrastructure/ so existing
 * `import … from '../utilities'` statements keep working.
 */

// --- data ---
export { confirmDeleteAllRows } from '../infrastructure/data/confirmDeleteAllRows';
export { default as DatenSortieren } from '../infrastructure/data/DatenSortieren';
export { default as saveDaten } from '../infrastructure/data/saveDaten';
export { default as normalizeResourceRows } from '../infrastructure/data/normalizeResourceRows';
export { default as tableToArray } from '../infrastructure/data/tableToArray';

// --- date ---
export { getStoredMonatJahr } from '../infrastructure/date/dateStorage';
export {
  filterByMonat,
  getMonatFromBE,
  getMonatFromBZ,
  getMonatFromEWT,
  getMonatFromEWTBuchungstag,
  getMonatFromN,
  isEwtInMonat,
} from '../infrastructure/date/getMonatFromItem';
export { default as getDurationFromTime } from '../infrastructure/date/getDurationFromTime';

// --- api ---
export { FetchRetry, getServerUrl } from '../infrastructure/api/FetchRetry';
export { abortController } from '../infrastructure/api/abortController';

// --- storage ---
export { default as Storage } from '../infrastructure/storage/Storage';
export { default as storageAvailable } from '../infrastructure/storage/storageAvailable';

// --- ui ---
export {
  ACT_AS_STATUS_EVENT,
  getActAsState,
  notifyActAsStateChanged,
  updateActAsBanner,
} from '../infrastructure/ui/actAsStatus';
export { default as buttonDisable } from '../infrastructure/ui/buttonDisable';
export { default as clearLoading } from '../infrastructure/ui/clearLoading';
export { default as setLoading } from '../infrastructure/ui/setLoading';
export { default as setDisableButton } from '../infrastructure/ui/setDisableButton';
export { default as setOffline } from '../infrastructure/ui/setOffline';
export { default as updateTabVisibility, hideAllFeatureTabs } from '../infrastructure/ui/updateTabVisibility';
export { default as initializeColorModeToggler } from '../infrastructure/ui/BSColorToggler';
export { rememberOriginalButtonContent, takeOriginalButtonContent } from '../infrastructure/ui/loadingButtonState';

// --- tokenManagement ---
export { isAdmin, getUserCookie } from '../infrastructure/tokenManagement/decodeAccessToken';
export { default as tokenErneuern, resetTokenState } from '../infrastructure/tokenManagement/tokenErneuern';
export {
  getPasskeyErrorMessage,
  guessPasskeyDeviceName,
  registerPasskeyWithResult,
} from '../infrastructure/tokenManagement/passkeys';

// --- validation ---
export {
  GERMAN_ADDRESS_FORMAT_HINT,
  PERS_FIELD_LABELS,
  isValidGermanAddress,
  normalizeGermanAddress,
  setupGermanAddressValidation,
  setupPersValidation,
  validateGermanAddressInput,
  validatePersInput,
} from '../infrastructure/validation/addressValidation';
export { default as checkMaxTag } from '../infrastructure/validation/checkMaxTag';
export { default as compareVersion } from '../infrastructure/validation/compareVersion';

// --- autoSave ---
export {
  cancelAllPending,
  createOnChangeHandler,
  flushAll,
  getAutoSaveDelay,
  getResourceStatus,
  isAutoSaveEnabled,
  markResourceSaved,
  onAutoSaveStatus,
  scheduleAutoSave,
  setAutoSaveDelay,
  setAutoSaveEnabled,
} from '../infrastructure/autoSave/autoSave';
