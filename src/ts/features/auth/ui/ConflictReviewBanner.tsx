import { DBButton, DBNotification, DBStack } from '@db-ux/react-core-components';
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
    <div className="app-hinweise">
      <DBNotification
        semantic="informational"
        variant="standalone"
        role="status"
        ariaLive="polite"
        headline="Bitte erst Änderungen überprüfen und speichern"
      >
        {/* Knopf im Inhalt, nicht im `link`-Slot (dort setzt DB einen `.db-button` als Schliessen-Knopf oben rechts). */}
        <DBStack gap="x-small" alignment="start">
          <span>{text}</span>
          <DBButton variant="brand" size="small" type="button" disabled={saving} onClick={handleClick}>
            Übernehmen {saving && <span className="laedt" role="status" aria-hidden="true" />}
          </DBButton>
        </DBStack>
      </DBNotification>
    </div>
  );
};

export default ConflictReviewBanner;
