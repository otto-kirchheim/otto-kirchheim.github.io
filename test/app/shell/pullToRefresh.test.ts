import { beforeEach, describe, expect, it } from 'bun:test';

import initPullToRefresh from '@/app/shell/pullToRefresh';

/**
 * Prueft die Stellschrauben aus `pullToRefresh.ts` (Ausloese-Distanz, Daempfung,
 * Vertikal-Verhaeltnis) am echten DOM-Verhalten -- nicht die Konstanten selbst, sondern was sie
 * bewirken. `location.reload` laesst sich in happy-dom nicht ueberschreiben (`Cannot redefine
 * property`), das Ausloesen ist deshalb am zurueckbleibenden `transform` erkennbar: die
 * Umsetzung raeumt es beim Zurueckschnappen ab, laesst es beim Ausloesen aber bewusst stehen
 * (kein Flackern kurz vor dem Neuaufbau).
 */

const AUSLOESE_DISTANZ_PX = 80;
const DAEMPFUNG = 0.5;

function container(): HTMLElement {
  return document.querySelector<HTMLElement>('.db-shell-content')!;
}

function beruehrung(ziel: HTMLElement, x: number, y: number): Touch {
  return new Touch({ identifier: 1, target: ziel, clientX: x, clientY: y });
}

function geste(von: { x: number; y: number }, nach: { x: number; y: number }): { transformBeimZiehen: string } {
  const el = container();
  const feuere = (typ: string, x: number, y: number): void => {
    const punkt = beruehrung(el, x, y);
    el.dispatchEvent(
      new TouchEvent(typ, {
        bubbles: true,
        cancelable: true,
        touches: typ === 'touchend' ? [] : [punkt],
        changedTouches: [punkt],
      }),
    );
  };

  feuere('touchstart', von.x, von.y);
  feuere('touchmove', nach.x, nach.y);
  const transformBeimZiehen = el.style.transform;
  feuere('touchend', nach.x, nach.y);
  return { transformBeimZiehen };
}

describe('initPullToRefresh', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div class="db-shell-content"></div>';
    initPullToRefresh();
  });

  it('bewegt den Inhalt gedaempft mit', () => {
    const fingerWeg = 40;
    const { transformBeimZiehen } = geste({ x: 100, y: 100 }, { x: 100, y: 100 + fingerWeg });

    expect(transformBeimZiehen).toBe(`translateY(${fingerWeg * DAEMPFUNG}px)`);
  });

  it('schnappt unterhalb der Ausloese-Distanz zurueck, statt neu zu laden', () => {
    // 40px Finger -> 20px Inhalt, klar unter der Schwelle.
    geste({ x: 100, y: 100 }, { x: 100, y: 140 });

    expect(container().style.transform).toBe('');
  });

  it('loest oberhalb der Ausloese-Distanz aus (Transform bleibt fuers Neuladen stehen)', () => {
    const fingerWeg = AUSLOESE_DISTANZ_PX / DAEMPFUNG + 20;
    geste({ x: 100, y: 100 }, { x: 100, y: 100 + fingerWeg });

    expect(container().style.transform).not.toBe('');
  });

  it('blendet den Indikator mit dem Fortschritt ein und meldet die erreichte Ausloese-Distanz', () => {
    const el = container();
    const indikator = document.querySelector<HTMLElement>('.ptr-indikator')!;
    const symbol = indikator.querySelector<HTMLElement>('.ptr-indikator__symbol')!;

    const punkt = (y: number, typ: string): void => {
      const beruehrung = new Touch({ identifier: 1, target: el, clientX: 100, clientY: y });
      el.dispatchEvent(
        new TouchEvent(typ, { bubbles: true, cancelable: true, touches: [beruehrung], changedTouches: [beruehrung] }),
      );
    };

    punkt(100, 'touchstart');
    punkt(180, 'touchmove'); // 80px Finger -> 40px Inhalt = halber Weg
    expect(indikator.style.opacity).toBe('0.5');
    expect(symbol.style.transform).toBe('rotate(0.5turn)');
    expect(indikator.classList.contains('ptr-indikator--bereit')).toBe(false);

    punkt(400, 'touchmove'); // weit ueber der Schwelle
    expect(indikator.style.opacity).toBe('1');
    expect(indikator.classList.contains('ptr-indikator--bereit')).toBe(true);
  });

  it('loest erst beim Loslassen aus, nicht schon beim vollen Durchziehen', () => {
    const el = container();
    const symbol = document.querySelector<HTMLElement>('.ptr-indikator__symbol')!;
    const feuere = (typ: string, y: number): void => {
      const beruehrung = new Touch({ identifier: 1, target: el, clientX: 100, clientY: y });
      el.dispatchEvent(
        new TouchEvent(typ, {
          bubbles: true,
          cancelable: true,
          touches: typ === 'touchend' ? [] : [beruehrung],
          changedTouches: [beruehrung],
        }),
      );
    };

    feuere('touchstart', 100);
    feuere('touchmove', 400); // weit ueber der Schwelle, Finger bleibt unten
    expect(symbol.classList.contains('laedt')).toBe(false);

    feuere('touchend', 400);
    expect(symbol.classList.contains('laedt')).toBe(true);
  });

  it('loest nicht aus, wenn nach dem Durchziehen wieder unter die Schwelle zurueckgezogen wird', () => {
    const el = container();
    const symbol = document.querySelector<HTMLElement>('.ptr-indikator__symbol')!;
    const feuere = (typ: string, y: number): void => {
      const beruehrung = new Touch({ identifier: 1, target: el, clientX: 100, clientY: y });
      el.dispatchEvent(
        new TouchEvent(typ, {
          bubbles: true,
          cancelable: true,
          touches: typ === 'touchend' ? [] : [beruehrung],
          changedTouches: [beruehrung],
        }),
      );
    };

    feuere('touchstart', 100);
    feuere('touchmove', 400);
    feuere('touchmove', 140); // zurueck auf 20px Inhalt
    feuere('touchend', 140);

    expect(symbol.classList.contains('laedt')).toBe(false);
  });

  it('behaelt die Geste beim Ziehen (preventDefault), laesst waagerechtes Wischen aber dem Browser', () => {
    const el = container();
    const bewegung = (x: number, y: number): boolean => {
      const beruehrung = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
      const ereignis = new TouchEvent('touchmove', {
        bubbles: true,
        cancelable: true,
        touches: [beruehrung],
        changedTouches: [beruehrung],
      });
      el.dispatchEvent(ereignis);
      return ereignis.defaultPrevented;
    };
    const start = (): void => {
      const beruehrung = new Touch({ identifier: 1, target: el, clientX: 100, clientY: 100 });
      el.dispatchEvent(
        new TouchEvent('touchstart', { bubbles: true, touches: [beruehrung], changedTouches: [beruehrung] }),
      );
    };

    start();
    expect(bewegung(100, 160)).toBe(true);

    start();
    expect(bewegung(300, 130)).toBe(false);
  });

  it('ignoriert ueberwiegend waagerechtes Wischen (Tabellen scrollen quer)', () => {
    const { transformBeimZiehen } = geste({ x: 100, y: 100 }, { x: 300, y: 130 });

    expect(transformBeimZiehen).toBe('');
  });

  it('greift nur aus der Ruhelage am oberen Rand', () => {
    const el = container();
    Object.defineProperty(el, 'scrollTop', { value: 50, configurable: true });

    const { transformBeimZiehen } = geste({ x: 100, y: 100 }, { x: 100, y: 300 });

    expect(transformBeimZiehen).toBe('');
  });
});
