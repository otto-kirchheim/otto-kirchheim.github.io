/**
 * `actions2` (Einstellungen/Admin/Theme-Schalter in `AppHeader.tsx`) landet auf Mobile im
 * `DBDrawerFooter` -- AUSSERHALB von `.db-control-panel-mobile-drawer-scroll-container`, dem
 * einzigen Bereich, den `DBControlPanelMobile`s eingebauter Auto-Close-Klick-Handler
 * (`isEventTargetNavigationItem`/`handleNavigationItemClick`) beobachtet. Ein Klick im Footer
 * schliesst die Schublade deshalb NICHT von selbst. `DBControlPanelMobile` bietet dafuer auch
 * keinen `open`/`onToggle`-Prop von aussen -- der native `<dialog class="db-drawer">`
 * (`DBDrawer`s Wurzelelement) wird deshalb direkt per `HTMLDialogElement.close()` geschlossen.
 *
 * Reiner `dialog`-Tag-Selektor (kein `.db-control-panel-mobile-drawer`): `DBDrawer` reicht den
 * per `className`-Prop uebergebenen Klassennamen NICHT an sein eigenes `<dialog>`-Wurzelelement
 * durch (Puppeteer-verifiziert -- `<dialog class="db-drawer">` traegt nur diese eine, feste
 * Klasse). `closest('dialog')` ist trotzdem eindeutig: auf Desktop hat der Klick-Ursprung
 * keinen `<dialog>`-Vorfahren (No-op), auf Mobile genau den umschliessenden Drawer.
 *
 * @param el - Element, in dem geklickt wurde (z. B. `event.currentTarget`).
 */
export default function schliesseMobilenDrawer(el: Element): void {
  el.closest<HTMLDialogElement>('dialog')?.close();
}
