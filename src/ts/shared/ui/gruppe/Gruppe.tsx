import { DBInfotext } from '@db-ux/react-core-components';
import type { CSSProperties, ReactNode } from 'react';

/**
 * Umrandete Feldgruppe mit kleiner Titelzeile in Grossbuchstaben (z. B. „Passwort“ im Registrieren-Dialog, „Neue
 * Zeitvariante“ im Arbeitszeit-Editor). Rahmen und Abstaende: `.gruppe` in `styles.scss`.
 *
 * @param props - `titel` (optional), Inhalt und optional eine weitere Klasse (z. B. fuer einen anderen Hintergrund), `id` und `style`
 *   (z. B. wenn ein Dialog die Gruppe per `display` ein- und ausblendet).
 */
export function Gruppe({
  titel,
  children,
  className,
  id,
  style,
}: {
  titel?: string;
  children: ReactNode;
  className?: string;
  id?: string;
  style?: CSSProperties;
}) {
  return (
    <div id={id} style={style} className={className ? `gruppe ${className}` : 'gruppe'}>
      {titel && (
        <DBInfotext showIcon={false} className="gruppe__titel">
          <strong>{titel}</strong>
        </DBInfotext>
      )}
      {children}
    </div>
  );
}
