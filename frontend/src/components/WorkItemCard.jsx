// src/components/WorkItemCard.jsx
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';

const TYPE_ICONS = {
  assignment: 'ti ti-file-text',
  task:       'ti ti-tool',
  project:    'ti ti-rocket',
};

const TYPE_LABELS = {
  assignment: 'Assignment',
  task:       'Task',
  project:    'Project',
};

export default function WorkItemCard({ item, basePath = '/intern/work-items' }) {
  const deadline = new Date(item.deadline);
  const formattedDeadline = deadline.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <Link
      to={`${basePath}/${item.id}`}
      className="card flex items-center justify-between hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center text-lg flex-shrink-0">
          <i className={TYPE_ICONS[item.type]} aria-hidden="true" />
        </div>
        <div>
          <p className="font-medium text-gray-900">{item.title}</p>
          <p className="text-sm text-gray-500">{TYPE_LABELS[item.type]} · Due {formattedDeadline}</p>
        </div>
      </div>
      <StatusBadge status={item.status} />
    </Link>
  );
}
