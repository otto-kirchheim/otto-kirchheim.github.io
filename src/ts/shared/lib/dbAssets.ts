/**
 * Schalter fuer die DB-Markenassets (gesetzt in `vite.base-config.ts` aus `DB_ASSETS`). Aus: freie Alternativen statt
 * DB-Schriften/-Icons, im PDF nur die Standard-Schriften. In Bun-Tests ist der Wert die Prozess-Env (ungesetzt = aus).
 */
const roh: unknown = import.meta.env.DB_ASSETS;
export const DB_ASSETS: boolean = roh === true || roh === '1' || roh === 'true';
