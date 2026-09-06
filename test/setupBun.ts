import { afterAll, afterEach, mock, setSystemTime, vi } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

// Unterdrückt Buns "error: <message>"-Stack-Trace für rejected Promises, die der
// Test-Code selbst via mockRejectedValue() erzeugt und anschließend korrekt abfängt.
// Echte Testfehler werden weiterhin vom Bun-Testrunner erkannt und gemeldet.
process.on('unhandledRejection', () => {});

type ViCompat = typeof vi & {
  hoisted?: <T>(factory: () => T) => T;
  advanceTimersByTimeAsync?: (ms: number) => Promise<void>;
  setSystemTime?: (now?: number | Date | string) => void;
};

GlobalRegistrator.register({
  url: 'http://localhost/',
});

const originalWindowAddEventListener = window.addEventListener.bind(window);
window.addEventListener = ((
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: AddEventListenerOptions | boolean,
) => {
  if (type === 'load') {
    return;
  }

  originalWindowAddEventListener(type, listener, options);
}) as typeof window.addEventListener;

const originalDocumentAddEventListener = document.addEventListener.bind(document);
document.addEventListener = ((
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: AddEventListenerOptions | boolean,
) => {
  if (type === 'DOMContentLoaded') {
    return;
  }

  originalDocumentAddEventListener(type, listener, options);
}) as typeof document.addEventListener;

const bunVi = vi as ViCompat;

if (typeof bunVi.hoisted !== 'function') {
  bunVi.hoisted = <T>(factory: () => T): T => factory();
}

if (typeof bunVi.advanceTimersByTimeAsync !== 'function') {
  bunVi.advanceTimersByTimeAsync = async (ms: number): Promise<void> => {
    bunVi.advanceTimersByTime(ms);
    await Promise.resolve();
  };
}

if (typeof bunVi.setSystemTime !== 'function') {
  bunVi.setSystemTime = (now?: number | Date | string): void => {
    setSystemTime(typeof now === 'string' ? new Date(now) : now);
  };
}

// happy-dom kennt `<dialog>.showModal()`/`close()` nicht. Die Dialoge der App (DB-Drawer ueber
// nativem `<dialog>`) brauchen im Test nur das `open`-Attribut -- Fokus-Falle und Top-Layer
// pruefen die Puppeteer-Smokes, nicht happy-dom.
HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
};

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(() => {
  mock.restore();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
  localStorage.clear();
  sessionStorage.clear();
});
