import { Outlet } from 'react-router-dom';
import { AuthProvider } from '@/services/auth/authContext';
import { RequireAuth } from '@/components/admin/RequireAuth';
import { RouteTransition } from '@/components/common/RouteTransition';

/**
 * Single layout route for `/admin/*`.
 *
 * Previously every `/admin/*` route independently wrapped its element in
 * `<AuthProvider><RequireAuth>...</RequireAuth></AuthProvider>`. Each navigation
 * therefore unmounted and remounted the AuthProvider, which re-fired the
 * `/api/admin/session` reconciliation effect and reset the
 * `isAuthenticated` state — causing a brief login flash and N redundant
 * session calls per admin flow.
 *
 * By hoisting AuthProvider + RequireAuth here and using nested children
 * routes, the provider now mounts once when the user enters `/admin/*` and
 * stays mounted for the entire admin session.
 *
 * Sidebar rendering is intentionally kept inside each admin page (see
 * `AdminSidebar` consumers) so this refactor stays purely about auth-state
 * consolidation — it does not change per-page layout.
 *
 * `/admin/login` intentionally stays as a separate top-level route so it
 * can render without `RequireAuth` (it IS the unauthenticated entry point).
 */
export function AdminShell() {
  return (
    <AuthProvider>
      <RequireAuth>
        <RouteTransition>
          <Outlet />
        </RouteTransition>
      </RequireAuth>
    </AuthProvider>
  );
}