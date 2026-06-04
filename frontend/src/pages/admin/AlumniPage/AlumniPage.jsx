import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { alumniService } from '../../../services/alumniService';
import { downloadCSV } from '../../../utils/csvExport';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import Input from '../../../components/common/Input/Input';
import Button from '../../../components/common/Button/Button';
import Card from '../../../components/common/Card/Card';
import './AlumniPage.css';

const EXAM_TYPES   = ['CEPD', 'BEPC', 'BAC', 'BTS', 'Autre'];
const EXAM_RESULTS = [
  'Admis', 'Admis avec mention', 'Mention Assez Bien',
  'Mention Bien', 'Mention Très Bien', 'Ajourné', 'Absent',
];

const EMPTY_FORM = {
  studentId: '', graduationYear: new Date().getFullYear(),
  lastClass: '', diplomaNumber: '', examType: '', examSession: '',
  examResult: '', nationalExamCenter: '', furtherEducation: '',
  currentEmployer: '', contactEmail: '', contactPhone: '', notes: '',
};

export default function AlumniPage() {
  const qc = useQueryClient();
  const [search, setSearch]       = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [errors, setErrors]       = useState({});

  const { data: alumni = [], isLoading } = useQuery({
    queryKey: ['alumni', search, yearFilter],
    queryFn: () =>
      alumniService
        .list({ search: search || undefined, year: yearFilter || undefined })
        .then((r) => r.data),
  });

  const upsertMutation = useMutation({
    mutationFn: (data) => alumniService.upsert(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alumni'] });
      toast.success(isEditing ? 'Fiche modifiée' : 'Ancien élève enregistré');
      closePanel();
    },
    onError: () => toast.error('Une erreur est survenue'),
  });

  const deleteMutation = useMutation({
    mutationFn: (studentId) => alumniService.remove(studentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alumni'] });
      toast.success('Fiche supprimée');
    },
    onError: () => toast.error('Impossible de supprimer cette fiche'),
  });

  function openPanel(record = null) {
    setIsEditing(!!record);
    if (record) {
      setForm({
        studentId:          record.studentId,
        graduationYear:     record.graduationYear,
        lastClass:          record.lastClass          ?? '',
        diplomaNumber:      record.diplomaNumber      ?? '',
        examType:           record.examType           ?? '',
        examSession:        record.examSession        ?? '',
        examResult:         record.examResult         ?? '',
        nationalExamCenter: record.nationalExamCenter ?? '',
        furtherEducation:   record.furtherEducation   ?? '',
        currentEmployer:    record.currentEmployer    ?? '',
        contactEmail:       record.contactEmail       ?? '',
        contactPhone:       record.contactPhone       ?? '',
        notes:              record.notes              ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setIsEditing(false);
    setForm(EMPTY_FORM);
    setErrors({});
  }

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const e = {};
    if (!form.studentId.trim()) e.studentId      = 'Ce champ est requis';
    if (!form.graduationYear)   e.graduationYear  = 'Ce champ est requis';
    setErrors(e);
    return !Object.keys(e).length;
  }

  function handleSubmit() {
    if (!validate()) return;
    const payload = { ...form };
    if (!payload.graduationYear) delete payload.graduationYear;
    upsertMutation.mutate(payload);
  }

  const years = [...new Set(alumni.map((a) => a.graduationYear))].sort((a, b) => b - a);

  const subtitle = alumni.length > 0
    ? `${alumni.length} diplômé${alumni.length !== 1 ? 's' : ''} enregistré${alumni.length !== 1 ? 's' : ''}`
    : 'Aucun ancien élève enregistré — ajoutez le premier';

  const exportCSV = () => {
    const rows = alumni.map((a) => ({
      Matricule:           a.student?.admissionNumber ?? '',
      Nom:                 a.student?.user?.name ?? '',
      Promotion:           a.graduationYear,
      'Dernière classe':   a.lastClass          ?? '',
      "Type d'examen":     a.examType           ?? '',
      Session:             a.examSession        ?? '',
      Résultat:            a.examResult         ?? '',
      'N° Diplôme':        a.diplomaNumber      ?? '',
      'Poursuite études':  a.furtherEducation   ?? '',
      Téléphone:           a.contactPhone       ?? '',
      Email:               a.contactEmail       ?? '',
    }));
    downloadCSV(rows, `anciens-eleves-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <AppShell>
      <PageHeader
        title="Anciens Élèves"
        subtitle={subtitle}
        actions={
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <Button variant="ghost" size="sm" onClick={exportCSV}>↓ CSV</Button>
            <Button size="sm" onClick={() => openPanel()}>+ Ajouter</Button>
          </div>
        }
      />

      {/* Filters */}
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
          <option value="">Toutes les promotions</option>
          {years.map((y) => (
            <option key={y} value={y}>Promotion {y}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <p className="alumni-page__loading">Chargement…</p>
      ) : alumni.length === 0 ? (
        <Card>
          <div className="alumni-page__empty">
            <span className="alumni-page__empty-icon">🎓</span>
            <p>Aucun ancien élève enregistré.</p>
            <Button size="sm" onClick={() => openPanel()} style={{ marginTop: '1rem' }}>
              + Ajouter le premier diplômé
            </Button>
          </div>
        </Card>
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
                  onClick={() => {
                    if (window.confirm('Supprimer cet enregistrement ?'))
                      deleteMutation.mutate(rec.studentId);
                  }}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fiche Alumni OffCanvas */}
      <OffCanvas
        open={panelOpen}
        onClose={closePanel}
        title="Fiche Alumni"
        subtitle={
          isEditing
            ? 'Mettez à jour les informations de cet ancien élève'
            : 'Enregistrez un diplômé dans la base des anciens élèves'
        }
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closePanel} disabled={upsertMutation.isPending}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <div className="alumni-form">
          {/* Student ID */}
          <Input
            label="ID Élève"
            required
            placeholder="Copiez l'identifiant depuis la page Élèves"
            value={form.studentId}
            onChange={(e) => set('studentId', e.target.value)}
            error={errors.studentId}
            disabled={isEditing}
          />

          {/* Graduation year + last class */}
          <div className="alumni-form__row2">
            <Input
              label="Année de diplomation"
              required
              type="number"
              min="1990"
              max="2100"
              value={form.graduationYear}
              onChange={(e) => set('graduationYear', parseInt(e.target.value, 10))}
              error={errors.graduationYear}
            />
            <Input
              label="Dernière classe"
              placeholder="ex : Terminale D"
              value={form.lastClass}
              onChange={(e) => set('lastClass', e.target.value)}
            />
          </div>

          {/* Exam section header */}
          <p className="alumni-form__section-label">Résultats aux examens</p>

          {/* Exam type + result */}
          <div className="alumni-form__row2">
            <div className="form-field">
              <label className="form-field__label">Type d'examen</label>
              <select
                className="alumni-form__select"
                value={form.examType}
                onChange={(e) => set('examType', e.target.value)}
              >
                <option value="">—</option>
                {EXAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-field__label">Résultat</label>
              <select
                className="alumni-form__select"
                value={form.examResult}
                onChange={(e) => set('examResult', e.target.value)}
              >
                <option value="">—</option>
                {EXAM_RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Session + centre */}
          <div className="alumni-form__row2">
            <Input
              label="Session"
              placeholder="ex : 2024 Session Normale"
              value={form.examSession}
              onChange={(e) => set('examSession', e.target.value)}
            />
            <Input
              label="Centre d'examen"
              placeholder="ex : Lycée de Lomé"
              value={form.nationalExamCenter}
              onChange={(e) => set('nationalExamCenter', e.target.value)}
            />
          </div>

          <Input
            label="N° Diplôme"
            placeholder="Numéro officiel du diplôme"
            value={form.diplomaNumber}
            onChange={(e) => set('diplomaNumber', e.target.value)}
          />

          {/* Tracking section */}
          <p className="alumni-form__section-label">Suivi post-diplomation</p>

          <Input
            label="Poursuite d'études"
            placeholder="ex : Université de Lomé, BTS Informatique…"
            value={form.furtherEducation}
            onChange={(e) => set('furtherEducation', e.target.value)}
          />

          <Input
            label="Employeur actuel"
            placeholder="Entreprise ou administration"
            value={form.currentEmployer}
            onChange={(e) => set('currentEmployer', e.target.value)}
          />

          {/* Contact */}
          <div className="alumni-form__row2">
            <Input
              label="Téléphone"
              placeholder="+228…"
              value={form.contactPhone}
              onChange={(e) => set('contactPhone', e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              placeholder="email@example.com"
              value={form.contactEmail}
              onChange={(e) => set('contactEmail', e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="form-field">
            <label className="form-field__label">Notes</label>
            <textarea
              className="alumni-form__textarea"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              placeholder="Observations…"
            />
          </div>
        </div>
      </OffCanvas>
    </AppShell>
  );
}
