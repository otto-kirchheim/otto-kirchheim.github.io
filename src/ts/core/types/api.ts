import type { ApiResponse } from '@otto-kirchheim/nebengeld-shared';

export type { ApiResponse as BackendEnvelope } from '@otto-kirchheim/nebengeld-shared';

export type ApiHttpResponse<T = unknown> = ApiResponse<T> & { statusCode: number };

export function unwrapEnvelope<T>(response: ApiHttpResponse<T>): T {
  if (!response.success && response.statusCode >= 400) {
    throw new Error(response.message ?? `API-Fehler (${response.statusCode})`);
  }

  return response.data as T;
}

export type AppResult<T, E = string> = { ok: true; data: T } | { ok: false; error: E };

export function ok<T>(data: T): AppResult<T> {
  return { ok: true, data };
}

export function err<E = string>(error: E): AppResult<never, E> {
  return { ok: false, error };
}
