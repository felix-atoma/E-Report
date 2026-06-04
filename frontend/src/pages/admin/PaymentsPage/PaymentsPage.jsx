import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

const METHODS = [
  { value: 'CASH',                  label: 'Espèces' },
  { value: 'MOBILE_MONEY_TMONEY',   label: 'TMoney' },
  { value: 'MOBILE_MONEY_FLOOZ',    label: 'Flooz' },
  { value: 'MOBILE_MONEY_MOMO',     label: 'MoMo' },
  { value: 'BANK_TRANSFER',         label: 'Virement bancaire' },
  { value: 'CHEQUE',                label: 'Chèque' },
  { value: 'OTHER',                 label: 'Autre' },
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

const EMPTY_FORM = { studentId: '', amount: '', paymentMethod: 'CASH', referenceNumber: '', notes: '' };

function validate(form) {
  const errors = {};
  if (!form.studentId)      errors.studentId      = 'Élève requis';
  if (!form.amount)         errors.amount         = 'Montant requis';
  else if (isNaN(Number(form.amount)) || Number(form.amount) <= 0)
    errors.amount = 'Montant invalide';
  if (!form.paymentMethod)  errors.paymentMethod  = 'Méthode requise';
  return errors;
}

function PaymentForm({ form, errors, onChange, students }) {
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
          value={form.paymentMethod} error={errors.paymentMethod}
          options={METHODS}
          onChange={(e) => onChange('paymentMethod', e.target.value)}
        />
      </div>
      <Input
        id="pay-ref" label="Référence / N° reçu"
        value={form.referenceNumber}
        placeholder="Optionnel"
        onChange={(e) => onChange('referenceNumber', e.target.value)}
      />
      <Input
        id="pay-note" label="Note"
        value={form.notes}
        placeholder="Optionnel"
        onChange={(e) => onChange('notes', e.target.value)}
      />
    </div>
  );
}

function PaymentsPage() {
  const qc = useQueryClient();
  const { institution } = useInstitution();
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
      studentId:       form.studentId,
      amount:          Number(form.amount),
      paymentMethod:   form.paymentMethod,
      academicYear:    institution?.academicYear ?? '',
      referenceNumber: form.referenceNumber || undefined,
      notes:           form.notes           || undefined,
    });
  }

  const totals = useMemo(() => {
    const sum = payments.reduce((acc, p) => acc + (p.amount ?? 0), 0);
    return sum;
  }, [payments]);

  function printReceipt(p) {
    const studentName  = p.student?.user?.name ?? p.student?.admissionNumber ?? '—';
    const studentClass = p.student?.classes?.[0]?.class?.name ?? p.student?.class?.name ?? '';
    const method       = METHODS.find((m) => m.value === p.paymentMethod)?.label ?? p.paymentMethod;
    const date         = p.paymentDate
      ? new Date(p.paymentDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
      : new Date(p.createdAt ?? Date.now()).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const schoolName   = institution?.name ?? 'Établissement';
    const receiptNo    = p.receiptNumber ?? p.referenceNumber ?? `REC-${p.id?.slice(-6).toUpperCase()}`;

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Reçu de paiement</title>
<style>
  body{font-family:Arial,sans-serif;margin:0;padding:24px;color:#111}
  .receipt{max-width:420px;margin:0 auto;border:2px solid #1e2a78;border-radius:8px;padding:24px}
  .receipt__header{text-align:center;border-bottom:1px solid #e5e7eb;padding-bottom:16px;margin-bottom:16px}
  .receipt__school{font-size:18px;font-weight:700;color:#1e2a78}
  .receipt__title{font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-top:6px}
  .receipt__no{font-size:12px;color:#9ca3af;margin-top:4px}
  .receipt__row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f9fafb;font-size:13px}
  .receipt__row:last-of-type{border-bottom:none}
  .receipt__label{color:#6b7280;font-weight:500}
  .receipt__value{font-weight:600;text-align:right;max-width:55%}
  .receipt__amount{font-size:22px;font-weight:800;color:#1e2a78;text-align:center;margin:16px 0;padding:12px;background:#eef2ff;border-radius:8px}
  .receipt__footer{margin-top:20px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:12px}
  .receipt__stamp{margin:16px auto;width:80px;height:80px;border:3px solid #1e2a78;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#1e2a78;font-size:10px;font-weight:700;text-align:center;line-height:1.3}
  @media print{body{padding:0}}
</style></head><body>
<div class="receipt">
  <div class="receipt__header">
    <div class="receipt__school">${schoolName}</div>
    <div class="receipt__title">Reçu de Paiement</div>
    <div class="receipt__no">N° ${receiptNo}</div>
  </div>
  <div class="receipt__amount">${Number(p.amount).toLocaleString('fr-FR')} FCFA</div>
  <div class="receipt__row"><span class="receipt__label">Élève</span><span class="receipt__value">${studentName}</span></div>
  ${studentClass ? `<div class="receipt__row"><span class="receipt__label">Classe</span><span class="receipt__value">${studentClass}</span></div>` : ''}
  <div class="receipt__row"><span class="receipt__label">Date</span><span class="receipt__value">${date}</span></div>
  <div class="receipt__row"><span class="receipt__label">Mode de paiement</span><span class="receipt__value">${method}</span></div>
  ${p.academicYear ? `<div class="receipt__row"><span class="receipt__label">Année scolaire</span><span class="receipt__value">${p.academicYear}</span></div>` : ''}
  ${p.term ? `<div class="receipt__row"><span class="receipt__label">Trimestre</span><span class="receipt__value">${p.term}</span></div>` : ''}
  ${p.notes ? `<div class="receipt__row"><span class="receipt__label">Note</span><span class="receipt__value">${p.notes}</span></div>` : ''}
  <div class="receipt__stamp">PAYÉ ✓</div>
  <div class="receipt__footer">Ce reçu est un justificatif officiel de paiement.<br>Émis par NovaBulletin — ${new Date().toLocaleDateString('fr-FR')}</div>
</div>
<script>window.onload=function(){window.print();window.close();}<\/script>
</body></html>`;

    const w = window.open('', '_blank', 'width=500,height=700');
    w.document.write(html);
    w.document.close();
  }

  const columns = [
    {
      key: 'student',
      label: 'Élève',
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
      render: (p) => METHODS.find((m) => m.value === p.paymentMethod)?.label ?? p.paymentMethod,
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
      render: (p) => p.referenceNumber ?? <span className="payments-table__empty">—</span>,
    },
    {
      key: 'receipt',
      label: '',
      style: { width: '80px', textAlign: 'right' },
      render: (p) => (
        <Button size="sm" variant="ghost" onClick={() => printReceipt(p)} title="Imprimer le reçu">
          🧾 Reçu
        </Button>
      ),
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

      <OffCanvas
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
      </OffCanvas>
    </AppShell>
  );
}

export default PaymentsPage;
