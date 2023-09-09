//setupVitest.js or similar file
import createFetchMock from "vitest-fetch-mock";
import { vi } from "vitest";
// import failOnConsole from "vitest-fail-on-console";

const fetchMocker = createFetchMock(vi);

// sets globalThis.fetch and globalThis.fetchMock to our mocked version
fetchMocker.enableMocks();

// failOnConsole({ shouldFailOnWarn: false });
