import { useState } from 'react';
import { DBButton, DBFooter, DBFooterMeta } from '@db-ux/react-core-components';
import dayjs from '@/infrastructure/date/configDayjs';
import ImpressumDialog from './ImpressumDialog';

/**
 * Phase K1: erster React-Slice der App-Shell. Nutzt die mit `@db-ux/react-core-components`
 * 5.4.0 hinzugekommenen `DBFooter`/`DBFooterMeta` (Copyright-Zeile + Sekundaerinhalt,
 * `.db-footer-meta`-Styling deckt sich mit dem bisherigen Handbau) statt eigenem Markup.
 *
 * `footer .impressum { pointer-events: all }` (styles.scss:601) ist ein Nachfahren- kein
 * Kind-Selektor, weil `DBFooterMeta` den Button jetzt in `.db-footer-meta-content` verschachtelt
 * -- `pointer-events` vererbt sich, der Selektor muss die Verschachtelungstiefe nicht kennen.
 *
 * Phase K3: Impressum-Knopf setzt jetzt React-State statt `data-dialog-target` + `dbDialog.ts`;
 * `ImpressumDialog` sitzt hier als Geschwister, weil Ausloeser und Dialog denselben State
 * teilen (kein zweiter Mount-Punkt noetig).
 */
export default function AppFooter({ startYear = 2021 }: { startYear?: number }) {
  const [impressumOffen, setImpressumOffen] = useState(false);
  const currentYear = dayjs().year();
  const yearLabel = startYear < currentYear ? `${startYear}-${currentYear}` : `${currentYear}`;

  return (
    <>
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
      <ImpressumDialog open={impressumOffen} onClose={() => setImpressumOffen(false)} />
    </>
  );
}
