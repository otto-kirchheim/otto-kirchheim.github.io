import { afterEach, describe, expect, it } from 'bun:test';
import { render } from '@test/reactRender';

import PersoenlicheDatenPanel from '@/pages/einstellungen/ui/PersoenlicheDatenPanel';
import { setEmailStatus, useEmailStatus, type EmailStatus } from '@/pages/einstellungen/model/emailStatusStore';

function renderPanel(): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(<PersoenlicheDatenPanel />, container);
  return container;
}

/** `.db-infotext`-Meldung des E-Mail-Felds (DBInput rendert `message` als Infotext neben dem Feld). */
function emailMeldung(container: ParentNode): Element | undefined {
  return (
    Array.from(container.querySelectorAll('.db-input'))
      .find(huelle => huelle.querySelector('#EmailAnzeige'))
      ?.querySelector('.db-infotext:not([data-semantic="critical"])') ?? undefined
  );
}

async function flush(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
}

afterEach(() => {
  document.body.innerHTML = '';
  setEmailStatus(null);
});

describe('emailStatusStore', () => {
  it('liefert den gesetzten Status ueber useEmailStatus und benachrichtigt bei Aenderung', async () => {
    const gesehen: EmailStatus[] = [];
    function Probe() {
      gesehen.push(useEmailStatus());
      return null;
    }
    const container = document.createElement('div');
    render(<Probe />, container);

    setEmailStatus({ text: 'E-Mail ist verifiziert.', icon: 'check' });
    await flush();

    expect(gesehen[0]).toBeNull();
    expect(gesehen.at(-1)).toEqual({ text: 'E-Mail ist verifiziert.', icon: 'check' });
  });

  it('rendert bei identischem Status nicht erneut', async () => {
    let renders = 0;
    function Probe() {
      useEmailStatus();
      renders++;
      return null;
    }
    render(<Probe />, document.createElement('div'));

    setEmailStatus({ text: 'A', icon: 'check' });
    await flush();
    const nachErstem = renders;
    setEmailStatus({ text: 'A', icon: 'check' });
    await flush();

    expect(renders).toBe(nachErstem);
  });
});

describe('PersoenlicheDatenPanel: E-Mail-Hinweis am Feld', () => {
  it('zeigt ohne Status keine Meldung und keinen losen #EmailVerificationHint', () => {
    const container = renderPanel();

    expect(container.querySelector('#EmailVerificationHint')).toBeNull();
    expect(emailMeldung(container)).toBeUndefined();
  });

  it('zeigt den Status als Meldung am E-Mail-Feld und aktualisiert ihn', async () => {
    const container = renderPanel();

    setEmailStatus({ text: 'E-Mail ist verifiziert.', icon: 'check' });
    await flush();
    expect(emailMeldung(container)?.textContent).toContain('E-Mail ist verifiziert.');

    setEmailStatus({ text: 'E-Mail ist noch nicht verifiziert.', icon: 'exclamation_mark_circle' });
    await flush();
    expect(emailMeldung(container)?.textContent).toContain('E-Mail ist noch nicht verifiziert.');
  });
});
