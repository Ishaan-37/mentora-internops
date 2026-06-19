// src/pages/mentor/InternDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as mentorApi from '../../api/mentor.api';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import CreateWorkItemForm from './CreateWorkItemForm';

export default function InternDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [intern, setIntern] = useState(null);
  const [workItems, setWorkItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const load = () => {
    setLoading(true);
    mentorApi
      .getInternDetail(id)
      .then((res) => {
        setIntern(res.data.intern);
        setWorkItems(res.data.workItems);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  if (loading) return <p className="text-gray-400">Loading...</p>;
  if (!intern) return <p className="text-danger-600">Intern not found, or not assigned to you.</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
      >
        <i className="ti ti-arrow-left" aria-hidden="true" /> Back
      </button>

      <div className="card flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-xl text-gray-900">{intern.name}</h2>
          <p className="text-sm text-gray-500 mt-1">{intern.email} · {intern.batch_name}</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <i className="ti ti-plus mr-1.5" aria-hidden="true" /> New work item
        </button>
      </div>

      <div className="card !p-0">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-display font-semibold text-gray-900">Work items</h3>
        </div>
        {workItems.length === 0 ? (
          <p className="text-gray-400 p-6 text-center">No work items assigned yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {workItems.map((item) => (
              <div key={item.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 capitalize">
                    {item.type} · Due {new Date(item.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create work item">
        <CreateWorkItemForm
          internId={id}
          onSuccess={() => {
            setShowCreateModal(false);
            load();
          }}
        />
      </Modal>
    </div>
  );
}
