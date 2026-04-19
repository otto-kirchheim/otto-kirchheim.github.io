import { beforeEach, describe, expect, it } from 'bun:test';
import Storage from '../../src/ts/infrastructure/storage/Storage';
import { getActAsState, updateActAsBanner } from '../../src/ts/infrastructure/ui/actAsStatus';

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
});
