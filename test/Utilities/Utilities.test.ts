import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { DatenSortieren, Storage, buttonDisable, checkMaxTag, clearLoading, setLoading } from '../../src/ts/utilities';
import { getUserCookie, isAdmin } from '../../src/ts/utilities/decodeAccessToken';
/* import * as exportBerechnung from "../src/ts/Berechnung";
import * as exportSnackbar from "../src/ts/class/CustomSnackbar";
import * as exportEinstelllungen from "../src/ts/Einstellungen/utils"; */
/* import { VorgabenUMock, mockBereitschaft, mockEWT, mockNeben } from "./mockData";
 */
describe('#Storage', () => {
  afterEach(() => {
    localStorage.clear(); // reset localStorage after each test
  });

  it('should set and get a value', () => {
    Storage.set('key', 'value');
    expect(Storage.get<string>('key')).toBe('value');
  });

  it('should throw Error when key does not exist', () => {
    expect(() => Storage.get<any>('non-existing-key', { check: true })).toThrowError(
      '"non-existing-key" nicht gefunden',
    );
  });

  it('should remove a value', () => {
    Storage.set('key', 'value');
    Storage.remove('key');
    expect(Storage.check('key')).toBeFalsy();
  });

  it('should clear all values', () => {
    Storage.set('key1', 'value1');
    Storage.set('key2', 'value2');
    Storage.clear();
    expect(Storage.size()).toBe(0);
  });

  it('should check if key exists', () => {
    Storage.set('key', 'value');
    expect(Storage.check('key')).toBeTruthy();
    expect(Storage.check('non-existing-key')).toBeFalsy();
  });

  describe('compare', () => {
    it('should compare a simple string value', () => {
      Storage.set('key', 'value');
      expect(Storage.compare('key', 'value')).toBe(true);
      expect(Storage.compare('key', 'other-value')).toBe(false);
    });

    it('should return false when key does not exist', () => {
      expect(Storage.compare('key', 'test')).toBe(false);
    });

    it('should compare numbers correctly', () => {
      Storage.set('key', 42);
      expect(Storage.compare('key', 42)).toBe(true);
      expect(Storage.compare('key', 43)).toBe(false);
    });

    it('should compare booleans correctly', () => {
      Storage.set('key', true);
      expect(Storage.compare('key', true)).toBe(true);
      expect(Storage.compare('key', false)).toBe(false);
    });

    it('should compare null correctly', () => {
      Storage.set('key', null);
      expect(Storage.compare('key', null)).toBe(true);
      expect(Storage.compare('key', 'null')).toBe(false);
    });

    it('should compare objects correctly', () => {
      Storage.set('key', { a: 1, b: 'test' });
      expect(Storage.compare('key', { a: 1, b: 'test' })).toBe(true);
      expect(Storage.compare('key', { a: 2, b: 'test' })).toBe(false);
    });

    it('should compare objects independent of key order', () => {
      Storage.set('key', { a: 1, b: 2, c: 3 });
      expect(Storage.compare('key', { c: 3, a: 1, b: 2 })).toBe(true);
    });

    it('should compare nested objects correctly', () => {
      const nested = { a: { b: { c: 1 } }, d: [1, 2, 3] };
      Storage.set('key', nested);
      expect(Storage.compare('key', { a: { b: { c: 1 } }, d: [1, 2, 3] })).toBe(true);
      expect(Storage.compare('key', { a: { b: { c: 2 } }, d: [1, 2, 3] })).toBe(false);
    });

    it('should compare nested objects independent of key order', () => {
      Storage.set('key', { x: { b: 2, a: 1 }, y: 3 });
      expect(Storage.compare('key', { y: 3, x: { a: 1, b: 2 } })).toBe(true);
    });

    it('should compare arrays correctly (order-sensitive)', () => {
      Storage.set('key', [1, 2, 3]);
      expect(Storage.compare('key', [1, 2, 3])).toBe(true);
      expect(Storage.compare('key', [3, 2, 1])).toBe(false);
    });

    it('should distinguish empty arrays and objects', () => {
      Storage.set('key', []);
      expect(Storage.compare('key', [])).toBe(true);
      expect(Storage.compare('key', {})).toBe(false);

      Storage.set('key', {});
      expect(Storage.compare('key', {})).toBe(true);
      expect(Storage.compare('key', [])).toBe(false);
    });

    it('should compare arrays containing objects', () => {
      const data = [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ];
      Storage.set('key', data);
      expect(
        Storage.compare('key', [
          { id: 1, name: 'A' },
          { id: 2, name: 'B' },
        ]),
      ).toBe(true);
      expect(
        Storage.compare('key', [
          { id: 2, name: 'B' },
          { id: 1, name: 'A' },
        ]),
      ).toBe(false);
    });

    it('should detect different types as unequal', () => {
      Storage.set('key', '42');
      expect(Storage.compare('key', 42)).toBe(false);

      Storage.set('key', 0);
      expect(Storage.compare('key', false)).toBe(false);
    });

    it('should handle undefined values in objects (stripped by JSON.stringify)', () => {
      Storage.set('key', { a: 1 });
      expect(Storage.compare('key', { a: 1, b: undefined })).toBe(true);
    });
  });
});

