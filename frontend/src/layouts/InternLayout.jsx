// src/layouts/InternLayout.jsx
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const PAGE_TITLES = {
  '/intern/dashboard':     'Dashboard',
  '/intern/work-items':    'Work items',
  '/intern/timeline':      'Timeline',
  '/intern/cohort':        'Cohort directory',
  '/intern/notifications': 'Notifications',
};

export default function InternLayout() {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'InternOps';

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role="intern" />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} />
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
