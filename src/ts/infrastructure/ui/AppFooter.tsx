import { DBButton } from '@db-ux/react-core-components';
import dayjs from '@/infrastructure/date/configDayjs';

/**
 * Phase K1: erster React-Slice der App-Shell. `footer { pointer-events: none }` +
 * `footer > .impressum { pointer-events: all }` (styles.scss) verlangt, dass der Button
 * DIREKTES Kind von `<footer>` bleibt -- kein zusaetzlicher Wrapper.
 *
 * Der Impressum-Knopf bleibt bewusst `data-dialog-target="impressum"`: der Dialog selbst ist
 * noch der Vanilla-`dbDialog.ts`-Mechanismus (`initStatischeDialoge`), der per Delegation auf
 * `document` lauscht -- das funktioniert unabhaengig davon, ob der Ausloeser nativ oder React
 * ist. Umstellung auf React-State folgt in K3.
 */
export default function AppFooter({ startYear = 2021 }: { startYear?: number }) {
  const currentYear = dayjs().year();
  const yearLabel = startYear < currentYear ? `${startYear}-${currentYear}` : `${currentYear}`;

  return (
    <footer className="app-footer bg-body-tertiary border-top px-3 py-2 d-flex justify-content-between align-items-center">
      <span className="text-body-secondary small">
        &copy; {yearLabel} Jan Otto | v{import.meta.env.APP_VERSION}
      </span>
      <DBButton type="button" className="impressum" variant="outlined" size="small" data-dialog-target="impressum">
        Impressum
      </DBButton>
    </footer>
  );
}
