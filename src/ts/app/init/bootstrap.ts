type AppStartTask = () => void | Promise<void>;

const appStartTasks: AppStartTask[] = [];
let bootstrapInitialized = false;
let bootstrapStarted = false;

/**
 * Reiht eine Aufgabe für den App-Start ein; die Aufgaben laufen in Registrierungsreihenfolge.
 *
 * @param task - Sync- oder Async-Funktion, die einmalig beim Start läuft.
 */
export function registerAppStartTask(task: AppStartTask): void {
  appStartTasks.push(task);
}

/**
 * Führt die registrierten Start-Aufgaben nacheinander aus (jede wird abgewartet).
 * Läuft nur einmal; weitere Aufrufe sind wirkungslos.
 */
async function runAppStartTasks(): Promise<void> {
  if (bootstrapStarted) return;
  bootstrapStarted = true;

  for (const task of appStartTasks) {
    await task();
  }
}

/**
 * Startet die App-Start-Aufgaben: sofort, wenn das Dokument schon geladen ist, sonst nach dem `load`-Event.
 * Mehrfache Aufrufe sind wirkungslos.
 */
export function initializeAppBootstrap(): void {
  if (bootstrapInitialized) return;
  bootstrapInitialized = true;

  if (document.readyState === 'complete') {
    void runAppStartTasks();
    return;
  }

  window.addEventListener('load', () => {
    void runAppStartTasks();
  });
}
