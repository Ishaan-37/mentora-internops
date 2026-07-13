// src/pages/admin/ManageUsers.jsx
import { useState, useEffect } from 'react';
import * as adminApi from '../../api/admin.api';
import * as professorApi from '../../api/professor.api';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';

const TABS = [
  { value: 'intern',     label: 'Interns' },
  { value: 'mentor',     label: 'Mentors' },
  { value: 'professor',  label: 'Professors' },
  { value: 'admin',      label: 'Admins' },
  { value: 'assign',     label: 'Assign' },
];

const ADD_LABELS = {
  intern:    'Add Intern',
  mentor:    'Add Mentor',
  professor: 'Add Professor',
  admin:     'Add Admin',
};

export default function ManageUsers() {
  const [activeTab, setActiveTab] = useState('intern');
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [batches, setBatches]     = useState([]);
  const [mentors, setMentors]     = useState([]);

  const load = () => {
    if (activeTab === 'assign') { setLoading(false); return; }
    setLoading(true);
    if (activeTab === 'professor') {
      professorApi
        .getAllProfessors()
        .then((res) => setUsers(res.data.professors.map((p) => ({
          id: p.id,
          professor_id: p.professor_id,
          name: p.name,
          email: p.email,
          is_active: p.is_active,
          created_at: p.created_at,
          department: p.department,
        }))))
        .finally(() => setLoading(false));
      return;
    }
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

  const handleDelete = async (row) => {
    if (!window.confirm(`Deactivate ${row.name}? They will no longer be able to log in.`)) return;
    if (activeTab === 'professor') {
      await professorApi.deleteProfessor(row.professor_id);
    } else {
      await adminApi.deleteUser(row.id);
    }
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
        <button onClick={() => handleDelete(row)} className="text-danger-600 hover:text-danger-700 text-sm font-medium">
          Deactivate
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
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
        {activeTab !== 'assign' && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <i className="ti ti-plus mr-1.5" aria-hidden="true" /> {ADD_LABELS[activeTab]}
          </button>
        )}
      </div>

      {/* Assign tab — special layout */}
      {activeTab === 'assign' ? (
        <AssignTab />
      ) : (
        <div className="card !p-0">
          {loading ? (
            <p className="text-gray-400 p-6">Loading...</p>
          ) : (
            <Table
              columns={columns}
              rows={users}
              emptyMessage={`No ${TABS.find((t) => t.value === activeTab)?.label.toLowerCase()} yet.`}
            />
          )}
        </div>
      )}

      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={ADD_LABELS[activeTab]}
      >
        <AddUserForm
          role={activeTab}
          batches={batches}
          mentors={mentors}
          onSuccess={() => { setShowAddModal(false); load(); }}
        />
      </Modal>
    </div>
  );
}

