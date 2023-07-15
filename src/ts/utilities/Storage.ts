class Storage {
	private static instance: Storage;

	static getInstance(): Storage {
		if (!Storage.instance) {
			Storage.instance = new Storage();
		}
		return Storage.instance;
	}

	set<T>(key: string, value: T): void {
		localStorage.setItem(key, JSON.stringify(value));
	}

	get<T>(key: string): T {
		const value = localStorage.getItem(key);
		if (!value) throw new Error(`Wert "${key}" nicht gefunden`);
		if (!this.isJsonString(value)) return this.convertToJson<T>(key, value as T);
		return JSON.parse(value);
	}

	remove(key: string): void {
		localStorage.removeItem(key);
	}

	clear(): void {
		localStorage.clear();
	}

	check(key: string): boolean {
		return Boolean(localStorage.getItem(key));
	}

	size(): number {
		return localStorage.length;
	}

	compare<T>(key: string, compareValue: T): boolean {
		const value = localStorage.getItem(key);
		return value === JSON.stringify(compareValue);
	}

	private convertToJson<T>(key: string, value: T): T {
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
}

export default Storage.getInstance();
