import './StatusPill.css';

const STATUS_MAP = {
  PAID:    { label: 'À jour',           variant: 'paid' },
  PARTIAL: { label: 'Partiel',          variant: 'partial' },
  UNPAID:  { label: 'Non payé',         variant: 'unpaid' },
  EXEMPT:  { label: 'Exonéré',          variant: 'exempt' },
  DRAFT:   { label: 'Brouillon',        variant: 'gray' },
  REVIEW:  { label: 'En révision',      variant: 'warning' },
  PUBLISHED: { label: 'Publié',         variant: 'success' },
  PENDING: { label: 'En attente',       variant: 'warning' },
  SENT:    { label: 'Envoyé',           variant: 'success' },
  FAILED:  { label: 'Échec',            variant: 'danger' },
  HELD_UNPAID:  { label: 'Retenu (impayé)',  variant: 'danger' },
  HELD_PARTIAL: { label: 'Retenu (partiel)', variant: 'warning' },
};

function StatusPill({ status }) {
  const cfg = STATUS_MAP[status] ?? { label: status, variant: 'gray' };
  return (
    <span className={`status-pill status-pill--${cfg.variant}`}>
      {cfg.label}
    </span>
  );
}

export default StatusPill;
