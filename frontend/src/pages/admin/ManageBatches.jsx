// src/pages/admin/ManageBatches.jsx
import { useState, useEffect } from 'react';
import * as adminApi from '../../api/admin.api';
import Table from '../../components/Table';
import Modal from '../../components/Modal';

export default function ManageBatches() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi
      .getAllBatches()
      .then((res) => setBatches(res.data.batches))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (new Date(endDate) <= new Date(startDate)) {
      setError('End date must be after start date.');
      return;
    }

    setSubmitting(true);
    try {
      await adminApi.createBatch({ name, startDate, endDate });
      setShowModal(false);
      setName(''); setStartDate(''); setEndDate('');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create batch.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: 'name', header: 'Batch name', render: (row) => <span className="font-medium text-gray-900">{row.name}</span> },
    {
      key: 'start_date',
      header: 'Start',
      render: (row) => new Date(row.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    },
    {
      key: 'end_date',
      header: 'End',
      render: (row) => new Date(row.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    },
    { key: 'intern_count', header: 'Interns' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <i className="ti ti-plus mr-1.5" aria-hidden="true" /> New batch
        </button>
      </div>

      <div className="card !p-0">
        {loading ? (
          <p className="text-gray-400 p-6">Loading...</p>
        ) : (
          <Table columns={columns} rows={batches} emptyMessage="No batches created yet." />
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create batch">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Batch name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="e.g. Summer 2026"
              required
            />
          </div>
          <div>
            <label className="label">Start date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="label">End date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field" required />
          </div>

          {error && <p className="text-sm text-danger-600">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Creating...' : 'Create batch'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
