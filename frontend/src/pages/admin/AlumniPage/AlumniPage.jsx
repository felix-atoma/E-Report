import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alumniService } from '../../../services/alumniService';
import './AlumniPage.css';

const EXAM_TYPES = ['CEPD', 'BEPC', 'BAC', 'BTS', 'Autre'];
const EXAM_RESULTS = ['Admis', 'Admis avec mention', 'Mention Assez Bien', 'Mention Bien', 'Mention Très Bien', 'Ajourné', 'Absent'];

const EMPTY_FORM = {
  studentId: '',
  graduationYear: new Date().getFullYear(),
  lastClass: '',
  diplomaNumber: '',
  examType: '',
  examSession: '',
  examResult: '',
  nationalExamCenter: '',
  furtherEducation: '',
  currentEmployer: '',
  contactEmail: '',
  contactPhone: '',
  notes: '',
};

export default function AlumniPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const { data: alumni = [], isLoading } = useQuery({
    queryKey: ['alumni', search, yearFilter],
    queryFn: () =>
      alumniService.list({ search: search || undefined, year: yearFilter || undefined }).then((r) => r.data),
  });

  const upsertMutation = useMutation({
    mutationFn: (data) => alumniService.upsert(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alumni'] });
      closePanel();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (studentId) => alumniService.remove(studentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alumni'] }),
  });

  function openPanel(record = null) {
    if (record) {
      setForm({
        studentId: record.studentId,
        graduationYear: record.graduationYear,
        lastClass: record.lastClass ?? '',
        diplomaNumber: record.diplomaNumber ?? '',
        examType: record.examType ?? '',
        examSession: record.examSession ?? '',
        examResult: record.examResult ?? '',
        nationalExamCenter: record.nationalExamCenter ?? '',
        furtherEducation: record.furtherEducation ?? '',
        currentEmployer: record.currentEmployer ?? '',
        contactEmail: record.contactEmail ?? '',
        contactPhone: record.contactPhone ?? '',
        notes: record.notes ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
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
    if (!form.graduationYear) e.graduationYear = 'Requis';
    setErrors(e);
    return !Object.keys(e).length;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    const payload = { ...form };
    if (!payload.graduationYear) delete payload.graduationYear;
    upsertMutation.mutate(payload);
  }

  const years = [...new Set(alumni.map((a) => a.graduationYear))].sort((a, b) => b - a);

  return (
    <div className="alumni-page">
      <div className="alumni-page__header">
        <div>
          <h1 className="alumni-page__title">Anciens Élèves</h1>
          <p className="alumni-page__subtitle">{alumni.length} diplômé(s) enregistré(s)</p>
        </div>
        <button className="alumni-page__btn-add" onClick={() => openPanel()}>
          + Ajouter
        </button>
      </div>

      <div className="alumni-page__filters">
        <input
          className="alumni-page__search"
          placeholder="Rechercher par nom ou matricule…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="alumni-page__year-filter"
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
        >
          <option value="">Toutes les années</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="alumni-page__loading">Chargement…</p>
      ) : alumni.length === 0 ? (
        <div className="alumni-page__empty">
          <span className="alumni-page__empty-icon">🎓</span>
          <p>Aucun ancien élève enregistré.</p>
        </div>
      ) : (
        <div className="alumni-page__grid">
          {alumni.map((rec) => (
            <div key={rec.id} className="alumni-card">
              <div className="alumni-card__top">
                {rec.student?.photo ? (
                  <img src={rec.student.photo} alt="" className="alumni-card__photo" />
                ) : (
                  <div className="alumni-card__avatar">
                    {(rec.student?.user?.name ?? rec.student?.admissionNumber ?? '?')[0].toUpperCase()}
                  </div>
                )}
                <div className="alumni-card__info">
                  <strong className="alumni-card__name">
                    {rec.student?.user?.name ?? rec.student?.admissionNumber ?? '—'}
                  </strong>
                  <span className="alumni-card__number">{rec.student?.admissionNumber}</span>
                  <span className="alumni-card__year">Promotion {rec.graduationYear}</span>
                </div>
              </div>

              {rec.lastClass && (
                <div className="alumni-card__row">
                  <span className="alumni-card__label">Dernière classe</span>
                  <span>{rec.lastClass}</span>
                </div>
              )}
              {rec.examType && (
                <div className="alumni-card__row">
                  <span className="alumni-card__label">{rec.examType}</span>
                  <span className={`alumni-card__result alumni-card__result--${rec.examResult === 'Ajourné' ? 'fail' : 'pass'}`}>
                    {rec.examResult ?? '—'}
                  </span>
                </div>
              )}
              {rec.furtherEducation && (
                <div className="alumni-card__row">
                  <span className="alumni-card__label">Poursuite</span>
                  <span>{rec.furtherEducation}</span>
                </div>
              )}
              {rec.contactPhone && (
                <div className="alumni-card__row">
                  <span className="alumni-card__label">Contact</span>
                  <span>{rec.contactPhone}</span>
                </div>
              )}

              <div className="alumni-card__actions">
                <button className="alumni-card__btn-edit" onClick={() => openPanel(rec)}>Modifier</button>
                <button
                  className="alumni-card__btn-del"
                  onClick={() => { if (window.confirm('Supprimer cet enregistrement ?')) deleteMutation.mutate(rec.studentId); }}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* OffCanvas panel */}
      {panelOpen && (
        <div className="alumni-panel-overlay" onClick={closePanel}>
          <div className="alumni-panel" onClick={(e) => e.stopPropagation()}>
            <div className="alumni-panel__header">
              <h2>Fiche Alumni</h2>
              <button className="alumni-panel__close" onClick={closePanel}>✕</button>
            </div>

            <form className="alumni-panel__form" onSubmit={handleSubmit}>
              <div className="alumni-panel__group">
                <label>ID Élève *</label>
                <input
                  value={form.studentId}
                  onChange={(e) => set('studentId', e.target.value)}
                  placeholder="Saisir l'ID de l'élève"
                />
                {errors.studentId && <span className="alumni-panel__error">{errors.studentId}</span>}
                <small>Copiez l'identifiant depuis la page Élèves</small>
              </div>

              <div className="alumni-panel__row2">
                <div className="alumni-panel__group">
                  <label>Année de diplomation *</label>
                  <input
                    type="number"
                    value={form.graduationYear}
                    onChange={(e) => set('graduationYear', parseInt(e.target.value, 10))}
                    min="1990"
                    max="2100"
                  />
                  {errors.graduationYear && <span className="alumni-panel__error">{errors.graduationYear}</span>}
                </div>
                <div className="alumni-panel__group">
                  <label>Dernière classe</label>
                  <input
                    value={form.lastClass}
                    onChange={(e) => set('lastClass', e.target.value)}
                    placeholder="ex: Terminale D"
                  />
                </div>
              </div>

              <div className="alumni-panel__row2">
                <div className="alumni-panel__group">
                  <label>Type d'examen</label>
                  <select value={form.examType} onChange={(e) => set('examType', e.target.value)}>
                    <option value="">—</option>
                    {EXAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="alumni-panel__group">
                  <label>Résultat</label>
                  <select value={form.examResult} onChange={(e) => set('examResult', e.target.value)}>
                    <option value="">—</option>
                    {EXAM_RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div className="alumni-panel__row2">
                <div className="alumni-panel__group">
                  <label>Session</label>
                  <input
                    value={form.examSession}
                    onChange={(e) => set('examSession', e.target.value)}
                    placeholder="ex: 2024 Session Normale"
                  />
                </div>
                <div className="alumni-panel__group">
                  <label>Centre d'examen</label>
                  <input
                    value={form.nationalExamCenter}
                    onChange={(e) => set('nationalExamCenter', e.target.value)}
                    placeholder="ex: Lycée de Lomé"
                  />
                </div>
              </div>

              <div className="alumni-panel__group">
                <label>N° Diplôme</label>
                <input
                  value={form.diplomaNumber}
                  onChange={(e) => set('diplomaNumber', e.target.value)}
                  placeholder="Numéro du diplôme"
                />
              </div>

              <div className="alumni-panel__group">
                <label>Poursuite d'études</label>
                <input
                  value={form.furtherEducation}
                  onChange={(e) => set('furtherEducation', e.target.value)}
                  placeholder="ex: Université de Lomé, BTS Informatique…"
                />
              </div>

              <div className="alumni-panel__group">
                <label>Employeur actuel</label>
                <input
                  value={form.currentEmployer}
                  onChange={(e) => set('currentEmployer', e.target.value)}
                  placeholder="Entreprise ou administration"
                />
              </div>

              <div className="alumni-panel__row2">
                <div className="alumni-panel__group">
                  <label>Téléphone</label>
                  <input
                    value={form.contactPhone}
                    onChange={(e) => set('contactPhone', e.target.value)}
                    placeholder="+228…"
                  />
                </div>
                <div className="alumni-panel__group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => set('contactEmail', e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div className="alumni-panel__group">
                <label>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  rows={3}
                  placeholder="Observations…"
                />
              </div>

              <div className="alumni-panel__footer">
                <button type="button" className="alumni-panel__btn-cancel" onClick={closePanel}>Annuler</button>
                <button type="submit" className="alumni-panel__btn-save" disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
