import { beforeEach, describe, expect, it } from 'bun:test';
import Storage from '@/infrastructure/storage/Storage';
import {
  ACT_AS_STATUS_EVENT,
  getActAsState,
  notifyActAsStateChanged,
  updateActAsBanner,
} from '@/infrastructure/ui/actAsStatus';

describe('actAsStatus', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="actAsNotice" class="d-none">
        <div id="actAsNoticeText"></div>
        <button id="actAsOwnDataButton" type="button"></button>
      </div>
    `;
    localStorage.clear();
  });

  it("shows a visible notice when another user's data is active", () => {
    Storage.set('Benutzer', 'Admin Jan');
    Storage.set('AccessToken', 'token-123');
    Storage.set('actAsUserId', 'user-42');
    Storage.set('actAsUserName', 'otto');

    const state = updateActAsBanner();

    expect(state.active).toBe(true);
    expect(getActAsState().userName).toBe('otto');
    expect(document.querySelector('#actAsNotice')?.classList.contains('d-none')).toBe(false);
    expect(document.querySelector('#actAsNoticeText')?.textContent).toContain('otto');
    expect(document.querySelector('#actAsNoticeText')?.textContent).toContain('Admin Jan');
  });

  it('hides the notice when no act-as user is active', () => {
    Storage.set('Benutzer', 'Admin Jan');
    Storage.set('AccessToken', 'token-123');

    const state = updateActAsBanner();

    expect(state.active).toBe(false);
    expect(document.querySelector('#actAsNotice')?.classList.contains('d-none')).toBe(true);
  });

  it('resets text and button label when inactive', () => {
    Storage.set('AccessToken', 'tok');

    updateActAsBanner();

    expect(document.querySelector('#actAsNoticeText')?.textContent).toBe('');
    expect(document.querySelector<HTMLButtonElement>('#actAsOwnDataButton')?.textContent).toBe('Eigene Daten laden');
  });

  it('omits currentUser suffix when currentUserName is absent', () => {
    Storage.set('AccessToken', 'tok');
    Storage.set('actAsUserId', 'u-99');
    Storage.set('actAsUserName', 'petra');
    // Benutzer deliberately not set

    const state = updateActAsBanner();

    expect(state.active).toBe(true);
    expect(document.querySelector('#actAsNoticeText')?.textContent).toContain('petra');
    expect(document.querySelector('#actAsNoticeText')?.textContent).not.toContain('Angemeldet');
  });

  it('returns early without crashing when notice elements are absent', () => {
    document.body.innerHTML = ''; // no #actAsNotice or #actAsNoticeText
    Storage.set('AccessToken', 'tok');
    Storage.set('actAsUserId', 'u-1');
    Storage.set('actAsUserName', 'ghost');

    expect(() => updateActAsBanner()).not.toThrow();
  });

  it('notifyActAsStateChanged dispatches CustomEvent with correct detail', () => {
    Storage.set('AccessToken', 'tok');
    Storage.set('actAsUserId', 'u-5');
    Storage.set('actAsUserName', 'max');
    Storage.set('Benutzer', 'admin');

    let received: CustomEvent | null = null;
    window.addEventListener(ACT_AS_STATUS_EVENT, e => {
      received = e as CustomEvent;
    });

    const state = notifyActAsStateChanged();

    expect(received).not.toBeNull();
    expect((received as unknown as CustomEvent).detail).toEqual(state);
    expect(state.active).toBe(true);
    expect(state.userId).toBe('u-5');
  });
});
