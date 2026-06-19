// src/components/Header.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import NotificationBell from './NotificationBell';

export default function Header({ title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate('/login');
  };

  const roleLabel = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';

  return (
    <header className="h-16 flex items-center justify-between px-8 border-b border-gray-100 bg-white sticky top-0 z-10">
      <h1 className="font-display font-semibold text-lg text-gray-900">{title}</h1>

      <div className="flex items-center gap-5">
        {user?.role === 'intern' && <NotificationBell />}

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900 leading-tight">{user?.name}</p>
            <p className="text-xs text-gray-500 leading-tight">{roleLabel}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center font-medium text-sm">
            {user?.name?.charAt(0) || '?'}
          </div>
        </div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          aria-label="Log out"
          className="text-gray-400 hover:text-danger-600 transition-colors disabled:opacity-50"
        >
          <i className="ti ti-logout text-xl" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
