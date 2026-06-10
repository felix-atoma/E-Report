import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { paymentsService } from '../../../services/paymentsService';
import { studentsService } from '../../../services/studentsService';
import { useInstitution } from '../../../context/InstitutionContext';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Table from '../../../components/common/Table/Table';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import Input from '../../../components/common/Input/Input';
import Select from '../../../components/common/Select/Select';
import Button from '../../../components/common/Button/Button';
import Badge from '../../../components/common/Badge/Badge';
import SearchBar from '../../../components/common/SearchBar/SearchBar';
import './PaymentsPage.css';

const STATUS_VARIANT = { PAID: 'success', PARTIAL: 'warning', UNPAID: 'danger', EXEMPT: 'default' };
const EMPTY_FORM = { studentId: '', amount: '', paymentMethod: 'CASH', referenceNumber: '', notes: '' };

function validate(form, t) {
  const errors = {};
  if (!form.studentId)     errors.studentId     = t('payments.errors.studentRequired');
  if (!form.amount)        errors.amount        = t('payments.errors.amountRequired');
  else if (isNaN(Number(form.amount)) || Number(form.amount) <= 0)
    errors.amount = t('payments.errors.amountInvalid');
  if (!form.paymentMethod) errors.paymentMethod = t('payments.errors.methodRequired');
  return errors;
}

function PaymentForm({ form, errors, onChange, students, methods, t }) {
  const studentOptions = students.map((s) => {
    const cls = s.classes?.[0]?.class ?? s.class;
    return {
      value: s.id,
      label: `${s.user?.name ?? s.admissionNumber}${cls?.name ? ` — ${cls.name}` : ''}`,
    };
  });

  return (
    <div className="payment-form">
      <Select
        id="pay-student" label={t('payments.student')} required
        value={form.studentId} error={errors.studentId}
        placeholder={t('payments.selectStudent')}
        options={studentOptions}
        onChange={(e) => onChange('studentId', e.target.value)}
      />
      <div className="payment-form__row">
        <Input
          id="pay-amount" label={t('payments.amount')} type="number" min="0" required
          value={form.amount} error={errors.amount}
          placeholder="ex: 25000"
          onChange={(e) => onChange('amount', e.target.value)}
        />
        <Select
          id="pay-method" label={t('payments.method')} required
          value={form.paymentMethod} error={errors.paymentMethod}
          options={methods}
          onChange={(e) => onChange('paymentMethod', e.target.value)}
        />
      </div>
      <Input
        id="pay-ref" label={t('payments.reference')}
        value={form.referenceNumber}
        placeholder={t('common.optional')}
        onChange={(e) => onChange('referenceNumber', e.target.value)}
      />
      <Input
        id="pay-note" label={t('payments.note')}
        value={form.notes}
        placeholder={t('common.optional')}
        onChange={(e) => onChange('notes', e.target.value)}
      />
    </div>
  );
}

