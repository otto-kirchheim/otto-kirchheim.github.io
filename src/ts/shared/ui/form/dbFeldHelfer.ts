import { useLayoutEffect, type CSSProperties, type Ref, type RefObject } from 'react';

/**
 * Fallback-Text fuer die Ungueltig-Meldung der DB-Formularfelder. Ohne `invalidMessage`
 * rendern `DBInput`/`DBSelect`/`DBSwitch` ihre eingebaute Entwickler-Notiz
 * `TODO: Add an invalidMessage` (`@db-ux/react-core-components`, `DEFAULT_INVALID_MESSAGE`),
 * die bei einem `:user-invalid`- oder `data-custom-validity="invalid"`-Feld sichtbar wird.
 * Aufrufer mit einer feldspezifischen Meldung reichen sie ueber die eigene Prop durch.
 */
export const STANDARD_UNGUELTIG_MELDUNG = 'Bitte überprüfe diese Eingabe.';

/**
 * Verbindet die Ref des Aufrufers mit einer eigenen Ref auf dasselbe Element (React kennt nur
 * eine `ref` pro Element).
 *
 * @typeParam T - Elementtyp der Refs.
 * @param refs - Callback- oder Objekt-Refs; `undefined` wird uebersprungen.
 * @returns Ref-Callback, der das Element an alle `refs` weitergibt.
 */
export function refZusammenfuehren<T>(...refs: (Ref<T> | undefined)[]): (element: T | null) => void {
  return (element: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === 'function') ref(element);
      else (ref as { current: T | null }).current = element;
    }
  };
}

/**
 * Setzt die `id` direkt nach dem Commit auf das Element.
 *
 * Die DB-UX-Komponenten vergeben ihre `id` erst in einem `useEffect` -- direkt nach
 * `mount()` steht sie also noch nicht im DOM. Der bestehende Code sucht seine Felder aber
 * synchron (`document.querySelector('#Tag')?.addEventListener(...)` unmittelbar nach
 * `showModal()`), und ein `?.` schluckt den Fehlschlag lautlos. `useLayoutEffect` laeuft
 * noch innerhalb des `flushSync`-Commits und schliesst diese Luecke.
 *
 * @typeParam T - Elementtyp der Ref.
 * @param ref - Ref auf das Feld-Element.
 * @param id - Gewuenschte `id`; ohne Angabe passiert nichts.
 */
export function useSofortigeId<T extends HTMLElement>(ref: RefObject<T | null>, id?: string): void {
  useLayoutEffect(() => {
    const element = ref.current;
    if (id && element && element.id !== id) element.id = id;
  }, [ref, id]);
}

/**
 * Setzt die Klasse direkt am Element (fuer `DBInput`/`DBSelect`, deren `className` nur an der
 * `.db-input`/`.db-select`-Huelle landet, nie am inneren `<input>`/`<select>`). Ersetzt den
 * gesamten `className` des Elements; ohne `klasse` wird er geleert.
 *
 * @typeParam T - Elementtyp der Ref.
 * @param ref - Ref auf das Feld-Element.
 * @param klasse - Zu setzende Klasse(n).
 */
export function useSofortigeKlasse<T extends HTMLElement>(ref: RefObject<T | null>, klasse?: string): void {
  useLayoutEffect(() => {
    const element = ref.current;
    if (element) element.className = klasse ?? '';
  }, [ref, klasse]);
}

/**
 * Uebertraegt Inline-Styles auf die `.db-input`/`.db-select`-Huelle, die `DBInput`/`DBSelect`
 * selbst rendern. Ueber deren Prop-API nicht erreichbar: ein `style`-Prop landet dort am
 * INNEREN Feld (siehe `useSofortigeKlasse`), nicht an der Huelle -- und ein zusaetzlicher
 * eigener Wrapper wuerde `.feldgruppe > .db-input`/`.db-select` (styles.scss) brechen, weil die
 * Huelle dann kein direktes Kind der Feldgruppe mehr waere. `ref.current.parentElement` ist
 * die Huelle selbst (`DBInput`/`DBSelect` rendern `<label>`+Feld als direkte Kinder davon).
 *
 * @typeParam T - Elementtyp der Ref.
 * @param ref - Ref auf das Feld-Element.
 * @param style - Inline-Styles fuer die Huelle; ohne Angabe passiert nichts.
 */
export function useSofortigeHuelleStyle<T extends HTMLElement>(ref: RefObject<T | null>, style?: CSSProperties): void {
  useLayoutEffect(() => {
    const huelle = ref.current?.parentElement;
    if (huelle && style) Object.assign(huelle.style, style);
  }, [ref, style]);
}
