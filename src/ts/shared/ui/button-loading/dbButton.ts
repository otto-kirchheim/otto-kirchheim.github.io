/**
 * Look-Beschreibung fuer Tabellen-Fuss-Custom-Buttons (`CustomTableOptions.editing.customButton`,
 * siehe `customTableTypes.ts`); `CustomTableView.tsx` rendert sie als `<DBButton>`.
 */
export type DbButtonLook = {
  variant: 'brand' | 'filled' | 'outlined' | 'ghost';
  color?: 'critical' | 'informational' | 'successful' | 'warning';
  size?: 'small' | 'medium';
  width?: 'full';
  /** Layout-Klassen ohne DB-Entsprechung (z. B. `text-start`), von `utilities.scss` bedient. */
  rest?: string;
};
