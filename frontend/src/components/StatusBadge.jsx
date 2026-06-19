// src/components/StatusBadge.jsx
// Small colored pill for work item / submission status.

const STYLES = {
  pending:   'bg-warning-50 text-warning-700 border-warning-200',
  completed: 'bg-success-50 text-success-700 border-success-200',
  overdue:   'bg-danger-50 text-danger-700 border-danger-200',
  approved:  'bg-success-50 text-success-700 border-success-200',
  rejected:  'bg-danger-50 text-danger-700 border-danger-200',
  scheduled: 'bg-accent-50 text-accent-700 border-accent-200',
};

const LABELS = {
  pending: 'Pending',
  completed: 'Completed',
  overdue: 'Overdue',
  approved: 'Approved',
  rejected: 'Rejected',
  scheduled: 'Scheduled',
};

export default function StatusBadge({ status }) {
  const style = STYLES[status] || 'bg-gray-50 text-gray-700 border-gray-200';
  const label = LABELS[status] || status;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${style}`}
    >
      {label}
    </span>
  );
}
