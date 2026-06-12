import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { paymentPlansService } from '../../../services/paymentPlansService';
import { studentsService } from '../../../services/studentsService';
import { useInstitution } from '../../../context/InstitutionContext';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import Card from '../../../components/common/Card/Card';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Select from '../../../components/common/Select/Select';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import Loading from '../../../components/common/Loading/Loading';
import SearchBar from '../../../components/common/SearchBar/SearchBar';
import './PaymentPlansPage.css';

const EMPTY_INSTALMENT = { dueDate: '', amount: '' };

function InstalmentRow({ idx, inst, onChange, onRemove, canRemove, t }) {
  return (
    <div className="pp-inst-row">
      <span className="pp-inst-row__num">{idx + 1}</span>
      <Input
        id={`due-${idx}`}
        label={t('paymentPlans.dueDate')}
        type="date"
        value={inst.dueDate}
        onChange={(e) => onChange(idx, 'dueDate', e.target.value)}
        required
      />
      <Input
        id={`amt-${idx}`}
        label={t('paymentPlans.amount')}
        type="number"
        min="1"
        value={inst.amount}
        onChange={(e) => onChange(idx, 'amount', e.target.value)}
        required
      />
      {canRemove && (
        <button className="pp-inst-row__remove" onClick={() => onRemove(idx)} title={t('action.delete')}>✕</button>
      )}
    </div>
  );
}

