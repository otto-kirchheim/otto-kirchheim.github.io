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
    <div className="container-fluid px-2 px-md-3 mt-1">
      <div className="alert alert-info border-info-subtle shadow-sm mb-0" role="status" aria-live="polite">
        <div className="d-flex flex-column flex-sm-row align-items-start justify-content-between gap-2 gap-sm-3">
          <div className="d-flex align-items-start gap-2">
            <span className="db-icon mt-1 mt-sm-0 flex-shrink-0" data-icon="pen" />
            <div>
              <div className="fw-semibold">Bitte erst Änderungen überprüfen und speichern</div>
              <div className="small mt-1">{text}</div>
            </div>
          </div>
          <div className="d-flex justify-content-center align-self-stretch align-self-sm-auto gap-2 flex-shrink-0">
            <button
              className="btn btn-primary btn-sm u-min-w-120"
              type="button"
              disabled={saving}
              onClick={handleClick}
            >
              Übernehmen{' '}
              {saving && (
                <span className="spinner-border spinner-border-sm ms-2" role="status" aria-hidden="true"></span>
              )}
            </button>
          </div>
        </div>
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
