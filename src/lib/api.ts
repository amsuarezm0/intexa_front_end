const BASE: string =
  (window as any).__APP_CONFIG__?.apiBaseUrl ||
  import.meta.env.VITE_API_BASE_URL ||
  '/api/v1';

export function getToken(): string | null {
  return localStorage.getItem('arca_token');
}

export function setToken(token: string) {
  localStorage.setItem('arca_token', token);
}

export function clearToken() {
  localStorage.removeItem('arca_token');
  localStorage.removeItem('arca_user');
}

export interface StoredUser { id: string; name: string; email: string; role: string; }

export function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem('arca_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setStoredUser(user: StoredUser) {
  localStorage.setItem('arca_user', JSON.stringify(user));
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/** True if there is no token or the stored JWT's `exp` is in the past. */
export function isTokenExpired(): boolean {
  const token = getToken();
  if (!token) return true;
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1]));
    if (!exp) return false; // no expiry claim: treat as non-expiring
    return Date.now() >= exp * 1000;
  } catch {
    return true; // unparseable token is effectively invalid
  }
}

/** Decodes the stored JWT payload without verifying the signature. */
export function getCurrentUser(): CurrentUser | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.sub ?? '',
      name: payload.name ?? payload.email ?? '',
      email: payload.email ?? '',
      role: payload.role ?? '',
    };
  } catch {
    return null;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 401) {
    clearToken();
    // App.tsx listens for this and switches to the login view (no full reload).
    window.dispatchEvent(new Event('auth:session-expired'));
    return new Promise(() => {});
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
