// src/components/StatCard.jsx
// Reusable stat box for dashboards. icon is a Tabler classname e.g. "ti ti-users"

export default function StatCard({ icon, label, value, accent = 'accent' }) {
  const accentClasses = {
    accent:  'bg-accent-50 text-accent-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    danger:  'bg-danger-50 text-danger-600',
  };

  return (
    <div className="card flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-xl ${accentClasses[accent]}`}>
        <i className={icon} aria-hidden="true" />
      </div>
      <div>
        <p className="text-2xl font-display font-semibold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}
