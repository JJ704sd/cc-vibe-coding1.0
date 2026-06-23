import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/router';
import '@/styles/index.css';
import './styles/global.css';

// Non-critical styles (gallery loading screen, map projection overlay,
// skeleton/empty-state helpers, maplibre-gl CSS) ship on a separate dynamic
// import so they don't block first paint on non-map / non-gallery routes.
void import('./styles/non-critical.css');

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
