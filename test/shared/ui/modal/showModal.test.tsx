import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test';
import showModal, { beiModalSchliessen, schliesseModal } from '@/shared/ui/modal/showModal';

/**
 * `beiModalSchliessen` rief bis Teil 4 der "mehr echtes React"-Initiative einen
 * `MutationObserver` auf -- ersetzt durch einen direkten, synchronen Aufruf an den zwei
 * Stellen, an denen `#modal`-Inhalt tatsaechlich verschwindet: `schliesseModal()` und
 * `showModal()`s Ersetzen-Zweig. Kein bestehender Test deckte das bisher ab (alle mockten
 * `beiModalSchliessen` vollstaendig).
 */

beforeEach(() => {
  document.body.innerHTML = '<div id="modal"></div>';
});

afterEach(() => {
  schliesseModal();
  document.body.innerHTML = '';
});

describe('beiModalSchliessen', () => {
  it('feuert nicht beim blossen Oeffnen', () => {
    const aufraeumen = vi.fn();
    showModal(<div>Inhalt</div>);
    beiModalSchliessen(aufraeumen);

    expect(aufraeumen).not.toHaveBeenCalled();
  });

  it('feuert genau einmal bei schliesseModal()', () => {
    const aufraeumen = vi.fn();
    showModal(<div>Inhalt</div>);
    beiModalSchliessen(aufraeumen);

    schliesseModal();
    expect(aufraeumen).toHaveBeenCalledTimes(1);

    // Ein zweites Schliessen (nichts mehr offen) darf nicht nochmal aufraeumen.
    schliesseModal();
    expect(aufraeumen).toHaveBeenCalledTimes(1);
  });

  it('feuert genau einmal, wenn ein zweiter Dialog denselben Container ohne vorherigen Close ersetzt', () => {
    const aufraeumenErster = vi.fn();
    showModal(<div>Erster Dialog</div>);
    beiModalSchliessen(aufraeumenErster);

    const aufraeumenZweiter = vi.fn();
    showModal(<div>Zweiter Dialog</div>);
    beiModalSchliessen(aufraeumenZweiter);

    expect(aufraeumenErster).toHaveBeenCalledTimes(1);
    expect(aufraeumenZweiter).not.toHaveBeenCalled();

    schliesseModal();
    expect(aufraeumenZweiter).toHaveBeenCalledTimes(1);
    expect(aufraeumenErster).toHaveBeenCalledTimes(1);
  });

  it('registriert nichts, wenn kein #modal existiert', () => {
    document.body.innerHTML = '';
    const aufraeumen = vi.fn();

    expect(() => beiModalSchliessen(aufraeumen)).not.toThrow();
  });
});
