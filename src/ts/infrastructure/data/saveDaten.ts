import Storage from '../storage/Storage';
import buttonDisable from '../ui/buttonDisable';
import clearLoading from '../ui/clearLoading';
import setLoading from '../ui/setLoading';
import { createSnackBar } from '../ui/CustomSnackbar';
import type { IVorgabenU, TResourceKey } from '@/types';
import {
  applyAutoSaveSettings,
  flushAll,
  getResourceStatus,
  hasPendingTableChanges,
  markResourceSaved,
} from '../autoSave/autoSave';
import { profileApi } from '../api/apiService';
import dayjs from '../date/configDayjs';
import { invokeHook } from '@/core/hooks';
import { syncFeatureTabs } from '@/core/orchestration/syncFeatureTabs';

function hasLocalSettingsChanges(previousData: IVorgabenU, nextData: IVorgabenU): boolean {
  return JSON.stringify(previousData) !== JSON.stringify(nextData);
}

function getButtonResources(buttonId: string): TResourceKey[] {
  switch (buttonId) {
    case 'btnSaveB':
      return ['BZ', 'BE'];
    case 'btnSaveE':
      return ['EWT'];
    case 'btnSaveN':
      return ['N'];
    case 'btnSaveEA':
      return ['EA'];
    case 'btnSaveEinstellungen':
      return ['settings'];
    default:
      return ['BZ', 'BE', 'EWT', 'N', 'EA', 'settings'];
  }
}

/**
 * Speichert alle Daten: Tabellen-Änderungen via AutoSave-Flush + Einstellungen via API.
 * Ersetzt den alten einzelnen POST /saveData Call.
 */

export default async function saveDaten(button: HTMLButtonElement | null): Promise<void> {
  if (button === null) return;

  if (!navigator.onLine) {
    createSnackBar({
      message: 'Speichern nicht möglich – keine Internetverbindung',
      status: 'error',
      timeout: 3000,
      fixed: true,
    });
    return;
  }

  setLoading(button.id);
  buttonDisable(true);

  try {
    const previousUserData = Storage.get<IVorgabenU>('VorgabenU', { check: true });
    const buttonResources = getButtonResources(button.id);

    // 1. Einstellungen aus dem Formular sammeln – entkoppelt vom Tabellen-Flush:
    //    Ein Validierungsfehler (saveEinstellungen zeigt bereits eine feldgenaue Snackbar)
    //    darf das Speichern der Tabellendaten nicht blockieren.
    let userData: IVorgabenU | null = null;
    try {
      userData = invokeHook('pre-save:settings') ?? null;
      if (!userData) throw new Error('pre-save:settings hook not registered');
      Storage.set('VorgabenU', userData);
      applyAutoSaveSettings(userData.Einstellungen);
    } catch (err: unknown) {
      console.error('Einstellungen sammeln fehlgeschlagen:', err instanceof Error ? err.message : String(err));
    }

    const settingsStatus = getResourceStatus('settings').status;
    const settingsNeedsSync =
      userData !== null &&
      (hasLocalSettingsChanges(previousUserData, userData) ||
        settingsStatus === 'pending' ||
        settingsStatus === 'error');
    const shouldMarkSavedAfterFlush: Record<TResourceKey, boolean> = {
      BZ: buttonResources.includes('BZ') && hasPendingTableChanges('BZ', true),
      BE: buttonResources.includes('BE') && hasPendingTableChanges('BE', true),
      EWT: buttonResources.includes('EWT') && hasPendingTableChanges('EWT', true),
      N: buttonResources.includes('N') && hasPendingTableChanges('N', true),
      EA: buttonResources.includes('EA') && hasPendingTableChanges('EA', true),
      settings: settingsNeedsSync,
    };

    // 2. Alle ausstehenden Tabellen-Änderungen sofort senden – auch bei Einstellungs-Fehler
    await flushAll();

    // Bei Race-Condition: Falls ein Ressourcen-Status nach dem Flush schon wieder auf idle
    // gesetzt wurde, obwohl vorher Änderungen vorhanden waren, saved nachholen.
    for (const resource of buttonResources) {
      if (!shouldMarkSavedAfterFlush[resource]) continue;
      if (resource !== 'settings' && getResourceStatus(resource).status === 'idle') {
        markResourceSaved(resource);
      }
    }

    // 2b. Tab-Inhalt von Bereitschaft/EWT/Neben live an aktivierteTabs anpassen — erst jetzt, da die
    //     Tabellen-Daten durch flushAll() (oben) bereits sicher geflusht sind (sonst würde ein Unmount vor
    //     dem Flush die betroffene Tabelle aus dem DOM entfernen, bevor ihre Änderungen gesendet wurden).
    await syncFeatureTabs((userData ?? previousUserData).Einstellungen?.aktivierteTabs);

    // 3. Profil nur bei Änderungen speichern
    const profileResult = settingsNeedsSync && userData ? await profileApi.updateMyProfile(userData) : null;

    // 4. Server-normalisierte Profilwerte zurück in den lokalen Zustand übernehmen.
    if (profileResult?.updatedAt) {
      Storage.setWithTimestamp('VorgabenU', profileResult.data, dayjs(profileResult.updatedAt).valueOf());
    } else if (profileResult?.data) {
      Storage.set('VorgabenU', profileResult.data);
    }

    // 5. Settings-Resource als gespeichert markieren, sobald sie explizit synchronisiert wurde.
    if (settingsNeedsSync) markResourceSaved('settings');

    // 6. Erfolgsmeldung unterdrücken nur, wenn der Button ausschließlich Einstellungen betrifft
    //    UND diese fehlgeschlagen sind. Sonst wäre bei Tabellen-Buttons (btnSaveB/E/N) die
    //    feldgenaue Fehler-Snackbar aus saveEinstellungen die einzige Rückmeldung, obwohl die
    //    eigentlich angeforderten Tabellendaten erfolgreich gespeichert wurden.
    const settingsOnlyButton = buttonResources.length === 1 && buttonResources[0] === 'settings';
    if (!(settingsOnlyButton && userData === null)) {
      createSnackBar({
        message: `Speichern<br/>Daten gespeichert`,
        status: 'success',
        timeout: 3000,
        fixed: true,
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Speichern fehlgeschlagen:', msg);
    createSnackBar({
      message: `Speichern<br/>Es ist ein Fehler aufgetreten: ${msg}`,
      status: 'error',
      timeout: 3000,
      fixed: true,
    });
  } finally {
    clearLoading(button.id);
    buttonDisable(false);
  }
}
