import { Suspense, lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { PublicLayout } from '@/components/site/PublicLayout';
import { AuthProvider } from '@/services/auth/authContext';
import { AdminShell } from '@/components/admin/AdminShell';

const HomePage = lazy(() => import('@/app/routes/gallery/GalleryHome').then((module) => ({ default: module.GalleryHome })));
const ProjectsPage = lazy(() => import('@/app/routes/public/projects/ProjectsPage').then((module) => ({ default: module.ProjectsPage })));
const ProjectDetailPage = lazy(() => import('@/app/routes/public/project-detail/ProjectDetailPage').then((module) => ({ default: module.ProjectDetailPage })));
const MapPage = lazy(() => import('@/app/routes/public/map/MapPage').then((module) => ({ default: module.MapPage })));
const SpinViewPage = lazy(() => import('@/app/routes/public/spin-view/SpinViewPage').then((module) => ({ default: module.SpinViewPage })));
const GalleryViewPage = lazy(() => import('@/app/routes/public/gallery-view/GalleryViewPage').then((module) => ({ default: module.GalleryViewPage })));
const AdminDashboardPage = lazy(() => import('@/app/routes/admin/dashboard/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })));
const AdminProjectsPage = lazy(() => import('@/app/routes/admin/projects/AdminProjectsPage').then((module) => ({ default: module.default })));
const AdminLocationsPage = lazy(() => import('@/app/routes/admin/locations/AdminLocationsPage').then((module) => ({ default: module.default })));
const AdminMediaPage = lazy(() => import('@/app/routes/admin/media/AdminMediaPage').then((module) => ({ default: module.default })));
const AdminRoutesPage = lazy(() => import('@/app/routes/admin/routes/AdminRoutesPage').then((module) => ({ default: module.default })));
const AdminLoginPage = lazy(() => import('@/app/routes/admin/login/AdminLoginPage').then((module) => ({ default: module.AdminLoginPage })));

function RouteFallback() {
  return (
    <div className="page-shell" style={{ paddingBottom: '48px' }}>
      <section className="panel" style={{ padding: '24px' }}>
        <h1 className="section-title">页面加载中</h1>
        <p className="muted">当前路由已改为懒加载，首次进入该页面时会按需加载对应代码块。</p>
      </section>
    </div>
  );
}

function withSuspense(node: React.ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{node}</Suspense>;
}

export const router = createBrowserRouter([
  { path: '/', element: withSuspense(<HomePage />) },
  {
    element: <PublicLayout />,
    children: [
      { path: 'projects', element: withSuspense(<ProjectsPage />) },
      { path: 'projects/:projectId', element: withSuspense(<ProjectDetailPage />) },
      { path: 'map', element: withSuspense(<MapPage />) },
      { path: 'spin/:mediaSetId', element: withSuspense(<SpinViewPage />) },
      { path: 'gallery/:mediaSetId', element: withSuspense(<GalleryViewPage />) }
    ]
  },
  {
    // Single AuthProvider + RequireAuth mount for all `/admin/*` routes
    // (except `/admin/login`, which must be reachable without a session).
    // Previously each child route independently wrapped its element in
    // `<AuthProvider><RequireAuth>...</RequireAuth></AuthProvider>`, causing
    // every admin navigation to unmount/remount AuthProvider and refire the
    // `/api/admin/session` reconciliation effect — see BUG-013.
    path: '/admin',
    element: <AdminShell />,
    children: [
      { index: true, element: withSuspense(<AdminDashboardPage />) },
      { path: 'projects', element: withSuspense(<AdminProjectsPage />) },
      { path: 'locations', element: withSuspense(<AdminLocationsPage />) },
      { path: 'media', element: withSuspense(<AdminMediaPage />) },
      { path: 'routes', element: withSuspense(<AdminRoutesPage />) }
    ]
  },
  {
    // Login page intentionally bypasses `RequireAuth`. It still needs its
    // own AuthProvider so the `useAuth().login()` call works, but it mounts
    // at most once per login flow (then redirects into `/admin/*` and the
    // AdminShell takes over).
    path: '/admin/login',
    element: (
      <AuthProvider>
        {withSuspense(<AdminLoginPage />)}
      </AuthProvider>
    )
  }
]);