function PlanCard({ plan, onPayInstalment, onDelete, locale, t }) {
  const [expanded, setExpanded] = useState(false);
  const [payModal, setPayModal] = useState(null);
  const [payAmount, setPayAmount] = useState('');

  const studentName = plan.student?.user?.name ?? plan.student?.admissionNumber ?? '—';
  const paid = plan.instalments.filter((i) => i.paidAt).reduce((s, i) => s + Number(i.paidAmount ?? i.amount), 0);
  const total = Number(plan.totalAmount);
  const remaining = total - paid;
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;

  function handlePay() {
    const amt = Number(payAmount);
    if (!amt || amt <= 0) { toast.error(t('paymentPlans.errors.amountInvalid')); return; }
    onPayInstalment(payModal, amt, () => { setPayModal(null); setPayAmount(''); });
  }

  return (
    <Card className="pp-card">
      <div className="pp-card__header" onClick={() => setExpanded((v) => !v)}>
        <div className="pp-card__info">
          <span className="pp-card__name">{studentName}</span>
          <span className="pp-card__year">{plan.academicYear}</span>
        </div>
        <div className="pp-card__progress-wrap">
          <div className="pp-card__progress-bar">
            <div className="pp-card__progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="pp-card__pct">{pct}%</span>
        </div>
        <div className="pp-card__amounts">
          <span className="pp-card__paid">{t('paymentPlans.paid_fcfa', { amount: paid.toLocaleString(locale) })}</span>
          <span className="pp-card__remaining">{t('paymentPlans.remaining_fcfa', { amount: remaining.toLocaleString(locale) })}</span>
        </div>
        <button className="pp-card__toggle">{expanded ? '▲' : '▼'}</button>
      </div>

      {expanded && (
        <div className="pp-card__body">
          {plan.notes && <p className="pp-card__notes">{plan.notes}</p>}
          <table className="pp-inst-table">
            <thead>
              <tr>
                <th>{t('paymentPlans.instalment')}</th>
                <th>{t('paymentPlans.amount')}</th>
                <th>{t('paymentPlans.status.PENDING')}</th>
                <th>{t('paymentPlans.paidOn')}</th>
                <th>{t('paymentPlans.paidAmount')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {plan.instalments.map((inst) => (
                <tr key={inst.id} className={inst.paidAt ? 'pp-inst-table__row--paid' : ''}>
                  <td>{new Date(inst.dueDate).toLocaleDateString(locale)}</td>
                  <td>{Number(inst.amount).toLocaleString(locale)} FCFA</td>
                  <td>
                    <span className={`pp-status pp-status--${inst.paidAt ? 'paid' : new Date(inst.dueDate) < new Date() ? 'overdue' : 'pending'}`}>
                      {inst.paidAt
                        ? t('paymentPlans.status.PAID')
                        : new Date(inst.dueDate) < new Date()
                          ? t('paymentPlans.status.OVERDUE')
                          : t('paymentPlans.status.PENDING')}
                    </span>
                  </td>
                  <td>{inst.paidAt ? new Date(inst.paidAt).toLocaleDateString(locale) : '—'}</td>
                  <td>{inst.paidAmount ? `${Number(inst.paidAmount).toLocaleString(locale)} FCFA` : '—'}</td>
                  <td>
                    {!inst.paidAt && (
                      <Button size="sm" variant="primary" onClick={() => { setPayModal(inst.id); setPayAmount(String(inst.amount)); }}>
                        {t('paymentPlans.collect')}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pp-card__footer">
            <Button size="sm" variant="danger" onClick={() => onDelete(plan.id)}>
              {t('paymentPlans.deletePlan')}
            </Button>
          </div>
        </div>
      )}

      {payModal && (
        <OffCanvas
          open
          onClose={() => { setPayModal(null); setPayAmount(''); }}
          title={t('paymentPlans.recordPayment')}
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setPayModal(null)}>{t('action.cancel')}</Button>
              <Button onClick={handlePay}>{t('action.confirm')}</Button>
            </>
          }
        >
          <Input
            id="pay-inst-amount"
            label={t('paymentPlans.collectedAmount')}
            type="number"
            min="1"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            required
          />
        </OffCanvas>
      )}
    </Card>
  );
}

const EMPTY_FORM = { studentId: '', academicYear: '', totalAmount: '', notes: '', instalments: [{ ...EMPTY_INSTALMENT }] };

function PaymentPlansPage() {
  const { t } = useTranslation();
  const locale = 'fr-FR';
  const qc = useQueryClient();
  const { institution } = useInstitution();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['payment-plans'],
    queryFn: () => paymentPlansService.list().then((r) => r.data),
    staleTime: 0,
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => studentsService.list().then((r) => r.data),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return plans.filter((p) => {
      const name = (p.student?.user?.name ?? p.student?.admissionNumber ?? '').toLowerCase();
      return !q || name.includes(q) || p.academicYear.includes(q);
    });
  }, [plans, search]);

  const createMutation = useMutation({
    mutationFn: (data) => paymentPlansService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-plans'] });
      toast.success(t('paymentPlans.toast.created'));
      setModal(false);
      setForm(EMPTY_FORM);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t('paymentPlans.toast.error')),
  });

  const payMutation = useMutation({
    mutationFn: ({ instalmentId, paidAmount }) => paymentPlansService.payInstalment(instalmentId, { paidAmount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-plans'] });
      toast.success(t('paymentPlans.toast.paid'));
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t('paymentPlans.toast.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => paymentPlansService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-plans'] });
      toast.success(t('paymentPlans.toast.deleted'));
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? t('paymentPlans.toast.error')),
  });

  function handleChangeForm(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleChangeInstalment(idx, field, value) {
    setForm((f) => {
      const instalments = [...f.instalments];
      instalments[idx] = { ...instalments[idx], [field]: value };
      return { ...f, instalments };
    });
  }

  function addInstalment() {
    setForm((f) => ({ ...f, instalments: [...f.instalments, { ...EMPTY_INSTALMENT }] }));
  }

  function removeInstalment(idx) {
    setForm((f) => ({ ...f, instalments: f.instalments.filter((_, i) => i !== idx) }));
  }

  function handleSubmit() {
    if (!form.studentId || !form.academicYear || !form.totalAmount) {
      toast.error(t('paymentPlans.errors.fieldsRequired'));
      return;
    }
    const instalments = form.instalments.filter((i) => i.dueDate && i.amount);
    if (!instalments.length) {
      toast.error(t('paymentPlans.errors.instalmentRequired'));
      return;
    }
    createMutation.mutate({
      studentId: form.studentId,
      academicYear: form.academicYear,
      totalAmount: Number(form.totalAmount),
      notes: form.notes || undefined,
      instalments: instalments.map((i) => ({ dueDate: i.dueDate, amount: Number(i.amount) })),
    });
  }

  const studentOptions = students.map((s) => ({
    value: s.id,
    label: `${s.user?.name ?? s.admissionNumber}${s.classes?.[0]?.class?.name ? ` — ${s.classes[0].class.name}` : ''}`,
  }));

  const yearOptions = useMemo(() => {
    const base = institution?.academicYear ?? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    const [start] = base.split('-').map(Number);
    return Array.from({ length: 4 }, (_, i) => {
      const y = start - i;
      const label = `${y}-${y + 1}`;
      return { value: label, label };
    });
  }, [institution]);

  return (
    <AppShell title={t('paymentPlans.title')}>
      <PageHeader
        title={t('paymentPlans.title')}
        subtitle={t('paymentPlans.subtitle', { count: plans.length })}
        actions={<Button icon="+" onClick={() => setModal(true)}>{t('paymentPlans.newPlan')}</Button>}
      />

      <div className="pp-toolbar">
        <SearchBar value={search} onChange={setSearch} placeholder={t('paymentPlans.search')} className="pp-toolbar__search" />
      </div>

      {isLoading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <div className="pp-empty">{t('paymentPlans.empty')}</div>
      ) : (
        <div className="pp-list">
          {filtered.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              locale={locale}
              t={t}
              onPayInstalment={(instalmentId, paidAmount, cb) => {
                payMutation.mutate({ instalmentId, paidAmount }, { onSuccess: cb });
              }}
              onDelete={(id) => {
                if (window.confirm(t('paymentPlans.confirmDelete'))) {
                  deleteMutation.mutate(id);
                }
              }}
            />
          ))}
        </div>
      )}

      <OffCanvas
        open={modal}
        onClose={() => { setModal(false); setForm(EMPTY_FORM); }}
        title={t('paymentPlans.newPlan')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(false)} disabled={createMutation.isPending}>{t('action.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? t('paymentPlans.creating') : t('paymentPlans.createBtn')}
            </Button>
          </>
        }
      >
        <div className="pp-form">
          <Select
            id="pp-student"
            label={t('paymentPlans.student')}
            required
            value={form.studentId}
            options={studentOptions}
            placeholder={t('paymentPlans.selectStudent')}
            onChange={(e) => handleChangeForm('studentId', e.target.value)}
          />
          <div className="pp-form__row">
            <Select
              id="pp-year"
              label={t('paymentPlans.academicYear')}
              required
              value={form.academicYear}
              options={yearOptions}
              placeholder={t('action.select')}
              onChange={(e) => handleChangeForm('academicYear', e.target.value)}
            />
            <Input
              id="pp-total"
              label={t('paymentPlans.totalAmount')}
              type="number"
              min="1"
              required
              value={form.totalAmount}
              onChange={(e) => handleChangeForm('totalAmount', e.target.value)}
            />
          </div>
          <Input
            id="pp-notes"
            label={t('paymentPlans.notesHint')}
            value={form.notes}
            onChange={(e) => handleChangeForm('notes', e.target.value)}
          />

          <div className="pp-form__inst-header">
            <span className="pp-form__inst-title">{t('paymentPlans.instalments')}</span>
            <Button size="sm" variant="ghost" onClick={addInstalment}>{t('paymentPlans.addInstalment')}</Button>
          </div>

          {form.instalments.map((inst, idx) => (
            <InstalmentRow
              key={idx}
              idx={idx}
              inst={inst}
              onChange={handleChangeInstalment}
              onRemove={removeInstalment}
              canRemove={form.instalments.length > 1}
              t={t}
            />
          ))}
        </div>
      </OffCanvas>
    </AppShell>
  );
}

export default PaymentPlansPage;
