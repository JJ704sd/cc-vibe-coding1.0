import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './authContext';

function Consumer() {
  const { isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="auth-state">{String(isAuthenticated)}</span>
      <button data-testid="login" onClick={() => login('u', 'p')}>login</button>
      <button data-testid="logout" onClick={() => logout()}>logout</button>
    </div>
  );
}

function mockFetchSequence(responses: Array<() => Response | Promise<Response>>) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    calls.push({ url, init });
    const next = responses.shift();
    if (!next) throw new Error('Unexpected fetch call');
    return await next();
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, calls };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('AuthProvider', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('verifies the existing session with /api/admin/session on mount and adopts the server result', async () => {
    const { fetchMock, calls } = mockFetchSequence([
      () => jsonResponse({ user: { id: 'admin-1', username: 'admin' } }),
    ]);

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('true');
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(calls[0].url).toBe('/api/admin/session');
    expect(calls[0].init?.credentials).toBe('include');
    expect(sessionStorage.getItem('trace-scope-auth')).toBe('true');
  });

  it('flips isAuthenticated to false and clears sessionStorage when the server reports no user', async () => {
    sessionStorage.setItem('trace-scope-auth', 'true');
    const { fetchMock } = mockFetchSequence([
      () => jsonResponse({ user: null }),
    ]);

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('false');
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('trace-scope-auth')).toBeNull();
  });

  it('keeps the stored flag when /api/admin/session itself errors (no logout on a flaky network)', async () => {
    sessionStorage.setItem('trace-scope-auth', 'true');
    mockFetchSequence([
      () => { throw new Error('network down'); },
    ]);

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    // Give the effect microtask + promise rejection a tick to settle.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(screen.getByTestId('auth-state').textContent).toBe('true');
    expect(sessionStorage.getItem('trace-scope-auth')).toBe('true');
  });

  it('treats a non-2xx /api/admin/session response as logged out', async () => {
    sessionStorage.setItem('trace-scope-auth', 'true');
    mockFetchSequence([
      () => new Response('forbidden', { status: 401 }),
    ]);

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('false');
    });

    expect(sessionStorage.getItem('trace-scope-auth')).toBeNull();
  });

  it('clears the stored flag after logout even if the API call fails', async () => {
    const { fetchMock, calls } = mockFetchSequence([
      () => jsonResponse({ user: { id: 'admin-1' } }), // mount
      () => Promise.reject(new Error('server down')),    // logout
    ]);

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('true');
    });

    await act(async () => {
      screen.getByTestId('logout').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-state').textContent).toBe('false');
    });

    expect(calls[1].url).toBe('/api/admin/logout');
    expect(sessionStorage.getItem('trace-scope-auth')).toBeNull();
    // Sanity: the failed logout still triggered a fetch attempt.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
