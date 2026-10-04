import type { ApiResponse } from '@otto-kirchheim/nebengeld-shared';

export type { ApiResponse as BackendEnvelope } from '@otto-kirchheim/nebengeld-shared';

export type ApiHttpResponse<T = unknown> = ApiResponse<T> & { statusCode: number };

/**
 * Entpackt die Nutzdaten einer Backend-Antwort.
 *
 * @param response - Antwort inklusive HTTP-Status.
 * @returns `data`; bei `success: false` mit Status unter 400 also `undefined`.
 * @throws {Error} Bei `success: false` und Status ab 400, mit der Server-Meldung.
 */
export function unwrapEnvelope<T>(response: ApiHttpResponse<T>): T {
  if (!response.success && response.statusCode >= 400) {
    throw new Error(response.message ?? `API-Fehler (${response.statusCode})`);
  }

  return response.data as T;
}

export type AppResult<T, E = string> = { ok: true; data: T } | { ok: false; error: E };

/**
 * Erfolgsergebnis.
 *
 * @param data - Nutzdaten.
 * @returns `{ ok: true, data }`.
 */
export function ok<T>(data: T): AppResult<T> {
  return { ok: true, data };
}

/**
 * Fehlerergebnis.
 *
 * @param error - Fehlerwert, meist eine Meldung.
 * @returns `{ ok: false, error }`.
 */
export function err<E = string>(error: E): AppResult<never, E> {
  return { ok: false, error };
}
