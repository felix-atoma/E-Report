import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { healthRecordsService } from '../../../services/healthRecordsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import Input from '../../../components/common/Input/Input';
import Button from '../../../components/common/Button/Button';
import './HealthRecordsPage.css';

const VISIT_TYPES = [
  { value: 'CONSULTATION', label: 'Consultation', color: '#1d4ed8', bg: '#dbeafe' },
  { value: 'ACCIDENT',     label: 'Accident',     color: '#b91c1c', bg: '#fee2e2' },
  { value: 'VACCINATION',  label: 'Vaccination',  color: '#15803d', bg: '#dcfce7' },
  { value: 'DRESSING',     label: 'Pansement',    color: '#a16207', bg: '#fef3c7' },
  { value: 'EVACUATION',   label: 'Évacuation',   color: '#c2410c', bg: '#ffedd5' },
  { value: 'OTHER',        label: 'Autre',        color: '#6b7280', bg: '#f3f4f6' },
];

const EMPTY_FORM = {
  studentId: '', date: '', visitType: 'CONSULTATION',
  complaint: '', diagnosis: '', treatment: '',
  referredToHospital: false, hospital: '', attendedByName: '', notes: '',
};

function VisitTypeBadge({ type }) {
  const cfg = VISIT_TYPES.find((t) => t.value === type) ?? VISIT_TYPES[5];
  return (
    <span className="hr-badge" style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  );
}

