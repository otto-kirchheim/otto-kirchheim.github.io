import { createElement, type ReactNode } from 'react';
import { mount, unmount } from '@/infrastructure/ui/reactRoot';

/**
 * Preact-kompatible Render-Signatur fuer die Tests: `render(<X />, container)` bzw.
 * `render(null, container)` zum Abhaengen. Nutzt bewusst dieselben `mount`/`unmount`-
 * Helfer wie die App, damit die Tests den echten Root-Cache mitpruefen.
 */
export function render(node: ReactNode, container: Element): void {
  if (node === null || node === undefined) unmount(container);
  else mount(container, node);
}

/**
 * Ersatz fuer `MyInput` in Komponententests. React bricht ab, wenn ein `<input>` `children`
 * bekommt, und warnt bei unbekannten DOM-Props -- Preact hat beides stillschweigend geschluckt.
 */
export function inputMock(props: Record<string, unknown>): ReactNode {
  const {
    children: _children,
    divClass: _divClass,
    popover: _popover,
    invalidFeedbackId: _invalidFeedbackId,
    invalidFeedbackText: _invalidFeedbackText,
    dataZulageInputCode,
    myRef,
    value,
    onChange,
    ...rest
  } = props;
  // Wie `MyInput`: ohne Handler ist `value` eine Vorbelegung, sonst ein gesteuertes Feld.
  const wert = onChange ? { value, onChange } : { defaultValue: value };
  return createElement('input', {
    ...rest,
    ...wert,
    ref: myRef,
    'data-zulage-input-code': dataZulageInputCode,
  });
}

/**
 * Schaltet eine React-Checkbox. React haengt `onChange`/`onInput` von Checkboxen am
 * `click`-Ereignis auf; ein direkt gesetztes `checked` plus `change`-Event erreicht den
 * Handler nicht (unter Preact ging beides).
 */
export function klickeCheckbox(el: HTMLInputElement, checked: boolean): void {
  if (el.checked !== checked) el.click();
}

/**
 * Setzt den Wert eines Formularfelds so, dass React die Aenderung bemerkt. React merkt sich
 * den zuletzt gerenderten Wert am DOM-Knoten; ein direktes `el.value = x` aktualisiert diesen
 * Tracker mit und der anschliessende `input`-Event loest `onChange` dann nicht mehr aus.
 */
export function setzeWert(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, wert: string): void {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, wert);
  else el.value = wert;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Ersatz fuer die Modal-Huellen (`MyFormModal`, `MyModalBody`, ...) in Komponententests:
 * rendert nur die Kinder in ein `<div>`. React warnt sonst ueber jede Komponenten-Prop,
 * die als DOM-Attribut landet (`myRef`, `submitText`, `helpContext`, ...).
 */
export function huelleMock(props: Record<string, unknown>): ReactNode {
  const kinder = props.children;
  // Als Array wuerde React je Kind einen `key` verlangen; einzelne Argumente bekommen
  // stattdessen ihre Position als impliziten Schluessel.
  return createElement('div', { ref: props.myRef as never }, ...(Array.isArray(kinder) ? kinder : [kinder]));
}
