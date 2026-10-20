import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import AppShell from '../../../components/layout/AppShell/AppShell';
import PageHeader from '../../../components/layout/PageHeader/PageHeader';
import OffCanvas from '../../../components/common/OffCanvas/OffCanvas';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import Select from '../../../components/common/Select/Select';
import api from '../../../services/api';
import { classesService } from '../../../services/classesService';
import { paymentsService } from '../../../services/paymentsService';
import './PaymentStatusPage.css';

const STATUS = {
  PAID:    { label: 'À jour',   icon: '🟢', cls: 'paid' },
  PARTIAL: { label: 'Partiel',  icon: '🟡', cls: 'partial' },
  UNPAID:  { label: 'Impayé',   icon: '🔴', cls: 'unpaid' },
  EXEMPT:  { label: 'Exonéré',  icon: '⚪', cls: 'exempt' },
  NO_FEES: { label: 'Aucun frais', icon: '⚪', cls: 'exempt' },
};
const METHODS = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'MOBILE_MONEY_TMONEY', label: 'TMoney' },
  { value: 'MOBILE_MONEY_FLOOZ', label: 'Flooz' },
  { value: 'MOBILE_MONEY_MOMO', label: 'MTN MoMo' },
  { value: 'BANK_TRANSFER', label: 'Virement' },
  { value: 'CHEQUE', label: 'Chèque' },
  { value: 'OTHER', label: 'Autre' },
];

const money = (v) => `${Math.round(v ?? 0).toLocaleString('fr-FR')}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

/** Export CSV (séparateur « ; », lisible directement par Excel en français) */
function exportCsv(rows, year) {
  const head = ['Élève', 'Matricule', 'Classe', 'Attendu', 'Payé', 'Reste', 'Statut', 'Dernier paiement', 'Parent', 'Téléphone'];
  const lines = rows.map((r) => [
    r.name, r.admissionNumber, r.className, Math.round(r.expected), Math.round(r.paid), Math.round(r.balance),
    STATUS[r.status]?.label ?? r.status, r.lastPayment ? fmtDate(r.lastPayment.date) : '', r.parent?.name ?? '', r.parent?.phone ?? '',
  ].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'));
  const blob = new Blob(['﻿' + [head.join(';'), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `situation-paiements-${year}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ── Encaisser un paiement pour un élève ─────────────────────────────── */
