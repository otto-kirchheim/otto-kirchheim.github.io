import { createSnackBar } from "../class/CustomSnackbar";

interface IStorage {
	set<T>(key: TStorageData, value: T): void;

	get<T>(key: TStorageData): T | null;
	get<T>(key: TStorageData, checked: true): T;
	get<T>(key: TStorageData, options: { check?: true; default?: T }): T;

	remove(key: TStorageData): void;
	clear(): void;
	check(key: TStorageData): boolean;
	size(): number;
	compare<T>(key: TStorageData, compareValue: T): boolean;
}

enum StorageData {
	accessToken = "Server Zugriffscode",
	refreshToken = "Server Zugriffscode aktualisierungscode",
	Benutzer = "Benutzer",
	Jahr = "Jahr",
	Monat = "Monat",
	dataBZ = "Daten Bereitschaftszeitraum",
	dataBE = "Daten Bereitschaftseinsatz",
	dataE = "Daten EWT",
	dataN = "Daten Nebengeld",
	VorgabenU = "Persönliche Daten",
	VorgabenGeld = "Vorgaben Geld",
	datenBerechnung = "Daten Berechnung",
	Jahreswechsel = "Jahreswechsel",
	theme = "Theme",
	dataServer = "Server Daten",
	Version = "Version der App",
	key = "Test Daten",
}

export type TStorageData = keyof typeof StorageData;

class Storage implements IStorage {
	private static instance: Storage;

	static getInstance(): Storage {
		if (!Storage.instance) Storage.instance = new Storage();
		return Storage.instance;
	}

	set<T>(key: TStorageData, value: T): void {
		localStorage.setItem(key, JSON.stringify(value));
	}

	get<T>(key: TStorageData): T | null;
	get<T>(key: TStorageData, checked: true): T;
	get<T>(key: TStorageData, options: { check?: true; default?: T }): T;
	get<T>(key: TStorageData, optionsOrChecked?: { check?: true; default?: T } | true): T | null {
		if (optionsOrChecked !== true && optionsOrChecked !== undefined) {
			if (optionsOrChecked.default !== undefined && !this.check(key)) {
				return optionsOrChecked.default;
			} else if (optionsOrChecked.check && !this.check(key)) {
				throw this.showSnackbarAndThrowError(new Error(`"${StorageData[key] ?? key}" nicht gefunden`));
			}
		}
		const value = localStorage.getItem(key);

		if (optionsOrChecked === true) {
			if (value === null) throw this.showSnackbarAndThrowError(new Error(`"${StorageData[key] ?? key}" nicht gefunden`));
		} else if (value === null) return optionsOrChecked?.default !== undefined ? optionsOrChecked.default : null;

		return this.isJsonString(value) ? JSON.parse(value) : this.convertToJson<T>(key, value as T);
	}

	remove(key: TStorageData): void {
		localStorage.removeItem(key);
	}

	clear(): void {
		localStorage.clear();
	}

	check(key: string extends TStorageData ? TStorageData : string): boolean {
		return Boolean(localStorage.getItem(key));
	}

	size(): number {
		return localStorage.length;
	}

	compare<T>(key: TStorageData, compareValue: T): boolean {
		return localStorage.getItem(key) === JSON.stringify(compareValue);
	}

	private convertToJson<T>(key: TStorageData, value: T): T {
		this.set(key, value);
		return value;
	}

	private isJsonString<T>(str: T): boolean {
		try {
			JSON.parse(str as string);
		} catch (e) {
			return false;
		}
		return true;
	}

	private showSnackbarAndThrowError(err: Error): Error {
		createSnackBar({
			message: `Fehler: ${err.message}`,
			status: "error",
			timeout: 3000,
			fixed: true,
		});
		return err;
	}
}

export default Storage.getInstance();
