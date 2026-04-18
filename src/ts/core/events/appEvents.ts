type Listener = () => void;

const listeners: Listener[] = [];

export function publishDataChanged(): void {
  listeners.forEach(fn => fn());
}

export function onDataChanged(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}
