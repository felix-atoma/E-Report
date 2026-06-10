import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { incidentReportsService } from '../../../services/incidentReportsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Select from '../../../components/common/Select/Select';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import Loading from '../../../components/common/Loading/Loading';
import './IncidentsPage.css';

const STATUS_OPTIONS = [
  { value: '',             label: 'Tous les statuts' },
  { value: 'PENDING',      label: 'En attente' },
  { value: 'UNDER_REVIEW', label: 'En cours d\'examen' },
  { value: 'RESOLVED',     label: 'Résolu' },
  { value: 'DISMISSED',    label: 'Rejeté' },
];

const STATUS_META = {
  PENDING:      { label: 'En attente',        cls: 'inc-status--pending' },
  UNDER_REVIEW: { label: 'En cours',          cls: 'inc-status--review' },
  RESOLVED:     { label: 'Résolu',            cls: 'inc-status--resolved' },
  DISMISSED:    { label: 'Rejeté',            cls: 'inc-status--dismissed' },
};

const CAT_LABEL = {
  BULLYING:            'Harcèlement / Intimidation',
  HARASSMENT:          'Harcèlement sexuel ou moral',
  DISCRIMINATION:      'Discrimination',
  TEACHER_MISCONDUCT:  'Comportement — Enseignant',
  STUDENT_MISCONDUCT:  'Comportement — Élève',
  CHEATING:            'Triche / Fraude',
  THEFT:               'Vol',
  OTHER:               'Autre',
};

const NEW_STATUS_OPTIONS = [
  { value: 'PENDING',      label: 'En attente' },
  { value: 'UNDER_REVIEW', label: 'En cours d\'examen' },
  { value: 'RESOLVED',     label: 'Résolu' },
  { value: 'DISMISSED',    label: 'Rejeté' },
];

export default function IncidentsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['incidents', statusFilter],
    queryFn: () => incidentReportsService.list(statusFilter ? { status: statusFilter } : {}).then((r) => r.data),
    staleTime: 0,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => incidentReportsService.updateStatus(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Signalement mis à jour');
      setSelected(null);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => incidentReportsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Signalement supprimé');
      setSelected(null);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  function openDetail(report) {
    setSelected(report);
    setNewStatus(report.status);
    setAdminNotes(report.adminNotes ?? '');
  }

  function handleUpdate() {
    updateMutation.mutate({ id: selected.id, data: { status: newStatus, adminNotes } });
  }

  const pending = reports.filter((r) => r.status === 'PENDING').length;

  return (
    <AppShell title="Signalements d'incidents">
      <PageHeader
        title="Signalements d'incidents"
        subtitle={`${reports.length} signalement${reports.length !== 1 ? 's' : ''}${pending > 0 ? ` · ${pending} en attente de traitement` : ''}`}
      />

      <div className="inc-toolbar">
        <Select
          id="inc-status-filter"
          label=""
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
        <div className="inc-legend">
          {Object.entries(STATUS_META).map(([k, v]) => (
            <span key={k} className={`inc-status ${v.cls}`}>{v.label} ({reports.filter((r) => r.status === k).length})</span>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Loading />
      ) : reports.length === 0 ? (
        <div className="inc-empty">
          <div className="inc-empty__icon">🛡️</div>
          <p>Aucun signalement{statusFilter ? ' pour ce statut' : ''}.</p>
        </div>
      ) : (
        <div className="inc-list">
          {reports.map((r) => {
            const s = STATUS_META[r.status] ?? STATUS_META.PENDING;
            const reporter = r.anonymous ? 'Anonyme' : (r.reportedBy?.name ?? '—');
            return (
              <Card key={r.id} className="inc-card" onClick={() => openDetail(r)}>
                <div className="inc-card__header">
                  <div className="inc-card__meta">
                    <span className="inc-card__cat">{CAT_LABEL[r.category] ?? r.category}</span>
                    <span className={`inc-status ${s.cls}`}>{s.label}</span>
                  </div>
                  <span className="inc-card__date">{new Date(r.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
                <h4 className="inc-card__title">{r.title}</h4>
                <div className="inc-card__info">
                  <span>Concerné(e) : <strong>{r.accusedName}</strong> ({r.accusedRole})</span>
                  <span>Signalé par : <strong>{reporter}</strong>{r.reportedBy?.role ? ` — ${r.reportedBy.role === 'TEACHER' ? 'Enseignant' : 'Élève'}` : ''}</span>
                </div>
                <p className="inc-card__desc">{r.description.length > 160 ? r.description.slice(0, 160) + '…' : r.description}</p>
              </Card>
            );
          })}
        </div>
      )}

      {selected && (
        <OffCanvas
          open
          onClose={() => setSelected(null)}
          title="Détail du signalement"
          size="md"
          footer={
            <>
              <Button
                variant="danger"
                size="sm"
                onClick={() => { if (window.confirm('Supprimer ce signalement ?')) deleteMutation.mutate(selected.id); }}
                disabled={deleteMutation.isPending}
              >
                Supprimer
              </Button>
              <Button variant="ghost" onClick={() => setSelected(null)}>Fermer</Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </>
          }
        >
          <div className="inc-detail">
            <div className="inc-detail__row">
              <span className="inc-detail__label">Catégorie</span>
              <span className="inc-detail__value">{CAT_LABEL[selected.category] ?? selected.category}</span>
            </div>
            <div className="inc-detail__row">
              <span className="inc-detail__label">Concerné(e)</span>
              <span className="inc-detail__value"><strong>{selected.accusedName}</strong> — {selected.accusedRole}</span>
            </div>
            <div className="inc-detail__row">
              <span className="inc-detail__label">Signalé par</span>
              <span className="inc-detail__value">
                {selected.anonymous ? 'Anonyme' : selected.reportedBy?.name ?? '—'}
                {!selected.anonymous && selected.reportedBy?.role && (
                  <span style={{ color: '#9ca3af', marginLeft: 4 }}>
                    ({selected.reportedBy.role === 'TEACHER' ? 'Enseignant' : 'Élève'})
                  </span>
                )}
              </span>
            </div>
            <div className="inc-detail__row">
              <span className="inc-detail__label">Date</span>
              <span className="inc-detail__value">{new Date(selected.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>

            <div className="inc-detail__section">
              <div className="inc-detail__label">Objet</div>
              <p className="inc-detail__title">{selected.title}</p>
            </div>

            <div className="inc-detail__section">
              <div className="inc-detail__label">Description</div>
              <p className="inc-detail__desc">{selected.description}</p>
            </div>

            <div className="inc-detail__divider" />

            <Select
              id="inc-new-status"
              label="Changer le statut"
              value={newStatus}
              options={NEW_STATUS_OPTIONS}
              onChange={(e) => setNewStatus(e.target.value)}
            />

            <div className="inc-detail__section">
              <label htmlFor="inc-admin-notes" className="inc-detail__label">Notes internes (admin uniquement)</label>
              <textarea
                id="inc-admin-notes"
                className="inc-detail__textarea"
                rows={4}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Observations, actions prises, décision finale…"
              />
            </div>
          </div>
        </OffCanvas>
      )}
    </AppShell>
  );
}
