import './Table.css';
import EmptyState from '../EmptyState/EmptyState';

function Table({
  columns = [],
  rows = [],
  emptyMessage = 'Aucune donnée',
  loading = false,
  selectable = false,
  selectedIds,
  onSelectionChange,
}) {
  if (loading) {
    return <div className="table-wrapper"><div className="table-skeleton" /></div>;
  }

  const sel = selectedIds ?? new Set();
  const allSelected = selectable && rows.length > 0 && rows.every((r) => sel.has(r.id));
  const someSelected = selectable && rows.some((r) => sel.has(r.id)) && !allSelected;

  function toggleAll() {
    if (!onSelectionChange) return;
    if (allSelected) {
      const next = new Set(sel);
      rows.forEach((r) => next.delete(r.id));
      onSelectionChange(next);
    } else {
      const next = new Set(sel);
      rows.forEach((r) => next.add(r.id));
      onSelectionChange(next);
    }
  }

  function toggleRow(id) {
    if (!onSelectionChange) return;
    const next = new Set(sel);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  }

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead className="table__head">
          <tr>
            {selectable && (
              <th className="table__th table__th--check">
                <input
                  type="checkbox"
                  className="table__checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onChange={toggleAll}
                  aria-label="Tout sélectionner"
                />
              </th>
            )}
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
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="table__empty-cell">
                <EmptyState message={emptyMessage} />
              </td>
            </tr>
          ) : (
            rows.map((row, i) => {
              const isSelected = selectable && sel.has(row.id);
              return (
                <tr
                  key={row.id ?? i}
                  className={`table__row${isSelected ? ' table__row--selected' : ''}`}
                >
                  {selectable && (
                    <td className="table__td table__td--check">
                      <input
                        type="checkbox"
                        className="table__checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(row.id)}
                        aria-label="Sélectionner"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className="table__td">
                      {col.render ? col.render(row, i) : row[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
