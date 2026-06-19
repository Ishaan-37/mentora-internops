// src/pages/mentor/ReviewSubmission.jsx
import { useState, useEffect } from 'react';
import * as mentorApi from '../../api/mentor.api';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';

const TABS = [
  { value: '',          label: 'All' },
  { value: 'pending',   label: 'Pending review' },
  { value: 'approved',  label: 'Approved' },
  { value: 'rejected',  label: 'Rejected' },
];

export default function ReviewSubmission() {
  const [activeTab, setActiveTab] = useState('pending');
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    mentorApi
      .getSubmissions(activeTab || undefined)
      .then((res) => setSubmissions(res.data.submissions))
      .finally(() => setLoading(false));
  };

  useEffect(load, [activeTab]);

  const openReview = (submission) => {
    setSelected(submission);
    setFeedbackText('');
    setError('');
  };

  const handleDecision = async (decision) => {
    if (decision === 'rejected' && !feedbackText.trim()) {
      setError('Feedback is required when rejecting a submission.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await mentorApi.reviewSubmission(selected.id, decision, feedbackText.trim() || undefined);
      setSelected(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

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
        <p className="text-gray-400">Loading submissions...</p>
      ) : submissions.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400">No submissions here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => (
            <button
              key={s.id}
              onClick={() => openReview(s)}
              className="card w-full text-left flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <p className="font-medium text-gray-900">{s.work_item_title}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {s.intern_name} · Submitted {new Date(s.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <StatusBadge status={s.mentor_review} />
            </button>
          ))}
        </div>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.work_item_title}
      >
        {selected && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">From {selected.intern_name}</p>

            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Type:</span> <span className="capitalize font-medium">{selected.submission_type}</span></p>
              {selected.file_url && (
                <p>
                  <span className="text-gray-500">File:</span>{' '}
                  <a href={selected.file_url} target="_blank" rel="noreferrer" className="text-accent-600 hover:underline">
                    Download
                  </a>
                </p>
              )}
              {selected.external_link && (
                <p>
                  <span className="text-gray-500">Link:</span>{' '}
                  <a href={selected.external_link} target="_blank" rel="noreferrer" className="text-accent-600 hover:underline break-all">
                    {selected.external_link}
                  </a>
                </p>
              )}
              {selected.notes && <p><span className="text-gray-500">Notes:</span> {selected.notes}</p>}
            </div>

            {selected.mentor_review === 'pending' ? (
              <>
                <div>
                  <label className="label">Feedback {selected.mentor_review === 'pending' && '(required to reject)'}</label>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    rows={3}
                    className="input-field"
                    placeholder="Comments for the intern..."
                  />
                </div>

                {error && <p className="text-sm text-danger-600">{error}</p>}

                <div className="flex gap-3">
                  <button
                    onClick={() => handleDecision('approved')}
                    disabled={submitting}
                    className="btn-primary flex-1 !bg-success-600 hover:!bg-success-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleDecision('rejected')}
                    disabled={submitting}
                    className="btn-danger flex-1"
                  >
                    Reject
                  </button>
                </div>
              </>
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-500 mb-1">Feedback given</p>
                <p className="text-sm text-gray-700">{selected.feedback_text || '—'}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
