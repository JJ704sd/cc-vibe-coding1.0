import { Suspense, lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { PublicLayout } from '@/components/site/PublicLayout';
import { AuthProvider } from '@/services/auth/authContext';
import { RequireAuth } from '@/components/admin/RequireAuth';

const HomePage = lazy(() => import('@/app/routes/gallery/GalleryHome').then((module) => ({ default: module.GalleryHome })));
const ProjectsPage = lazy(() => import('@/app/routes/public/projects/ProjectsPage').then((module) => ({ default: module.ProjectsPage })));
const ProjectDetailPage = lazy(() => import('@/app/routes/public/project-detail/ProjectDetailPage').then((module) => ({ default: module.ProjectDetailPage })));
const MapPage = lazy(() => import('@/app/routes/public/map/MapPage').then((module) => ({ default: module.MapPage })));
const SpinViewPage = lazy(() => import('@/app/routes/public/spin-view/SpinViewPage').then((module) => ({ default: module.SpinViewPage })));
const GalleryViewPage = lazy(() => import('@/app/routes/public/gallery-view/GalleryViewPage').then((module) => ({ default: module.GalleryViewPage })));
const AdminDashboardPage = lazy(() => import('@/app/routes/admin/dashboard/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })));
const AdminProjectsPage = lazy(() => import('@/app/routes/admin/projects/AdminProjectsPage').then((module) => ({ default: module.AdminProjectsPage })));
const AdminLocationsPage = lazy(() => import('@/app/routes/admin/locations/AdminLocationsPage').then((module) => ({ default: module.AdminLocationsPage })));
const AdminMediaPage = lazy(() => import('@/app/routes/admin/media/AdminMediaPage').then((module) => ({ default: module.AdminMediaPage })));
const AdminRoutesPage = lazy(() => import('@/app/routes/admin/routes/AdminRoutesPage').then((module) => ({ default: module.AdminRoutesPage })));
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
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: withSuspense(<HomePage />) },
      { path: 'projects', element: withSuspense(<ProjectsPage />) },
      { path: 'projects/:projectId', element: withSuspense(<ProjectDetailPage />) },
      { path: 'map', element: withSuspense(<MapPage />) },
      { path: 'spin/:mediaSetId', element: withSuspense(<SpinViewPage />) },
      { path: 'gallery/:mediaSetId', element: withSuspense(<GalleryViewPage />) }
    ]
  },
  {
    path: '/admin',
    element: (
      <AuthProvider>
        <RequireAuth>
          <AdminDashboardPage />
        </RequireAuth>
      </AuthProvider>
    )
  },
  {
    path: '/admin/projects',
    element: (
      <AuthProvider>
        <RequireAuth>
          <AdminProjectsPage />
        </RequireAuth>
      </AuthProvider>
    )
  },
  {
    path: '/admin/locations',
    element: (
      <AuthProvider>
        <RequireAuth>
          <AdminLocationsPage />
        </RequireAuth>
      </AuthProvider>
    )
  },
  {
    path: '/admin/media',
    element: (
      <AuthProvider>
        <RequireAuth>
          <AdminMediaPage />
        </RequireAuth>
      </AuthProvider>
    )
  },
  {
    path: '/admin/routes',
    element: (
      <AuthProvider>
        <RequireAuth>
          <AdminRoutesPage />
        </RequireAuth>
      </AuthProvider>
    )
  },
  {
    path: '/admin/login',
    element: (
      <AuthProvider>
        <AdminLoginPage />
      </AuthProvider>
    )
  }
]);