describe('#getUserCookie & isAdmin', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('getUserCookie sollte null zurückgeben wenn nichts gespeichert ist', () => {
    expect(getUserCookie()).toBeNull();
  });

  it('getUserCookie sollte Daten aus localStorage lesen', () => {
    localStorage.setItem('Benutzer', JSON.stringify('test'));
    localStorage.setItem('BenutzerRolle', JSON.stringify('member'));
    const result = getUserCookie();
    expect(result).toEqual({ userName: 'test', role: 'member' });
  });

  it('isAdmin sollte false zurückgeben ohne Daten', () => {
    expect(isAdmin()).toBe(false);
  });

  it('isAdmin sollte false zurückgeben für member', () => {
    localStorage.setItem('Benutzer', JSON.stringify('test'));
    localStorage.setItem('BenutzerRolle', JSON.stringify('member'));
    expect(isAdmin()).toBe(false);
  });

  it('isAdmin sollte true zurückgeben für team-admin', () => {
    localStorage.setItem('Benutzer', JSON.stringify('test'));
    localStorage.setItem('BenutzerRolle', JSON.stringify('team-admin'));
    expect(isAdmin()).toBe(true);
  });

  it('isAdmin sollte true zurückgeben für super-admin', () => {
    localStorage.setItem('Benutzer', JSON.stringify('test'));
    localStorage.setItem('BenutzerRolle', JSON.stringify('super-admin'));
    expect(isAdmin()).toBe(true);
  });
});

describe('#buttonDisable', () => {
  let buttons: HTMLButtonElement[];

  beforeAll(() => {
    buttons = [document.createElement('button'), document.createElement('button'), document.createElement('button')];
    buttons[0].setAttribute('data-disabler', 'true');
    buttons[1].setAttribute('data-disabler', 'true');
    buttons[2].setAttribute('data-enabler', 'true');
    document.body.appendChild(buttons[0]);
    document.body.appendChild(buttons[1]);
    document.body.appendChild(buttons[2]);
  });

  it('should disable all buttons with data-disabler attribute when status is true', () => {
    buttonDisable(true);
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].disabled).toBe(true);
    expect(buttons[2].disabled).toBe(false);
  });

  it('should enable all buttons with data-disabler attribute when status is false', () => {
    buttonDisable(false);
    expect(buttons[0].disabled).toBe(false);
    expect(buttons[1].disabled).toBe(false);
    expect(buttons[2].disabled).toBe(false);
  });

  afterAll(() => {
    buttons.forEach(button => button.remove());
  });
});

describe('#checkMaxTag', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return the current day of the month, if the current date is in the month', () => {
    const mockDate = new Date(2023, 2, 20);
    vi.setSystemTime(mockDate);

    const result = checkMaxTag(2023, 2);
    expect(result).toBe(20);
  });

  it('should return 1 if the current date is not in the month', () => {
    const mockDate = new Date(2023, 2, 31);
    vi.setSystemTime(mockDate);

    const result = checkMaxTag(2023, 3);
    expect(result).toBe(1);
  });
});

describe('#setLoading + #clearLoading', () => {
  let button: HTMLButtonElement;

  beforeAll(() => {
    button = document.createElement('button');
    button.id = 'test-button';
    button.innerHTML = 'Submit';
    button.disabled = false;
    document.body.appendChild(button);
  });

  it('should set the button to loading state', () => {
    setLoading('test-button');
    expect(button.innerHTML).toBe(
      '<span class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>',
    );
    expect(button.disabled).toBe(true);
  });

  it('should restore the button to its normal state', () => {
    clearLoading('test-button');
    expect(button.innerHTML).toBe('Submit');
    expect(button.disabled).toBe(false);
  });

  afterAll(() => {
    button.remove();
  });
});

