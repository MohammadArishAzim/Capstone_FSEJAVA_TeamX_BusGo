export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';

// Same keys the auth module writes; the booking code only ever reads the token.
export const TOKEN_KEY = 'busgo_token';
export const USER_KEY = 'busgo_user';

/** Failure from the API, carrying the HTTP status (0 = server unreachable) and a user-facing message. */
export class ApiRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined) headers.set('Content-Type', 'application/json');
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiRequestError(0, 'Could not reach the server. Is the backend running?');
  }

  if (!response.ok) {
    // The backend's consistent error shape: { timestamp, path, error, message }.
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // non-JSON error body: keep the generic message
    }
    throw new ApiRequestError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
