import { useMemo } from 'react';
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

/** Stabiler String-Schluessel je Ziel-Element (fuer die Gruppierung unten). */
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
 * Rendert alle aktiven Snackbars gruppiert nach (Ziel-Element, Position) -- ein
 * `CustomSnackbar-container`-Div pro Gruppe, per `createPortal` in das jeweilige Ziel
 * (Default: `document.body`) gehaengt. Ersetzt die alte `getOrAddContainerIn()`-DOM-Suche:
 * dieselbe Kombination nutzt weiterhin denselben (jetzt React-verwalteten) Container.
 *
 * Einmal in `App.tsx` gemountet, als Geschwister von `<AppFooter />` -- reine Overlay-Ebene,
 * unabhaengig davon, wo sie im Baum haengt (Positionierung kommt vollstaendig aus
 * `CustomSnackbar.css`s `position: absolute/fixed`).
 */
export default function SnackbarHost(): ReactNode {
  const entries = useSnackbars();

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
      // Letzter Eintrag dieser Gruppe gewinnt die `--fixed`-Klasse -- dieselbe (etwas
      // eigenwillige) Regel wie im alten `_applyPositionClasses()`, keine Verhaltensaenderung.
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
          group.target,
          key,
        ),
      )}
    </>
  );
}
