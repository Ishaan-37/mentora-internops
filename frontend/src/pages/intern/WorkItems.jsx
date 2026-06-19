// src/pages/intern/WorkItems.jsx
import { useState, useEffect } from 'react';
import * as internApi from '../../api/intern.api';
import WorkItemCard from '../../components/WorkItemCard';

const TABS = [
  { value: '',           label: 'All' },
  { value: 'assignment', label: 'Assignments' },
  { value: 'task',       label: 'Tasks' },
  { value: 'project',    label: 'Projects' },
];

export default function WorkItems() {
  const [activeTab, setActiveTab] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    internApi
      .getWorkItems(activeTab || undefined)
      .then((res) => setItems(res.data.workItems))
      .finally(() => setLoading(false));
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-accent-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400">Loading work items...</p>
      ) : items.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400">No work items here yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <WorkItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
