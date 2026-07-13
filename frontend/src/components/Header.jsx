// src/components/Header.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth }  from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';

export default function Header({ title }) {
  const { user, logout }  = useAuth();
  const { dark, toggle }  = useTheme();
  const navigate          = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate('/login');
  };

  const roleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : '';

  return (
    <header className="h-16 flex items-center justify-between px-8 border-b border-gray-100
                       bg-white sticky top-0 z-10
                       dark:bg-gray-900 dark:border-gray-700">
      <h1 className="font-display font-semibold text-lg text-gray-900 dark:text-white">
        {title}
      </h1>

      <div className="flex items-center gap-4">
        {/* Notification bell — interns only */}
        {user?.role === 'intern' && <NotificationBell />}

        {/* ── Dark / Light toggle ── */}
        <button
          onClick={toggle}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200
                     bg-gray-100 hover:bg-gray-200 text-gray-600
                     dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-yellow-300"
        >
          {dark
            ? <i className="ti ti-sun text-lg" aria-hidden="true" />
            : <i className="ti ti-moon text-lg" aria-hidden="true" />
          }
        </button>

        {/* User info */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900 leading-tight dark:text-white">
              {user?.name}
            </p>
            <p className="text-xs text-gray-500 leading-tight dark:text-gray-400">
              {roleLabel}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-accent-100 text-accent-700 flex items-center
                          justify-center font-medium text-sm dark:bg-accent-900 dark:text-accent-300">
            {user?.name?.charAt(0) || '?'}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          aria-label="Log out"
          className="text-gray-400 hover:text-danger-600 transition-colors
                     disabled:opacity-50 dark:text-gray-500 dark:hover:text-danger-400"
        >
          <i className="ti ti-logout text-xl" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
