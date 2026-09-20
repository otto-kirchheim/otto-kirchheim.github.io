import { useState } from 'react';
import { DBButton, DBFooter, DBFooterMeta } from '@db-ux/react-core-components';
import dayjs from '@/infrastructure/date/configDayjs';
import ImpressumDialog from './ImpressumDialog';

/**
 * Fusszeile der App-Shell: Copyright-Zeile mit Version (`DBFooter`/`DBFooterMeta`) und
 * Impressum-Knopf. `ImpressumDialog` sitzt als Geschwister, weil Ausloeser und Dialog denselben
 * State teilen.
 *
 * `.app-footer .impressum { pointer-events: all }` (styles.scss) ist ein Nachfahren- kein
 * Kind-Selektor, weil `DBFooterMeta` den Button in `.db-footer-meta-content` verschachtelt.
 *
 * @param props - `startYear`: erstes Jahr der Copyright-Angabe (Standard 2021).
 */
export default function AppFooter({ startYear = 2021 }: { startYear?: number }) {
  const [impressumOffen, setImpressumOffen] = useState(false);
  const currentYear = dayjs().year();
  const yearLabel = startYear < currentYear ? `${startYear}-${currentYear}` : `${currentYear}`;

  return (
    <>
      <ImpressumDialog open={impressumOffen} onClose={() => setImpressumOffen(false)} />
      <DBFooter className="app-footer">
        <DBFooterMeta copyright={`${yearLabel} Jan Otto | v${import.meta.env.APP_VERSION}`}>
          <DBButton
            type="button"
            className="impressum"
            variant="outlined"
            size="small"
            onClick={() => setImpressumOffen(true)}
          >
            Impressum
          </DBButton>
        </DBFooterMeta>
      </DBFooter>
    </>
  );
}
