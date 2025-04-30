import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSnackBar } from "../../src/ts/class/CustomSnackbar";
import * as Utils from "../../src/ts/utilities"; // Import all utilities to mock them
import { API_URL, FetchRetry, getServerUrl } from "../../src/ts/utilities/FetchRetry";

// --- Mocks ---

// Mock fetch
global.fetch = vi.fn();

// Mock sessionStorage
const sessionStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value.toString();
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
	};
})();
Object.defineProperty(window, "sessionStorage", {
	value: sessionStorageMock,
});

// Mock Storage module (which uses localStorage)
vi.mock("../../src/ts/utilities/Storage", () => ({
	default: {
		get: vi.fn(),
		set: vi.fn(),
		check: vi.fn(),
		remove: vi.fn(),
		clear: vi.fn(),
	},
}));

// Mock createSnackBar
vi.mock("../../src/ts/class/CustomSnackbar", () => ({
	createSnackBar: vi.fn(() => ({ Close: vi.fn() })), // Mock Close method as well
}));

// Mock getValidAccesstoken
vi.mock("../../src/ts/utilities/getValidAccesstoken", () => ({
	default: vi.fn(),
}));

// Mock tokenErneuern
vi.mock("../../src/ts/utilities/tokenErneuern", () => ({
	default: vi.fn(),
}));

// Mock abortController (if needed, though FetchRetry uses its own for timeout)
vi.mock("../../src/ts/utilities/abortController", () => ({
	abortController: {
		signal: new AbortController().signal, // Provide a default signal
		reset: vi.fn(),
	},
}));

// Mock Date.now for consistent time checks
const MOCK_DATE_NOW = 1678886400000; // Example timestamp
vi.spyOn(Date, "now").mockImplementation(() => MOCK_DATE_NOW);

// --- Test Suites ---

