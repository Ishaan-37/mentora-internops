// src/components/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = {
  admin: [
    { to: '/admin/dashboard', icon: 'ti ti-layout-dashboard', label: 'Dashboard' },
    { to: '/admin/users',     icon: 'ti ti-users',            label: 'Users' },
    { to: '/admin/batches',   icon: 'ti ti-calendar',         label: 'Batches' },
  ],
  professor: [
    { to: '/professor/dashboard', icon: 'ti ti-layout-dashboard', label: 'Dashboard' },
  ],
  mentor: [
    { to: '/mentor/dashboard',    icon: 'ti ti-layout-dashboard', label: 'Dashboard' },
    { to: '/mentor/interns',      icon: 'ti ti-users',            label: 'My interns' },
    { to: '/mentor/attendance',   icon: 'ti ti-map-pin',          label: 'Attendance 📍' },
    { to: '/mentor/directory',    icon: 'ti ti-address-book',     label: 'Mentor directory' },
    { to: '/mentor/submissions',  icon: 'ti ti-inbox',            label: 'Submissions' },
  ],
  intern: [
    { to: '/intern/dashboard',     icon: 'ti ti-layout-dashboard', label: 'Dashboard' },
    { to: '/intern/work-items',    icon: 'ti ti-checklist',        label: 'Work items' },
    { to: '/intern/timeline',      icon: 'ti ti-timeline',         label: 'Timeline' },
    { to: '/intern/cohort',        icon: 'ti ti-address-book',     label: 'Cohort' },
    { to: '/intern/attendance',    icon: 'ti ti-map-pin',          label: 'Attendance 📍' },
    { to: '/intern/notifications', icon: 'ti ti-bell',             label: 'Notifications' },
  ],
};

export default function Sidebar({ role }) {
  const items      = NAV_ITEMS[role] || [];
  const { logout } = useAuth();
  const navigate   = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="w-64 h-screen sticky top-0 flex flex-col bg-slate-900 text-slate-300 flex-shrink-0">
      {/* Logo */}
      <div className="px-4 pt-6 pb-6">
  <img
    src="/iit-jammu-logo.png"
    alt="Helix"
    className="w-100 object-contain"
  />
</div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`
            }
          >
            <i className={item.icon} aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                     text-slate-400 hover:bg-danger-600 hover:text-white transition-colors"
        >
          <i className="ti ti-logout" aria-hidden="true" />
          Logout
        </button>
      </div>

      <div className="px-6 py-4 border-t border-slate-800">
        <p className="text-xs text-slate-500">IIT Jammu · RISE-UP Internship</p>
      </div>
    </aside>
  );
}
