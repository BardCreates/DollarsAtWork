/**
 * One way to talk to the API. The sign-in cookie is sent automatically because
 * the app and the API share an address; there are no tokens to store.
 */

/** ASP.NET Core "problem details" error body. */
export interface ProblemDetails {
  title?: string;
  detail?: string;
  status?: number;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails;

  constructor(status: number, problem: ProblemDetails | undefined) {
    const p = problem ?? {};
    const firstFieldError = p.errors ? Object.values(p.errors).flat()[0] : undefined;
    super(p.detail ?? firstFieldError ?? p.title ?? `Request failed (${status})`);
    this.status = status;
    this.problem = p;
  }

  /** Error messages for one form field, e.g. fieldErrors('email'). */
  fieldErrors(field: string): string[] {
    return this.problem.errors?.[field] ?? [];
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export async function apiRequest<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = undefined;
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, data as ProblemDetails | undefined);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => apiRequest<T>('GET', path),
  post: <T = void>(path: string, body?: unknown) => apiRequest<T>('POST', path, body ?? {}),
  put: <T = void>(path: string, body: unknown) => apiRequest<T>('PUT', path, body),
  patch: <T = void>(path: string, body: unknown) => apiRequest<T>('PATCH', path, body),
  delete: <T = void>(path: string) => apiRequest<T>('DELETE', path),
};

/** A friendly message for any error thrown by a request. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return "Whoa, that's a lot of tries. Give it a minute and try again.";
    return error.message;
  }
  if (error instanceof TypeError) return "Can't reach Dollars at Work. Check your connection and try again.";
  return "Hmm, that didn't work. Please try again in a moment.";
}
