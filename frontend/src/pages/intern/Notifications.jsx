// src/pages/intern/Notifications.jsx
import { useState, useEffect } from 'react';
import * as internApi from '../../api/intern.api';

const TYPE_ICONS = {
  deadline:              'ti ti-clock',
  deadline_changed:      'ti ti-calendar-event',
  presentation:          'ti ti-presentation',
  submission_approved:   'ti ti-circle-check',
  submission_rejected:   'ti ti-circle-x',
  weekly_report:         'ti ti-file-text',
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    internApi
      .getNotifications()
      .then((res) => setNotifications(res.data.notifications))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleMarkRead = async (id) => {
    await internApi.markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  if (loading) return <p className="text-gray-400">Loading notifications...</p>;

  if (notifications.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-400">No notifications yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-3">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`card flex items-start gap-4 ${!n.is_read ? 'border-accent-200 bg-accent-50/30' : ''}`}
        >
          <div className="w-9 h-9 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center flex-shrink-0">
            <i className={TYPE_ICONS[n.type] || 'ti ti-bell'} aria-hidden="true" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-800">{n.message}</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-400">
                {new Date(n.created_at).toLocaleString('en-IN', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
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
        </div>
      ))}
    </div>
  );
}
