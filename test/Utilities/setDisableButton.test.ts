import { beforeEach, describe, expect, it } from 'vitest';

import setDisableButton from '../../src/ts/utilities/setDisableButton';

describe('setDisableButton', () => {
  beforeEach(() => {
    document.body.innerHTML = `
			<button id="btnSaveBZ">Save BZ</button>
			<button id="btnSaveBE">Save BE</button>
			<button id="btnDownloadB">Download B</button>
			<button id="btnDownloadN">Download N</button>
			<button id="btnAuswaehlen">Auswählen</button>
			<button id="btnChange">Ändern</button>
			<button id="btnPasswortAEndern">Passwort ändern</button>
		`;
  });

  it('deaktiviert alle Buttons wenn status=true', () => {
    setDisableButton(true);

    expect(document.querySelector<HTMLButtonElement>('#btnSaveBZ')!.disabled).toBe(true);
    expect(document.querySelector<HTMLButtonElement>('#btnSaveBE')!.disabled).toBe(true);
    expect(document.querySelector<HTMLButtonElement>('#btnDownloadB')!.disabled).toBe(true);
    expect(document.querySelector<HTMLButtonElement>('#btnDownloadN')!.disabled).toBe(true);
    expect(document.querySelector<HTMLButtonElement>('#btnAuswaehlen')!.disabled).toBe(true);
    expect(document.querySelector<HTMLButtonElement>('#btnChange')!.disabled).toBe(true);
    expect(document.querySelector<HTMLButtonElement>('#btnPasswortAEndern')!.disabled).toBe(true);
  });

  it('aktiviert alle Buttons wenn status=false', () => {
    // Erst deaktivieren, dann aktivieren
    setDisableButton(true);
    setDisableButton(false);

    expect(document.querySelector<HTMLButtonElement>('#btnSaveBZ')!.disabled).toBe(false);
    expect(document.querySelector<HTMLButtonElement>('#btnSaveBE')!.disabled).toBe(false);
    expect(document.querySelector<HTMLButtonElement>('#btnDownloadB')!.disabled).toBe(false);
    expect(document.querySelector<HTMLButtonElement>('#btnAuswaehlen')!.disabled).toBe(false);
    expect(document.querySelector<HTMLButtonElement>('#btnChange')!.disabled).toBe(false);
    expect(document.querySelector<HTMLButtonElement>('#btnPasswortAEndern')!.disabled).toBe(false);
  });

  it('funktioniert wenn optionale Buttons nicht vorhanden', () => {
    document.body.innerHTML = `
			<button id="btnSaveBZ">Save</button>
		`;
    // Sollte keinen Fehler werfen
    expect(() => setDisableButton(true)).not.toThrow();
    expect(document.querySelector<HTMLButtonElement>('#btnSaveBZ')!.disabled).toBe(true);
  });

  it('funktioniert mit leerem DOM', () => {
    document.body.innerHTML = '';
    expect(() => setDisableButton(true)).not.toThrow();
  });
});
