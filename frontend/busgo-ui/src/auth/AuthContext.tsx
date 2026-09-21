/**
 * TEMPORARY SHIM -- Dev 1 owns auth (Auth Context, Login/Register). This exists only so the Dev 6
 * pages (My Trips, Confirm Booking) can run and be tested on their own. When Dev 1's AuthContext
 * lands, replace this file and keep the same surface the Dev 6 code uses:
 *   useAuth() -> { user, isLoggedIn, login(email, password), logout() }
 * and the same localStorage keys ('busgo_token', 'busgo_user') -- the API client reads the token.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { API_URL, TOKEN_KEY, USER_KEY } from '../api/client';

export interface CurrentUser {
  email: string;
  name: string;
  isAdmin: boolean;
}

export interface AuthContextValue {
  user: CurrentUser | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as CurrentUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(readStoredUser);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      throw new Error(body.message ?? 'Login failed');
    }
    const data = (await response.json()) as CurrentUser & { token: string };
    const next: CurrentUser = { email: data.email, name: data.name, isAdmin: data.isAdmin };
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(next));
    setUser(next);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoggedIn: user !== null, login, logout }),
    [user, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
