const DataTable = ({ columns, data, actions, emptyMessage }) => {
  const safeData = (data || []).filter(item => item != null);

  if (safeData.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        {emptyMessage || "No data available"}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto w-full">
      {/* Added min-w to prevent squishing on mobile */}
      <table className="w-full min-w-[800px]">
        <thead>
          <tr className="border-b border-gray-200 dark:border-slate-700">
            {columns.map((col) => (
              <th key={col.key} className="text-left p-4 text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {col.header || col.label}
              </th>
            ))}
            {actions && (
              <th className="text-left p-4 text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {safeData.map((item, index) => {
            if (!item) return null;
            
            return (
              <tr key={item.id || item._id || index} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                {columns.map((col) => (
                  <td key={col.key} className="p-4">
                    {col.render ? col.render(item) : item[col.key]}
                  </td>
                ))}
                {actions && (
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      {actions(item)}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;