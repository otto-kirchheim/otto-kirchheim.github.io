import '../setupBun';
import { afterEach, describe, expect, it, vi } from 'bun:test';
import { setupBundeslandAutoFill } from '@/infrastructure/date/holidayRegion';

function renderForm(address = 'Beiersgraben, 36275 Kirchheim', bundesland = ''): void {
  document.body.innerHTML = `
    <input id="ErsteTkgStAdresse" value="${address}" />
    <select id="Bundesland">
      <option value="">Bitte wählen</option>
      <option value="HE">Hessen</option>
      <option value="BY">Bayern</option>
    </select>
  `;

  const select = document.querySelector<HTMLSelectElement>('#Bundesland');
  if (!select) throw new Error('Bundesland Select fehlt');
  select.value = bundesland;
}

describe('setupBundeslandAutoFill', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('füllt das Bundesland automatisch aus der Tätigkeitsstätten-Adresse', async () => {
    renderForm();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [{ federalState: { key: '06' } }],
    } as Response);

    setupBundeslandAutoFill();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(document.querySelector<HTMLSelectElement>('#Bundesland')?.value).toBe('HE');
  });

  it('überschreibt keine manuell gesetzte Auswahl', async () => {
    renderForm('Beiersgraben, 36275 Kirchheim', 'BY');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [{ federalState: { key: '06' } }],
    } as Response);

    setupBundeslandAutoFill();
    const addressInput = document.querySelector<HTMLInputElement>('#ErsteTkgStAdresse');
    addressInput?.dispatchEvent(new Event('change'));
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(document.querySelector<HTMLSelectElement>('#Bundesland')?.value).toBe('BY');
  });
});
