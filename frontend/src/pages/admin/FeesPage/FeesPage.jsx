import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { feesService } from '../../../services/feesService';
import { classesService } from '../../../services/classesService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Table from '../../../components/common/Table/Table';
import Modal from '../../../components/common/Modal/Modal';
import ConfirmDialog from '../../../components/common/ConfirmDialog/ConfirmDialog';
import Input from '../../../components/common/Input/Input';
import Select from '../../../components/common/Select/Select';
import Button from '../../../components/common/Button/Button';
import Badge from '../../../components/common/Badge/Badge';
import './FeesPage.css';

const TERM_OPTIONS = [
  { value: 'TRIMESTRE_1', label: '1er trimestre' },
  { value: 'TRIMESTRE_2', label: '2ème trimestre' },
  { value: 'TRIMESTRE_3', label: '3ème trimestre' },
  { value: 'SEMESTRE_1',  label: '1er semestre' },
  { value: 'SEMESTRE_2',  label: '2ème semestre' },
  { value: 'ANNUEL',      label: 'Annuel' },
];

const EMPTY_FORM = { name: '', amount: '', description: '', term: '' };

function validate(form) {
  const errors = {};
  if (!form.name.trim())  errors.name   = 'Nom requis';
  if (!form.amount)       errors.amount = 'Montant requis';
  else if (isNaN(Number(form.amount)) || Number(form.amount) <= 0)
    errors.amount = 'Montant invalide';
  return errors;
}

function FeeForm({ form, errors, onChange }) {
  return (
    <div className="fee-form">
      <Input
        id="fee-name" label="Nom de la cotisation" required
        value={form.name} error={errors.name}
        placeholder="ex: Frais de scolarité, Frais d'examen"
        onChange={(e) => onChange('name', e.target.value)}
      />
      <div className="fee-form__row">
        <Input
          id="fee-amount" label="Montant (FCFA)" type="number" min="0" required
          value={form.amount} error={errors.amount}
          placeholder="ex: 50000"
          onChange={(e) => onChange('amount', e.target.value)}
        />
        <Select
          id="fee-term" label="Période"
          value={form.term}
          placeholder="Toute l'année"
          options={TERM_OPTIONS}
          onChange={(e) => onChange('term', e.target.value)}
        />
      </div>
      <Input
        id="fee-desc" label="Description"
        value={form.description}
        placeholder="Optionnel"
        onChange={(e) => onChange('description', e.target.value)}
      />
    </div>
  );
}

function AssignModal({ fee, classes, open, onClose }) {
  const qc = useQueryClient();
  const [classId, setClassId] = useState('');

  const assign = useMutation({
    mutationFn: () => feesService.assignToClass(fee.id, { classId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fees'] });
      toast.success('Cotisation assignée à la classe');
      setClassId('');
      onClose();
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur d\'assignation'),
  });

  const classOptions = classes.map((c) => ({ value: c.id, label: c.name }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Assigner "${fee?.name}" à une classe`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={() => assign.mutate()} disabled={!classId || assign.isPending}>
            {assign.isPending ? 'Assignation…' : 'Assigner'}
          </Button>
        </>
      }
    >
      <Select
        id="assign-class"
        label="Classe"
        value={classId}
        placeholder="Sélectionner une classe"
        options={classOptions}
        onChange={(e) => setClassId(e.target.value)}
      />
    </Modal>
  );
}

function FeesPage() {
  const qc = useQueryClient();
  const [modal, setModal]       = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm]   = useState(null);
  const [assignFee, setAssign]  = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [errors, setErrors]     = useState({});

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fees'] }); toast.success('Cotisation créée'); closeModal(); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => feesService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fees'] }); toast.success('Cotisation mise à jour'); closeModal(); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => feesService.deactivate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fees'] }); toast.success('Cotisation supprimée'); setConfirm(null); },
    onError:   (err) => toast.error(err?.response?.data?.message ?? 'Erreur'),
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
      name:        form.name,
      amount:      Number(form.amount),
      description: form.description || undefined,
      term:        form.term        || undefined,
    };
    if (modal === 'create') createMutation.mutate(payload);
    else updateMutation.mutate({ id: selected.id, data: payload });
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const columns = [
    {
      key: 'name',
      label: 'Cotisation',
      render: (f) => (
        <div>
          <div className="fees-table__name">{f.name}</div>
          {f.description && <div className="fees-table__desc">{f.description}</div>}
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Montant',
      render: (f) => (
        <span className="fees-table__amount">
          {Number(f.amount).toLocaleString('fr-FR')} FCFA
        </span>
      ),
    },
    {
      key: 'term',
      label: 'Période',
      render: (f) =>
        f.term
          ? <Badge variant="info">{TERM_OPTIONS.find((t) => t.value === f.term)?.label ?? f.term}</Badge>
          : <span className="fees-table__empty">Annuel</span>,
    },
    {
      key: 'classes',
      label: 'Classes assignées',
      render: (f) => f._count?.feeAssignments ?? f.classCount ?? '—',
    },
    {
      key: 'actions',
      label: '',
      style: { width: '180px', textAlign: 'right' },
      render: (f) => (
        <div className="fees-table__actions">
          <Button size="sm" variant="ghost" onClick={() => setAssign(f)}>Assigner</Button>
          <Button size="sm" variant="ghost" onClick={() => openEdit(f)}>Modifier</Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirm(f)}>Supprimer</Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell title="Cotisations">
      <PageHeader
        title="Cotisations scolaires"
        subtitle={`${fees.length} structure${fees.length !== 1 ? 's' : ''} tarifaire${fees.length !== 1 ? 's' : ''}`}
        actions={<Button icon="+" onClick={openCreate}>Nouvelle cotisation</Button>}
      />

      <Table
        columns={columns}
        rows={fees}
        loading={isLoading}
        emptyMessage="Aucune cotisation définie"
      />

      <Modal
        open={!!modal}
        onClose={closeModal}
        title={modal === 'create' ? 'Nouvelle cotisation' : 'Modifier la cotisation'}
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
        <FeeForm form={form} errors={errors} onChange={handleChange} />
      </Modal>

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
        title="Supprimer la cotisation"
        message={`Supprimer "${confirm?.name}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        variant="danger"
      />
    </AppShell>
  );
}

export default FeesPage;
