// src/pages/professor/ProfessorDashboard.jsx
import { useState, useEffect } from 'react';
import * as professorApi from '../../api/professor.api';
import StatCard from '../../components/StatCard';
import Table from '../../components/Table';
import { useAuth } from '../../hooks/useAuth';

export default function ProfessorDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [scholars, setScholars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {

  console.log('ProfessorDashboard mounted');

  Promise.all([
    professorApi.getMyProfile(),
    professorApi.getMyScholars()
  ])

  .then(([profileRes, scholarsRes]) => {

    console.log('PROFILE =', profileRes);

    console.log('SCHOLARS =', scholarsRes);

    setProfile(profileRes.data.professor);

    setScholars(scholarsRes.data.scholars);

  })

  .catch((err) => {

    console.log('DASHBOARD ERROR =', err);

    setError(
      err.response?.data?.message ||
      'Failed to load dashboard.'
    );

  })

  .finally(() => {

    console.log('DASHBOARD FINISHED');

    setLoading(false);

  });

}, []);
  if (loading) return <p className="text-gray-400">Loading dashboard...</p>;
  if (error) return <p className="text-danger-600">{error}</p>;

  const totalInterns = scholars.reduce((sum, s) => sum + parseInt(s.intern_count || 0), 0);

  const columns = [
    { key: 'name', header: 'Name', render: (row) => <span className="font-medium text-gray-900">{row.name}</span> },
    { key: 'email', header: 'Email' },
    {
      key: 'mentor_role',
      header: 'Role',
      render: (row) => (row.mentor_role === 'research_scholar' ? 'Research Scholar' : 'Student'),
    },
    { key: 'intern_count', header: 'Interns mentored' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-semibold text-2xl text-gray-900">
          Hello, {user?.name?.split(' ')[0]} 👋
        </h2>
        <p className="text-gray-500 mt-1">
          {profile?.department || 'No department set'} · {scholars.length} research scholars under you
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard icon="ti ti-users" label="Research scholars" value={scholars.length} accent="accent" />
        <StatCard icon="ti ti-school" label="Total interns (via scholars)" value={totalInterns} accent="success" />
      </div>

      <div className="card !p-0">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-display font-semibold text-gray-900">Your research scholars</h3>
        </div>
        <Table
          columns={columns}
          rows={scholars}
          emptyMessage="No research scholars assigned to you yet. Ask your admin to assign one when creating a mentor."
        />
      </div>
    </div>
  );
}
