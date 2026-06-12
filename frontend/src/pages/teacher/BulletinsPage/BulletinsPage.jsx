import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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

const AUDIENCE_KEYS = ['CLASS', 'ALL_PARENTS', 'ALL'];

function validate(form, t) {
  const errors = {};
  if (!form.title.trim())   errors.title   = t('bulletins.errors.titleRequired');
  if (!form.content.trim()) errors.content = t('bulletins.errors.contentRequired');
  return errors;
}

function BulletinForm({ form, errors, onChange, classes, t }) {
  const classOptions = classes.map((c) => ({ value: c.id, label: c.name }));
  const audienceOptions = AUDIENCE_KEYS.map((k) => ({ value: k, label: t(`bulletins.audienceOptions.${k}`) }));

  return (
    <div className="bulletin-form">
      <Input
        id="bulletin-title" label={t('bulletins.titleField')} required
        value={form.title} error={errors.title}
        placeholder={t('bulletins.titlePlaceholder')}
        onChange={(e) => onChange('title', e.target.value)}
      />
      <Select
        id="audience" label={t('bulletins.audience')}
        value={form.audience}
        options={audienceOptions}
        onChange={(e) => onChange('audience', e.target.value)}
      />
      {form.audience === 'CLASS' && (
        <Select
          id="classId" label={t('classes.title')}
          value={form.classId}
          placeholder={t('fees.selectClass')}
          options={classOptions}
          onChange={(e) => onChange('classId', e.target.value)}
        />
      )}
      <Textarea
        id="bulletin-content" label={t('bulletins.content')} required rows={6}
        value={form.content} error={errors.content}
        placeholder={t('bulletins.contentPlaceholder')}
        onChange={(e) => onChange('content', e.target.value)}
      />
    </div>
  );
}

function BulletinsPage() {
  const { t } = useTranslation();
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bulletins'] }); toast.success(t('bulletins.toast.created')); closeModal(); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? t('common.errorGeneric')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => bulletinsService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bulletins'] }); toast.success(t('bulletins.toast.updated')); closeModal(); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? t('common.errorGeneric')),
  });

  const publishMutation = useMutation({
    mutationFn: (id) => bulletinsService.publish(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bulletins'] }); toast.success(t('bulletins.toast.published')); setConfirm(null); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? t('common.errorGeneric')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => bulletinsService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bulletins'] }); toast.success(t('bulletins.toast.deleted')); setConfirm(null); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? t('common.errorGeneric')),
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
    const errs = validate(form, t);
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
      label: t('bulletins.columns.title'),
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
      label: t('bulletins.columns.audience'),
      render: (b) => {
        if (b.audience === 'CLASS') return b.class?.name ?? t('classes.title');
        return t(`bulletins.audienceOptions.${b.audience}`, b.audience);
      },
    },
    {
      key: 'status',
      label: t('bulletins.columns.status'),
      render: (b) => (
        <Badge variant={b.publishedAt ? 'success' : 'default'}>
          {b.publishedAt ? t('bulletins.status.PUBLISHED') : t('bulletins.status.DRAFT')}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      label: t('bulletins.columns.publishedAt'),
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
              {t('action.publish')}
            </Button>
          )}
          {!b.publishedAt && (
            <Button size="sm" variant="ghost" onClick={() => openEdit(b)}>{t('action.edit')}</Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setConfirm({ type: 'delete', item: b })}>
            {t('action.delete')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell title={t('bulletins.title')}>
      <PageHeader
        title={t('bulletins.title')}
        subtitle={t('bulletins.subtitle', { count: bulletins.length })}
        actions={<Button icon="+" onClick={openCreate}>{t('bulletins.newBulletin')}</Button>}
      />

      <Table
        columns={columns}
        rows={bulletins}
        loading={isLoading}
        emptyMessage={t('bulletins.noAnnouncements')}
      />

      <OffCanvas
        open={!!modal}
        onClose={closeModal}
        title={modal === 'create' ? t('bulletins.newBulletin') : t('bulletins.editBulletin')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={isSaving}>{t('action.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? t('action.saving') : t('action.save')}
            </Button>
          </>
        }
      >
        <BulletinForm form={form} errors={errors} onChange={handleChange} classes={classes} t={t} />
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
        title={confirm?.type === 'publish' ? t('action.publish') : t('bulletins.deleteBulletin')}
        message={
          confirm?.type === 'publish'
            ? `${t('action.publish')} "${confirm?.item.title}" ?`
            : `${t('common.confirmDelete')} "${confirm?.item.title}" ? ${t('common.deleteWarning')}`
        }
        confirmLabel={confirm?.type === 'publish' ? t('action.publish') : t('action.delete')}
        variant={confirm?.type === 'publish' ? 'primary' : 'danger'}
      />
    </AppShell>
  );
}

export default BulletinsPage;
