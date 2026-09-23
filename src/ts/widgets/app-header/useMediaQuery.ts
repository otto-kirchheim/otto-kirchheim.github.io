import { useEffect, useState } from 'react';

/**
 * Reaktiver `window.matchMedia`-Wert; aktualisiert sich ueber das `change`-Event der MediaQueryList.
 *
 * @param query - Media-Query, z. B. `(min-width: 64em)`.
 * @returns `true`, solange die Query zutrifft.
 */
export default function useMediaQuery(query: string): boolean {
  const [passt, setPasst] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    /** Uebernimmt den aktuellen Treffer der Query in den State. */
    const aktualisieren = (): void => setPasst(mql.matches);
    aktualisieren();
    mql.addEventListener('change', aktualisieren);
    return () => mql.removeEventListener('change', aktualisieren);
  }, [query]);

  return passt;
}
