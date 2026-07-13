// src/components/Table.jsx

export default function Table({
  columns,
  rows,
  emptyMessage = "No data to show.",
  emptyIcon = "ti ti-database-off",
}) {
  if (!rows?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <i
            className={`${emptyIcon} text-3xl text-blue-500`}
            aria-hidden="true"
          />
        </div>

        <p className="mt-4 text-gray-500 dark:text-gray-400 font-medium">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-700 shadow-xl">
      <table className="min-w-full">

        {/* Header */}

        <thead>
          <tr className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-white"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}

        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id || i}
              className={`
                ${i % 2 === 0 ? "bg-[#1f2533]" : "bg-[#2a3142]"}
                hover:bg-[#364156]
                transition-all duration-200
              `}
            >
              {columns.map((col) => {
                const value = col.render
                  ? col.render(row)
                  : row[col.key];

                return (
                  <td
                    key={col.key}
                    className="px-6 py-5 whitespace-nowrap"
                  >
                    <div
                      className="
                        inline-flex
                        items-center
                        rounded-lg
                        bg-blue-600/20
                        border
                        border-blue-500/40
                        px-4
                        py-2
                        text-white
                        font-semibold
                        transition-all
                        duration-200
                        hover:bg-blue-600
                      "
                    >
                      {row[col.key]}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}

      <div className="bg-[#1f2533] border-t border-gray-700 px-6 py-4">
        <span className="rounded-full bg-blue-600 px-4 py-2 text-white text-sm font-semibold">
          {rows.length} {rows.length === 1 ? "record" : "records"}
        </span>
      </div>
    </div>
  );
}