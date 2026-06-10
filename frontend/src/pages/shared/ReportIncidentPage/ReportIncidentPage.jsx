import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { incidentReportsService } from '../../../services/incidentReportsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Select from '../../../components/common/Select/Select';
import './ReportIncidentPage.css';

const CATEGORIES = [
  { value: 'BULLYING',            label: 'Harcèlement / Intimidation' },
  { value: 'HARASSMENT',          label: 'Harcèlement sexuel ou moral' },
  { value: 'DISCRIMINATION',      label: 'Discrimination' },
  { value: 'TEACHER_MISCONDUCT',  label: 'Comportement inapproprié d\'un enseignant' },
  { value: 'STUDENT_MISCONDUCT',  label: 'Comportement inapproprié d\'un élève' },
  { value: 'CHEATING',            label: 'Triche / Fraude scolaire' },
  { value: 'THEFT',               label: 'Vol' },
  { value: 'OTHER',               label: 'Autre' },
];

const ACCUSED_ROLES = [
  { value: 'Élève',      label: 'Élève' },
  { value: 'Enseignant', label: 'Enseignant(e)' },
  { value: 'Autre',      label: 'Autre membre du personnel' },
];

const STATUS_LABEL = {
  PENDING:      { label: 'En attente',   cls: 'ri-status--pending' },
  UNDER_REVIEW: { label: 'En cours',     cls: 'ri-status--review' },
  RESOLVED:     { label: 'Résolu',       cls: 'ri-status--resolved' },
  DISMISSED:    { label: 'Rejeté',       cls: 'ri-status--dismissed' },
};

const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));

const EMPTY = { category: '', title: '', description: '', accusedName: '', accusedRole: 'Élève', anonymous: false };

export default function ReportIncidentPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['incidents', 'mine'],
    queryFn: () => incidentReportsService.mine().then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: (data) => incidentReportsService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents', 'mine'] });
      toast.success('Signalement envoyé à l\'administration');
      setShowForm(false);
      setForm(EMPTY);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur lors de l\'envoi'),
  });

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.category || !form.title || !form.description || !form.accusedName || !form.accusedRole) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (form.description.length < 20) {
      toast.error('La description doit comporter au moins 20 caractères');
      return;
    }
    mutation.mutate({
      category:    form.category,
      title:       form.title,
      description: form.description,
      accusedName: form.accusedName,
      accusedRole: form.accusedRole,
      anonymous:   form.anonymous,
    });
  }

  const isTeacher = user?.role === 'TEACHER';

  return (
    <AppShell title="Signaler un incident">
      <PageHeader
        title="Signaler un incident"
        subtitle="Signalez tout comportement inapproprié à l'administration de manière confidentielle."
        actions={
          !showForm && (
            <Button icon="+" onClick={() => setShowForm(true)}>Nouveau signalement</Button>
          )
        }
      />

      {showForm && (
        <Card className="ri-form-card">
          <div className="ri-form-card__head">
            <h3 className="ri-form-card__title">Nouveau signalement</h3>
            <button className="ri-form-card__close" onClick={() => { setShowForm(false); setForm(EMPTY); }}>✕</button>
          </div>

          <div className="ri-confidential-banner">
            <span className="ri-confidential-banner__icon">🔒</span>
            <span>Ce signalement sera transmis uniquement à l'administration. Votre identité sera protégée.</span>
          </div>

          <form className="ri-form" onSubmit={handleSubmit}>
            <Select
              id="ri-category"
              label="Catégorie *"
              required
              value={form.category}
              options={CATEGORIES}
              placeholder="Sélectionner une catégorie"
              onChange={(e) => handleChange('category', e.target.value)}
            />

            <div className="ri-form__row">
              <Input
                id="ri-accused-name"
                label="Nom de la personne concernée *"
                value={form.accusedName}
                onChange={(e) => handleChange('accusedName', e.target.value)}
                placeholder="Prénom et nom"
                required
              />
              <Select
                id="ri-accused-role"
                label="Rôle *"
                required
                value={form.accusedRole}
                options={ACCUSED_ROLES}
                onChange={(e) => handleChange('accusedRole', e.target.value)}
              />
            </div>

            <Input
              id="ri-title"
              label="Objet du signalement *"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Résumé en une phrase"
              required
            />

            <div className="ri-form__field">
              <label htmlFor="ri-description" className="ri-form__label">Description détaillée * <span className="ri-form__hint">(min. 20 caractères)</span></label>
              <textarea
                id="ri-description"
                className="ri-form__textarea"
                rows={5}
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Décrivez les faits avec précision : quand, où, comment…"
                required
              />
            </div>

            <label className="ri-form__checkbox">
              <input
                type="checkbox"
                checked={form.anonymous}
                onChange={(e) => handleChange('anonymous', e.target.checked)}
              />
              <span>Soumettre de manière anonyme <span className="ri-form__hint">(votre nom ne sera pas visible par l'administration)</span></span>
            </label>

            <div className="ri-form__actions">
              <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setForm(EMPTY); }}>
                Annuler
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Envoi…' : 'Envoyer le signalement'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="ri-list">
        {isLoading ? (
          <p className="ri-empty">Chargement…</p>
        ) : reports.length === 0 ? (
          <div className="ri-empty-state">
            <div className="ri-empty-state__icon">🛡️</div>
            <p className="ri-empty-state__text">Vous n'avez soumis aucun signalement.</p>
            <p className="ri-empty-state__sub">
              {isTeacher
                ? 'Utilisez ce formulaire pour signaler tout comportement inapproprié d\'un élève ou d\'un collègue.'
                : 'Utilisez ce formulaire pour signaler tout comportement inapproprié d\'un camarade ou d\'un enseignant.'}
            </p>
          </div>
        ) : (
          reports.map((r) => {
            const s = STATUS_LABEL[r.status] ?? STATUS_LABEL.PENDING;
            return (
              <Card key={r.id} className="ri-card">
                <div className="ri-card__header">
                  <div className="ri-card__meta">
                    <span className="ri-card__cat">{CAT_LABEL[r.category] ?? r.category}</span>
                    <span className={`ri-status ${s.cls}`}>{s.label}</span>
                    {r.anonymous && <span className="ri-card__anon">Anonyme</span>}
                  </div>
                  <span className="ri-card__date">{new Date(r.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
                <h4 className="ri-card__title">{r.title}</h4>
                <p className="ri-card__accused">Concerné(e) : <strong>{r.accusedName}</strong> — {r.accusedRole}</p>
                <p className="ri-card__desc">{r.description}</p>
                {r.adminNotes && (
                  <div className="ri-card__admin-note">
                    <span className="ri-card__admin-note__label">Note de l'administration :</span>
                    <p>{r.adminNotes}</p>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
