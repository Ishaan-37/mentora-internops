// src/pages/intern/Cohort.jsx
// RISE cohort directory — every intern in the program, with their
// assigned mentor/research scholar and overseeing professor/admin.
// Deliberately does NOT show progress, submissions, or work item
// content for other interns — identity + assignment only.

import { useState, useEffect } from 'react';
import * as internApi from '../../api/intern.api';
import Table from '../../components/Table';
import { useAuth } from '../../hooks/useAuth';

export default function Cohort() {
  const { user } = useAuth();
  const [cohort, setCohort] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    internApi
      .getCohort()
      .then((res) => setCohort(res.data.cohort))
      .finally(() => setLoading(false));
  }, []);

  const filtered = cohort.filter((c) =>
    [c.name, c.mentor_name, c.admin_name, c.batch_name]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const columns = [
    {
      key: 'name',
      header: 'Intern',
      render: (row) => (
        <span className="font-medium text-gray-900">
          {row.name}
          {row.name === user?.name && <span className="text-accent-600 text-xs ml-2">(You)</span>}
        </span>
      ),
    },
    { key: 'mentor_name', header: 'Mentor / research scholar' },
    { key: 'admin_name', header: 'Professor / admin' },
    { key: 'batch_name', header: 'Batch' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {cohort.length} interns across the RISE program · names and assignments only — individual progress stays private.
        </p>
      </div>

      <div className="relative max-w-sm">
        <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, mentor, or professor..."
          className="input-field pl-9"
        />
      </div>

      <div className="card !p-0">
        {loading ? (
          <p className="text-gray-400 p-6">Loading cohort...</p>
        ) : (
          <Table columns={columns} rows={filtered} emptyMessage="No matching interns." />
        )}
      </div>
    </div>
  );
}
