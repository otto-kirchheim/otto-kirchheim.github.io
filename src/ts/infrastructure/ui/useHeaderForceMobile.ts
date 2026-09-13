import { useEffect, useState } from 'react';

/**
 * `DBHeader`s eigene Mobil/Desktop-Weiche ist eine CSS-Media-Query bei `min-width: 64em`
 * (1024px) -- unabhaengig von `data-density`, denn `em` in Media Queries bezieht sich auf die
 * Browser-Standardschriftgroesse, nicht auf `:root`s tatsaechliche `font-size`. Bei
 * `data-density="regular"` (16px-Wurzel statt `functional`s 14px) braucht die volle
 * Hauptnavigation (Marke + Bereitschaft/EWT/Nebenbezuege/Entgeltausgleich/Berechnung +
 * Einstellungen/Admin/Theme-Switcher + Login-Knopf) mehr Platz als bei 1024px zur Verfuegung
 * steht -- ohne Eingriff wird der rechte Teil der Kopfzeile abgeschnitten (Puppeteer gemessen,
 * 2026-09-13: erst ab 1215px passt alles verlustfrei in eine Zeile, mit voller Navigation --
 * eingeloggt, alle Tabs aktiviert, Admin-Rolle).
 *
 * `forceMobile` (offizieller `DBHeader`-Prop) schliesst diese Luecke: unterhalb der
 * tatsaechlich benoetigten Breite bleibt die Burger-Navigation erzwungen, obwohl der Viewport
 * laut `DBHeader`s eigener 64em-Weiche schon "Desktop" waere.
 *
 * Bei kuenftigen Aenderungen an den Hauptnav-Eintraegen (mehr/weniger/laengere Eintraege) den
 * Schwellwert per Puppeteer neu vermessen (Bisektion zwischen 1024px und dem Wert, ab dem
 * `.db-header-navigation-bar`s `scrollWidth` nicht mehr ueber `clientWidth` hinausragt --
 * mit vollstaendig sichtbarer Navigation, sonst ist die Messung zu niedrig).
 */
const MIN_DESKTOP_WIDTH_PX: Record<string, number> = {
  functional: 1024, // deckt sich mit DBHeaders eigener 64em-Weiche, kein Nachhelfen noetig
  regular: 1215,
};

export default function useHeaderForceMobile(): true | undefined {
  const [erzwingen, setErzwingen] = useState<true | undefined>(undefined);

  useEffect(() => {
    const dichte = document.documentElement.dataset.density ?? 'regular';
    const schwelle = MIN_DESKTOP_WIDTH_PX[dichte] ?? MIN_DESKTOP_WIDTH_PX.regular;

    const pruefen = (): void => setErzwingen(window.innerWidth < schwelle ? true : undefined);
    pruefen();

    window.addEventListener('resize', pruefen);
    return () => window.removeEventListener('resize', pruefen);
  }, []);

  return erzwingen;
}
