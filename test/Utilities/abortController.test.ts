import { describe, expect, it, vi } from "vitest";
import { abortController } from "../../src/ts/utilities/abortController";

describe("AbortControllerWrapper", () => {
	it("should initialize with an AbortController and its signal", () => {
		expect(abortController.controller).toBeInstanceOf(AbortController);
		expect(abortController.signal).toBeInstanceOf(AbortSignal);
		expect(abortController.signal.aborted).toBe(false);
	});

	it("should abort the current controller and create a new one on reset", () => {
		const initialController = abortController.controller;
		const initialSignal = abortController.signal;
		const abortSpy = vi.spyOn(initialController, "abort");

		expect(initialSignal.aborted).toBe(false);

		abortController.reset("Test Reset Reason");

		// Check if the old controller was aborted
		expect(abortSpy).toHaveBeenCalledWith("Test Reset Reason");
		expect(initialSignal.aborted).toBe(true);
		expect(initialSignal.reason).toBe("Test Reset Reason");

		// Check if a new controller and signal were created
		expect(abortController.controller).toBeInstanceOf(AbortController);
		expect(abortController.signal).toBeInstanceOf(AbortSignal);
		expect(abortController.controller).not.toBe(initialController);
		expect(abortController.signal).not.toBe(initialSignal);

		// Check if the new signal is not aborted
		expect(abortController.signal.aborted).toBe(false);
		expect(abortController.signal.reason).toBeUndefined();
	});

	it("should reset with the default reason if none is provided", () => {
		const initialSignal = abortController.signal;
		abortController.reset(); // No reason provided
		expect(initialSignal.aborted).toBe(true);
		expect(initialSignal.reason).toBe("Unbekannt abgebrochen"); // Check default reason
		expect(abortController.signal.aborted).toBe(false);
	});
});