describe("FetchRetry.ts", () => {
	const mockServerConfigs = API_URL; // Use the actual config from the file
	const primaryServerUrl = mockServerConfigs[0].url;
	const secondaryServerUrl = mockServerConfigs[1].url;
	const mockAccessToken = "mock-access-token";
	const mockRefreshToken = "mock-refresh-token";

	beforeEach(() => {
		// Reset mocks before each test
		vi.clearAllMocks();
		sessionStorageMock.clear();
		(global.fetch as ReturnType<typeof vi.fn>).mockReset();
		// Default fetch mock (can be overridden in specific tests)
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({ success: true }),
			blob: async () => new Blob(["test"]),
			headers: new Headers(),
		});
		// Default Storage mocks
		(Utils.Storage.check as ReturnType<typeof vi.fn>).mockReturnValue(true);
		(Utils.Storage.get as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
			if (key === "accessToken") return mockAccessToken;
			if (key === "refreshToken") return mockRefreshToken;
			return null;
		});
		// Default token mocks
		(Utils.getValidAccesstoken as ReturnType<typeof vi.fn>).mockResolvedValue(mockAccessToken);
		(Utils.tokenErneuern as ReturnType<typeof vi.fn>).mockResolvedValue("new-access-token");
	});

	// --- getServerUrl Tests ---
	describe("getServerUrl", () => {
		it("should return currentServerUrl if last contact was recent", async () => {
			const recentTime = (Date.now() - 1 * 60 * 1000).toString(); // 1 minute ago
			sessionStorageMock.setItem("lastServerContact", recentTime);
			sessionStorageMock.setItem("currentServerUrl", secondaryServerUrl); // Use secondary to test it's preferred

			const url = await getServerUrl();

			expect(url).toBe(secondaryServerUrl);
			expect(global.fetch).not.toHaveBeenCalled(); // Should not check connection
			expect(createSnackBar).not.toHaveBeenCalled();
		});

		it("should return defaultServerUrl if last contact was recent but currentServerUrl is missing", async () => {
			const recentTime = (Date.now() - 1 * 60 * 1000).toString(); // 1 minute ago
			sessionStorageMock.setItem("lastServerContact", recentTime);
			// No currentServerUrl set

			const url = await getServerUrl();

			expect(url).toBe(primaryServerUrl); // Falls back to the first URL in the config
			expect(global.fetch).not.toHaveBeenCalled();
			expect(createSnackBar).not.toHaveBeenCalled();
		});

		it("should check and return the first server if it connects (no recent contact)", async () => {
			sessionStorageMock.setItem("lastServerContact", "0"); // Very old contact

			// Mock fetch to succeed only for the first server check
			(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
				if (url === `${primaryServerUrl}/`) {
					return { ok: true, status: 200, json: async () => ({}), headers: new Headers() };
				}
				throw new Error("Network error"); // Fail other requests
			});

			const url = await getServerUrl();

			expect(url).toBe(primaryServerUrl);
			expect(global.fetch).toHaveBeenCalledTimes(1);
			expect(global.fetch).toHaveBeenCalledWith(`${primaryServerUrl}/`, expect.objectContaining({ method: "GET" }));
			expect(sessionStorageMock.getItem("currentServerUrl")).toBe(primaryServerUrl);
			expect(sessionStorageMock.getItem("lastServerContact")).toBe(MOCK_DATE_NOW.toString());
			expect(createSnackBar).toHaveBeenCalledTimes(1); // For "connecting..."
		});

		it("should check first, fail, then check and return the second server if it connects", async () => {
			sessionStorageMock.setItem("lastServerContact", "0"); // Very old contact

			// Mock fetch to fail for the first server, succeed for the second
			(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
				if (url === `${primaryServerUrl}/`) {
					throw new Error("Timeout or network error");
				} else if (url === `${secondaryServerUrl}/`) {
					return { ok: true, status: 200, json: async () => ({}), headers: new Headers() };
				}
				throw new Error("Unexpected URL");
			});

			const url = await getServerUrl();

			expect(url).toBe(secondaryServerUrl);
			expect(global.fetch).toHaveBeenCalledTimes(2);
			expect(global.fetch).toHaveBeenCalledWith(`${primaryServerUrl}/`, expect.objectContaining({ method: "GET" }));
			expect(global.fetch).toHaveBeenCalledWith(`${secondaryServerUrl}/`, expect.objectContaining({ method: "GET" }));
			expect(sessionStorageMock.getItem("currentServerUrl")).toBe(secondaryServerUrl);
			expect(sessionStorageMock.getItem("lastServerContact")).toBe(MOCK_DATE_NOW.toString());
			expect(createSnackBar).toHaveBeenCalledTimes(1); // For "connecting..."
		});

		it("should throw an error and show snackbar if no servers connect", async () => {
			sessionStorageMock.setItem("lastServerContact", "0"); // Very old contact

			// Mock fetch to fail for all server checks
			(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network Error"));

			await expect(getServerUrl()).rejects.toThrow("Server nicht Erreichbar");

			expect(global.fetch).toHaveBeenCalledTimes(mockServerConfigs.length); // Called for each server
			expect(sessionStorageMock.getItem("currentServerUrl")).toBeNull();
			expect(sessionStorageMock.getItem("lastServerContact")).toBe("0"); // Should not be updated
			expect(createSnackBar).toHaveBeenCalledTimes(2); // Once for "connecting", once for "error"
			expect(createSnackBar).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({ message: expect.stringContaining("aufgebaut") }),
			);
			expect(createSnackBar).toHaveBeenNthCalledWith(2, expect.objectContaining({ message: "Server nicht Erreichbar" }));
		});

		// checkServerConnection timeout test (integrated into getServerUrl)
		it("should handle timeout correctly during server check", async () => {
			vi.useFakeTimers();
			sessionStorageMock.setItem("lastServerContact", "0");

			// Mock fetch to delay longer than the timeout for the first server
			(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string, options: RequestInit) => {
				if (url === `${primaryServerUrl}/`) {
					await new Promise((resolve, reject) => {
						const timeoutId = setTimeout(() => resolve({ ok: false }), mockServerConfigs[0].timeout + 100); // Resolve late
						options.signal?.addEventListener("abort", () => {
							clearTimeout(timeoutId);
							reject(new DOMException("Aborted", "AbortError")); // Simulate abort
						});
					});
					// This part should not be reached if abort works
					return { ok: true, status: 200, json: async () => ({}), headers: new Headers() };
				} else if (url === `${secondaryServerUrl}/`) {
					// Second server connects quickly
					return { ok: true, status: 200, json: async () => ({}), headers: new Headers() };
				}
				throw new Error("Unexpected URL");
			});

			const promise = getServerUrl();
			await vi.advanceTimersByTimeAsync(mockServerConfigs[0].timeout + 50); // Advance time past the first timeout
			const url = await promise; // Let the second fetch complete

			expect(url).toBe(secondaryServerUrl);
			expect(global.fetch).toHaveBeenCalledTimes(2);
			expect(sessionStorageMock.getItem("currentServerUrl")).toBe(secondaryServerUrl);

			vi.useRealTimers();
		});
	});

	// --- FetchRetry Tests ---
	describe("FetchRetry", () => {
		const testPath = "test/endpoint";
		const testData = { key: "value" };
		const mockSuccessResponse = { data: { result: "ok" }, status: true, statusCode: 200, message: "Success" };
		const mockErrorResponse = { data: null, status: false, statusCode: 500, message: "Internal Server Error" };
		const mockTokenExpiredResponse = { data: null, status: false, statusCode: 401, message: "Token abgelaufen" };

		beforeEach(() => {
			// Ensure getServerUrl doesn't perform checks during these specific tests
			sessionStorageMock.setItem("lastServerContact", (Date.now() - 1000).toString()); // Set last contact to 1 second ago
		});

		it("should perform a successful GET request", async () => {
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockSuccessResponse,
				headers: new Headers(),
			});

			const result = await FetchRetry(testPath, undefined, "GET");

			expect(result).toEqual({ ...mockSuccessResponse, statusCode: 200 });
			expect(global.fetch).toHaveBeenCalledTimes(1);
			expect(global.fetch).toHaveBeenCalledWith(
				`${primaryServerUrl}/${testPath}`,
				expect.objectContaining({ method: "GET" }),
			);
			expect(Utils.getValidAccesstoken).toHaveBeenCalledWith(mockAccessToken);
		});

		it("should perform a successful POST request with data", async () => {
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockSuccessResponse,
				headers: new Headers(),
			});

			const result = await FetchRetry(testPath, testData, "POST");

			expect(result).toEqual({ ...mockSuccessResponse, statusCode: 200 });
			expect(global.fetch).toHaveBeenCalledTimes(1);
			expect(global.fetch).toHaveBeenCalledWith(
				`${primaryServerUrl}/${testPath}`,
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify(testData),
					headers: expect.any(Headers),
				}),
			);
			expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers.get("Content-Type")).toBe(
				"application/json",
			);
			expect(Utils.getValidAccesstoken).toHaveBeenCalledWith(mockAccessToken);
		});

		it("should handle fetch error", async () => {
			const fetchError = new Error("Network Failed");
			(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(fetchError);

			await expect(FetchRetry(testPath, undefined, "GET")).rejects.toThrow(
				`Fetch-Fehler: ${fetchError.message}. URL: ${primaryServerUrl}/${testPath}, Method: GET, Retry: 0`,
			);
			expect(Utils.getValidAccesstoken).toHaveBeenCalled();
		});

		it("should handle non-ok response", async () => {
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: async () => mockErrorResponse, // Assume server still returns JSON on error
				headers: new Headers(),
			});

			const result = await FetchRetry(testPath, undefined, "GET");

			expect(result).toEqual({ ...mockErrorResponse, statusCode: 500 }); // Should return the error response structure
			expect(Utils.getValidAccesstoken).toHaveBeenCalled();
		});

		it("should retry with new token if token expired (401)", async () => {
			const newAccessToken = "new-valid-token";
			// First call: Token expired
			(global.fetch as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({
					ok: false,
					status: 401,
					json: async () => mockTokenExpiredResponse,
					headers: new Headers(),
				}) // Second call (after token refresh): Success
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => mockSuccessResponse,
					headers: new Headers(),
				});

			(Utils.tokenErneuern as ReturnType<typeof vi.fn>).mockResolvedValueOnce(newAccessToken);
			// Mock getValidAccesstoken to return the *new* token on the second internal call
			(Utils.getValidAccesstoken as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(mockAccessToken) // Initial check
				.mockResolvedValueOnce(newAccessToken); // Check after retry

			const result = await FetchRetry(testPath, undefined, "GET");

			expect(result).toEqual({ ...mockSuccessResponse, statusCode: 200 });
			expect(global.fetch).toHaveBeenCalledTimes(2);
			expect(Utils.tokenErneuern).toHaveBeenCalledTimes(1);
			expect(Utils.tokenErneuern).toHaveBeenCalledWith(0, undefined, mockAccessToken);
			expect(Utils.getValidAccesstoken).toHaveBeenCalledTimes(2); // Called initially, and again before the retry
			// Check Authorization header on the second call
			expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls[1][1].headers.get("Authorization")).toBe(
				`Bearer ${newAccessToken}`,
			);
		});

		it("should throw error if token refresh fails during retry", async () => {
			const refreshError = new Error("Refresh failed");
			// First call: Token expired
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: false,
				status: 401,
				json: async () => mockTokenExpiredResponse,
				headers: new Headers(),
			});

			(Utils.tokenErneuern as ReturnType<typeof vi.fn>).mockRejectedValueOnce(refreshError);

			// Expect the error thrown by FetchRetry's catch block
			await expect(FetchRetry(testPath, undefined, "GET")).rejects.toThrow(
				`Fetch-Fehler: ${refreshError.message}. URL: ${primaryServerUrl}/${testPath}, Method: GET, Retry: 0`,
			);

			expect(global.fetch).toHaveBeenCalledTimes(1); // Only the first call
			expect(Utils.tokenErneuern).toHaveBeenCalledTimes(1);
		});

		it("should throw error if retry limit is exceeded", async () => {
			await expect(FetchRetry(testPath, undefined, "GET", 3)).rejects.toThrow("Zu viele Tokenfehler");
			expect(global.fetch).not.toHaveBeenCalled(); // Should throw before fetching
		});
	});
});
