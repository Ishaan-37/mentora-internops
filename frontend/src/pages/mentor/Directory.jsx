// src/pages/mentor/Directory.jsx
// All mentors/research scholars institution-wide for the RISE program.
// Identity + intern count only — never another mentor's interns' work.

import { useState, useEffect } from 'react';
import * as mentorApi from '../../api/mentor.api';
import Table from '../../components/Table';
import { useAuth } from '../../hooks/useAuth';

const ROLE_LABELS = { research_scholar: 'Research Scholar', student: 'Student' };

export default function Directory() {
  const { user } = useAuth();
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    mentorApi
      .getMentorDirectory()
      .then((res) => setMentors(res.data.mentors))
      .finally(() => setLoading(false));
  }, []);

  const filtered = mentors.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      key: 'name',
      header: 'Mentor',
      render: (row) => (
        <span className="font-medium text-gray-900">
          {row.name}
          {row.name === user?.name && <span className="text-accent-600 text-xs ml-2">(You)</span>}
        </span>
      ),
    },
    {
      key: 'mentor_role',
      header: 'Role',
      render: (row) => ROLE_LABELS[row.mentor_role] || row.mentor_role,
    },
    { key: 'intern_count', header: 'Interns mentored' },
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">
        {mentors.length} mentors across the RISE program.
      </p>

      <div className="relative max-w-sm">
        <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search mentors..."
          className="input-field pl-9"
        />
      </div>

      <div className="card !p-0">
        {loading ? (
          <p className="text-gray-400 p-6">Loading directory...</p>
        ) : (
          <Table columns={columns} rows={filtered} emptyMessage="No matching mentors." />
        )}
      </div>
    </div>
  );
}
