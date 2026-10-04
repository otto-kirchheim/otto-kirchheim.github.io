import { createSnackBar } from '@/shared/ui/snackbar/CustomSnackbar';
import { setDisableButton } from '@/shared/ui/button-loading/buttonDisable';

/** Hoechstens so lange auf den neuen Service Worker warten, dann trotzdem neu laden. */
const SW_WARTEZEIT_MS = 20000;

/**
 * Holt die neue App-Version und laedt neu. `updateSW(true)` allein reicht nicht: mit `registerType: 'autoUpdate'` gibt es
 * meist keinen wartenden Service Worker, dann tut der Aufruf nichts und der Knopf wirkte wirkungslos (der Hinweis kommt
 * oft vom Backend per `426`, bevor der Service Worker die neue Version ueberhaupt kennt). Deshalb: Update anstossen, auf
 * einen neuen Worker kurz warten und in jedem Fall neu laden.
 *
 * @param updateSW - Service-Worker-Update aus `registerSW`.
 */
export async function aktualisiereApp(updateSW: (reloadPage?: boolean) => Promise<void>): Promise<void> {
  try {
    await updateSW(true);
  } catch {
    /* kein wartender Worker -- unten weiter */
  }
  const registrierung = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
  if (registrierung) {
    await registrierung.update().catch(() => undefined);
    const neu = registrierung.installing ?? registrierung.waiting;
    if (neu) {
      await new Promise<void>(fertig => {
        const zeit = setTimeout(fertig, SW_WARTEZEIT_MS);
        neu.addEventListener('statechange', () => {
          if (neu.state === 'activated') {
            clearTimeout(zeit);
            fertig();
          }
        });
      });
    }
  }
  location.reload();
}

/**
 * Meldet eine neue App-Version: sperrt die Buttons und zeigt eine dauerhafte Meldung mit Aktualisieren-Knopf.
 *
 * @param updateSW - Service-Worker-Update aus `registerSW`.
 */
export default function setVersionOutdated(updateSW: (reloadPage?: boolean) => Promise<void>): void {
  setDisableButton(true);
  createSnackBar({
    message: 'Eine neue App-Version ist verfügbar.',
    dismissible: false,
    status: 'warning',
    timeout: false,
    position: 'tc',
    fixed: true,
    actions: [{ text: 'Jetzt aktualisieren', function: () => void aktualisiereApp(updateSW), dismiss: false }],
  });
}
