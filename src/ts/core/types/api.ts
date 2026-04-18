export interface BackendEnvelope<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  statusCode?: number;
}

export type ApiHttpResponse<T = unknown> = BackendEnvelope<T> & { statusCode: number };

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
