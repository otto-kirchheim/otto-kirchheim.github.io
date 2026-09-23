import { mount, unmount } from '@/infrastructure/ui';
import ConflictReviewBanner from './ConflictReviewBanner';

/**
 * Entfernt das Konflikt-Hinweisbanner aus dem Container.
 *
 * @param container - Element, in das das Banner gemountet war.
 */
export function hideConflictReviewBanner(container: HTMLElement): void {
  unmount(container);
}

/**
 * Zeigt das Konflikt-Hinweisbanner im Container.
 *
 * @param container - Element, in das das Banner gemountet wird.
 * @param resources - Betroffene Ressourcen mit Monaten (1-12).
 * @param onSave - Async-Speichern; nach Abschluss wird das Banner entfernt.
 */
export function showConflictReviewBanner(
  container: HTMLElement,
  resources: { name: string; months: number[] }[],
  onSave: () => Promise<void>,
): void {
  mount(
    container,
    <ConflictReviewBanner
      resources={resources}
      onSave={async () => {
        await onSave();
        unmount(container);
      }}
    />,
  );
}
