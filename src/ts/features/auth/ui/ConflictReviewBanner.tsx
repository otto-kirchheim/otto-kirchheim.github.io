import { DBButton } from '@db-ux/react-core-components';
import { type FC, useState } from 'react';

import dayjs from '@/shared/lib/date/configDayjs';

type Resource = { name: string; months: number[] };

type Props = {
  resources: Resource[];
  onSave: () => Promise<void>;
};

/**
 * Hinweisbanner nach einem Sync mit Konflikten: nennt die betroffenen Ressourcen samt Monaten
 * und bietet den Knopf zum Uebernehmen (Speichern), waehrend dessen der Knopf gesperrt ist.
 *
 * @param props - `resources` (Name plus Monate 1-12) und `onSave` (async Speichern).
 */
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

  /** Startet `onSave` und sperrt den Knopf bis zum Ende, auch bei Fehlern. */
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
        <DBButton
          className="u-min-w-120"
          variant="brand"
          size="small"
          type="button"
          disabled={saving}
          onClick={handleClick}
        >
          Übernehmen {saving && <span className="laedt ms-2" role="status" aria-hidden="true" />}
        </DBButton>
      </div>
    </div>
  );
};

export default ConflictReviewBanner;
