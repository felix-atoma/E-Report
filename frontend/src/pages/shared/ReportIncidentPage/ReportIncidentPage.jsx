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
import Textarea from '../../../components/common/Textarea/Textarea';
import Select from '../../../components/common/Select/Select';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
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
  const [panelOpen, setPanelOpen] = useState(false);
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
      closePanel();
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur lors de l\'envoi'),
  });

  function closePanel() {
    setPanelOpen(false);
    setForm(EMPTY);
  }

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit() {
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
          <Button icon="+" onClick={() => setPanelOpen(true)}>Nouveau signalement</Button>
        }
      />

      {/* List */}
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

      {/* OffCanvas form */}
      <OffCanvas
        open={panelOpen}
        onClose={closePanel}
        title="Nouveau signalement"
        subtitle="Votre signalement sera transmis uniquement à l'administration. Votre identité sera protégée."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closePanel} disabled={mutation.isPending}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={mutation.isPending}>
              {mutation.isPending ? 'Envoi…' : 'Envoyer le signalement'}
            </Button>
          </>
        }
      >
        <div className="ri-form">
          <Select
            id="ri-category"
            label="Catégorie"
            required
            value={form.category}
            options={CATEGORIES}
            placeholder="Sélectionner une catégorie"
            onChange={(e) => handleChange('category', e.target.value)}
          />

          <div className="ri-form__row">
            <Input
              id="ri-accused-name"
              label="Nom de la personne concernée"
              value={form.accusedName}
              onChange={(e) => handleChange('accusedName', e.target.value)}
              placeholder="Prénom et nom"
              required
            />
            <Select
              id="ri-accused-role"
              label="Rôle"
              required
              value={form.accusedRole}
              options={ACCUSED_ROLES}
              onChange={(e) => handleChange('accusedRole', e.target.value)}
            />
          </div>

          <Input
            id="ri-title"
            label="Objet du signalement"
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Résumé en une phrase"
            required
          />

          <Textarea
            id="ri-description"
            label="Description détaillée"
            hint="Minimum 20 caractères — quand, où, comment…"
            rows={5}
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Décrivez les faits avec précision : quand, où, comment…"
            required
          />

          <label className="ri-form__checkbox">
            <input
              type="checkbox"
              checked={form.anonymous}
              onChange={(e) => handleChange('anonymous', e.target.checked)}
            />
            <span>
              Soumettre de manière anonyme
              <span className="form-field__hint"> (votre nom ne sera pas visible par l'administration)</span>
            </span>
          </label>
        </div>
      </OffCanvas>
    </AppShell>
  );
}
