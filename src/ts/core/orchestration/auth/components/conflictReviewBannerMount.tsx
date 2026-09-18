import { mount, unmount } from '@/infrastructure/ui';
import ConflictReviewBanner from './ConflictReviewBanner';

export function hideConflictReviewBanner(container: HTMLElement): void {
  unmount(container);
}

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