// ------------------------------------------------------------------
// AssignTab — assign existing intern to a research scholar
// ------------------------------------------------------------------
function AssignTab() {
  const [interns,     setInterns]     = useState([]);
  const [mentors,     setMentors]     = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [internId,    setInternId]    = useState('');
  const [mentorId,    setMentorId]    = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [success,     setSuccess]     = useState('');
  const [error,       setError]       = useState('');

  const loadData = () => {
    adminApi.getAllUsers('intern').then((res) => setInterns(res.data.users));
    adminApi.getAllUsers('mentor').then((res) => setMentors(res.data.users));
    adminApi.getAssignments().then((res) => setAssignments(res.data.assignments));
  };

  useEffect(loadData, []);

  const handleAssign = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!internId || !mentorId) { setError('Please select both an intern and a research scholar.'); return; }
    setSubmitting(true);
    try {
      await adminApi.assignMentor(internId, mentorId);
      setSuccess('Intern assigned successfully.');
      setInternId(''); setMentorId('');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Assignment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const assignmentColumns = [
    { key: 'intern_name',    header: 'Intern',            render: (row) => <span className="font-medium text-gray-900">{row.intern_name}</span> },
    { key: 'batch_name',     header: 'Batch' },
    { key: 'mentor_name',    header: 'Research Scholar' },
    { key: 'professor_name', header: 'Professor',         render: (row) => row.professor_name || <span className="text-gray-400">—</span> },
    {
      key: 'internship_status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.internship_status === 'active' ? 'completed' : 'overdue'} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Assignment form */}
      <div className="card max-w-lg">
        <h3 className="font-display font-semibold text-gray-900 mb-4">
          Assign intern to research scholar
        </h3>
        <form onSubmit={handleAssign} className="space-y-4">
          <div>
            <label className="label">Intern</label>
            <select value={internId} onChange={(e) => setInternId(e.target.value)} className="input-field" required>
              <option value="">Select intern...</option>
              {interns.map((i) => (
                <option key={i.id} value={i.id}>{i.name} — {i.email}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Research Scholar (Mentor)</label>
            <select value={mentorId} onChange={(e) => setMentorId(e.target.value)} className="input-field" required>
              <option value="">Select research scholar...</option>
              {mentors.map((m) => (
                <option key={m.id} value={m.id}>{m.name} — {m.email}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm text-danger-600 flex items-center gap-1.5">
              <i className="ti ti-alert-circle" aria-hidden="true" /> {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-success-700 flex items-center gap-1.5">
              <i className="ti ti-circle-check" aria-hidden="true" /> {success}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Assigning...' : 'Assign Intern'}
          </button>
        </form>
      </div>

      {/* Current assignments table */}
      <div className="card !p-0">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-display font-semibold text-gray-900">Current assignments</h3>
        </div>
        <Table
          columns={assignmentColumns}
          rows={assignments}
          emptyMessage="No intern assignments yet."
        />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// AddUserForm — fields change based on role
// ------------------------------------------------------------------
function AddUserForm({ role, batches, mentors, onSuccess }) {
  const [name,         setName]         = useState('');
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [professorName,setProfessorName]= useState('');
  const [department,   setDepartment]   = useState('');
  const [mentorRole,   setMentorRole]   = useState('research_scholar');
  const [batchId,      setBatchId]      = useState('');
  const [mentorId,     setMentorId]     = useState('');
  const [professors,   setProfessors]   = useState([]);
  const [professorId,  setProfessorId]  = useState('');
  const [error,        setError]        = useState('');
  const [submitting,   setSubmitting]   = useState(false);

  useEffect(() => {
    if (role === 'mentor') {
      professorApi.getAllProfessors().then((res) => setProfessors(res.data.professors));
    }
  }, [role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (role === 'admin') {
        await adminApi.addAdmin({ name, email, password, professorName, department });
      } else if (role === 'professor') {
        await professorApi.addProfessor({ name, email, password, department });
      } else if (role === 'mentor') {
        if (!professorId) { setError('Please select a professor.'); setSubmitting(false); return; }
        await adminApi.addMentor({ name, email, password, mentorRole, professorId });
      } else if (role === 'intern') {
        if (!batchId || !mentorId) { setError('Please select a batch and mentor.'); setSubmitting(false); return; }
        await adminApi.addIntern({ name, email, password, batchId, mentorId });
      }
      onSuccess?.();
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (errors?.length) {
        setError(errors.map((e) => `${e.field}: ${e.message}`).join(' | '));
      } else {
        setError(err.response?.data?.message || 'Failed to create user.');
      }
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
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="input-field" placeholder="Min 8 chars, 1 uppercase, 1 number" required />
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

      {role === 'professor' && (
        <div>
          <label className="label">Department</label>
          <input value={department} onChange={(e) => setDepartment(e.target.value)}
            className="input-field" placeholder="e.g. Mechanical Engineering" required />
        </div>
      )}

      {role === 'mentor' && (
        <>
          <div>
            <label className="label">Mentor role</label>
            <select value={mentorRole} onChange={(e) => setMentorRole(e.target.value)} className="input-field">
              <option value="research_scholar">Research Scholar</option>
              <option value="student">Student</option>
            </select>
          </div>
          <div>
            <label className="label">Assign Professor</label>
            <select value={professorId} onChange={(e) => setProfessorId(e.target.value)} className="input-field" required>
              <option value="">Select professor...</option>
              {professors.map((p) => (
                <option key={p.professor_id} value={p.professor_id}>{p.name}</option>
              ))}
            </select>
          </div>
        </>
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
          <i className="ti ti-alert-circle" aria-hidden="true" /> {error}
        </p>
      )}

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Creating...' : `Add ${role === 'professor' ? 'Professor' : role}`}
      </button>
    </form>
  );
}
