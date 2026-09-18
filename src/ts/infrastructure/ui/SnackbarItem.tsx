import { useEffect, useLayoutEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { DBButton, DBNotification } from '@db-ux/react-core-components';
import { removeSnackbar, startClosingSnackbar } from './snackbarStore';
import type { SnackbarEntry, Ticon, Tstatus } from './snackbarStore';

type Tsemantik = 'adaptive' | 'successful' | 'warning' | 'critical' | 'informational';

/** App-Status auf DB-Semantik samt Standardsymbol abbilden. */
function semantikFuerStatus(status: Tstatus): { semantik: Tsemantik; icon: string } | null {
  switch (status) {
    case 'success':
    case 'green':
      return { semantik: 'successful', icon: 'check_circle' };
    case 'warning':
    case 'alert':
    case 'orange':
      return { semantik: 'warning', icon: 'exclamation_mark_triangle' };
    case 'danger':
    case 'error':
    case 'red':
      return { semantik: 'critical', icon: 'exclamation_mark_circle' };
    case 'info':
      return { semantik: 'informational', icon: 'information_circle' };
    default:
      // Ohne Status bleibt die Meldung neutral und ohne Symbol.
      return null;
  }
}

/** Alte Ein-Zeichen-Symbole auf DB-Symbolnamen abbilden; alles andere gilt bereits als DB-Name. */
function dbSymbol(icon: Ticon): string {
  switch (icon) {
    case 'exclamation':
    case 'warn':
    case 'danger':
    case '!':
      return 'exclamation_mark_triangle';
    case 'info':
      return 'information_circle';
    case 'question':
    case 'question-mark':
    case '?':
      return 'question_mark_circle';
    case 'plus':
    case 'add':
    case '+':
      return 'plus';
    default:
      return icon;
  }
}

/**
 * Eine einzelne Snackbar-Karte. Die Karte selbst ist `<DBNotification variant="overlay">`
 * (DB-UX-Baustein, laut Doku explizit fuer "absolute and floating notifications like snackbars
 * etc." gedacht) -- Positionierung/Stapel-Container kommen von `SnackbarHost.tsx`, die
 * Hoehen-Animation um die Karte bleibt hier per `ref`, exakt die Sequenz der alten
 * `SnackBar.Open()`/`Close()`-Methoden (siehe dort).
 */
export default function SnackbarItem({ entry }: { entry: SnackbarEntry }): ReactNode {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Oeffnen: Hoehe von 0 auf den gemessenen Inhalt animieren (Aequivalent zu `SnackBar.Open()`).
  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return undefined;
    el.style.height = el.scrollHeight + 'px';
    el.style.opacity = '1';
    el.style.marginTop = '5px';
    el.style.marginBottom = '5px';

    const onTransitionEnd = (): void => {
      el.removeEventListener('transitionend', onTransitionEnd);
      // Offen bleiben nach dem Oeffnen; nur ueber `Close()` wieder einklappen.
      el.style.height = 'auto';
    };
    el.addEventListener('transitionend', onTransitionEnd);
    return () => el.removeEventListener('transitionend', onTransitionEnd);
  }, []);

  // Schliessen: derselbe Doppel-rAF-Kollaps wie `SnackBar.Close()`, danach Entfernen aus dem Store.
  useEffect(() => {
    if (!entry.closing) return undefined;
    const el = wrapperRef.current;
    if (!el) {
      removeSnackbar(entry.id);
      return undefined;
    }

    const snackbarHeight = el.scrollHeight;
    const transition = el.style.transition;
    el.style.transition = '';
    const raf = requestAnimationFrame(() => {
      el.style.height = snackbarHeight + 'px';
      el.style.opacity = '1';
      el.style.marginTop = '0px';
      el.style.marginBottom = '0px';
      el.style.transition = transition;
      requestAnimationFrame(() => {
        el.style.height = '0px';
        el.style.opacity = '0';
      });
    });

    const timer = setTimeout(() => removeSnackbar(entry.id), 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [entry.closing, entry.id]);

  // Auto-Close nach `timeout` (Zahl > 0) -- Wert aendert sich nach Erzeugung des Eintrags nie.
  useEffect(() => {
    if (typeof entry.timeout !== 'number' || entry.timeout <= 0) return undefined;
    const timer = setTimeout(() => startClosingSnackbar(entry.id), entry.timeout);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abbildung = semantikFuerStatus(entry.status);
  const semantic = abbildung?.semantik ?? 'adaptive';
  const iconName = entry.icon ? dbSymbol(entry.icon) : abbildung?.icon;

  const wrapperStyle: CSSProperties = { height: 0, opacity: 0, marginTop: 0, marginBottom: 0 };
  if (entry.width) wrapperStyle.width = `${entry.width}px`;
  if (typeof entry.speed === 'number') wrapperStyle.transitionDuration = `${entry.speed}ms`;
  else if (typeof entry.speed === 'string') wrapperStyle.transitionDuration = entry.speed;

  return (
    <div className="CustomSnackbar__wrapper" ref={wrapperRef} style={wrapperStyle}>
      <DBNotification
        className="CustomSnackbar"
        variant="overlay"
        semantic={semantic}
        icon={iconName}
        showIcon={Boolean(iconName)}
        headline={entry.titel}
        closeable={entry.dismissible}
        closeButtonText="Schließen"
        onClose={() => startClosingSnackbar(entry.id)}
      >
        {/* Entwicklerkontrollierter HTML-Inhalt (kein Nutzereingabe-Pfad), wie beim
            bisherigen `innerHTML`-Vertrag. */}
        <span className="CustomSnackbar__message" dangerouslySetInnerHTML={{ __html: entry.message }} />
        {entry.actions.length > 0 && (
          <div className="CustomSnackbar__actions">
            {entry.actions.map((action, index) => (
              <DBButton
                key={index}
                type="button"
                variant={index === 0 ? 'brand' : 'outlined'}
                size="small"
                className={['CustomSnackbar__action', ...(action.class ?? [])].join(' ')}
                onClick={() => {
                  if (action.function) action.function();
                  if (action.dismiss === true || !action.function) startClosingSnackbar(entry.id);
                }}
              >
                {action.text}
              </DBButton>
            ))}
          </div>
        )}
      </DBNotification>
    </div>
  );
}
