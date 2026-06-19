// src/components/Table.jsx
// Generic table. columns: [{ key, header, render? }]

export default function Table({ columns, rows, emptyMessage = 'No data to show.' }) {
  if (!rows?.length) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-6">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-gray-100">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id || i} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className="px-6 py-4 text-sm text-gray-700">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
