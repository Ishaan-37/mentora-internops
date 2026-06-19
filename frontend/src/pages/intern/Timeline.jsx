// src/pages/intern/Timeline.jsx
import { useState, useEffect } from 'react';
import * as internApi from '../../api/intern.api';
import StatusBadge from '../../components/StatusBadge';

export default function Timeline() {
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    internApi
      .getTimeline()
      .then((res) => setWeeks(res.data.timeline))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-400">Loading timeline...</p>;

  if (weeks.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-400">Your mentor hasn't set up a timeline yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      {weeks.map((week) => (
        <div key={week.id} className="card flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-accent-50 text-accent-700 flex items-center justify-center font-display font-semibold flex-shrink-0">
            {week.week_number}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-900">{week.title}</p>
              <StatusBadge status={week.status.replace('_', '-')} />
            </div>
            {week.goal && <p className="text-sm text-gray-500 mt-1">{week.goal}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