function PaymentsPage() {
  const { t } = useTranslation();
  const locale = 'fr-FR';
  const qc = useQueryClient();
  const { institution } = useInstitution();
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('');
  const [modal, setModal]         = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [errors, setErrors]       = useState({});

  const METHODS = useMemo(() => [
    { value: 'CASH',                label: t('payment.methods.CASH')  },
    { value: 'MOBILE_MONEY_TMONEY', label: t('payment.methods.TMONEY') },
    { value: 'MOBILE_MONEY_FLOOZ',  label: t('payment.methods.FLOOZ') },
    { value: 'MOBILE_MONEY_MOMO',   label: t('payment.methods.MOMO')  },
    { value: 'BANK_TRANSFER',       label: t('payment.methods.BANK')  },
    { value: 'CHEQUE',              label: t('payment.methods.CHECK') },
    { value: 'OTHER',               label: t('payment.methods.OTHER') },
  ], [t]);

  const STATUS_OPTIONS = useMemo(() => [
    { value: 'PAID',    label: t('payment.upToDate') },
    { value: 'PARTIAL', label: t('payment.partial')  },
    { value: 'UNPAID',  label: t('payment.unpaid')   },
    { value: 'EXEMPT',  label: t('payment.exempted') },
  ], [t]);

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
      const name = (p.student?.user?.name ?? p.student?.admissionNumber ?? '').toLowerCase();
      const matchSearch = !q || name.includes(q) || (p.reference ?? '').toLowerCase().includes(q);
      const matchStatus = !statusFilter || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [payments, search, statusFilter]);

  const recordMutation = useMutation({
    mutationFn: (data) => paymentsService.record(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
      toast.success(t('payments.toast.created'));
      setModal(false);
      setForm(EMPTY_FORM);
      setErrors({});
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t('common.errorGeneric')),
  });

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function handleSubmit() {
    const errs = validate(form, t);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    recordMutation.mutate({
      studentId:       form.studentId,
      amount:          Number(form.amount),
      paymentMethod:   form.paymentMethod,
      academicYear:    institution?.academicYear ?? '',
      referenceNumber: form.referenceNumber || undefined,
      notes:           form.notes           || undefined,
    });
  }

  const totals = useMemo(() => payments.reduce((acc, p) => acc + (p.amount ?? 0), 0), [payments]);

  async function downloadReceipt(p) {
    try {
      const res = await paymentsService.receipt(p.id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `recu-${p.receiptNumber ?? p.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('payments.receiptError'));
    }
  }

  const columns = [
    {
      key: 'student',
      label: t('payments.student'),
      render: (p) => (
        <div>
          <div className="payments-table__name">
            {p.student ? (p.student.user?.name ?? p.student.admissionNumber ?? '—') : '—'}
          </div>
          {(p.student?.classes?.[0]?.class?.name ?? p.student?.class?.name) && (
            <div className="payments-table__class">
              {p.student.classes?.[0]?.class?.name ?? p.student.class?.name}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      label: t('payments.amount'),
      render: (p) => (
        <span className="payments-table__amount">
          {Number(p.amount).toLocaleString(locale)} {t('common.currency')}
        </span>
      ),
    },
    {
      key: 'method',
      label: t('payments.method'),
      render: (p) => METHODS.find((m) => m.value === p.paymentMethod)?.label ?? p.paymentMethod,
    },
    {
      key: 'status',
      label: t('common.status'),
      render: (p) => (
        <Badge variant={STATUS_VARIANT[p.status] ?? 'default'}>
          {STATUS_OPTIONS.find((s) => s.value === p.status)?.label ?? p.status}
        </Badge>
      ),
    },
    {
      key: 'date',
      label: t('payments.date'),
      render: (p) =>
        p.createdAt ? new Date(p.createdAt).toLocaleDateString(locale) : '—',
    },
    {
      key: 'reference',
      label: t('payments.reference'),
      render: (p) => p.referenceNumber ?? <span className="payments-table__empty">—</span>,
    },
    {
      key: 'receipt',
      label: '',
      style: { width: '80px', textAlign: 'right' },
      render: (p) => (
        <Button size="sm" variant="ghost" onClick={() => downloadReceipt(p)} title={t('payments.receipt')}>
          🧾 {t('payments.receipt')}
        </Button>
      ),
    },
  ];

  return (
    <AppShell title={t('payments.title')}>
      <PageHeader
        title={t('payments.title')}
        subtitle={`${payments.length} ${t('payments.title').toLowerCase()} — Total : ${totals.toLocaleString(locale)} FCFA`}
        actions={<Button icon="+" onClick={() => setModal(true)}>{t('payments.addPayment')}</Button>}
      />

      <div className="payments-page__toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('payments.searchPlaceholder')}
          className="payments-page__search"
        />
        <Select
          id="status-filter"
          value={statusFilter}
          placeholder={t('payments.allStatuses')}
          options={STATUS_OPTIONS}
          onChange={(e) => setStatus(e.target.value)}
          className="payments-page__status-filter"
        />
      </div>

      <Table
        columns={columns}
        rows={filtered}
        loading={isLoading}
        emptyMessage={t('payments.noPayments')}
      />

      <OffCanvas
        open={modal}
        onClose={() => { setModal(false); setForm(EMPTY_FORM); setErrors({}); }}
        title={t('payments.addPayment')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(false)} disabled={recordMutation.isPending}>
              {t('action.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={recordMutation.isPending}>
              {recordMutation.isPending ? t('payments.recording') : t('action.save')}
            </Button>
          </>
        }
      >
        <PaymentForm form={form} errors={errors} onChange={handleChange} students={students} methods={METHODS} t={t} />
      </OffCanvas>
    </AppShell>
  );
}

export default PaymentsPage;
