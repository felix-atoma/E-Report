import './Table.css';
import EmptyState from '../EmptyState/EmptyState';

function Table({ columns = [], rows = [], emptyMessage = 'Aucune donnée', loading = false }) {
  if (loading) {
    return <div className="table-wrapper"><div className="table-skeleton" /></div>;
  }

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead className="table__head">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="table__th" style={col.style}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="table__body">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table__empty-cell">
                <EmptyState message={emptyMessage} />
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={row.id ?? i} className="table__row">
                {columns.map((col) => (
                  <td key={col.key} className="table__td">
                    {col.render ? col.render(row, i) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
