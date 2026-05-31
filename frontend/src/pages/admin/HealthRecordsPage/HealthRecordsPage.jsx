import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { healthRecordsService } from '../../../services/healthRecordsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
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
  studentId: '',
  date: '',
  visitType: 'CONSULTATION',
  complaint: '',
  diagnosis: '',
  treatment: '',
  referredToHospital: false,
  hospital: '',
  attendedByName: '',
  notes: '',
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
  const [search, setSearch] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

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
      closePanel();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => healthRecordsService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['health-records'] }),
  });

  function openPanel(record = null) {
    if (record) {
      setEditRecord(record);
      setForm({
        studentId: record.studentId,
        date: record.date?.slice(0, 10) ?? '',
        visitType: record.visitType ?? 'CONSULTATION',
        complaint: record.complaint ?? '',
        diagnosis: record.diagnosis ?? '',
        treatment: record.treatment ?? '',
        referredToHospital: record.referredToHospital ?? false,
        hospital: record.hospital ?? '',
        attendedByName: record.attendedByName ?? '',
        notes: record.notes ?? '',
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
    if (!form.studentId.trim()) e.studentId = 'Requis';
    if (!form.date) e.date = 'Requis';
    setErrors(e);
    return !Object.keys(e).length;
  }

  function handleSubmit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    saveMutation.mutate({
      studentId: form.studentId,
      date: form.date,
      visitType: form.visitType,
      complaint: form.complaint || undefined,
      diagnosis: form.diagnosis || undefined,
      treatment: form.treatment || undefined,
      referredToHospital: form.referredToHospital,
      hospital: form.hospital || undefined,
      attendedByName: form.attendedByName || undefined,
      notes: form.notes || undefined,
    });
  }

  const studentName = (r) => r.student?.user?.name ?? r.student?.admissionNumber ?? r.studentId;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <AppShell title="Dossiers Santé">
      <div className="hr-page">
        <div className="hr-page__header">
          <div>
            <h1 className="hr-page__title">Dossiers Santé</h1>
            <p className="hr-page__subtitle">Visites infirmerie, consultations, accidents</p>
          </div>
          <button className="hr-page__btn-add" onClick={() => openPanel()}>+ Nouvelle visite</button>
        </div>

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

        {/* Cards */}
        {isLoading ? (
          <p className="hr-page__loading">Chargement…</p>
        ) : records.length === 0 ? (
          <div className="hr-page__empty">
            <span className="hr-page__empty-icon">🏥</span>
            <p>Aucun dossier médical enregistré.</p>
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
                {rec.complaint && (
                  <p className="hr-card__complaint"><strong>Plainte :</strong> {rec.complaint}</p>
                )}
                {rec.diagnosis && (
                  <p className="hr-card__diagnosis"><strong>Diagnostic :</strong> {rec.diagnosis}</p>
                )}
                {rec.treatment && (
                  <p className="hr-card__treatment"><strong>Traitement :</strong> {rec.treatment}</p>
                )}
                {rec.hospital && (
                  <p className="hr-card__hospital"><strong>Hôpital :</strong> {rec.hospital}</p>
                )}
                {rec.attendedByName && (
                  <p className="hr-card__attended"><strong>Pris en charge par :</strong> {rec.attendedByName}</p>
                )}
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
      </div>

      {/* OffCanvas Panel */}
      {panelOpen && (
        <div className="hr-panel-overlay" onClick={closePanel}>
          <div className="hr-panel" onClick={(e) => e.stopPropagation()}>
            <div className="hr-panel__header">
              <h2>{editRecord ? 'Modifier la visite' : 'Nouvelle visite'}</h2>
              <button className="hr-panel__close" onClick={closePanel}>✕</button>
            </div>

            <form className="hr-panel__form" onSubmit={handleSubmit}>
              <div className="hr-panel__row2">
                <div className="hr-panel__group">
                  <label>ID Élève *</label>
                  <input
                    value={form.studentId}
                    onChange={(e) => set('studentId', e.target.value)}
                    placeholder="UUID de l'élève"
                    disabled={!!editRecord}
                  />
                  {errors.studentId && <span className="hr-panel__error">{errors.studentId}</span>}
                </div>
                <div className="hr-panel__group">
                  <label>Date *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => set('date', e.target.value)}
                  />
                  {errors.date && <span className="hr-panel__error">{errors.date}</span>}
                </div>
              </div>

              <div className="hr-panel__group">
                <label>Type de visite</label>
                <select value={form.visitType} onChange={(e) => set('visitType', e.target.value)}>
                  {VISIT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div className="hr-panel__group">
                <label>Plainte / Motif</label>
                <input
                  value={form.complaint}
                  onChange={(e) => set('complaint', e.target.value)}
                  placeholder="ex: Maux de tête, fièvre, blessure au genou…"
                />
              </div>

              <div className="hr-panel__group">
                <label>Diagnostic</label>
                <input
                  value={form.diagnosis}
                  onChange={(e) => set('diagnosis', e.target.value)}
                  placeholder="ex: Paludisme, entorse légère…"
                />
              </div>

              <div className="hr-panel__group">
                <label>Traitement</label>
                <input
                  value={form.treatment}
                  onChange={(e) => set('treatment', e.target.value)}
                  placeholder="ex: Doliprane 500mg, pansement…"
                />
              </div>

              <div className="hr-panel__group hr-panel__group--inline">
                <label>
                  <input
                    type="checkbox"
                    checked={form.referredToHospital}
                    onChange={(e) => set('referredToHospital', e.target.checked)}
                  />
                  Évacué vers un hôpital
                </label>
              </div>

              {form.referredToHospital && (
                <div className="hr-panel__group">
                  <label>Nom de l'hôpital</label>
                  <input
                    value={form.hospital}
                    onChange={(e) => set('hospital', e.target.value)}
                    placeholder="ex: CHU Campus, Clinique El Fateh…"
                  />
                </div>
              )}

              <div className="hr-panel__group">
                <label>Pris en charge par</label>
                <input
                  value={form.attendedByName}
                  onChange={(e) => set('attendedByName', e.target.value)}
                  placeholder="Nom de l'infirmier(e) ou médecin"
                />
              </div>

              <div className="hr-panel__group">
                <label>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  rows={2}
                  placeholder="Observations supplémentaires…"
                />
              </div>

              <div className="hr-panel__footer">
                <button type="button" className="hr-panel__btn-cancel" onClick={closePanel}>Annuler</button>
                <button type="submit" className="hr-panel__btn-save" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
