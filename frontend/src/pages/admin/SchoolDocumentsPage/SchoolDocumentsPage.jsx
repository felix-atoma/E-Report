import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { schoolDocumentsService } from '../../../services/schoolDocumentsService';
import { uploadService } from '../../../services/uploadService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Loading from '../../../components/common/Loading/Loading';
import EmptyState from '../../../components/common/EmptyState/EmptyState';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import './SchoolDocumentsPage.css';

const CATEGORIES = [
  { value: '',            label: 'Tous' },
  { value: 'CIRCULAR',   label: 'Circulaire' },
  { value: 'REPORT',     label: 'Rapport' },
  { value: 'CONTRACT',   label: 'Contrat' },
  { value: 'SCHEDULE',   label: 'Emploi du temps' },
  { value: 'FINANCIAL',  label: 'Finance' },
  { value: 'EXAM',       label: 'Examen' },
  { value: 'STAFF',      label: 'Personnel' },
  { value: 'STUDENT',    label: 'Élèves' },
  { value: 'OTHER',      label: 'Autre' },
];

const CAT_ICONS = {
  CIRCULAR: '📢', REPORT: '📊', CONTRACT: '📝', SCHEDULE: '📅',
  FINANCIAL: '💰', EXAM: '🎓', STAFF: '👤', STUDENT: '🎒', OTHER: '📁',
};

const EMPTY_FORM = { title: '', category: 'OTHER', description: '', isPublic: false };

export default function SchoolDocumentsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['school-documents', filter],
    queryFn: () => schoolDocumentsService.list(filter ? { category: filter } : {}).then((r) => r.data),
  });

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: async () => {
      let fileUrl = form.fileUrl;
      if (file) {
        setUploading(true);
        const res = await uploadService.upload(file, 'document');
        fileUrl = res.data?.url ?? res.data;
        setUploading(false);
      }
      if (!fileUrl) throw new Error('Veuillez sélectionner un fichier');
      return schoolDocumentsService.create({ ...form, fileUrl });
    },
    onSuccess: () => {
      toast.success('Document ajouté');
      qc.invalidateQueries(['school-documents']);
      setOpen(false);
      setForm(EMPTY_FORM);
      setFile(null);
    },
    onError: (e) => {
      setUploading(false);
      toast.error(e.message ?? 'Erreur lors de l\'enregistrement');
    },
  });

  const { mutate: remove } = useMutation({
    mutationFn: (id) => schoolDocumentsService.remove(id),
    onSuccess: () => { toast.success('Document supprimé'); qc.invalidateQueries(['school-documents']); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const { mutate: togglePublic } = useMutation({
    mutationFn: ({ id, isPublic }) => schoolDocumentsService.update(id, { isPublic }),
    onSuccess: () => qc.invalidateQueries(['school-documents']),
  });

  const confirmDelete = (doc) => {
    if (window.confirm(`Supprimer "${doc.title}" ?`)) remove(doc.id);
  };

  if (isLoading) return <AppShell title="Documents"><Loading /></AppShell>;

  return (
    <AppShell title="Documents scolaires">
      <PageHeader
        title="Documents scolaires"
        subtitle="Circulaires, rapports, contrats et autres documents officiels"
        actions={<Button icon="+" onClick={() => setOpen(true)}>Ajouter un document</Button>}
      />

      {/* Category filter */}
      <div className="sdoc-filters">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            className={`sdoc-filter${filter === c.value ? ' active' : ''}`}
            onClick={() => setFilter(c.value)}
          >
            {c.value && <span>{CAT_ICONS[c.value]}</span>}
            {c.label}
          </button>
        ))}
      </div>

      {docs.length === 0 ? (
        <EmptyState message="Aucun document pour le moment." />
      ) : (
        <div className="sdoc-grid">
          {docs.map((doc) => (
            <Card key={doc.id} className="sdoc-card">
              <div className="sdoc-card__icon">{CAT_ICONS[doc.category] ?? '📁'}</div>
              <div className="sdoc-card__body">
                <strong className="sdoc-card__title">{doc.title}</strong>
                {doc.description && <p className="sdoc-card__desc">{doc.description}</p>}
                <div className="sdoc-card__meta">
                  <span className="sdoc-badge">{CATEGORIES.find((c) => c.value === doc.category)?.label ?? doc.category}</span>
                  {doc.isPublic && <span className="sdoc-badge sdoc-badge--public">🌐 Public</span>}
                  {doc.fileSize && <span className="sdoc-badge">{(doc.fileSize / 1024).toFixed(0)} KB</span>}
                </div>
              </div>
              <div className="sdoc-card__actions">
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="sdoc-action-btn sdoc-action-btn--view">
                  Ouvrir
                </a>
                <button
                  type="button"
                  className={`sdoc-action-btn ${doc.isPublic ? 'sdoc-action-btn--unpublish' : 'sdoc-action-btn--publish'}`}
                  onClick={() => togglePublic({ id: doc.id, isPublic: !doc.isPublic })}
                >
                  {doc.isPublic ? 'Priver' : 'Publier'}
                </button>
                <button
                  type="button"
                  className="sdoc-action-btn sdoc-action-btn--delete"
                  onClick={() => confirmDelete(doc)}
                >
                  Supprimer
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Document OffCanvas */}
      <OffCanvas open={open} onClose={() => { setOpen(false); setForm(EMPTY_FORM); setFile(null); }} title="Ajouter un document">
        <div className="sdoc-form">
          <div className="sdoc-form__field">
            <label>Titre *</label>
            <input
              type="text"
              placeholder="Ex : Circulaire de rentrée 2025"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="sdoc-form__field">
            <label>Catégorie</label>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.filter((c) => c.value).map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="sdoc-form__field">
            <label>Description</label>
            <textarea
              rows={3}
              placeholder="Description optionnelle…"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="sdoc-form__field">
            <label>Fichier *</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png"
              onChange={(e) => setFile(e.target.files[0] ?? null)}
            />
            {file && <span className="sdoc-file-name">{file.name}</span>}
          </div>
          <div className="sdoc-form__check">
            <input
              id="sdoc-public"
              type="checkbox"
              checked={form.isPublic}
              onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))}
            />
            <label htmlFor="sdoc-public">Visible par les parents et élèves</label>
          </div>
          <Button
            onClick={() => save()}
            disabled={saving || uploading || !form.title}
            style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
          >
            {uploading ? 'Téléchargement…' : saving ? 'Enregistrement…' : 'Ajouter le document'}
          </Button>
        </div>
      </OffCanvas>
    </AppShell>
  );
}
