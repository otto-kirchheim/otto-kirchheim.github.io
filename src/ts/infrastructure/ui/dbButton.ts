/**
 * Look-Beschreibung fuer Tabellen-Fuss-Custom-Buttons (`CustomTableOptions.editing.customButton`).
 *
 * Die Vanilla-DOM-Bruecke (`erzeugeDbButton`/`erzeugeDbButtonAusLook`/`buttonLook`), die diesen
 * Typ frueher fuer `infrastructure/table/customTableRender.ts` in echte DOM-Buttons uebersetzte,
 * ist mit Phase M (CustomTable-Rendering nach React) entfallen -- `CustomTableView.tsx` rendert
 * `customButton`-Eintraege direkt als `<DBButton>`. Der Typ bleibt, weil `customTableTypes.ts`
 * ihn weiterhin fuer die `editing.customButton`-Option braucht.
 */
export type DbButtonLook = {
  variant: 'brand' | 'filled' | 'outlined' | 'ghost';
  color?: 'critical' | 'informational' | 'successful' | 'warning';
  size?: 'small' | 'medium';
  width?: 'full';
  /** Layout-Klassen ohne DB-Entsprechung (z. B. `text-start`), von `utilities.scss` bedient. */
  rest?: string;
};
