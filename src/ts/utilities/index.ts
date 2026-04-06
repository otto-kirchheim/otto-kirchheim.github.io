import initializeColorModeToggler from './BSColorToggler';
import DatenSortieren from './DatenSortieren';
import { FetchRetry, getServerUrl } from './FetchRetry';
import Storage from './Storage';
import { abortController } from './abortController';
import {
  GERMAN_ADDRESS_FORMAT_HINT,
  PERS_FIELD_LABELS,
  isValidGermanAddress,
  normalizeGermanAddress,
  setupGermanAddressValidation,
  setupPersValidation,
  validateGermanAddressInput,
  validatePersInput,
} from './addressValidation';
import {
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
} from './autoSave';
import buttonDisable from './buttonDisable';
import checkMaxTag from './checkMaxTag';
import clearLoading from './clearLoading';
import compareVersion from './compareVersion';
import { isAdmin, getUserCookie } from './decodeAccessToken';
import getDurationFromTime from './getDurationFromTime';
import {
  filterByMonat,
  getMonatFromBE,
  getMonatFromBZ,
  getMonatFromEWT,
  getMonatFromEWTBuchungstag,
  getMonatFromN,
  isEwtInMonat,
} from './getMonatFromItem';
import saveDaten from './saveDaten';
import normalizeResourceRows from './normalizeResourceRows';
import { getPasskeyErrorMessage, guessPasskeyDeviceName, registerPasskeyWithResult } from './passkeys';
import setDisableButton from './setDisableButton';
import setLoading from './setLoading';
import setOffline from './setOffline';
import storageAvailable from './storageAvailable';
import tableToArray from './tableToArray';
import tokenErneuern from './tokenErneuern';
import updateTabVisibility, { hideAllFeatureTabs } from './updateTabVisibility';

export {
  DatenSortieren,
  FetchRetry,
  GERMAN_ADDRESS_FORMAT_HINT,
  PERS_FIELD_LABELS,
  Storage,
  abortController,
  buttonDisable,
  cancelAllPending,
  checkMaxTag,
  clearLoading,
  compareVersion,
  createOnChangeHandler,
  flushAll,
  filterByMonat,
  getAutoSaveDelay,
  getDurationFromTime,
  getMonatFromBE,
  getMonatFromBZ,
  getMonatFromEWT,
  getMonatFromEWTBuchungstag,
  getMonatFromN,
  getPasskeyErrorMessage,
  getResourceStatus,
  getServerUrl,
  getUserCookie,
  guessPasskeyDeviceName,
  initializeColorModeToggler,
  isAdmin,
  isEwtInMonat,
  isValidGermanAddress,
  isAutoSaveEnabled,
  markResourceSaved,
  normalizeGermanAddress,
  normalizeResourceRows,
  onAutoSaveStatus,
  registerPasskeyWithResult,
  saveDaten,
  scheduleAutoSave,
  setAutoSaveDelay,
  setAutoSaveEnabled,
  setDisableButton,
  setupGermanAddressValidation,
  setupPersValidation,
  setLoading,
  setOffline,
  storageAvailable,
  tableToArray,
  tokenErneuern,
  updateTabVisibility,
  validateGermanAddressInput,
  validatePersInput,
  hideAllFeatureTabs,
};
