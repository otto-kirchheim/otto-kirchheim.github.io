import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test';
import showModal, { beiModalSchliessen, schliesseModal } from '@/shared/ui/modal/showModal';
import MyFormModal from '@/shared/ui/modal/MyFormModal';
import MyDivModal from '@/shared/ui/modal/MyDivModal';

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

describe('data-dialog-dismiss', () => {
  it('schliesst einen Formular-Dialog (<form><dialog>) ueber "Abbrechen" im Footer', () => {
    showModal(
      <MyFormModal myRef={{ current: null }} title="Formular" onSubmit={() => {}}>
        <p>Inhalt</p>
      </MyFormModal>,
    );
    expect(document.querySelector('#modal dialog')).not.toBeNull();

    document.querySelector<HTMLButtonElement>('#modal .db-dialog-footer [data-dialog-dismiss="modal"]')!.click();

    expect(document.querySelector('#modal dialog')).toBeNull();
  });

  it('schliesst einen Dialog ohne Formular ueber "Abbrechen" im Footer', () => {
    showModal(
      <MyDivModal title="Anzeige">
        <p>Inhalt</p>
      </MyDivModal>,
    );

    document.querySelector<HTMLButtonElement>('#modal .db-dialog-footer [data-dialog-dismiss="modal"]')!.click();

    expect(document.querySelector('#modal dialog')).toBeNull();
  });
});

describe('Handy-Breite (Vollbild-Drawer statt Dialog)', () => {
  const echteMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = echteMatchMedia;
  });

  /**
   * Ersetzt `matchMedia` fuer den naechsten `showModal`.
   *
   * @param handy - `true`: die Handy-Abfrage (`max-width`) trifft zu.
   */
  function setzeHandy(handy: boolean): void {
    window.matchMedia = ((abfrage: string) => ({
      matches: handy && abfrage.includes('max-width'),
    })) as typeof window.matchMedia;
  }

  it('oeffnet auf dem Handy einen Drawer im Vollbild mit Drawer-Kopf und -Fusszeile', () => {
    setzeHandy(true);
    showModal(
      <MyDivModal title="Anzeige">
        <p>Inhalt</p>
      </MyDivModal>,
    );

    expect(document.querySelector('#modal dialog.db-drawer [data-container-size="full"]')).not.toBeNull();
    expect(document.querySelector('#modal .db-drawer-header')).not.toBeNull();
    expect(document.querySelector('#modal .db-drawer-footer')).not.toBeNull();
    expect(document.querySelector('#modal .db-dialog-header')).toBeNull();
  });

  it('oeffnet ab sm einen DBDialog mit Dialog-Kopf und -Fusszeile', () => {
    setzeHandy(false);
    showModal(
      <MyDivModal title="Anzeige">
        <p>Inhalt</p>
      </MyDivModal>,
    );

    expect(document.querySelector('#modal dialog.db-dialog')).not.toBeNull();
    expect(document.querySelector('#modal .db-dialog-header')).not.toBeNull();
    expect(document.querySelector('#modal .db-dialog-footer')).not.toBeNull();
    expect(document.querySelector('#modal dialog.db-drawer')).toBeNull();
  });

  it('schliesst den Handy-Drawer ueber "Abbrechen" im Footer', () => {
    setzeHandy(true);
    showModal(
      <MyDivModal title="Anzeige">
        <p>Inhalt</p>
      </MyDivModal>,
    );

    document.querySelector<HTMLButtonElement>('#modal .db-drawer-footer [data-dialog-dismiss="modal"]')!.click();

    expect(document.querySelector('#modal dialog')).toBeNull();
  });
});
