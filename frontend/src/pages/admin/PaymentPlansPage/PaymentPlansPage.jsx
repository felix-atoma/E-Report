import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

function InstalmentRow({ idx, inst, onChange, onRemove, canRemove }) {
  return (
    <div className="pp-inst-row">
      <span className="pp-inst-row__num">{idx + 1}</span>
      <Input
        id={`due-${idx}`}
        label="Date d'échéance"
        type="date"
        value={inst.dueDate}
        onChange={(e) => onChange(idx, 'dueDate', e.target.value)}
        required
      />
      <Input
        id={`amt-${idx}`}
        label="Montant (FCFA)"
        type="number"
        min="1"
        value={inst.amount}
        onChange={(e) => onChange(idx, 'amount', e.target.value)}
        required
      />
      {canRemove && (
        <button className="pp-inst-row__remove" onClick={() => onRemove(idx)} title="Supprimer">✕</button>
      )}
    </div>
  );
}

function PlanCard({ plan, onPayInstalment, onDelete, locale }) {
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
    if (!amt || amt <= 0) { toast.error('Montant invalide'); return; }
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
          <span className="pp-card__paid">{paid.toLocaleString(locale)} FCFA payés</span>
          <span className="pp-card__remaining">{remaining.toLocaleString(locale)} FCFA restants</span>
        </div>
        <button className="pp-card__toggle">{expanded ? '▲' : '▼'}</button>
      </div>

      {expanded && (
        <div className="pp-card__body">
          {plan.notes && <p className="pp-card__notes">{plan.notes}</p>}
          <table className="pp-inst-table">
            <thead>
              <tr>
                <th>Échéance</th>
                <th>Montant prévu</th>
                <th>Statut</th>
                <th>Payé le</th>
                <th>Montant payé</th>
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
                      {inst.paidAt ? 'Payé' : new Date(inst.dueDate) < new Date() ? 'En retard' : 'À venir'}
                    </span>
                  </td>
                  <td>{inst.paidAt ? new Date(inst.paidAt).toLocaleDateString(locale) : '—'}</td>
                  <td>{inst.paidAmount ? `${Number(inst.paidAmount).toLocaleString(locale)} FCFA` : '—'}</td>
                  <td>
                    {!inst.paidAt && (
                      <Button size="sm" variant="primary" onClick={() => { setPayModal(inst.id); setPayAmount(String(inst.amount)); }}>
                        Encaisser
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pp-card__footer">
            <Button size="sm" variant="danger" onClick={() => onDelete(plan.id)}>
              Supprimer le plan
            </Button>
          </div>
        </div>
      )}

      {payModal && (
        <OffCanvas
          open
          onClose={() => { setPayModal(null); setPayAmount(''); }}
          title="Enregistrer le paiement"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setPayModal(null)}>Annuler</Button>
              <Button onClick={handlePay}>Confirmer</Button>
            </>
          }
        >
          <Input
            id="pay-inst-amount"
            label="Montant encaissé (FCFA)"
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
      toast.success('Plan créé');
      setModal(false);
      setForm(EMPTY_FORM);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  const payMutation = useMutation({
    mutationFn: ({ instalmentId, paidAmount }) => paymentPlansService.payInstalment(instalmentId, { paidAmount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-plans'] });
      toast.success('Paiement enregistré');
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => paymentPlansService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-plans'] });
      toast.success('Plan supprimé');
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Erreur'),
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
      toast.error('Étudiant, année et montant total sont requis');
      return;
    }
    const instalments = form.instalments.filter((i) => i.dueDate && i.amount);
    if (!instalments.length) {
      toast.error('Au moins une échéance est requise');
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
    <AppShell title="Plans de paiement">
      <PageHeader
        title="Plans de paiement échelonné"
        subtitle={`${plans.length} plan${plans.length !== 1 ? 's' : ''} en cours`}
        actions={<Button icon="+" onClick={() => setModal(true)}>Nouveau plan</Button>}
      />

      <div className="pp-toolbar">
        <SearchBar value={search} onChange={setSearch} placeholder="Rechercher un élève..." className="pp-toolbar__search" />
      </div>

      {isLoading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <div className="pp-empty">Aucun plan de paiement trouvé</div>
      ) : (
        <div className="pp-list">
          {filtered.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              locale={locale}
              onPayInstalment={(instalmentId, paidAmount, cb) => {
                payMutation.mutate({ instalmentId, paidAmount }, { onSuccess: cb });
              }}
              onDelete={(id) => {
                if (window.confirm('Supprimer ce plan ? Cette action est irréversible.')) {
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
        title="Nouveau plan de paiement"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(false)} disabled={createMutation.isPending}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Création...' : 'Créer le plan'}
            </Button>
          </>
        }
      >
        <div className="pp-form">
          <Select
            id="pp-student"
            label="Élève"
            required
            value={form.studentId}
            options={studentOptions}
            placeholder="Sélectionner un élève"
            onChange={(e) => handleChangeForm('studentId', e.target.value)}
          />
          <div className="pp-form__row">
            <Select
              id="pp-year"
              label="Année académique"
              required
              value={form.academicYear}
              options={yearOptions}
              placeholder="Sélectionner"
              onChange={(e) => handleChangeForm('academicYear', e.target.value)}
            />
            <Input
              id="pp-total"
              label="Montant total (FCFA)"
              type="number"
              min="1"
              required
              value={form.totalAmount}
              onChange={(e) => handleChangeForm('totalAmount', e.target.value)}
            />
          </div>
          <Input
            id="pp-notes"
            label="Notes (facultatif)"
            value={form.notes}
            onChange={(e) => handleChangeForm('notes', e.target.value)}
          />

          <div className="pp-form__inst-header">
            <span className="pp-form__inst-title">Échéances</span>
            <Button size="sm" variant="ghost" onClick={addInstalment}>+ Ajouter une échéance</Button>
          </div>

          {form.instalments.map((inst, idx) => (
            <InstalmentRow
              key={idx}
              idx={idx}
              inst={inst}
              onChange={handleChangeInstalment}
              onRemove={removeInstalment}
              canRemove={form.instalments.length > 1}
            />
          ))}
        </div>
      </OffCanvas>
    </AppShell>
  );
}

export default PaymentPlansPage;
