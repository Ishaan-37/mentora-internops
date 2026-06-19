// src/components/Sidebar.jsx
// Deep slate sidebar with violet accent active states.
// Nav items are role-aware — pass `role` to render the right menu.

import { NavLink } from 'react-router-dom';

const NAV_ITEMS = {
  admin: [
    { to: '/admin/dashboard', icon: 'ti ti-layout-dashboard', label: 'Dashboard' },
    { to: '/admin/users',     icon: 'ti ti-users',            label: 'Users' },
    { to: '/admin/batches',   icon: 'ti ti-calendar',         label: 'Batches' },
  ],
  mentor: [
    { to: '/mentor/dashboard', icon: 'ti ti-layout-dashboard', label: 'Dashboard' },
    { to: '/mentor/interns',   icon: 'ti ti-users',            label: 'My interns' },
    { to: '/mentor/directory', icon: 'ti ti-address-book',     label: 'Mentor directory' },
    { to: '/mentor/submissions', icon: 'ti ti-inbox',          label: 'Submissions' },
  ],
  intern: [
    { to: '/intern/dashboard',  icon: 'ti ti-layout-dashboard', label: 'Dashboard' },
    { to: '/intern/work-items', icon: 'ti ti-checklist',        label: 'Work items' },
    { to: '/intern/timeline',   icon: 'ti ti-timeline',         label: 'Timeline' },
    { to: '/intern/cohort',     icon: 'ti ti-address-book',     label: 'Cohort' },
    { to: '/intern/notifications', icon: 'ti ti-bell',          label: 'Notifications' },
  ],
};

export default function Sidebar({ role }) {
  const items = NAV_ITEMS[role] || [];

  return (
    <aside className="w-64 h-screen sticky top-0 flex flex-col bg-slate-900 text-slate-300 flex-shrink-0">
      <div className="px-6 py-6 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-accent-500 flex items-center justify-center">
          <i className="ti ti-bolt text-white text-lg" aria-hidden="true" />
        </div>
        <span className="font-display font-semibold text-white text-lg">InternOps</span>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent-600 text-white'
                  : 'text-slate-400 hover:bg-slate-850 hover:text-slate-100'
              }`
            }
          >
            <i className={item.icon} aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-5 border-t border-slate-850">
        <p className="text-xs text-slate-500">IIT Jammu · RISE Internship</p>
      </div>
    </aside>
  );
}
