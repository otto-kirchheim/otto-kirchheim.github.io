import { DBInfotext } from '@db-ux/react-core-components';
import type { ReactNode } from 'react';

/**
 * Umrandete Feldgruppe mit kleiner Titelzeile in Grossbuchstaben (z. B. „Passwort“ im Registrieren-Dialog, „Neue
 * Zeitvariante“ im Arbeitszeit-Editor). Rahmen und Abstaende: `.gruppe` in `styles.scss`.
 *
 * @param props - `titel`, Inhalt und optional eine weitere Klasse (z. B. fuer einen anderen Hintergrund).
 */
export function Gruppe({ titel, children, className }: { titel: string; children: ReactNode; className?: string }) {
  return (
    <div className={className ? `gruppe ${className}` : 'gruppe'}>
      <DBInfotext showIcon={false} className="gruppe__titel">
        <strong>{titel}</strong>
      </DBInfotext>
      {children}
    </div>
  );
}
