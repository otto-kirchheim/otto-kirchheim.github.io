import { describe, expect, it } from "vitest";
import compareVersion from "../../src/ts/utilities/compareVersion";

describe("compareVersion", () => {
	it("should return a positive number if version1 > version2 (major)", () => {
		expect(compareVersion("2.0", "1.5")).toBeGreaterThan(0);
	});

	it("should return a positive number if version1 > version2 (minor)", () => {
		expect(compareVersion("1.6", "1.5")).toBeGreaterThan(0);
	});

	it("should return a negative number if version1 < version2 (major)", () => {
		expect(compareVersion("1.5", "2.0")).toBeLessThan(0);
	});

	it("should return a negative number if version1 < version2 (minor)", () => {
		expect(compareVersion("1.5", "1.6")).toBeLessThan(0);
	});

	it("should return 0 if versions are equal", () => {
		expect(compareVersion("1.5", "1.5")).toBe(0);
	});

	it("should handle single-digit versions correctly", () => {
		expect(compareVersion("1.2", "1.2")).toBe(0);
		expect(compareVersion("2.1", "1.9")).toBeGreaterThan(0);
		expect(compareVersion("1.9", "2.1")).toBeLessThan(0);
	});

	// Note: The current implementation doesn't handle patch versions or non-numeric parts.
	// These tests confirm the behavior based on the existing logic.
	it("should compare based on major and minor only", () => {
		expect(compareVersion("1.5.10", "1.5.2")).toBe(0); // Ignores patch
	});
});