export default function HealthRecordsPage() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch]         = useState('');
  const [panelOpen, setPanelOpen]   = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [errors, setErrors]         = useState({});

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['health-records', typeFilter, search],
    queryFn: () =>
      healthRecordsService
        .list({ type: typeFilter || undefined, search: search || undefined })
        .then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editRecord
        ? healthRecordsService.update(editRecord.id, data)
        : healthRecordsService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health-records'] });
      toast.success(editRecord ? 'Visite modifiée' : 'Visite enregistrée');
      closePanel();
    },
    onError: () => toast.error('Une erreur est survenue'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => healthRecordsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health-records'] });
      toast.success('Dossier supprimé');
    },
    onError: () => toast.error('Impossible de supprimer ce dossier'),
  });

  function openPanel(record = null) {
    if (record) {
      setEditRecord(record);
      setForm({
        studentId:         record.studentId,
        date:              record.date?.slice(0, 10) ?? '',
        visitType:         record.visitType ?? 'CONSULTATION',
        complaint:         record.complaint         ?? '',
        diagnosis:         record.diagnosis         ?? '',
        treatment:         record.treatment         ?? '',
        referredToHospital: record.referredToHospital ?? false,
        hospital:          record.hospital          ?? '',
        attendedByName:    record.attendedByName    ?? '',
        notes:             record.notes             ?? '',
      });
    } else {
      setEditRecord(null);
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setEditRecord(null);
    setForm(EMPTY_FORM);
    setErrors({});
  }

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const e = {};
    if (!form.studentId.trim()) e.studentId = 'Ce champ est requis';
    if (!form.date)             e.date       = 'Ce champ est requis';
    setErrors(e);
    return !Object.keys(e).length;
  }

  function handleSubmit() {
    if (!validate()) return;
    saveMutation.mutate({
      studentId:          form.studentId,
      date:               form.date,
      visitType:          form.visitType,
      complaint:          form.complaint          || undefined,
      diagnosis:          form.diagnosis          || undefined,
      treatment:          form.treatment          || undefined,
      referredToHospital: form.referredToHospital,
      hospital:           form.hospital           || undefined,
      attendedByName:     form.attendedByName     || undefined,
      notes:              form.notes              || undefined,
    });
  }

  const studentName = (r) => r.student?.user?.name ?? r.student?.admissionNumber ?? r.studentId;
  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <AppShell>
      <PageHeader
        title="Dossiers Santé"
        subtitle="Visites infirmerie, consultations, accidents"
        actions={<Button size="sm" onClick={() => openPanel()}>+ Nouvelle visite</Button>}
      />

      {/* Filters */}
      <div className="hr-page__filters">
        <input
          className="hr-page__search"
          placeholder="Rechercher par élève, plainte, diagnostic…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="hr-page__tabs">
          <button
            className={`hr-page__tab${typeFilter === '' ? ' active' : ''}`}
            onClick={() => setTypeFilter('')}
          >
            Tous
          </button>
          {VISIT_TYPES.map((t) => (
            <button
              key={t.value}
              className={`hr-page__tab${typeFilter === t.value ? ' active' : ''}`}
              onClick={() => setTypeFilter(t.value)}
              style={typeFilter === t.value ? { background: t.bg, color: t.color, borderColor: t.color } : {}}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Records */}
      {isLoading ? (
        <p className="hr-page__loading">Chargement…</p>
      ) : records.length === 0 ? (
        <div className="hr-page__empty">
          <span className="hr-page__empty-icon">🏥</span>
          <p>Aucun dossier médical enregistré.</p>
          <Button size="sm" onClick={() => openPanel()} style={{ marginTop: '1rem' }}>
            + Enregistrer une visite
          </Button>
        </div>
      ) : (
        <div className="hr-page__list">
          {records.map((rec) => (
            <div key={rec.id} className="hr-card">
              <div className="hr-card__top">
                <span className="hr-card__student">{studentName(rec)}</span>
                <span className="hr-card__date">{fmtDate(rec.date)}</span>
                <VisitTypeBadge type={rec.visitType} />
                {rec.referredToHospital && (
                  <span className="hr-card__evacuation-badge">Évacué</span>
                )}
              </div>
              {rec.complaint     && <p className="hr-card__complaint"><strong>Plainte :</strong> {rec.complaint}</p>}
              {rec.diagnosis     && <p className="hr-card__diagnosis"><strong>Diagnostic :</strong> {rec.diagnosis}</p>}
              {rec.treatment     && <p className="hr-card__treatment"><strong>Traitement :</strong> {rec.treatment}</p>}
              {rec.hospital      && <p className="hr-card__hospital"><strong>Hôpital :</strong> {rec.hospital}</p>}
              {rec.attendedByName && <p className="hr-card__attended"><strong>Pris en charge par :</strong> {rec.attendedByName}</p>}
              <div className="hr-card__actions">
                <button className="hr-card__btn-edit" onClick={() => openPanel(rec)}>Modifier</button>
                <button
                  className="hr-card__btn-del"
                  onClick={() => { if (window.confirm('Supprimer ce dossier ?')) deleteMutation.mutate(rec.id); }}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New / Edit visit OffCanvas */}
      <OffCanvas
        open={panelOpen}
        onClose={closePanel}
        title={editRecord ? 'Modifier la visite' : 'Nouvelle visite'}
        subtitle={
          editRecord
            ? `Modification du dossier de ${studentName(editRecord)}`
            : 'Enregistrez une visite à l\'infirmerie ou un incident médical'
        }
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closePanel} disabled={saveMutation.isPending}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <div className="hr-form">
          {/* Student ID + Date */}
          <div className="hr-form__row2">
            <Input
              label="ID Élève"
              required
              placeholder="UUID de l'élève"
              value={form.studentId}
              onChange={(e) => set('studentId', e.target.value)}
              error={errors.studentId}
              disabled={!!editRecord}
            />
            <Input
              label="Date"
              required
              type="date"
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              error={errors.date}
            />
          </div>

          {/* Visit type */}
          <div className="form-field">
            <label className="form-field__label">Type de visite</label>
            <div className="hr-form__type-grid">
              {VISIT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`hr-form__type-btn${form.visitType === t.value ? ' active' : ''}`}
                  style={form.visitType === t.value ? { background: t.bg, color: t.color, borderColor: t.color } : {}}
                  onClick={() => set('visitType', t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Plainte / Motif"
            placeholder="ex : Maux de tête, fièvre, blessure au genou…"
            value={form.complaint}
            onChange={(e) => set('complaint', e.target.value)}
          />

          <Input
            label="Diagnostic"
            placeholder="ex : Paludisme, entorse légère…"
            value={form.diagnosis}
            onChange={(e) => set('diagnosis', e.target.value)}
          />

          <Input
            label="Traitement"
            placeholder="ex : Doliprane 500mg, pansement…"
            value={form.treatment}
            onChange={(e) => set('treatment', e.target.value)}
          />

          {/* Referred to hospital */}
          <label className="hr-form__checkbox-label">
            <input
              type="checkbox"
              checked={form.referredToHospital}
              onChange={(e) => set('referredToHospital', e.target.checked)}
            />
            Évacué vers un hôpital
          </label>

          {form.referredToHospital && (
            <Input
              label="Nom de l'hôpital"
              placeholder="ex : CHU Campus, Clinique El Fateh…"
              value={form.hospital}
              onChange={(e) => set('hospital', e.target.value)}
            />
          )}

          <Input
            label="Pris en charge par"
            placeholder="Nom de l'infirmier(e) ou médecin"
            value={form.attendedByName}
            onChange={(e) => set('attendedByName', e.target.value)}
          />

          <div className="form-field">
            <label className="form-field__label">Notes</label>
            <textarea
              className="hr-form__textarea"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              placeholder="Observations supplémentaires…"
            />
          </div>
        </div>
      </OffCanvas>
    </AppShell>
  );
}
