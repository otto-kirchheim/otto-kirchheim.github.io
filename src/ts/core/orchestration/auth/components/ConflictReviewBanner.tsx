import { type FC, useState } from 'react';
import { mount, unmount } from '@/infrastructure/ui';

import dayjs from '@/infrastructure/date/configDayjs';

type Resource = { name: string; months: number[] };

type Props = {
  resources: Resource[];
  onSave: () => Promise<void>;
};

const ConflictReviewBanner: FC<Props> = ({ resources, onSave }) => {
  const [saving, setSaving] = useState(false);

  const text = `Betroffene Bereiche: ${resources
    .map(({ name, months }) =>
      months.length > 0
        ? `${name} (${months
            .map(m =>
              dayjs()
                .month(m - 1)
                .format('MMM'),
            )
            .join(', ')})`
        : name,
    )
    .join(', ')}`;

  const handleClick = async () => {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="breit px-2 px-md-3 mt-1">
      {/* Der Knopf steht als direktes Kind im `close`-Bereich des Meldungsrasters -- innerhalb
          des Inhalts wuerde DB die Spalte trotzdem freihalten und der Text bliebe schmal. */}
      <div className="db-notification shadow-sm mb-0" data-semantic="informational" role="status" aria-live="polite">
        <span data-area="content">
          <span className="fw-semibold d-block">Bitte erst Änderungen überprüfen und speichern</span>
          <span className="small">{text}</span>
        </span>
        <button
          className="db-button u-min-w-120"
          data-variant="brand"
          data-size="small"
          type="button"
          disabled={saving}
          onClick={handleClick}
        >
          Übernehmen {saving && <span className="laedt ms-2" role="status" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
};

export default ConflictReviewBanner;

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