describe('#DatenSortieren', () => {
  it('should sort the data array in ascending order', () => {
    const data = [
      { tag: '2', name: 'Foo' },
      { tag: '1', name: 'Bar' },
      { tag: '3', name: 'Baz' },
    ];
    const expectedData = [
      { tag: '1', name: 'Bar' },
      { tag: '2', name: 'Foo' },
      { tag: '3', name: 'Baz' },
    ];
    DatenSortieren(data, 'tag');
    expect(data).toEqual(expectedData);
  });

  it('should not change the data array if it is already sorted', () => {
    const data = [
      { tag: '1', name: 'Bar' },
      { tag: '2', name: 'Foo' },
      { tag: '3', name: 'Baz' },
    ];
    const expectedData = [
      { tag: '1', name: 'Bar' },
      { tag: '2', name: 'Foo' },
      { tag: '3', name: 'Baz' },
    ];
    DatenSortieren(data, 'tag');
    expect(data).toEqual(expectedData);
  });
});

// describe("saveDaten", async () => {
// 	let button: HTMLButtonElement;

// 	beforeAll(() => {
// 		mockBereitschaft();
// 		mockEWT();
// 		mockNeben();
// 		Storage.set("VorgabenU", VorgabenUMock);
// 		Storage.set("Monat", 3);
// 		button = document.createElement("button");
// 		button.id = "test-button";
// 		button.disabled = false;
// 		button.innerHTML = "Save";
// 		document.body.appendChild(button);
// 	});

// 	it("should save the data and update the UI", async () => {
// 		// Simulate the click on the button
// 		vi.spyOn(console, "log").mockImplementation(() => {
// 			return null;
// 		});
// 		const mockFetchRetry = vi.spyOn(exports, "FetchRetry").mockResolvedValueOnce({
// 			status: true,
// 			statusCode: 200,
// 			message: "Test",
// 			data: {
// 				datenBerechnung: false,
// 				daten: {
// 					BZ: [],
// 					BE: [],
// 					E: [],
// 					N: [],
// 				},
// 				user: {},
// 			},
// 		});
// 		const setLoadingSpy = vi.spyOn(exports, "setLoading");
// 		const buttonDisableSpy = vi.spyOn(exports, "buttonDisable");
// 		const saveTableDataSpy = vi.spyOn(exports, "saveTableData");
// 		const generateTableBerechnungSpy = vi.spyOn(exportBerechnung, "generateTableBerechnung");
// 		const createSnackBarSpy = vi.spyOn(exportSnackbar, "createSnackBar");
// 		const generateEingabeMaskeEinstellungenSpy = vi.spyOn(exportEinstelllungen, "generateEingabeMaskeEinstellungen");
// 		const StorageSetSpy = vi.spyOn(exports.Storage, "set");

// 		await saveDaten(button);

// 		expect(setLoadingSpy).toHaveBeenCalledWith(button.id);
// 		expect(buttonDisableSpy).toHaveBeenCalledWith(true);
// 		console.log(mockFetchRetry);
// 		expect(mockFetchRetry).toHaveBeenCalledWith("saveData", expect.any(Object), "POST");
// 		expect(saveTableDataSpy).toHaveBeenCalledWith("tableBZ", expect.any(Object));
// 		expect(saveTableDataSpy).toHaveBeenCalledWith("tableBE", expect.any(Object));
// 		expect(saveTableDataSpy).toHaveBeenCalledWith("tableE", expect.any(Object));
// 		expect(saveTableDataSpy).toHaveBeenCalledWith("tableN", expect.any(Object));
// 		expect(generateTableBerechnungSpy).toHaveBeenCalledWith({});
// 		expect(createSnackBarSpy).toHaveBeenCalledWith({
// 			message: "Speichern<br/>Daten gespeichert",
// 			status: "success",
// 			timeout: 3000,

// 			fixed: true,
// 		});
// 		expect(generateEingabeMaskeEinstellungenSpy).toHaveBeenCalledWith({});
// 		expect(StorageSetSpy).toHaveBeenCalledWith("VorgabenU", {});
// 		expect(StorageSetSpy).toHaveBeenCalledWith("datenBerechnung", {});
// 		expect(console.log).toHaveBeenCalledWith("Erfolgreich gespeichert");
// 		expect(setLoadingSpy).toHaveBeenCalledWith(button.id);
// 		expect(buttonDisableSpy).toHaveBeenCalledWith(false);
// 	});

// 	afterAll(() => {
// 		button.remove();
// 	});
// });
