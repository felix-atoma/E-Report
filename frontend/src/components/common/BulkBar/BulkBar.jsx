import Button from '../Button/Button';
import './BulkBar.css';

function BulkBar({ count, onClear, onDelete, loading }) {
  if (count === 0) return null;
  return (
    <div className="bulk-bar">
      <span className="bulk-bar__count">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        {count} sélectionné{count > 1 ? 's' : ''}
      </span>
      <div className="bulk-bar__actions">
        <Button size="sm" variant="ghost" onClick={onClear} disabled={loading}>
          Désélectionner
        </Button>
        <Button size="sm" variant="danger" onClick={onDelete} disabled={loading}>
          {loading ? 'Suppression…' : `Supprimer ${count} élément${count > 1 ? 's' : ''}`}
        </Button>
      </div>
    </div>
  );
}

export default BulkBar;