function RecordPayment({ row, year, onClose, onDone }) {
  const [amount, setAmount] = useState(row ? String(Math.round(row.balance) || '') : '');
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  if (!row) return null;
  const submit = async () => {
    const n = Number(amount);
    if (!(n > 0)) { toast.error('Indiquez un montant valide.'); return; }
    setBusy(true);
    try {
      await paymentsService.record({ studentId: row.studentId, amount: n, paymentMethod: method, academicYear: year, referenceNumber: reference || undefined });
      toast.success(`Paiement enregistré — reçu envoyé au parent.`);
      onDone();
    } catch (err) {
      const m = err?.response?.data?.message;
      toast.error(m ? [].concat(m).join(' · ') : "L'enregistrement a échoué.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <OffCanvas open onClose={onClose} title={`Encaisser — ${row.name}`} size="sm"
      footer={<><Button variant="ghost" onClick={onClose} disabled={busy}>Annuler</Button><Button onClick={submit} disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer le paiement'}</Button></>}>
      <div className="pst-pay">
        <div className="pst-pay__summary">
          <span>Attendu <strong>{money(row.expected)}</strong></span>
          <span>Payé <strong>{money(row.paid)}</strong></span>
          <span>Reste <strong className="pst-red">{money(row.balance)} FCFA</strong></span>
        </div>
        <Input label="Montant (FCFA)" type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Select label="Mode de paiement" value={method} options={METHODS} onChange={(e) => setMethod(e.target.value)} />
        <Input label="Référence (facultatif)" value={reference} placeholder="N° de transaction Mobile Money…" onChange={(e) => setReference(e.target.value)} />
        <p className="pst-pay__hint">Le parent reçoit aussitôt un reçu (WhatsApp, SMS, e-mail) avec son nouveau solde.</p>
      </div>
    </OffCanvas>
  );
}

/** Numéro au format international pour wa.me (chiffres seulement) : 0XX XXX XXXX (Ghana) → 233…, 8 chiffres (Togo) → 228… */
function intlDigits(phone) {
  let d = String(phone ?? '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 10 && d.startsWith('0')) d = `233${d.slice(1)}`;
  else if (d.length === 8) d = `228${d}`;
  return d;
}
const waLink = (phone, text) => `https://wa.me/${intlDigits(phone)}?text=${encodeURIComponent(text)}`;
const smsLink = (phone, text) => `sms:${String(phone).replace(/[^\d+]/g, '')}?body=${encodeURIComponent(text)}`;

const CHANNELS = [
  { key: 'WHATSAPP', label: 'WhatsApp', avail: 'whatsapp' },
  { key: 'SMS', label: 'SMS', avail: 'sms' },
  { key: 'EMAIL', label: 'E-mail', avail: 'email' },
];

/* ── Rappels à envoyer depuis le téléphone de l'école (WhatsApp / SMS déjà rédigés) ── */
function ManualReminders({ items, onClose }) {
  const [done, setDone] = useState(new Set());
  if (!items?.length) return null;
  const mark = (id) => setDone((s) => new Set(s).add(id));
  return (
    <OffCanvas open onClose={onClose} title={`Envoyer depuis votre téléphone (${items.length})`} size="md"
      footer={<Button onClick={onClose}>Terminé</Button>}>
      <p className="pst-manual__intro">
        Ces parents n'ont pas pu être prévenus automatiquement. Le message est déjà rédigé : touchez
        <strong> WhatsApp</strong> ou <strong>SMS</strong>, votre application s'ouvre, il ne reste qu'à appuyer sur Envoyer.
      </p>
      <ul className="pst-manual">
        {items.map((m) => (
          <li key={m.studentId} className={done.has(m.studentId) ? 'pst-manual__item pst-manual__item--done' : 'pst-manual__item'}>
            <div className="pst-manual__who"><strong>{m.name}</strong><span>{m.phone}</span></div>
            <div className="pst-manual__btns">
              <a className="pst-manual__wa" href={waLink(m.phone, m.message)} target="_blank" rel="noopener noreferrer" onClick={() => mark(m.studentId)}>💬 WhatsApp</a>
              <a className="pst-manual__sms" href={smsLink(m.phone, m.message)} onClick={() => mark(m.studentId)}>✉️ SMS</a>
              {done.has(m.studentId) && <span className="pst-manual__ok">✓</span>}
            </div>
          </li>
        ))}
      </ul>
    </OffCanvas>
  );
}

/* ── Numéro du parent (père ou mère), pour pouvoir le relancer ── */
function ParentPhoneForm({ row, onClose, onDone }) {
  const [phone, setPhone] = useState('');
  const [who, setWho] = useState('FATHER');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  if (!row) return null;
  const submit = async () => {
    if (phone.replace(/\D/g, '').length < 8) { toast.error('Indiquez un numéro de téléphone valide.'); return; }
    setBusy(true);
    try {
      await api.patch(`/fees/students/${row.studentId}/parent-phone`, { phone, who, name: name || undefined });
      toast.success('Numéro enregistré.');
      onDone();
    } catch (err) {
      const m = err?.response?.data?.message;
      toast.error(m ? [].concat(m).join(' · ') : "L'enregistrement a échoué.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <OffCanvas open onClose={onClose} title={`Numéro du parent — ${row.name}`} size="sm"
      footer={<><Button variant="ghost" onClick={onClose} disabled={busy}>Annuler</Button><Button onClick={submit} disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</Button></>}>
      <div className="pst-pay">
        <Select label="Parent" value={who} options={[{ value: 'FATHER', label: 'Père' }, { value: 'MOTHER', label: 'Mère' }]} onChange={(e) => setWho(e.target.value)} />
        <Input label="Téléphone (WhatsApp de préférence)" value={phone} placeholder="ex. 024 123 4567" onChange={(e) => setPhone(e.target.value)} />
        <Input label="Nom (facultatif)" value={name} onChange={(e) => setName(e.target.value)} />
        <p className="pst-pay__hint">Enregistré sur la fiche de l'élève ; utilisé pour les rappels de paiement et les reçus.</p>
      </div>
    </OffCanvas>
  );
}

export default function PaymentStatusPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const qc = useQueryClient();
  // Vide au départ : le serveur choisit l'année (en cours, sinon la plus récente qui a des frais)
  const [year, setYear] = useState('');
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [paying, setPaying] = useState(null);
  const [sending, setSending] = useState(false);
  const [channels, setChannels] = useState(new Set(['WHATSAPP', 'SMS', 'EMAIL']));
  const [manual, setManual] = useState(null);
  const [phoneFor, setPhoneFor] = useState(null);
  // Canaux d'envoi automatique configurés sur la plateforme
  const { data: available } = useQuery({
    queryKey: ['reminder-channels'],
    queryFn: () => api.get('/fees/reminders/channels').then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });
  const toggleChannel = (k) => setChannels((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => classesService.list().then((r) => r.data) });
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['students-status', year, classId],
    queryFn: () => api.get('/fees/students-status', { params: { academicYear: year || undefined, classId: classId || undefined } }).then((r) => r.data),
  });
  // Année choisie par le serveur : on la retient en réutilisant les données déjà reçues (pas de second chargement)
  useEffect(() => {
    if (!year && data?.academicYear) {
      qc.setQueryData(['students-status', data.academicYear, classId], data);
      setYear(data.academicYear);
    }
  }, [data, year, classId, qc]);
  const rows = data?.rows ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => (!status || r.status === status)
      && (!q || r.name.toLowerCase().includes(q) || r.admissionNumber.toLowerCase().includes(q)));
  }, [rows, status, search]);

  const counts = useMemo(() => rows.reduce((c, r) => ({ ...c, [r.status]: (c[r.status] ?? 0) + 1 }), {}), [rows]);
  const totals = useMemo(() => filtered.reduce((t, r) => ({ expected: t.expected + r.expected, paid: t.paid + r.paid, balance: t.balance + r.balance }),
    { expected: 0, paid: 0, balance: 0 }), [filtered]);
  const remindable = filtered.filter((r) => r.balance > 0);
  const allChecked = remindable.length > 0 && remindable.every((r) => selected.has(r.studentId));

  const toggle = (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(remindable.map((r) => r.studentId)));

  const remind = async (ids) => {
    if (!ids.length) return;
    if (ids.length > 1 && !window.confirm(`Envoyer un rappel de paiement aux parents de ${ids.length} élève(s) ?`)) return;
    setSending(true);
    try {
      const { data: res } = await api.post('/fees/reminders/send', { studentIds: ids, academicYear: year, channels: [...channels] });
      const by = res.byChannel ?? {};
      const parts = [
        by.whatsapp ? `${by.whatsapp} WhatsApp` : '', by.sms ? `${by.sms} SMS` : '', by.email ? `${by.email} e-mail` : '',
      ].filter(Boolean).join(', ');
      const extra = `${res.manual?.length ? ` · ${res.manual.length} à envoyer depuis votre téléphone` : ''}${res.noContact ? ` · ${res.noContact} sans numéro de parent` : ''}${res.noBalance ? ` · ${res.noBalance} déjà à jour` : ''}`;
      if (res.sent) toast.success(`${res.sent} parent(s) prévenu(s)${parts ? ` (${parts})` : ''}${extra}.`, { duration: 7000 });
      else toast(`Aucun envoi automatique${extra}.`, { icon: '📲', duration: 7000 });
      if (res.manual?.length) setManual(res.manual);
      setSelected(new Set());
    } catch (err) {
      const m = err?.response?.data?.message;
      toast.error(m ? [].concat(m).join(' · ') : "L'envoi a échoué.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell title="Situation des paiements">
      <PageHeader
        title="Situation des paiements"
        subtitle="Tous les élèves inscrits : attendu, payé, reste et statut. Encaissez, relancez ou exportez en un clic."
        actions={<Button variant="ghost" onClick={() => exportCsv(filtered, year)} disabled={!filtered.length}>⬇️ Exporter (Excel)</Button>}
      />

      <div className="pst-filters">
        <Input label="Année scolaire" value={year} onChange={(e) => { setYear(e.target.value); setSelected(new Set()); }} />
        <Select label="Classe" value={classId} placeholder="Toutes les classes"
          options={[{ value: '', label: 'Toutes les classes' }, ...classes.map((c) => ({ value: c.id, label: c.name }))]}
          onChange={(e) => { setClassId(e.target.value); setSelected(new Set()); }} />
        <Input label="Rechercher" value={search} placeholder="Nom ou matricule" onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="pst-chips">
        {[['', `Tous (${rows.length})`], ['UNPAID', `🔴 Impayés (${counts.UNPAID ?? 0})`], ['PARTIAL', `🟡 Partiels (${counts.PARTIAL ?? 0})`],
          ['PAID', `🟢 À jour (${counts.PAID ?? 0})`], ['EXEMPT', `⚪ Exonérés (${counts.EXEMPT ?? 0})`]].map(([v, l]) => (
          <button key={v || 'all'} type="button" className={`pst-chip${status === v ? ' pst-chip--on' : ''}`} onClick={() => setStatus(v)}>{l}</button>
        ))}
      </div>

      <div className="pst-totals">
        <span>Attendu <strong>{money(totals.expected)} FCFA</strong></span>
        <span>Payé <strong className="pst-green">{money(totals.paid)} FCFA</strong></span>
        <span>Reste <strong className="pst-red">{money(totals.balance)} FCFA</strong></span>
        {selected.size > 0 && (
          <Button size="sm" onClick={() => remind([...selected])} disabled={sending || channels.size === 0}>
            {sending ? 'Envoi…' : `📲 Rappeler ${selected.size} parent(s)`}
          </Button>
        )}
      </div>

      {/* Canaux des rappels de paiement */}
      <div className="pst-channels">
        <span className="pst-channels__label">Rappels envoyés par :</span>
        {CHANNELS.map((c) => (
          <label key={c.key} className={`pst-channel${available && !available[c.avail] ? ' pst-channel--off' : ''}`}
            title={available && !available[c.avail] ? "Envoi automatique non activé : le message vous sera proposé pour l'envoyer depuis votre téléphone" : ''}>
            <input type="checkbox" checked={channels.has(c.key)} onChange={() => toggleChannel(c.key)} />
            {c.label}{available && !available[c.avail] && c.key !== 'EMAIL' ? ' (depuis votre téléphone)' : ''}
          </label>
        ))}
      </div>

      {isLoading ? (
        <div className="pst-empty">Chargement de la situation des élèves…</div>
      ) : isError ? (
        <div className="pst-empty">Impossible de charger la situation. <button type="button" onClick={() => refetch()}>Réessayer</button></div>
      ) : rows.length === 0 ? (
        <div className="pst-empty">Aucun élève inscrit pour {year}{classId ? ' dans cette classe' : ''}.</div>
      ) : (
        <div className="pst-table-wrap">
          <table className="pst-table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Tout sélectionner" disabled={!remindable.length} /></th>
                <th>Élève</th><th>Classe</th><th className="pst-num">Attendu</th><th className="pst-num">Payé</th>
                <th className="pst-num">Reste</th><th>Statut</th><th>Dernier paiement</th><th>Parent</th><th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const st = STATUS[r.status] ?? STATUS.NO_FEES;
                return (
                  <tr key={r.studentId}>
                    <td><input type="checkbox" checked={selected.has(r.studentId)} disabled={r.balance <= 0} onChange={() => toggle(r.studentId)} aria-label={`Sélectionner ${r.name}`} /></td>
                    <td>
                      {isAdmin ? <Link to={`/admin/students/${r.studentId}`} className="pst-name">{r.name}</Link> : <span className="pst-name">{r.name}</span>}
                      <div className="pst-sub">{r.admissionNumber}</div>
                    </td>
                    <td>{r.className}</td>
                    <td className="pst-num">{money(r.expected)}</td>
                    <td className="pst-num pst-green">{money(r.paid)}</td>
                    <td className={`pst-num${r.balance > 0 ? ' pst-red' : ''}`}><strong>{money(r.balance)}</strong></td>
                    <td><span className={`pst-status pst-status--${st.cls}`}>{st.icon} {st.label}</span></td>
                    <td>{r.lastPayment ? <>{fmtDate(r.lastPayment.date)}<div className="pst-sub">{money(r.lastPayment.amount)} FCFA</div></> : <span className="pst-sub">Aucun</span>}</td>
                    <td>
                      {r.parent ? <>{r.parent.name ?? 'Parent'}<div className="pst-sub">{r.parent.phone || r.parent.email || 'Pas de contact'}</div></> : <span className="pst-sub">Aucun numéro</span>}
                      {!r.parent?.phone && <button type="button" className="pst-addphone" onClick={() => setPhoneFor(r)}>📞 Ajouter le numéro</button>}
                    </td>
                    <td className="pst-actions">
                      {r.expected > 0 && r.balance > 0 && <button type="button" onClick={() => setPaying(r)}>💵 Encaisser</button>}
                      {r.balance > 0 && <button type="button" onClick={() => remind([r.studentId])} disabled={sending}>📲 Rappeler</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {paying && (
        <RecordPayment
          row={paying}
          year={year}
          onClose={() => setPaying(null)}
          onDone={() => {
            setPaying(null);
            qc.invalidateQueries({ queryKey: ['students-status'] });
            qc.invalidateQueries({ queryKey: ['collection-overview'] });
          }}
        />
      )}
      {manual && <ManualReminders items={manual} onClose={() => setManual(null)} />}
      {phoneFor && (
        <ParentPhoneForm
          row={phoneFor}
          onClose={() => setPhoneFor(null)}
          onDone={() => { setPhoneFor(null); qc.invalidateQueries({ queryKey: ['students-status'] }); }}
        />
      )}
    </AppShell>
  );
}
