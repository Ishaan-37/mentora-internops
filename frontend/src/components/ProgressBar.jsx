// src/components/ProgressBar.jsx

export default function ProgressBar({ value, size = 'md' }) {
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5';
  const color =
    value >= 75 ? 'bg-success-500' : value >= 40 ? 'bg-warning-500' : 'bg-danger-500';

  return (
    <div className="w-full">
      <div className={`w-full bg-gray-100 rounded-full ${height} overflow-hidden`}>
        <div
          className={`${height} ${color} rounded-full transition-all duration-300`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
