import { useEffect, useState } from 'react';

/** Reaktiver `window.matchMedia`-Wert -- reagiert auf `resize` UND `matchMedia`-`change`. */
export default function useMediaQuery(query: string): boolean {
  const [passt, setPasst] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const aktualisieren = (): void => setPasst(mql.matches);
    aktualisieren();
    mql.addEventListener('change', aktualisieren);
    return () => mql.removeEventListener('change', aktualisieren);
  }, [query]);

  return passt;
}
