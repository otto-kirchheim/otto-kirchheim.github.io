import { useLayoutEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import useSnackbars from './useSnackbars';
import SnackbarItem from './SnackbarItem';
import type { Tposition } from './snackbarStore';

const POSITION_CLASS: Record<Tposition, string> = {
  bl: 'CustomSnackbar-container--bottom-left',
  tl: 'CustomSnackbar-container--top-left',
  tr: 'CustomSnackbar-container--top-right',
  tc: 'CustomSnackbar-container--top-center',
  tm: 'CustomSnackbar-container--top-center',
  bc: 'CustomSnackbar-container--bottom-center',
  bm: 'CustomSnackbar-container--bottom-center',
  br: 'CustomSnackbar-container--bottom-right',
};

let targetIdCounter = 0;
const targetIds = new WeakMap<HTMLElement, number>();

/**
 * Liefert einen stabilen String-Schluessel je Ziel-Element (fuer die Gruppierung in `SnackbarHost`).
 *
 * @param target - Ziel-Element der Snackbar; `document.body` ergibt immer `'body'`, andere Elemente eine fortlaufende Id.
 * @returns Schluessel, der pro Element gleich bleibt.
 */
function targetKey(target: HTMLElement): string {
  if (target === document.body) return 'body';
  let id = targetIds.get(target);
  if (id === undefined) {
    id = targetIdCounter++;
    targetIds.set(target, id);
  }
  return `el${id}`;
}

/**
 * Haengt die Ebene in den zuletzt geoeffneten `<dialog>` (sonst `document.body`) und zeigt sie als Popover.
 * Ein modaler Dialog liegt in der Top-Layer und macht alles ausserhalb inert: Meldungen in `document.body`
 * waeren dahinter unsichtbar. Im Dialog bleiben sie bedienbar, das Popover hebt sie ueber dessen Inhalt.
 *
 * @param ebene - Ebene der Body-Snackbars.
 */
function platziereEbene(ebene: HTMLElement): void {
  const dialoge = document.querySelectorAll<HTMLDialogElement>('dialog[open]');
  const ziel = dialoge[dialoge.length - 1] ?? document.body;
  if (ebene.parentElement !== ziel) ziel.append(ebene);
  if (typeof ebene.showPopover === 'function' && !ebene.matches(':popover-open')) ebene.showPopover();
}

/**
 * Rendert alle aktiven Snackbars gruppiert nach (Ziel-Element, Position): ein
 * `CustomSnackbar-container`-Div pro Gruppe, per `createPortal` in das jeweilige Ziel gehaengt.
 * Dieselbe Kombination nutzt immer denselben Container. Default-Ziel `document.body` landet in
 * einer eigenen Ebene, die ueber offenen Dialogen liegt (`platziereEbene`).
 *
 * Einmal in `App.tsx` neben `<AppFooter />` gemountet; die Positionierung kommt vollstaendig aus
 * `CustomSnackbar.css` (`position: absolute/fixed`), der Platz im Baum ist unerheblich.
 *
 * @returns Die Portale aller Gruppen.
 */
export default function SnackbarHost(): ReactNode {
  const entries = useSnackbars();
  const [ebene] = useState(() => {
    const el = document.createElement('div');
    el.className = 'CustomSnackbar-ebene';
    el.setAttribute('popover', 'manual');
    return el;
  });

  // Die Ebene muss schon vor dem Mounten einer Meldung am Ziel haengen: `SnackbarItem` misst im
  // Layout-Effekt seine Hoehe, und Kind-Effekte laufen vor diesem hier.
  useLayoutEffect(() => {
    platziereEbene(ebene);
    const beobachter = new MutationObserver(() => platziereEbene(ebene));
    beobachter.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
    return () => {
      beobachter.disconnect();
      ebene.remove();
    };
  }, [ebene]);

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { target: HTMLElement; position: Tposition; fixed: boolean; entries: typeof entries }
    >();
    for (const entry of entries) {
      const key = `${targetKey(entry.container)}|${entry.position}`;
      let group = map.get(key);
      if (!group) {
        group = { target: entry.container, position: entry.position, fixed: entry.fixed, entries: [] };
        map.set(key, group);
      }
      // Der letzte Eintrag einer Gruppe bestimmt die `--fixed`-Klasse.
      group.fixed = entry.fixed;
      group.entries.push(entry);
    }
    return [...map.entries()];
  }, [entries]);

  return (
    <>
      {groups.map(([key, group]) =>
        createPortal(
          <div
            className={[
              'CustomSnackbar-container',
              POSITION_CLASS[group.position],
              group.fixed ? 'CustomSnackbar-container--fixed' : null,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {group.entries.map(entry => (
              <SnackbarItem key={entry.id} entry={entry} />
            ))}
          </div>,
          group.target === document.body ? ebene : group.target,
          key,
        ),
      )}
    </>
  );
}
