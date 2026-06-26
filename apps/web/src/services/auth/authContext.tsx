import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const API_BASE = '';
const AUTH_STORAGE_KEY = 'trace-scope-auth';

function readStoredAuth(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Seed the initial value from sessionStorage so a hard refresh doesn't
  // briefly redirect the user to /admin/login while we verify the cookie.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => readStoredAuth());

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/admin/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore network errors during logout — we still clear local state
    }
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(false);
  }, []);

  // Reconcile the local flag with the server's view of the session on mount.
  // Without this, an expired/revoked cookie would still leave the UI in
  // "authenticated" mode until the next admin action triggers a 401.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/admin/session`, {
          credentials: 'include',
        });
        if (!res.ok) {
          if (!cancelled) {
            sessionStorage.removeItem(AUTH_STORAGE_KEY);
            setIsAuthenticated(false);
          }
          return;
        }
        const body = (await res.json()) as { user: unknown };
        const authed = body?.user != null;
        if (cancelled) return;
        if (authed) {
          sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
        } else {
          sessionStorage.removeItem(AUTH_STORAGE_KEY);
        }
        setIsAuthenticated(authed);
      } catch {
        if (!cancelled) {
          // Network error: trust the stored flag (better than logging the
          // user out on a flaky connection), but don't change storage.
          setIsAuthenticated(readStoredAuth());
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
