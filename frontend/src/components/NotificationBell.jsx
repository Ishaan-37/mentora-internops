// src/components/NotificationBell.jsx
import { useState, useEffect, useRef } from 'react';
import * as internApi from '../api/intern.api';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await internApi.getNotifications();
      setNotifications(res.data.notifications);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60_000); // poll every 60s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id) => {
    await internApi.markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications, ${unreadCount} unread`}
        className="relative text-gray-400 hover:text-gray-600 transition-colors"
      >
        <i className={`ti ti-bell text-xl ${unreadCount > 0 ? 'animate-pulse' : ''}`} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 max-h-96 overflow-y-auto z-20">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="font-medium text-sm text-gray-900">Notifications</p>
          </div>
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`px-4 py-3 border-b border-gray-50 ${!n.is_read ? 'bg-accent-50/40' : ''}`}
              >
                <p className="text-sm text-gray-700">{n.message}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-xs text-gray-400">
                    {new Date(n.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="text-xs text-accent-600 hover:text-accent-700 font-medium"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
