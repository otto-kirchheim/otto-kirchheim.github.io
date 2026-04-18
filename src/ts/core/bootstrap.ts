type AppStartTask = () => void | Promise<void>;

const appStartTasks: AppStartTask[] = [];
let bootstrapInitialized = false;
let bootstrapStarted = false;

export function registerAppStartTask(task: AppStartTask): void {
  appStartTasks.push(task);
}

async function runAppStartTasks(): Promise<void> {
  if (bootstrapStarted) return;
  bootstrapStarted = true;

  for (const task of appStartTasks) {
    await task();
  }
}

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
