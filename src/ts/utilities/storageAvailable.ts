export default function storageAvailable(type: "localStorage" | "sessionStorage"): boolean {
	let storage: Storage | undefined;
	try {
		storage = window[type];
		const x = "__storage_test__";
		storage.setItem(x, x);
		storage.removeItem(x);
		return true;
	} catch (e) {
		if (!storage) return false;
		return (
			e instanceof DOMException &&
			// everything except Firefox
			(e.name === "QuotaExceededError" ||
				// Firefox
				e.name === "NS_ERROR_DOM_QUOTA_REACHED") &&
			// acknowledge QuotaExceededError only if there's something already stored
			storage &&
			storage.length !== 0
		);
	}
}
