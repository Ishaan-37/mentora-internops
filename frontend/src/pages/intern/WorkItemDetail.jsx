// src/pages/intern/WorkItemDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as internApi from '../../api/intern.api';
import StatusBadge from '../../components/StatusBadge';
import SubmissionForm from '../../components/SubmissionForm';

const TYPE_LABELS = { assignment: 'Assignment', task: 'Task', project: 'Project' };

export default function WorkItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const load = () => {
    setLoading(true);
    internApi
      .getWorkItemDetail(id)
      .then((res) => setItem(res.data.workItem))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  if (loading) return <p className="text-gray-400">Loading...</p>;
  if (!item) return <p className="text-danger-600">Work item not found.</p>;

  const hasSubmission = !!item.submission_id;
  const deadline = new Date(item.deadline);

  return (
    <div className="max-w-2xl space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
      >
        <i className="ti ti-arrow-left" aria-hidden="true" /> Back
      </button>

      <div className="card">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs font-medium text-accent-600 uppercase tracking-wide mb-1">
              {TYPE_LABELS[item.type]}
            </p>
            <h2 className="font-display font-semibold text-xl text-gray-900">{item.title}</h2>
          </div>
          <StatusBadge status={item.status} />
        </div>

        <p className="text-gray-600 mt-3 whitespace-pre-wrap">{item.description}</p>

        <div className="flex items-center gap-6 mt-5 pt-5 border-t border-gray-100 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <i className="ti ti-clock" aria-hidden="true" />
            Due {deadline.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="flex items-center gap-1.5">
            <i className="ti ti-user" aria-hidden="true" />
            {item.mentor_name}
          </span>
        </div>
      </div>

      {hasSubmission && (
        <div className="card">
          <h3 className="font-display font-semibold text-gray-900 mb-3">Your submission</h3>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-gray-500">Type:</span>{' '}
              <span className="text-gray-800 font-medium capitalize">{item.submission_type}</span>
            </p>
            {item.file_url && (
              <p>
                <span className="text-gray-500">File:</span>{' '}
                <a href={item.file_url} target="_blank" rel="noreferrer" className="text-accent-600 hover:underline">
                  Download
                </a>
              </p>
            )}
            {item.external_link && (
              <p>
                <span className="text-gray-500">Link:</span>{' '}
                <a href={item.external_link} target="_blank" rel="noreferrer" className="text-accent-600 hover:underline break-all">
                  {item.external_link}
                </a>
              </p>
            )}
            {item.submission_notes && (
              <p><span className="text-gray-500">Notes:</span> {item.submission_notes}</p>
            )}
            <p className="flex items-center gap-2 pt-2">
              <span className="text-gray-500">Review status:</span>
              <StatusBadge status={item.mentor_review} />
            </p>
            {item.feedback_text && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-500 mb-1">Mentor feedback</p>
                <p className="text-gray-700">{item.feedback_text}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {(!hasSubmission || item.mentor_review === 'rejected') && (
        <div className="card">
          <h3 className="font-display font-semibold text-gray-900 mb-4">
            {hasSubmission ? 'Re-submit your work' : 'Submit your work'}
          </h3>
          {justSubmitted ? (
            <p className="text-sm text-success-700 flex items-center gap-2">
              <i className="ti ti-circle-check" aria-hidden="true" /> Submitted successfully.
            </p>
          ) : (
            <SubmissionForm
              workItemId={item.id}
              onSuccess={() => {
                setJustSubmitted(true);
                load();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
