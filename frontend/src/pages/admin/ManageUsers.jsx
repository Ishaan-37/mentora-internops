// src/pages/admin/ManageUsers.jsx
import { useState, useEffect } from 'react';
import * as adminApi from '../../api/admin.api';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';

const TABS = [
  { value: 'intern', label: 'Interns' },
  { value: 'mentor', label: 'Mentors' },
  { value: 'admin',  label: 'Admins' },
];

export default function ManageUsers() {
  const [activeTab, setActiveTab] = useState('intern');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [batches, setBatches] = useState([]);
  const [mentors, setMentors] = useState([]);

  const load = () => {
    setLoading(true);
    adminApi
      .getAllUsers(activeTab)
      .then((res) => setUsers(res.data.users))
      .finally(() => setLoading(false));
  };

  useEffect(load, [activeTab]);

  useEffect(() => {
    if (activeTab === 'intern') {
      adminApi.getAllBatches().then((res) => setBatches(res.data.batches));
      adminApi.getAllUsers('mentor').then((res) => setMentors(res.data.users));
    }
  }, [activeTab]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Deactivate ${name}? They will no longer be able to log in.`)) return;
    await adminApi.deleteUser(id);
    load();
  };

  const columns = [
    { key: 'name', header: 'Name', render: (row) => <span className="font-medium text-gray-900">{row.name}</span> },
    { key: 'email', header: 'Email' },
    {
      key: 'is_active',
      header: 'Status',
      render: (row) => <StatusBadge status={row.is_active ? 'completed' : 'overdue'} />,
    },
    {
      key: 'created_at',
      header: 'Joined',
      render: (row) => new Date(row.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <button
          onClick={() => handleDelete(row.id, row.name)}
          className="text-danger-600 hover:text-danger-700 text-sm font-medium"
        >
          Deactivate
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <i className="ti ti-plus mr-1.5" aria-hidden="true" /> Add {activeTab}
        </button>
      </div>

      <div className="card !p-0">
        {loading ? (
          <p className="text-gray-400 p-6">Loading...</p>
        ) : (
          <Table columns={columns} rows={users} emptyMessage={`No ${activeTab}s yet.`} />
        )}
      </div>

      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={`Add ${activeTab}`}
      >
        <AddUserForm
          role={activeTab}
          batches={batches}
          mentors={mentors}
          onSuccess={() => {
            setShowAddModal(false);
            load();
          }}
        />
      </Modal>
    </div>
  );
}

// ------------------------------------------------------------------
// Inline form — fields change based on role
// ------------------------------------------------------------------
function AddUserForm({ role, batches, mentors, onSuccess }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [professorName, setProfessorName] = useState('');
  const [department, setDepartment] = useState('');
  const [mentorRole, setMentorRole] = useState('research_scholar');
  const [batchId, setBatchId] = useState('');
  const [mentorId, setMentorId] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (role === 'admin') {
        await adminApi.addAdmin({ name, email, password, professorName, department });
      } else if (role === 'mentor') {
        await adminApi.addMentor({ name, email, password, mentorRole });
      } else if (role === 'intern') {
        if (!batchId || !mentorId) {
          setError('Please select a batch and mentor.');
          setSubmitting(false);
          return;
        }
        await adminApi.addIntern({ name, email, password, batchId, mentorId });
      }
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Full name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="input-field" required />
      </div>
      <div>
        <label className="label">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" required />
      </div>
      <div>
        <label className="label">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field"
          placeholder="Min 8 chars, 1 uppercase, 1 number"
          required
        />
      </div>

      {role === 'admin' && (
        <>
          <div>
            <label className="label">Professor name</label>
            <input value={professorName} onChange={(e) => setProfessorName(e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="label">Department</label>
            <input value={department} onChange={(e) => setDepartment(e.target.value)} className="input-field" />
          </div>
        </>
      )}

      {role === 'mentor' && (
        <div>
          <label className="label">Mentor role</label>
          <select value={mentorRole} onChange={(e) => setMentorRole(e.target.value)} className="input-field">
            <option value="research_scholar">Research Scholar</option>
            <option value="student">Student</option>
          </select>
        </div>
      )}

      {role === 'intern' && (
        <>
          <div>
            <label className="label">Batch</label>
            <select value={batchId} onChange={(e) => setBatchId(e.target.value)} className="input-field" required>
              <option value="">Select batch...</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Assign mentor</label>
            <select value={mentorId} onChange={(e) => setMentorId(e.target.value)} className="input-field" required>
              <option value="">Select mentor...</option>
              {mentors.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {error && (
        <p className="text-sm text-danger-600 flex items-center gap-1.5">
          <i className="ti ti-alert-circle" aria-hidden="true" />
          {error}
        </p>
      )}

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Creating...' : `Add ${role}`}
      </button>
    </form>
  );
}
