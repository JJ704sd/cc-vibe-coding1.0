import { Outlet } from 'react-router-dom';
import { SiteHeader } from '@/components/site/SiteHeader';

export function PublicLayout() {
  return (
    <div>
      <SiteHeader />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
