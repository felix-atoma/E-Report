import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { paymentsService } from '../../../services/paymentsService';
import { studentsService } from '../../../services/studentsService';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Table from '../../../components/common/Table/Table';
import Modal from '../../../components/common/Modal/Modal';
import Input from '../../../components/common/Input/Input';
import Select from '../../../components/common/Select/Select';
import Button from '../../../components/common/Button/Button';
import Badge from '../../../components/common/Badge/Badge';
import SearchBar from '../../../components/common/SearchBar/SearchBar';
import './PaymentsPage.css';

const METHODS = [
  { value: 'CASH',     label: 'Espèces' },
  { value: 'TMONEY',   label: 'TMoney' },
  { value: 'FLOOZ',    label: 'Flooz' },
  { value: 'MOMO',     label: 'MoMo' },
  { value: 'TRANSFER', label: 'Virement bancaire' },
  { value: 'CHEQUE',   label: 'Chèque' },
  { value: 'OTHER',    label: 'Autre' },
];

const STATUS_OPTIONS = [
  { value: 'PAID',    label: 'À jour' },
  { value: 'PARTIAL', label: 'Paiement partiel' },
  { value: 'UNPAID',  label: 'Non payé' },
  { value: 'EXEMPT',  label: 'Exonéré' },
];

const STATUS_VARIANT = {
  PAID:    'success',
  PARTIAL: 'warning',
  UNPAID:  'danger',
  EXEMPT:  'default',
};

const EMPTY_FORM = { studentId: '', amount: '', method: 'CASH', reference: '', note: '' };

function validate(form) {
  const errors = {};
  if (!form.studentId) errors.studentId = 'Élève requis';
  if (!form.amount)    errors.amount    = 'Montant requis';
  else if (isNaN(Number(form.amount)) || Number(form.amount) <= 0)
    errors.amount = 'Montant invalide';
  if (!form.method)    errors.method    = 'Méthode requise';
  return errors;
}

function PaymentForm({ form, errors, onChange, students }) {
  const studentOptions = students.map((s) => ({
    value: s.id,
    label: `${s.firstName} ${s.lastName}${s.class?.name ? ` — ${s.class.name}` : ''}`,
  }));

  return (
    <div className="payment-form">
      <Select
        id="pay-student" label="Élève" required
        value={form.studentId} error={errors.studentId}
        placeholder="Sélectionner un élève"
        options={studentOptions}
        onChange={(e) => onChange('studentId', e.target.value)}
      />
      <div className="payment-form__row">
        <Input
          id="pay-amount" label="Montant (FCFA)" type="number" min="0" required
          value={form.amount} error={errors.amount}
          placeholder="ex: 25000"
          onChange={(e) => onChange('amount', e.target.value)}
        />
        <Select
          id="pay-method" label="Méthode" required
          value={form.method} error={errors.method}
          options={METHODS}
          onChange={(e) => onChange('method', e.target.value)}
        />
      </div>
      <Input
        id="pay-ref" label="Référence / N° reçu"
        value={form.reference}
        placeholder="Optionnel"
        onChange={(e) => onChange('reference', e.target.value)}
      />
      <Input
        id="pay-note" label="Note"
        value={form.note}
        placeholder="Optionnel"
        onChange={(e) => onChange('note', e.target.value)}
      />
    </div>
  );
}

function PaymentsPage() {
  const qc = useQueryClient();
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('');
  const [modal, setModal]         = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [errors, setErrors]       = useState({});

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => paymentsService.list().then((r) => r.data),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => studentsService.list().then((r) => r.data),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return payments.filter((p) => {
      const name = `${p.student?.firstName ?? ''} ${p.student?.lastName ?? ''}`.toLowerCase();
      const matchSearch = !q || name.includes(q) || (p.reference ?? '').toLowerCase().includes(q);
      const matchStatus = !statusFilter || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [payments, search, statusFilter]);

  const recordMutation = useMutation({
    mutationFn: (data) => paymentsService.record(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Paiement enregistré');
      setModal(false);
      setForm(EMPTY_FORM);
      setErrors({});
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur d\'enregistrement'),
  });

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function handleSubmit() {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    recordMutation.mutate({
      studentId: form.studentId,
      amount:    Number(form.amount),
      method:    form.method,
      reference: form.reference || undefined,
      note:      form.note      || undefined,
    });
  }

  const totals = useMemo(() => {
    const sum = payments.reduce((acc, p) => acc + (p.amount ?? 0), 0);
    return sum;
  }, [payments]);

  const columns = [
    {
      key: 'student',
      label: 'Élève',
      render: (p) => (
        <div>
          <div className="payments-table__name">
            {p.student ? `${p.student.firstName} ${p.student.lastName}` : '—'}
          </div>
          {p.student?.class?.name && (
            <div className="payments-table__class">{p.student.class.name}</div>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Montant',
      render: (p) => (
        <span className="payments-table__amount">
          {Number(p.amount).toLocaleString('fr-FR')} FCFA
        </span>
      ),
    },
    {
      key: 'method',
      label: 'Méthode',
      render: (p) => METHODS.find((m) => m.value === p.method)?.label ?? p.method,
    },
    {
      key: 'status',
      label: 'Statut',
      render: (p) => (
        <Badge variant={STATUS_VARIANT[p.status] ?? 'default'}>
          {STATUS_OPTIONS.find((s) => s.value === p.status)?.label ?? p.status}
        </Badge>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      render: (p) =>
        p.createdAt
          ? new Date(p.createdAt).toLocaleDateString('fr-FR')
          : '—',
    },
    {
      key: 'reference',
      label: 'Référence',
      render: (p) => p.reference ?? <span className="payments-table__empty">—</span>,
    },
  ];

  return (
    <AppShell title="Paiements">
      <PageHeader
        title="Paiements"
        subtitle={`${payments.length} paiement${payments.length !== 1 ? 's' : ''} — Total : ${totals.toLocaleString('fr-FR')} FCFA`}
        actions={<Button icon="+" onClick={() => setModal(true)}>Enregistrer un paiement</Button>}
      />

      <div className="payments-page__toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Rechercher par élève ou référence…"
          className="payments-page__search"
        />
        <Select
          id="status-filter"
          value={statusFilter}
          placeholder="Tous les statuts"
          options={STATUS_OPTIONS}
          onChange={(e) => setStatus(e.target.value)}
          className="payments-page__status-filter"
        />
      </div>

      <Table
        columns={columns}
        rows={filtered}
        loading={isLoading}
        emptyMessage="Aucun paiement trouvé"
      />

      <Modal
        open={modal}
        onClose={() => { setModal(false); setForm(EMPTY_FORM); setErrors({}); }}
        title="Enregistrer un paiement"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(false)} disabled={recordMutation.isPending}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={recordMutation.isPending}>
              {recordMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <PaymentForm form={form} errors={errors} onChange={handleChange} students={students} />
      </Modal>
    </AppShell>
  );
}

export default PaymentsPage;
