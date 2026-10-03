/**
 * Look-Beschreibung fuer Tabellen-Fuss-Custom-Buttons (`CustomTableOptions.editing.customButton`,
 * siehe `customTableTypes.ts`); `CustomTableView.tsx` rendert sie als `<DBButton>`.
 */
export type DbButtonLook = {
  variant: 'brand' | 'filled' | 'outlined' | 'ghost';
  color?: 'critical' | 'informational' | 'successful' | 'warning';
  size?: 'small' | 'medium';
  width?: 'full';
  /** Zusaetzliche Klassen ohne DB-Entsprechung (Layout), von `styles.scss`/`admin.scss` bedient. */
  rest?: string;
};
