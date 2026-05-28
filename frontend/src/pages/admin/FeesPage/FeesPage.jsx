import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { feesService } from '../../../services/feesService';
import { classesService } from '../../../services/classesService';
import { useInstitution } from '../../../context/InstitutionContext';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Table from '../../../components/common/Table/Table';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import ConfirmDialog from '../../../components/common/ConfirmDialog/ConfirmDialog';
import Input from '../../../components/common/Input/Input';
import Select from '../../../components/common/Select/Select';
import Button from '../../../components/common/Button/Button';
import Badge from '../../../components/common/Badge/Badge';
import './FeesPage.css';

const TERM_KEYS = ['TRIMESTRE_1', 'TRIMESTRE_2', 'TRIMESTRE_3', 'SEMESTRE_1', 'SEMESTRE_2', 'ANNUEL'];

const FEE_TYPES = [
  { value: 'TUITION',      label: 'Scolarité' },
  { value: 'REGISTRATION', label: 'Inscription' },
  { value: 'EXAM',         label: 'Examen' },
  { value: 'CANTEEN',      label: 'Cantine' },
  { value: 'TRANSPORT',    label: 'Transport' },
  { value: 'OTHER',        label: 'Autre' },
];

const EMPTY_FORM = { name: '', amount: '', feeType: 'TUITION', description: '', term: '' };

function FeeForm({ form, errors, onChange, termOptions }) {
  const { t } = useTranslation();
  return (
    <div className="fee-form">
      <Input
        id="fee-name" label={t('fees.feeName')} required
        value={form.name} error={errors.name}
        placeholder={t('fees.feePlaceholder')}
        onChange={(e) => onChange('name', e.target.value)}
      />
      <div className="fee-form__row">
        <Input
          id="fee-amount" label={t('fees.amount')} type="number" min="0" required
          value={form.amount} error={errors.amount}
          placeholder={t('fees.amountPlaceholder')}
          onChange={(e) => onChange('amount', e.target.value)}
        />
        <Select
          id="fee-type" label="Type" required
          value={form.feeType}
          options={FEE_TYPES}
          onChange={(e) => onChange('feeType', e.target.value)}
        />
      </div>
      <div className="fee-form__row">
        <Select
          id="fee-term" label={t('fees.period')}
          value={form.term}
          placeholder={t('fees.allYear')}
          options={termOptions}
          onChange={(e) => onChange('term', e.target.value)}
        />
      </div>
      <Input
        id="fee-desc" label={t('fees.description')}
        value={form.description}
        placeholder={t('fees.optional')}
        onChange={(e) => onChange('description', e.target.value)}
      />
    </div>
  );
}

function AssignModal({ fee, classes, open, onClose }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [classId, setClassId] = useState('');

  const assign = useMutation({
    mutationFn: () => feesService.assignToClass(fee.id, { classId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fees'] });
      toast.success(t('fees.toast.assigned'));
      setClassId('');
      onClose();
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t('fees.toast.error')),
  });

  const classOptions = classes.map((c) => ({ value: c.id, label: c.name }));

  return (
    <OffCanvas
      open={open}
      onClose={onClose}
      title={t('fees.assignTitle', { name: fee?.name })}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('action.cancel')}</Button>
          <Button onClick={() => assign.mutate()} disabled={!classId || assign.isPending}>
            {assign.isPending ? t('action.assigning') : t('action.assign')}
          </Button>
        </>
      }
    >
      <Select
        id="assign-class"
        label={t('fees.class')}
        value={classId}
        placeholder={t('fees.selectClass')}
        options={classOptions}
        onChange={(e) => setClassId(e.target.value)}
      />
    </OffCanvas>
  );
}

function FeesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { institution } = useInstitution();
  const [modal, setModal]       = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm]   = useState(null);
  const [assignFee, setAssign]  = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [errors, setErrors]     = useState({});

  const termOptions = TERM_KEYS.map((k) => ({ value: k, label: t(`fees.terms.${k}`) }));

  function validate(f) {
    const errs = {};
    if (!f.name.trim())  errs.name   = t('fees.errors.nameRequired');
    if (!f.amount)       errs.amount = t('fees.errors.amountRequired');
    else if (isNaN(Number(f.amount)) || Number(f.amount) <= 0)
      errs.amount = t('fees.errors.amountInvalid');
    return errs;
  }

  const { data: fees = [], isLoading } = useQuery({
    queryKey: ['fees'],
    queryFn: () => feesService.list().then((r) => r.data),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesService.list().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => feesService.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fees'] }); toast.success(t('fees.toast.created')); closeModal(); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? t('fees.toast.error')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => feesService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fees'] }); toast.success(t('fees.toast.updated')); closeModal(); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? t('fees.toast.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => feesService.deactivate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fees'] }); toast.success(t('fees.toast.deleted')); setConfirm(null); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? t('fees.toast.error')),
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setErrors({});
    setModal('create');
  }

  function openEdit(fee) {
    setSelected(fee);
    setForm({
      name:        fee.name        ?? '',
      amount:      String(fee.amount ?? ''),
      feeType:     fee.feeType     ?? 'TUITION',
      description: fee.description ?? '',
      term:        fee.term        ?? '',
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
      name:         form.name,
      amount:       Number(form.amount),
      feeType:      form.feeType || 'TUITION',
      academicYear: institution?.academicYear || undefined,
      description:  form.description || undefined,
      term:         form.term        || undefined,
    };
    if (modal === 'create') createMutation.mutate(payload);
    else updateMutation.mutate({ id: selected.id, data: payload });
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const columns = [
    {
      key: 'name',
      label: t('fees.fee'),
      render: (f) => (
        <div>
          <div className="fees-table__name">{f.name}</div>
          {f.description && <div className="fees-table__desc">{f.description}</div>}
        </div>
      ),
    },
    {
      key: 'amount',
      label: t('fees.amount'),
      render: (f) => (
        <span className="fees-table__amount">
          {Number(f.amount).toLocaleString('fr-FR')} FCFA
        </span>
      ),
    },
    {
      key: 'term',
      label: t('fees.period'),
      render: (f) =>
        f.term
          ? <Badge variant="info">{t(`fees.terms.${f.term}`, f.term)}</Badge>
          : <span className="fees-table__empty">{t('fees.annual')}</span>,
    },
    {
      key: 'classes',
      label: t('fees.assignedClasses'),
      render: (f) => f._count?.feeAssignments ?? f.classCount ?? '—',
    },
    {
      key: 'actions',
      label: '',
      style: { width: '180px', textAlign: 'right' },
      render: (f) => (
        <div className="fees-table__actions">
          <Button size="sm" variant="ghost" onClick={() => setAssign(f)}>{t('action.assign')}</Button>
          <Button size="sm" variant="ghost" onClick={() => openEdit(f)}>{t('action.edit')}</Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirm(f)}>{t('action.delete')}</Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell title={t('fees.pageTitle')}>
      <PageHeader
        title={t('fees.pageTitle')}
        subtitle={t('fees.count', { count: fees.length })}
        actions={<Button icon="+" onClick={openCreate}>{t('fees.newFee')}</Button>}
      />

      <Table
        columns={columns}
        rows={fees}
        loading={isLoading}
        emptyMessage={t('fees.newFee')}
      />

      <OffCanvas
        open={!!modal}
        onClose={closeModal}
        title={modal === 'create' ? t('fees.createTitle') : t('fees.editTitle')}
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
        <FeeForm form={form} errors={errors} onChange={handleChange} termOptions={termOptions} />
      </OffCanvas>

      <AssignModal
        fee={assignFee}
        classes={classes}
        open={!!assignFee}
        onClose={() => setAssign(null)}
      />

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => deleteMutation.mutate(confirm.id)}
        loading={deleteMutation.isPending}
        title={t('action.delete')}
        message={`${t('action.delete')} "${confirm?.name}" ?`}
        confirmLabel={t('action.delete')}
        variant="danger"
      />
    </AppShell>
  );
}

export default FeesPage;
