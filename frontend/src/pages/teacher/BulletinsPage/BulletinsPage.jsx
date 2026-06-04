import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { bulletinsService } from '../../../services/bulletinsService';
import { classesService } from '../../../services/classesService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Table from '../../../components/common/Table/Table';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import ConfirmDialog from '../../../components/common/ConfirmDialog/ConfirmDialog';
import Input from '../../../components/common/Input/Input';
import Textarea from '../../../components/common/Textarea/Textarea';
import Select from '../../../components/common/Select/Select';
import Button from '../../../components/common/Button/Button';
import Badge from '../../../components/common/Badge/Badge';
import './BulletinsPage.css';

const EMPTY_FORM = { title: '', content: '', classId: '', audience: 'CLASS' };

const AUDIENCE_OPTIONS = [
  { value: 'CLASS',       label: 'Classe spécifique' },
  { value: 'ALL_PARENTS', label: 'Tous les parents' },
  { value: 'ALL',         label: 'Tout l\'établissement' },
];

function validate(form) {
  const errors = {};
  if (!form.title.trim())   errors.title   = 'Titre requis';
  if (!form.content.trim()) errors.content = 'Contenu requis';
  return errors;
}

function BulletinForm({ form, errors, onChange, classes }) {
  const classOptions = classes.map((c) => ({ value: c.id, label: c.name }));

  return (
    <div className="bulletin-form">
      <Input
        id="bulletin-title" label="Titre" required
        value={form.title} error={errors.title}
        placeholder="ex: Réunion des parents d'élèves"
        onChange={(e) => onChange('title', e.target.value)}
      />
      <Select
        id="audience" label="Destinataires"
        value={form.audience}
        options={AUDIENCE_OPTIONS}
        onChange={(e) => onChange('audience', e.target.value)}
      />
      {form.audience === 'CLASS' && (
        <Select
          id="classId" label="Classe"
          value={form.classId}
          placeholder="Sélectionner une classe"
          options={classOptions}
          onChange={(e) => onChange('classId', e.target.value)}
        />
      )}
      <Textarea
        id="bulletin-content" label="Contenu" required rows={6}
        value={form.content} error={errors.content}
        placeholder="Message à diffuser…"
        onChange={(e) => onChange('content', e.target.value)}
      />
    </div>
  );
}

function BulletinsPage() {
  const qc = useQueryClient();
  const [modal, setModal]       = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm]   = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [errors, setErrors]     = useState({});

  const { data: bulletins = [], isLoading } = useQuery({
    queryKey: ['bulletins'],
    queryFn: () => bulletinsService.list().then((r) => r.data),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesService.list().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => bulletinsService.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bulletins'] }); toast.success('Annonce créée'); closeModal(); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => bulletinsService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bulletins'] }); toast.success('Annonce mise à jour'); closeModal(); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  const publishMutation = useMutation({
    mutationFn: (id) => bulletinsService.publish(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bulletins'] }); toast.success('Annonce publiée'); setConfirm(null); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? 'Erreur de publication'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => bulletinsService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bulletins'] }); toast.success('Annonce supprimée'); setConfirm(null); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? 'Erreur de suppression'),
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setErrors({});
    setModal('create');
  }

  function openEdit(b) {
    setSelected(b);
    setForm({
      title:    b.title    ?? '',
      content:  b.content  ?? '',
      classId:  b.classId  ?? '',
      audience: b.audience ?? 'CLASS',
    });
    setErrors({});
    setModal('edit');
  }

  function closeModal() {
    setModal(null);
    setSelected(null);
    setForm(EMPTY_FORM);
    setErrors({});
  }

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function handleSubmit() {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const payload = {
      title:    form.title,
      content:  form.content,
      audience: form.audience,
      classId:  form.audience === 'CLASS' && form.classId ? form.classId : undefined,
    };
    if (modal === 'create') createMutation.mutate(payload);
    else updateMutation.mutate({ id: selected.id, data: payload });
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const columns = [
    {
      key: 'title',
      label: 'Titre',
      render: (b) => (
        <div>
          <div className="bulletins-table__title">{b.title}</div>
          <div className="bulletins-table__preview">
            {(b.content ?? '').slice(0, 80)}{b.content?.length > 80 ? '…' : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'audience',
      label: 'Destinataires',
      render: (b) => {
        if (b.audience === 'CLASS') return b.class?.name ?? 'Classe';
        if (b.audience === 'ALL_PARENTS') return 'Tous les parents';
        return 'Tout l\'établissement';
      },
    },
    {
      key: 'status',
      label: 'Statut',
      render: (b) => (
        <Badge variant={b.publishedAt ? 'success' : 'default'}>
          {b.publishedAt ? 'Publié' : 'Brouillon'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      label: 'Créé le',
      render: (b) =>
        b.createdAt
          ? new Date(b.createdAt).toLocaleDateString('fr-FR')
          : '—',
    },
    {
      key: 'actions',
      label: '',
      style: { width: '200px', textAlign: 'right' },
      render: (b) => (
        <div className="bulletins-table__actions">
          {!b.publishedAt && (
            <Button size="sm" variant="ghost" onClick={() => setConfirm({ type: 'publish', item: b })}>
              Publier
            </Button>
          )}
          {!b.publishedAt && (
            <Button size="sm" variant="ghost" onClick={() => openEdit(b)}>Modifier</Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setConfirm({ type: 'delete', item: b })}>
            Supprimer
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell title="Annonces">
      <PageHeader
        title="Annonces"
        subtitle={`${bulletins.length} annonce${bulletins.length !== 1 ? 's' : ''}`}
        actions={<Button icon="+" onClick={openCreate}>Nouvelle annonce</Button>}
      />

      <Table
        columns={columns}
        rows={bulletins}
        loading={isLoading}
        emptyMessage="Aucune annonce créée"
      />

      <OffCanvas
        open={!!modal}
        onClose={closeModal}
        title={modal === 'create' ? 'Nouvelle annonce' : 'Modifier l\'annonce'}
        subtitle={modal === 'create' ? 'Rédigez et diffusez un message à votre public cible' : 'Mettez à jour le contenu de cette annonce'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={isSaving}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <BulletinForm form={form} errors={errors} onChange={handleChange} classes={classes} />
      </OffCanvas>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          confirm?.type === 'publish'
            ? publishMutation.mutate(confirm.item.id)
            : deleteMutation.mutate(confirm.item.id)
        }
        loading={publishMutation.isPending || deleteMutation.isPending}
        title={confirm?.type === 'publish' ? 'Publier l\'annonce' : 'Supprimer l\'annonce'}
        message={
          confirm?.type === 'publish'
            ? `Publier "${confirm?.item.title}" ? Elle sera visible par les destinataires.`
            : `Supprimer "${confirm?.item.title}" ? Cette action est irréversible.`
        }
        confirmLabel={confirm?.type === 'publish' ? 'Publier' : 'Supprimer'}
        variant={confirm?.type === 'publish' ? 'primary' : 'danger'}
      />
    </AppShell>
  );
}

export default BulletinsPage;
