import { Outlet } from 'react-router-dom';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SkyBackground } from '@/components/site/SkyBackground';

export function PublicLayout() {
  return (
    <>
      <SkyBackground />
      <SiteHeader />
      <main style={{ minHeight: 'calc(100vh - 80px)', paddingTop: '8px' }}>
        <Outlet />
      </main>
    </>
  );
}
